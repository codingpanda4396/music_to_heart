# 曲径通幽

从用户此刻的心境出发，推荐一首音乐，提供克制的导赏，并在 B站聆听后留下可分享的一句话。

## 本地运行

要求 Node.js 24、pnpm 10.33、PostgreSQL 16+。

```bash
cp .env.example .env
pnpm install --frozen-lockfile
pnpm db:generate
pnpm db:migrate
ADMIN_PASSWORD='至少十二位的密码' pnpm db:seed
pnpm dev
```

- Web 开发服务器：`http://localhost:5173`
- Fastify API：`http://localhost:3000`
- 管理后台：`http://localhost:5173/admin`

正式构建由 Fastify 同域提供 Web 静态资源：

```bash
pnpm build
STATIC_DIR="$PWD/apps/web/dist" pnpm --filter @qujing/server start
```

## 常用验证

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm --filter @qujing/server validate:catalog
pnpm test:e2e
bash infra/scripts/check-migrations.sh
```

E2E 使用真实 PostgreSQL，并覆盖移动 Chromium、WebKit 的用户闭环及管理员登录。自由输入的心境补充只写入 `localStorage`，不会进入 API 请求。

## 工程结构

- `apps/web`：React/Vite 用户端与管理员端
- `apps/server`：Fastify、Prisma、分享 HTML 与 PNG 生成
- `packages/shared`：Zod 请求契约与事件枚举
- `infra`：ECS 初始化、Nginx、蓝绿发布、备份恢复
- `e2e`：移动端真实浏览器流程

核心数据和推荐理由通过 `apps/server/prisma/seed.ts` 初始化。种子操作是幂等的：不会覆盖管理员已经替换过的具体 B站视频链接。

## 隐私与安全边界

- 不保存首页自由文字；匿名标识由浏览器本地生成。
- 听感限制 120 字，以随机分享码访问，并带一次性返回的删除凭证。
- 分享页包含 `noindex, nofollow`，不进入公开广场。
- 不记录原始 IP；日志不得记录听感正文、Cookie 或删除凭证。
- 产品是音乐导赏，不提供医疗诊断或心理治疗。

## 生产部署

生产目标为 Ubuntu 24.04 x86_64 ECS、`pandaprivate.top`、GHCR 和私有 OSS。完整步骤见 [云端运行手册](docs/deployment.md)。

完成一次 bootstrap 后：

1. PR 必须通过格式、lint、类型、单元/集成、构建、E2E 和容器冒烟。
2. 合并 `main` 后构建一次镜像并推送 GHCR。
3. 发布只接受不可变 digest，在空闲槽位迁移、启动和冒烟。
4. Nginx 原子切流；失败立即回切，旧槽位保留 15 分钟。

真实 ECS、DNS、证书、CloudMonitor 和 OSS 恢复演练需要云端凭证，不能由本地测试代替。
