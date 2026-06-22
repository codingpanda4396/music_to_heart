#!/usr/bin/env bash
set -Eeuo pipefail
set -a
source /etc/qujing/runtime.env
set +a
: "${1:?usage: restore-check.sh oss://bucket/object.dump.enc}"
WORK=$(mktemp -d)
CONTAINER=qujing-restore-check
trap 'docker rm -f "$CONTAINER" >/dev/null 2>&1 || true; rm -rf "$WORK"' EXIT
ossutil -c /etc/qujing/ossutilconfig cp -f "$1" "$WORK/backup.enc"
openssl enc -d -aes-256-cbc -pbkdf2 -pass env:BACKUP_PASSPHRASE -in "$WORK/backup.enc" -out "$WORK/backup.dump"
docker run -d --name "$CONTAINER" -e POSTGRES_PASSWORD=restore -e POSTGRES_DB=restore postgres:16.6-bookworm >/dev/null
for _ in {1..30}; do docker exec "$CONTAINER" pg_isready -U postgres -d restore >/dev/null 2>&1 && break; sleep 1; done
docker cp "$WORK/backup.dump" "$CONTAINER:/tmp/backup.dump"
docker exec "$CONTAINER" pg_restore -U postgres -d restore --clean --if-exists /tmp/backup.dump
docker exec "$CONTAINER" psql -U postgres -d restore -Atc 'SELECT count(*) FROM "OriginCategory"' | grep -Eq '^[1-9][0-9]*$'
docker exec "$CONTAINER" psql -U postgres -d restore -Atc 'SELECT count(*) FROM "NeedCategory"' | grep -Eq '^[1-9][0-9]*$'
date -u +%FT%TZ > /opt/qujing/last-restore-check-at
echo 'restore check passed'
