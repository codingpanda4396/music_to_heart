#!/usr/bin/env bash
set -Eeuo pipefail
[[ $EUID -eq 0 ]] || { echo 'Run as root.' >&2; exit 1; }

DOMAIN=${DOMAIN:-pandaprivate.top}
BASE_ONLY=${BASE_ONLY:-false}
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
DEPLOY_PUBLIC_KEY=${DEPLOY_PUBLIC_KEY:-}
[[ -n "$DEPLOY_PUBLIC_KEY" ]] || { echo 'Set DEPLOY_PUBLIC_KEY to the GitHub Actions deploy public key.' >&2; exit 1; }
if [[ "$BASE_ONLY" != true ]]; then
  : "${ADMIN_EMAIL:?Set ADMIN_EMAIL for certificate registration}"
  : "${POSTGRES_IMAGE:?Set POSTGRES_IMAGE to the staged local PostgreSQL image ID}"
  : "${OSS_ENDPOINT:?Set OSS_ENDPOINT}"
  : "${OSS_BUCKET:?Set OSS_BUCKET}"
  : "${OSS_ACCESS_KEY_ID:?Set OSS_ACCESS_KEY_ID}"
  : "${OSS_ACCESS_KEY_SECRET:?Set OSS_ACCESS_KEY_SECRET}"
  command -v ossutil >/dev/null || { echo 'Install Alibaba Cloud ossutil before bootstrap.' >&2; exit 1; }
  [[ "$POSTGRES_IMAGE" == sha256:* ]] || { echo 'POSTGRES_IMAGE must be a local immutable image ID.' >&2; exit 1; }
fi

apt-get update
apt-get install -y ca-certificates curl gnupg nginx certbot python3-certbot-nginx ufw openssl unzip
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
. /etc/os-release
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $VERSION_CODENAME stable" > /etc/apt/sources.list.d/docker.list
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

id deploy >/dev/null 2>&1 || useradd --create-home --shell /bin/bash deploy
usermod -aG docker deploy
install -o deploy -g deploy -m 0700 -d /home/deploy/.ssh
printf '%s\n' "$DEPLOY_PUBLIC_KEY" > /home/deploy/.ssh/authorized_keys
chown deploy:deploy /home/deploy/.ssh/authorized_keys
chmod 0600 /home/deploy/.ssh/authorized_keys
printf 'deploy ALL=(root) NOPASSWD: /usr/sbin/nginx -t, /usr/bin/systemctl reload nginx\n' > /etc/sudoers.d/qujing-deploy
chmod 0440 /etc/sudoers.d/qujing-deploy

install -o deploy -g deploy -m 0755 -d /opt/qujing /opt/qujing/releases /opt/qujing/bin
install -m 0755 -d /etc/qujing /var/www/certbot
docker network inspect qujing >/dev/null 2>&1 || docker network create qujing
if [[ "$BASE_ONLY" == true ]]; then
  ufw default deny incoming
  ufw default allow outgoing
  ufw allow OpenSSH
  ufw allow 'Nginx Full'
  ufw --force enable
  systemctl enable --now docker nginx certbot.timer
  echo 'Base bootstrap complete. Stage PostgreSQL, then run the full bootstrap.'
  exit 0
fi
if [[ ! -f /etc/qujing/runtime.env ]]; then
  DB_PASSWORD=$(openssl rand -hex 24)
  COOKIE_SECRET=$(openssl rand -hex 32)
  ADMIN_PASSWORD=$(openssl rand -hex 16)
  BACKUP_PASSPHRASE=$(openssl rand -hex 32)
  cat > /etc/qujing/runtime.env <<EOF
NODE_ENV=production
APP_ORIGIN=https://$DOMAIN
DATABASE_URL=postgresql://qujing:$DB_PASSWORD@qujing-postgres:5432/qujing
POSTGRES_USER=qujing
POSTGRES_PASSWORD=$DB_PASSWORD
POSTGRES_DB=qujing
POSTGRES_IMAGE=$POSTGRES_IMAGE
COOKIE_SECRET=$COOKIE_SECRET
ADMIN_USERNAME=admin
ADMIN_PASSWORD=$ADMIN_PASSWORD
OSS_ENDPOINT=$OSS_ENDPOINT
OSS_BUCKET=$OSS_BUCKET
OSS_ACCESS_KEY_ID=$OSS_ACCESS_KEY_ID
OSS_ACCESS_KEY_SECRET=$OSS_ACCESS_KEY_SECRET
BACKUP_PASSPHRASE=$BACKUP_PASSPHRASE
EOF
  chmod 0640 /etc/qujing/runtime.env
  chown root:deploy /etc/qujing/runtime.env
  printf 'Initial admin password: %s\nStore it now; it is only printed once.\n' "$ADMIN_PASSWORD"
fi
if ! grep -q '^POSTGRES_IMAGE=' /etc/qujing/runtime.env; then
  printf 'POSTGRES_IMAGE=%s\n' "$POSTGRES_IMAGE" >> /etc/qujing/runtime.env
fi
ossutil config -e "$OSS_ENDPOINT" -i "$OSS_ACCESS_KEY_ID" -k "$OSS_ACCESS_KEY_SECRET" -L CH -c /etc/qujing/ossutilconfig
chmod 0600 /etc/qujing/ossutilconfig

docker image inspect "$POSTGRES_IMAGE" >/dev/null || {
  echo 'Stage the pinned PostgreSQL image on this ECS before bootstrap.' >&2
  exit 1
}
install -o deploy -g deploy -m 0755 "$SCRIPT_DIR/scripts/deploy.sh" /opt/qujing/bin/deploy.sh
install -m 0755 "$SCRIPT_DIR/scripts/backup.sh" /opt/qujing/bin/backup.sh
install -m 0755 "$SCRIPT_DIR/scripts/restore-check.sh" /opt/qujing/bin/restore-check.sh
install -m 0755 "$SCRIPT_DIR/scripts/weekly-restore-check.sh" /opt/qujing/bin/weekly-restore-check.sh
printf 'upstream qujing_active { server 127.0.0.1:3101; keepalive 32; }\n' > /opt/qujing/current-upstream.conf
chown deploy:deploy /opt/qujing/current-upstream.conf
install -m 0644 "$SCRIPT_DIR/nginx/log-format.conf" /etc/nginx/conf.d/00-qujing-log-format.conf
cat > /etc/nginx/sites-available/qujing-bootstrap <<EOF
server { listen 80; listen [::]:80; server_name $DOMAIN; location /.well-known/acme-challenge/ { root /var/www/certbot; } location / { return 200 'bootstrap ready'; add_header Content-Type text/plain; } }
EOF
ln -sf /etc/nginx/sites-available/qujing-bootstrap /etc/nginx/sites-enabled/qujing
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
certbot certonly --webroot -w /var/www/certbot -d "$DOMAIN" --email "$ADMIN_EMAIL" --agree-tos --non-interactive
sed "s/__DOMAIN__/$DOMAIN/g" "$SCRIPT_DIR/nginx/qujing.conf.template" > /etc/nginx/sites-available/qujing
ln -sf /etc/nginx/sites-available/qujing /etc/nginx/sites-enabled/qujing
nginx -t && systemctl reload nginx

docker compose --env-file /etc/qujing/runtime.env -f "$SCRIPT_DIR/compose/database.yml" up -d
install -m 0644 "$SCRIPT_DIR/systemd/qujing-backup.service" /etc/systemd/system/qujing-backup.service
install -m 0644 "$SCRIPT_DIR/systemd/qujing-backup.timer" /etc/systemd/system/qujing-backup.timer
install -m 0644 "$SCRIPT_DIR/systemd/qujing-restore-check.service" /etc/systemd/system/qujing-restore-check.service
install -m 0644 "$SCRIPT_DIR/systemd/qujing-restore-check.timer" /etc/systemd/system/qujing-restore-check.timer
systemctl daemon-reload
systemctl enable --now qujing-backup.timer
systemctl enable --now qujing-restore-check.timer

ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable
systemctl enable --now docker nginx certbot.timer

cat > /etc/ssh/sshd_config.d/99-qujing-hardening.conf <<'EOF'
PermitRootLogin no
PasswordAuthentication no
KbdInteractiveAuthentication no
EOF
sshd -t && systemctl reload ssh
echo "Bootstrap complete. Merge main to run the first deployment."
