#!/usr/bin/env bash
set -Eeuo pipefail
if rg -n -i '\b(DROP[[:space:]]+(TABLE|COLUMN)|ALTER[[:space:]]+TYPE|RENAME[[:space:]]+COLUMN)\b' apps/server/prisma/migrations --glob '*.sql'; then
  echo 'Destructive migration detected. Use an expand/contract release sequence.' >&2
  exit 1
fi
echo 'Migration safety check passed.'
