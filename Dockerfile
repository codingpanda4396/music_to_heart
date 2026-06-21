# syntax=docker/dockerfile:1.7
FROM node:24-bookworm-slim AS builder
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@10.33.2 --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/tsconfig.json packages/shared/
COPY apps/server/package.json apps/server/tsconfig.json apps/server/
COPY apps/web/package.json apps/web/tsconfig*.json apps/web/vite.config.ts apps/web/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
COPY . .
RUN pnpm db:generate && pnpm build

FROM node:24-bookworm-slim AS runtime
ENV NODE_ENV=production PORT=3000 STATIC_DIR=/app/apps/web/dist
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl dumb-init fonts-noto-cjk openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/apps/server/package.json ./apps/server/package.json
COPY --from=builder /app/apps/server/node_modules ./apps/server/node_modules
COPY --from=builder /app/apps/server/dist ./apps/server/dist
COPY --from=builder /app/apps/server/prisma ./apps/server/prisma
COPY --from=builder /app/apps/web/dist ./apps/web/dist
RUN chown -R node:node /app
USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=3s --retries=5 CMD curl -fsS http://127.0.0.1:3000/healthz || exit 1
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "apps/server/dist/index.js"]
