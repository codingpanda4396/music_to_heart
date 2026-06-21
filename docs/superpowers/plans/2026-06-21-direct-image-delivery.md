# Direct Image Delivery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver immutable Docker images directly from GitHub Actions to the ECS over SSH without a paid or cross-border registry dependency.

**Architecture:** GitHub Actions builds and scans one local image, compresses `docker save`, transfers it with SCP, verifies a checksum, and uses `docker load` on the ECS. Blue-green releases and rollbacks use immutable local Docker image IDs; PostgreSQL is staged once through a separate pinned-digest workflow and Compose never pulls it.

**Tech Stack:** GitHub Actions, Docker Buildx, gzip, OpenSSH/SCP, Bash, Nginx, Fastify, Prisma, PostgreSQL 16.

---

### Task 1: Replace registry contracts with direct-delivery contracts

**Files:**

- Modify: `apps/server/src/infra-contract.test.ts`

- [ ] Assert the deploy workflow contains `docker save`, `scp`, `docker load`,
      checksum verification, and no `ACR_` or `ghcr.io` references.
- [ ] Assert the deploy script accepts `sha256:` local image IDs.
- [ ] Assert Compose contains `pull_policy: never`.
- [ ] Assert `stage-postgres.yml` pins `POSTGRES_UPSTREAM_DIGEST` and transfers a
      Docker archive.
- [ ] Run the focused test and observe RED against the current ACR workflow.

### Task 2: Deliver the application archive directly

**Files:**

- Modify: `.github/workflows/deploy.yml`
- Modify: `infra/scripts/deploy.sh`
- Modify: `.github/workflows/rollback.yml`

- [ ] Build once with `load: true` and tag `qujing:<workflow_run.head_sha>`.
- [ ] Run Trivy and SBOM against the local image.
- [ ] Save and gzip the image, create a SHA-256 checksum, and attest the archive.
- [ ] SCP the release scripts, archive, and checksum to the ECS.
- [ ] Verify the checksum, load the image, resolve its immutable image ID, and
      invoke blue-green deployment.
- [ ] Make deploy conditionally pull registry digests but only inspect local
      image IDs; reject mutable tags.
- [ ] Roll back using a recent local image ID.

### Task 3: Stage PostgreSQL without Docker Hub access from ECS

**Files:**

- Delete: `.github/workflows/mirror-postgres.yml`
- Create: `.github/workflows/stage-postgres.yml`
- Modify: `infra/compose/database.yml`
- Modify: `infra/bootstrap.sh`

- [ ] Pull the fixed upstream PostgreSQL digest on a GitHub runner.
- [ ] Tag, save, checksum, SCP, verify, and load it on ECS.
- [ ] Print the loaded local image ID without printing credentials.
- [ ] Require `POSTGRES_IMAGE=sha256:...` and `pull_policy: never` in bootstrap
      and Compose.
- [ ] Remove all ACR/GHCR bootstrap credentials and preflight logic.

### Task 4: Verify, document, and publish

**Files:**

- Modify: `README.md`
- Modify: `docs/deployment.md`

- [ ] Document zero-cost direct delivery, first-time PostgreSQL staging, archive
      size, rollback retention, and the lack of registry-layer caching.
- [ ] Run Node 24 format, lint, typecheck, 22 unit tests, build, Bash syntax, and
      infrastructure contracts.
- [ ] Push the branch and require the full GitHub `verify` check.
- [ ] Merge only after CI is green, then observe the direct production workflow
      and complete ECS health, rollback, backup, and browser acceptance.
