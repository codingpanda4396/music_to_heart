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
    const verifyImage = readRepoFile('infra/scripts/verify-production-image.sh');

    expect(dockerfile).toContain('AS prod-deps');
    expect(dockerfile).toContain('pnpm install --prod');
    expect(dockerfile).not.toContain('COPY --from=builder /app/node_modules ./node_modules');
    expect(verifyImage).toContain('MAX_COMPRESSED_BYTES=${MAX_COMPRESSED_BYTES:-461373440}');
  });

  it('uses a locally staged immutable PostgreSQL image', () => {
    const compose = readRepoFile('infra/compose/database.yml');
    const bootstrap = readRepoFile('infra/bootstrap.sh');
    const stageWorkflow = readRepoFile('.github/workflows/stage-postgres.yml');

    expect(compose).toContain('image: ${POSTGRES_IMAGE:?');
    expect(compose).toContain('pull_policy: never');
    expect(bootstrap).not.toContain('ACR_REGISTRY');
    expect(bootstrap).toContain('BASE_ONLY');
    expect(bootstrap).toContain('POSTGRES_IMAGE must be a local immutable image ID');
    expect(stageWorkflow).toContain('POSTGRES_UPSTREAM_DIGEST');
    expect(stageWorkflow).toContain('docker save');
    expect(stageWorkflow).toContain('docker load');
  });

  it('delivers and rolls back immutable local application images', () => {
    const deployWorkflow = readRepoFile('.github/workflows/deploy.yml');
    const rollbackWorkflow = readRepoFile('.github/workflows/rollback.yml');
    const deployScript = readRepoFile('infra/scripts/deploy.sh');

    expect(deployWorkflow).toContain('docker save');
    expect(deployWorkflow).toContain('docker load');
    expect(deployWorkflow).toContain('sha256sum --check');
    expect(deployWorkflow).toContain('scp');
    expect(deployWorkflow).toContain('IMAGE_TAG="qujing:$SHA"');
    expect(deployWorkflow).toContain('^[0-9a-f]{40}$');
    expect(deployWorkflow).not.toContain('ACR_');
    expect(deployWorkflow).not.toContain('ghcr.io');
    expect(deployScript).toContain('LOCAL_IMAGE_ID');
    expect(deployScript).toContain('9>&-');
    expect(rollbackWorkflow).toContain('^sha256:[0-9a-f]{64}$');
    expect(rollbackWorkflow).not.toContain('ACR_REGISTRY');
  });

  it('serves and certificates only the canonical root domain', () => {
    const nginxTemplate = readRepoFile('infra/nginx/qujing.conf.template');
    const bootstrap = readRepoFile('infra/bootstrap.sh');

    expect(nginxTemplate).not.toContain('www.__DOMAIN__');
    expect(nginxTemplate.indexOf('include /opt/qujing/current-upstream.conf')).toBeLessThan(
      nginxTemplate.indexOf('server {'),
    );
    expect(bootstrap).not.toContain('www.$DOMAIN');
    expect(bootstrap).toContain('certbot certonly');
    expect(bootstrap).toContain('-d "$DOMAIN"');
  });
});
