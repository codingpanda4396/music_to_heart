# 云端运行手册

## 1. 上线前资源

- Ubuntu 24.04 x86_64 ECS，安全组仅允许 22、80、443。
- `pandaprivate.top` 与 `www.pandaprivate.top` 的 A/AAAA 记录指向 ECS。
- 私有 OSS Bucket；RAM 用户仅能读写该 Bucket 的备份前缀。
- ECS 已安装阿里云官方 `ossutil`。
- GitHub `production` Environment 中已配置 ECS SSH 主机、用户、私钥和固定 host key。

OSS 生命周期规则必须设置为：

- `postgres/daily/` 保留 30 天。
- `postgres/weekly/` 保留 90 天。

## 2. 一次性初始化

生成专用部署密钥，将私钥保存为 GitHub Environment Secret `ECS_SSH_PRIVATE_KEY`：

```bash
ssh-keygen -t ed25519 -C qujing-deploy -f ./qujing-deploy
```

先在 ECS 上以 root 执行基础初始化，只创建运行环境和 `deploy` 用户：

```bash
sudo env \
  BASE_ONLY=true \
  DOMAIN=pandaprivate.top \
  DEPLOY_PUBLIC_KEY="$(cat qujing-deploy.pub)" \
  bash infra/bootstrap.sh
```

在 GitHub Actions 手动运行 **Stage PostgreSQL image on ECS**。成功后，ECS 的 `/opt/qujing/postgres-image-id` 保存不可变本地 image ID。然后执行完整初始化：

```bash
sudo env \
  DOMAIN=pandaprivate.top \
  ADMIN_EMAIL=ops@example.com \
  DEPLOY_PUBLIC_KEY="$(cat qujing-deploy.pub)" \
  POSTGRES_IMAGE="$(cat /opt/qujing/postgres-image-id)" \
  OSS_ENDPOINT='oss-cn-REGION.aliyuncs.com' \
  OSS_BUCKET='私有 Bucket 名称' \
  OSS_ACCESS_KEY_ID='最小权限 RAM AccessKey' \
  OSS_ACCESS_KEY_SECRET='对应 Secret' \
  bash infra/bootstrap.sh
```

脚本会打印一次初始管理员密码。立即存入密码管理器；运行密钥位于 `/etc/qujing/runtime.env`，权限为 `root:deploy 0640`。

不要把 OSS 密码粘贴到聊天、仓库或 Actions 日志。推荐在 ECS 控制台通过隐藏输入读取密码，再调用 bootstrap，避免密码进入 shell history。

`POSTGRES_IMAGE` 必须是 `sha256:...` 本地 image ID。Compose 设置 `pull_policy: never`，数据库不会接触 Docker Hub。

## 3. GitHub 配置

创建受保护的 `production` Environment，配置：

- `ECS_HOST`
- `ECS_USER=deploy`
- `ECS_SSH_PRIVATE_KEY`
- `ECS_SSH_KNOWN_HOSTS`，必须来自人工核验的 `ssh-keyscan` 结果

同时创建仓库 Actions Variable `DEPLOY_ENABLED=false`，避免首次合并在 PostgreSQL 和证书准备完成前抢跑。完整初始化后改为 `true`。

保护 `main`：要求 PR、禁止 force push，并将 CI 的 `verify` job 设为 required check。

正常发布只需合并通过检查的 PR。Actions 构建一次镜像，生成 SBOM 和来源证明，校验压缩包 SHA-256 后通过 SCP 直传 ECS。部署记录保存在 GitHub Deployment 与 ECS `/opt/qujing/releases.log`。

## 4. 蓝绿发布与回滚

- blue：`127.0.0.1:3101`
- green：`127.0.0.1:3102`
- 活动槽位：`/opt/qujing/active-slot`
- Nginx upstream：`/opt/qujing/current-upstream.conf`

部署脚本拒绝 tag 和 `latest`，只接受 `image@sha256:...`。数据库迁移必须遵循 expand/contract：先增加兼容结构，至少下一版才删除旧结构。

需要回滚时，在 Actions 运行 **Roll back production**，填写 `/opt/qujing/releases.log` 最近十条中的 digest 和 commit。工作流会拒绝列表之外的 digest。

## 5. 备份与恢复

```bash
sudo systemctl status qujing-backup.timer
sudo systemctl status qujing-restore-check.timer
sudo /opt/qujing/bin/backup.sh
sudo /opt/qujing/bin/weekly-restore-check.sh
```

备份每 6 小时执行，先以 AES-256/PBKDF2 加密，再上传 OSS。每周恢复到隔离的临时 PostgreSQL 容器并检查心境表。目标 RPO ≤ 6 小时、RTO ≤ 2 小时。

## 6. 外部监控

在阿里云 CloudMonitor 创建站点监控：

- `https://pandaprivate.top/healthz`：响应 200 且包含 `ok`
- `https://pandaprivate.top/version`：响应 200
- 周期 1–5 分钟，连续两次失败发邮件

同时为 ECS 配置 CPU、内存和磁盘 ≥ 80% 告警；证书剩余期 < 14 天告警。为 `/opt/qujing/last-backup-at` 超过 8 小时、`last-restore-check-at` 超过 8 天配置巡检告警。

## 7. 必须真实演练

公开上线前保存三次演练证据：

1. 正常 digest 蓝绿发布和版本响应。
2. 使用故意无法通过 `/readyz` 的测试镜像，确认 Nginx 未切流或自动回切。
3. 从 OSS 最新加密备份恢复到空数据库。

没有 ECS/OSS 输出证据时，这三项只能标记为“待云端验证”，不能写成通过。
