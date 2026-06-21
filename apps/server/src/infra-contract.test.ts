import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const repoRoot = fileURLToPath(new URL('../../..', import.meta.url));

function readRepoFile(path: string): string {
  const absolutePath = `${repoRoot}/${path}`;
  return existsSync(absolutePath) ? readFileSync(absolutePath, 'utf8') : '';
}

describe('production delivery contracts', () => {
  it('keeps development dependencies out of the runtime image', () => {
    const dockerfile = readRepoFile('Dockerfile');

    expect(dockerfile).toContain('AS prod-deps');
    expect(dockerfile).toContain('pnpm install --prod');
    expect(dockerfile).not.toContain('COPY --from=builder /app/node_modules ./node_modules');
  });

  it('uses a digest-qualified PostgreSQL image mirrored to ACR', () => {
    const compose = readRepoFile('infra/compose/database.yml');
    const bootstrap = readRepoFile('infra/bootstrap.sh');
    const mirrorWorkflow = readRepoFile('.github/workflows/mirror-postgres.yml');

    expect(compose).toContain('image: ${POSTGRES_IMAGE:?');
    expect(bootstrap).toContain('ACR_REGISTRY');
    expect(mirrorWorkflow).toContain('POSTGRES_UPSTREAM_DIGEST');
  });

  it('publishes and rolls back immutable ACR application images', () => {
    const deployWorkflow = readRepoFile('.github/workflows/deploy.yml');
    const rollbackWorkflow = readRepoFile('.github/workflows/rollback.yml');

    expect(deployWorkflow).toContain('ACR_PASSWORD');
    expect(deployWorkflow).toContain('acr_digest');
    expect(deployWorkflow).toContain('type=raw,value=${{ steps.sha.outputs.value }}');
    expect(rollbackWorkflow).toContain('ACR_REGISTRY');
  });
});
