# 云端运行手册

## 1. 上线前资源

- Ubuntu 24.04 x86_64 ECS，安全组仅允许 22、80、443。
- `pandaprivate.top` 与 `www.pandaprivate.top` 的 A/AAAA 记录指向 ECS。
- 私有 OSS Bucket；RAM 用户仅能读写该 Bucket 的备份前缀。
- ECS 已安装阿里云官方 `ossutil`。
- GitHub 仓库允许 Actions 写入 Packages。

OSS 生命周期规则必须设置为：

- `postgres/daily/` 保留 30 天。
- `postgres/weekly/` 保留 90 天。

## 2. 一次性初始化

生成专用部署密钥，将私钥保存为 GitHub Environment Secret `ECS_SSH_PRIVATE_KEY`：

```bash
ssh-keygen -t ed25519 -C qujing-deploy -f ./qujing-deploy
```

在 ECS 上，以 root 从可信 checkout 执行：

```bash
sudo env \
  DOMAIN=pandaprivate.top \
  ADMIN_EMAIL=ops@example.com \
  DEPLOY_PUBLIC_KEY="$(cat qujing-deploy.pub)" \
  GHCR_USER=codingpanda4396 \
  GHCR_TOKEN='只含 read:packages 的拉取令牌' \
  GHCR_PREFLIGHT_IMAGE='ghcr.io/用户/仓库@sha256:已存在的摘要' \
  OSS_ENDPOINT='oss-cn-REGION.aliyuncs.com' \
  OSS_BUCKET='私有 Bucket 名称' \
  OSS_ACCESS_KEY_ID='最小权限 RAM AccessKey' \
  OSS_ACCESS_KEY_SECRET='对应 Secret' \
  bash infra/bootstrap.sh
```

脚本会打印一次初始管理员密码。立即存入密码管理器；运行密钥位于 `/etc/qujing/runtime.env`，权限为 `root:deploy 0640`。

Bootstrap 会连续三次拉取 `GHCR_PREFLIGHT_IMAGE`。任何一次失败都会终止初始化；此时不应强行发布，需先将镜像同步到 ACR，再把工作流和回滚工作流的镜像前缀切换为 ACR 后重跑。

## 3. GitHub 配置

创建受保护的 `production` Environment，配置：

- `ECS_HOST`
- `ECS_USER=deploy`
- `ECS_SSH_PRIVATE_KEY`
- `ECS_SSH_KNOWN_HOSTS`，必须来自人工核验的 `ssh-keyscan` 结果

保护 `main`：要求 PR、禁止 force push，并将 CI 的 `verify` job 设为 required check。

正常发布只需合并通过检查的 PR。部署记录保存在 GitHub Deployment 与 ECS `/opt/qujing/releases.log`。

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
