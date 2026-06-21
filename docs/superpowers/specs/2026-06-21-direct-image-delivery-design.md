# Direct Image Delivery Design

## Decision

Production delivery will not depend on GHCR, ACR, Docker Hub, or another image
registry. GitHub Actions builds the application image once, scans it, saves it
as a gzip-compressed Docker archive, and transfers that archive to the ECS over
the existing pinned-host-key SSH channel.

The ECS loads the archive with `docker load`. Blue-green deployment references
the resulting immutable Docker image ID (`sha256:...`) instead of a registry
manifest digest. The deploy script verifies that the image ID exists locally
and never attempts a pull for local images.

## Application Release

The production workflow runs only after successful `main` CI. One job checks
out the exact triggering commit, builds and loads `qujing:<commit>`, runs Trivy,
generates an SBOM, archives the image, records its SHA-256 checksum, and attests
the archive. It uploads the release scripts and archive directly to the ECS.

On the ECS, the `deploy` user verifies the archive checksum, loads it, resolves
the tag to an image ID, and invokes the existing blue-green deploy script. The
script runs migrations, seed validation, readiness checks, Nginx cutover, and
post-cutover smoke checks exactly as before. Release history stores the commit
and local image ID, so rollback remains immutable while the image exists.

## PostgreSQL Bootstrap

A separate manual workflow pulls the fixed official PostgreSQL upstream digest
on a GitHub-hosted runner, tags it `qujing-postgres:16.6-bookworm`, archives it,
and transfers it to the ECS. The ECS loads it once. Production Compose uses the
resulting local image ID and `pull_policy: never`, so the database never contacts
Docker Hub.

The database image remains independent of application releases and its named
volume remains long-lived. Changing the PostgreSQL version requires explicitly
running the staging workflow again and updating `POSTGRES_IMAGE`.

## Security and Failure Handling

- SSH continues to require the pinned ED25519 host key and the dedicated deploy
  key.
- Archives contain no runtime secrets; `/etc/qujing/runtime.env` remains only on
  the ECS.
- The archive checksum is verified before `docker load`.
- The application container still runs as non-root, read-only, capability-free,
  and with `no-new-privileges`.
- An interrupted transfer or failed load cannot affect the active slot.
- A failed migration, readiness check, or smoke check restores the old slot.
- Archives are deleted after a successful load; Docker images referenced by the
  last ten release records are retained for rollback.

## Trade-offs

This avoids registry cost and domestic registry administration. Each release
transfers the full compressed image, currently about 399 MiB, so deployment is
slower and uses more bandwidth than layer-aware registry pulls. That is an
acceptable V0.1 trade-off; a registry can be introduced later without changing
the application or blue-green model.

## Verification

CI must prove that the image runs as `node`, excludes Playwright/Vitest, stays
within 440 MiB compressed, starts against PostgreSQL, passes health/readiness,
has no actionable high/critical vulnerabilities, and produces an SBOM. The
direct-delivery contract additionally verifies registry-free workflows,
checksum verification, local image-ID deployment, and `pull_policy: never`.
