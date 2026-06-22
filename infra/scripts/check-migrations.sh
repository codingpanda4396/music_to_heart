#!/usr/bin/env bash
set -Eeuo pipefail
while IFS= read -r file; do
  if ! rg -q 'ALLOW_DESTRUCTIVE_NO_PRODUCTION_DATA' "$file"; then
    rg -n -i '\b(DROP[[:space:]]+(TABLE|COLUMN)|ALTER[[:space:]]+TYPE|RENAME[[:space:]]+COLUMN)\b' "$file"
    echo 'Destructive migration detected. Use an expand/contract release sequence.' >&2
    exit 1
  fi
done < <(rg -l -i '\b(DROP[[:space:]]+(TABLE|COLUMN)|ALTER[[:space:]]+TYPE|RENAME[[:space:]]+COLUMN)\b' apps/server/prisma/migrations --glob '*.sql')
echo 'Migration safety check passed.'
