#!/usr/bin/env bash
set -Eeuo pipefail
set -a
source /etc/qujing/runtime.env
set +a
: "${BACKUP_PASSPHRASE:?missing BACKUP_PASSPHRASE}"
: "${OSS_BUCKET:?missing OSS_BUCKET}"
STAMP=$(date -u +%Y%m%dT%H%M%SZ)
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT
docker exec qujing-postgres pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc > "$WORK/qujing.dump"
openssl enc -aes-256-cbc -pbkdf2 -salt -pass env:BACKUP_PASSPHRASE -in "$WORK/qujing.dump" -out "$WORK/qujing-$STAMP.dump.enc"
ossutil -c /etc/qujing/ossutilconfig cp -f "$WORK/qujing-$STAMP.dump.enc" "oss://$OSS_BUCKET/postgres/daily/qujing-$STAMP.dump.enc"
if [[ $(date -u +%u) == 7 ]]; then
  ossutil -c /etc/qujing/ossutilconfig cp -f "$WORK/qujing-$STAMP.dump.enc" "oss://$OSS_BUCKET/postgres/weekly/qujing-$STAMP.dump.enc"
fi
date -u +%FT%TZ > /opt/qujing/last-backup-at
echo "backup uploaded: qujing-$STAMP.dump.enc"
