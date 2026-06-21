# ACR Production Delivery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce a smaller production image, mirror PostgreSQL into ACR, and deploy immutable ACR digests to the Alibaba Cloud ECS while retaining GHCR as a fallback record.

**Architecture:** A builder stage compiles the monorepo and a separate production-dependencies stage installs only the server dependency graph. GitHub Actions pushes one application build to GHCR and ACR, verifies registry digests, mirrors the pinned PostgreSQL image into ACR, and passes only digest-qualified ACR references to the existing blue-green deploy script.

**Tech Stack:** Docker Buildx, pnpm 10, Node.js 24, GitHub Actions, GHCR, Alibaba Cloud ACR, Fastify, Prisma, PostgreSQL 16, Bash, Vitest.

---

## File Map

- `apps/server/src/infra-contract.test.ts`: executable contract tests for Docker, Compose, bootstrap, and workflow delivery invariants.
- `apps/server/package.json`: keeps migration and TypeScript seed executors in production dependencies.
- `pnpm-lock.yaml`: records dependency-classification changes.
- `Dockerfile`: separates build dependencies from production dependencies.
- `infra/scripts/verify-production-image.sh`: checks runtime user, excluded packages, and compressed OCI size.
- `infra/compose/database.yml`: requires a digest-qualified `POSTGRES_IMAGE` value.
- `infra/bootstrap.sh`: logs in to ACR, preflights ACR, and writes the pinned PostgreSQL reference.
- `.github/workflows/mirror-postgres.yml`: copies the official PostgreSQL digest to ACR and verifies the result.
- `.github/workflows/deploy.yml`: pushes one build to GHCR and ACR, compares digests, and deploys ACR.
- `.github/workflows/rollback.yml`: rolls back using the ACR repository rather than GHCR.
- `README.md`: documents ACR secrets and bootstrap inputs.

### Task 1: Add failing infrastructure delivery contracts

**Files:**
- Create: `apps/server/src/infra-contract.test.ts`

- [ ] **Step 1: Write the failing contract test**

Create a Vitest test that resolves the repository root from `import.meta.url`, reads the relevant files, and asserts:

```ts
expect(dockerfile).toContain('AS prod-deps');
expect(dockerfile).toContain('pnpm install --prod');
expect(dockerfile).not.toContain('COPY --from=builder /app/node_modules ./node_modules');
expect(compose).toContain('image: ${POSTGRES_IMAGE:?');
expect(bootstrap).toContain('ACR_REGISTRY');
expect(deployWorkflow).toContain('ACR_PASSWORD');
expect(deployWorkflow).toContain('acr_digest');
expect(rollbackWorkflow).toContain('ACR_REGISTRY');
expect(mirrorWorkflow).toContain('POSTGRES_UPSTREAM_DIGEST');
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
pnpm vitest run apps/server/src/infra-contract.test.ts
```

Expected: FAIL because the Dockerfile has no `prod-deps` stage and the ACR workflow does not exist.

- [ ] **Step 3: Commit the failing contract**

```bash
git add apps/server/src/infra-contract.test.ts
git commit -m "test: define ACR delivery contracts"
```

### Task 2: Build a production-only application image

**Files:**
- Modify: `apps/server/package.json`
- Modify: `pnpm-lock.yaml`
- Modify: `Dockerfile`
- Create: `infra/scripts/verify-production-image.sh`
- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: Make migration executors production dependencies**

Move `prisma` and `tsx` from `devDependencies` to `dependencies` in
`apps/server/package.json`, then run:

```bash
pnpm install --lockfile-only
```

This is required because deployment runs Prisma migrations and the TypeScript
seed file from the runtime image.

- [ ] **Step 2: Add a production-dependencies stage**

Add a `prod-deps` stage that copies workspace manifests and runs:

```dockerfile
RUN --mount=type=cache,id=pnpm-prod,target=/pnpm/store \
    pnpm install --prod --frozen-lockfile --filter @qujing/server...
```

Change the runtime stage to copy root, server, and shared `node_modules` from
`prod-deps`; continue copying built JavaScript and web assets from `builder`.

- [ ] **Step 3: Add executable runtime-image verification**

Create `infra/scripts/verify-production-image.sh IMAGE`, which:

```bash
[[ $(docker image inspect --format '{{.Config.User}}' "$IMAGE") == node ]]
docker run --rm --entrypoint node "$IMAGE" -e \
  "for (const p of ['playwright','vitest']) { try { require.resolve(p); process.exit(1) } catch {} }"
docker save "$IMAGE" | gzip -1 > "$archive"
(( $(stat -c %s "$archive") <= 300 * 1024 * 1024 ))
```

Use a temporary file with a cleanup trap and print the measured byte count.

- [ ] **Step 4: Wire verification into CI**

Immediately after `docker build -t qujing:ci .`, run:

```bash
bash infra/scripts/verify-production-image.sh qujing:ci
```

- [ ] **Step 5: Run GREEN verification**

Run:

```bash
pnpm vitest run apps/server/src/infra-contract.test.ts
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Expected: all commands exit 0.

- [ ] **Step 6: Commit the production image change**

```bash
git add Dockerfile apps/server/package.json pnpm-lock.yaml infra/scripts/verify-production-image.sh .github/workflows/ci.yml
git commit -m "build: exclude development dependencies from runtime image"
```

### Task 3: Pin PostgreSQL to an ACR mirror

**Files:**
- Modify: `infra/compose/database.yml`
- Modify: `infra/bootstrap.sh`
- Create: `.github/workflows/mirror-postgres.yml`

- [ ] **Step 1: Require a pinned database image**

Change Compose to:

```yaml
image: ${POSTGRES_IMAGE:?Set POSTGRES_IMAGE to a digest-qualified ACR image}
```

Require `POSTGRES_IMAGE` in bootstrap and reject values without `@sha256:`.
Write the value into `/etc/qujing/runtime.env` when it is first generated.

- [ ] **Step 2: Replace GHCR bootstrap inputs with ACR inputs**

Require `ACR_REGISTRY`, `ACR_USERNAME`, `ACR_PASSWORD`, and
`ACR_PREFLIGHT_IMAGE`. Log in as `deploy`, retry the digest-qualified ACR pull
three times with a 180-second timeout, and remove the GHCR login requirement.

- [ ] **Step 3: Add the PostgreSQL mirror workflow**

Create a manual workflow with a fixed source:

```yaml
env:
  POSTGRES_SOURCE: docker.io/library/postgres
  POSTGRES_UPSTREAM_DIGEST: sha256:557fea37a744d5f4c8faab304b0a90858b53ab119735a88c131fd19dab802f36
```

Install `crane`, authenticate to ACR using Environment secrets, copy the source
digest to `$ACR_REGISTRY/$ACR_NAMESPACE/qujing-postgres:16.6-bookworm`, and
compare the linux/amd64 source and destination digests. Fail on mismatch.

- [ ] **Step 4: Run the focused contract test**

```bash
pnpm vitest run apps/server/src/infra-contract.test.ts
```

Expected: PostgreSQL and bootstrap assertions pass; deploy workflow assertions
remain RED until Task 4.

- [ ] **Step 5: Commit database mirroring**

```bash
git add infra/compose/database.yml infra/bootstrap.sh .github/workflows/mirror-postgres.yml
git commit -m "ops: mirror pinned PostgreSQL image to ACR"
```

### Task 4: Publish and deploy one build through ACR

**Files:**
- Modify: `.github/workflows/deploy.yml`
- Modify: `.github/workflows/rollback.yml`

- [ ] **Step 1: Expose ACR secrets to the image job**

Set `environment: production` on the image job, log in to both registries, and
generate one GHCR tag plus one ACR tag from the same commit SHA.

- [ ] **Step 2: Push one Buildx result to both registries**

Pass both newline-separated tags to one `docker/build-push-action` invocation.
After push, inspect both registry tags with `docker buildx imagetools inspect`
and write `ghcr_digest` and `acr_digest` outputs. Fail unless they are equal.

- [ ] **Step 3: Deploy the ACR digest**

Build the SSH deployment reference as:

```bash
IMAGE="$ACR_REGISTRY/$ACR_NAMESPACE/music-to-heart@$ACR_DIGEST"
```

Keep Trivy, SBOM, provenance, concurrency, and GitHub Deployment metadata. The
deployment must never use `latest` or rebuild the image.

- [ ] **Step 4: Update rollback registry selection**

Construct the rollback image from `ACR_REGISTRY`, `ACR_NAMESPACE`, and the
operator-provided historical digest.

- [ ] **Step 5: Run GREEN contract and workflow syntax checks**

```bash
pnpm vitest run apps/server/src/infra-contract.test.ts
pnpm exec prettier --check .github/workflows/deploy.yml .github/workflows/rollback.yml
```

Expected: PASS.

- [ ] **Step 6: Commit dual-registry delivery**

```bash
git add .github/workflows/deploy.yml .github/workflows/rollback.yml apps/server/src/infra-contract.test.ts
git commit -m "ci: deploy immutable ACR image digests"
```

### Task 5: Document, verify, publish, and bootstrap production

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Document required production inputs**

Document the four ACR Environment secrets, `POSTGRES_IMAGE`, the two ACR
repositories, the certificate email, `www` DNS record, and secure ECS-side OSS
credential entry. State that GHCR is a fallback and ACR is the production pull
source.

- [ ] **Step 2: Run complete local verification**

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
git diff --check origin/main...HEAD
```

Expected: all commands exit 0 with zero failed tests.

- [ ] **Step 3: Commit documentation**

```bash
git add README.md
git commit -m "docs: describe ACR production bootstrap"
```

- [ ] **Step 4: Push and open a pull request**

```bash
git push -u origin codex/acr-production-delivery
gh pr create --fill --base main --head codex/acr-production-delivery
```

- [ ] **Step 5: Verify CI before merge**

Wait for the required `verify` check. Inspect logs and require all unit,
integration, build, browser, Docker smoke, vulnerability, and SBOM steps to
pass. Do not merge a skipped or unknown check.

- [ ] **Step 6: Configure ACR and perform production acceptance**

Set GitHub Environment secrets without printing values, run the PostgreSQL
mirror workflow, set the digest-qualified `POSTGRES_IMAGE` on ECS, run Compose,
merge the PR, and observe the production workflow. Verify `/healthz`, `/readyz`,
`/version`, the mobile journey, admin flow, failed-readiness rollback, backup,
and restore before removing the temporary root key.
