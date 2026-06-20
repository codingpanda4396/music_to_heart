#!/usr/bin/env bash
set -Eeuo pipefail
set -a
source /etc/qujing/runtime.env
set +a
LATEST=$(ossutil -c /etc/qujing/ossutilconfig ls "oss://$OSS_BUCKET/postgres/daily/" | awk '/qujing-.*dump\.enc/ {print $NF}' | tail -n 1)
[[ -n "$LATEST" ]] || { echo 'no backup found' >&2; exit 1; }
/opt/qujing/bin/restore-check.sh "$LATEST"
