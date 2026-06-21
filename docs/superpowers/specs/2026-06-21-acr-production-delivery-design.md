# ACR Production Delivery Design

## Context

The first production preflight exposed two measurable delivery failures on the
Alibaba Cloud ECS:

- the application image in GHCR is about 468 MB compressed and did not finish
  pulling after more than seven minutes;
- Docker Hub resolution/connectivity is unreliable, so the PostgreSQL image
  cannot be pulled directly on the ECS.

The host itself is healthy: it runs Ubuntu 24.04 x86_64, Docker and Nginx are
active, a 2 GiB swap file is enabled, and the deployment user and firewall are
configured. The delivery path, rather than the application runtime, is the
current blocker.

## Decision

Use Alibaba Cloud Container Registry (ACR) as the primary production pull
source. Keep GHCR as the build record and fallback registry.

The application is still built exactly once. The same OCI image produced by
GitHub Actions is pushed to both registries, and deployment records both
registry references and the immutable manifest digest. The ECS pulls only the
ACR reference during normal deployment.

The official PostgreSQL 16.6 Bookworm image is copied by immutable upstream
digest into a private ACR repository. Production Compose references the ACR
copy by digest and never contacts Docker Hub.

## Production Image

The Dockerfile gains a dedicated production-dependencies stage. It installs
only packages needed by the server at runtime. Build and test dependencies such
as Playwright, Vitest, Vite, and TypeScript remain in the builder stage and are
not copied into the runtime image.

Application build artifacts continue to come from the builder stage. Runtime
workspace links for `apps/server` and `packages/shared` come from the
production-dependencies stage. Chinese fonts, OpenSSL, curl, and dumb-init stay
in the final image because share-card rendering, Prisma, health checks, and
signal handling depend on them.

CI rejects a runtime image that:

- contains Playwright or Vitest packages;
- runs as root;
- cannot start and pass `/healthz` and `/readyz` against PostgreSQL;
- exceeds the compressed OCI layer-size ceiling of 300 MB.

CI exports the image as an OCI archive and sums its compressed layer blobs, so
the measurement does not depend on Docker's human-readable display. The ceiling
is generous enough for Node and Noto CJK fonts, while still failing the measured
468 MB development-dependency image.

## Registry Flow

The production workflow logs in to GHCR with `GITHUB_TOKEN` and to ACR with
credentials stored in the GitHub `production` Environment. Buildx performs one
build and pushes the resulting image to both registry tags.

Required Environment secrets:

- `ACR_REGISTRY`, for example `registry.cn-hangzhou.aliyuncs.com`;
- `ACR_NAMESPACE`;
- `ACR_USERNAME`;
- `ACR_PASSWORD`.

The application repository name is `music-to-heart`; the mirrored database
repository name is `qujing-postgres`. Credentials must have push permission
from GitHub Actions and pull permission from the ECS. If ACR supports separate
credentials, the ECS receives a pull-only credential.

The workflow obtains the pushed ACR manifest digest and verifies that it equals
the GHCR application manifest digest before deployment. A mismatch stops the
release. No deployment uses a mutable tag such as `latest`.

## PostgreSQL Mirror

An explicit workflow copies
`docker.io/library/postgres:16.6-bookworm` by its verified upstream digest into
`$ACR_REGISTRY/$ACR_NAMESPACE/qujing-postgres`. It records both the upstream
digest and ACR digest and fails if the copy changes the selected linux/amd64
manifest.

The production Compose file accepts `POSTGRES_IMAGE` from the runtime
environment and requires a digest-qualified value. Bootstrap sets it to the ACR
mirror. This keeps the database volume and lifecycle independent of application
blue-green releases.

## Deployment and Failure Handling

GitHub Actions uploads only the release scripts over SSH. The deploy script
receives the ACR application reference with its digest, runs migrations and
catalog validation, starts the idle blue/green slot, performs readiness and
journey smoke checks, then switches Nginx atomically.

If ACR authentication, pull, migration, readiness, or post-switch smoke checks
fail, the active slot remains or is restored. GHCR fallback is an explicit
manual rollback choice; the deployment does not silently change registries,
because doing so would hide a degraded production dependency.

Registry credentials are never written into the repository, image, workflow
logs, or application environment. Docker credential files on the ECS are owned
by `deploy` with mode `0600`.

## Verification

Before production cutover:

1. Run format, lint, type checks, unit tests, PostgreSQL integration tests,
   production builds, and mobile Chromium/WebKit E2E.
2. Build the production image and verify its user, dependency exclusions, size,
   health, and readiness.
3. Copy PostgreSQL into ACR by digest and restore a new database volume from the
   pinned image.
4. Push the application once to GHCR and ACR, then compare manifest digests.
5. Pull both ACR images from the ECS without contacting Docker Hub or GHCR.
6. Execute a normal blue-green release and a deliberately failed readiness
   release to prove automatic rollback.
7. Remove the temporary root bootstrap key only after the GitHub Actions
   `deploy` key completes an SSH deployment.

## Out of Scope

This change does not alter product behavior, the database schema, content, or
the backup format. OSS credentials, DNS completion, TLS issuance, external
monitoring, and restore drills remain required production-bootstrap steps after
the registry path is healthy.
