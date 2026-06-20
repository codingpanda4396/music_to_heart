#!/usr/bin/env bash
set -Eeuo pipefail

IMAGE="${1:?usage: deploy.sh IMAGE@DIGEST COMMIT_SHA}"
COMMIT="${2:?usage: deploy.sh IMAGE@DIGEST COMMIT_SHA}"
MODE=${3:-deploy}
ROOT=/opt/qujing
ENV_FILE=/etc/qujing/runtime.env
LOCK="$ROOT/deploy.lock"
exec 9>"$LOCK"
flock -n 9 || { echo "another deployment is running" >&2; exit 1; }

[[ "$IMAGE" == *@sha256:* ]] || { echo "deployment requires an immutable digest" >&2; exit 1; }
if [[ "$MODE" == rollback ]] && ! grep -Fq " $IMAGE " "$ROOT/releases.log" 2>/dev/null; then
  echo "rollback digest is not present in the last ten release records" >&2
  exit 1
fi
source "$ENV_FILE"
ACTIVE=blue
[[ -f "$ROOT/active-slot" ]] && ACTIVE=$(<"$ROOT/active-slot")
if [[ "$ACTIVE" == blue ]]; then NEXT=green; NEXT_PORT=3102; OLD_PORT=3101; else NEXT=blue; NEXT_PORT=3101; OLD_PORT=3102; fi
NEXT_CONTAINER="qujing-$NEXT"
OLD_CONTAINER="qujing-$ACTIVE"
PREVIOUS_IMAGE=$(docker inspect --format '{{.Config.Image}}' "$OLD_CONTAINER" 2>/dev/null || true)

rollback() {
  echo "deployment failed; restoring $ACTIVE" >&2
  if docker ps --format '{{.Names}}' | grep -qx "$OLD_CONTAINER"; then
    printf 'upstream qujing_active { server 127.0.0.1:%s; keepalive 32; }\n' "$OLD_PORT" > "$ROOT/current-upstream.conf.tmp"
    mv "$ROOT/current-upstream.conf.tmp" "$ROOT/current-upstream.conf"
    sudo nginx -t && sudo systemctl reload nginx
  fi
  docker rm -f "$NEXT_CONTAINER" >/dev/null 2>&1 || true
}
trap rollback ERR

docker pull "$IMAGE"
docker run --rm --network qujing --env-file "$ENV_FILE" "$IMAGE" \
  ./node_modules/.bin/prisma migrate deploy --schema apps/server/prisma/schema.prisma
docker run --rm --network qujing --env-file "$ENV_FILE" "$IMAGE" \
  ./node_modules/.bin/tsx apps/server/prisma/seed.ts
docker run --rm --network qujing --env-file "$ENV_FILE" "$IMAGE" \
  node apps/server/dist/validate-catalog.js
docker rm -f "$NEXT_CONTAINER" >/dev/null 2>&1 || true
docker run -d --name "$NEXT_CONTAINER" --restart unless-stopped --network qujing \
  --env-file "$ENV_FILE" -e APP_VERSION="$COMMIT" -e PORT=3000 \
  -p "127.0.0.1:$NEXT_PORT:3000" --read-only --tmpfs /tmp:rw,noexec,nosuid,size=64m \
  --cap-drop ALL --security-opt no-new-privileges \
  --log-opt max-size=10m --log-opt max-file=5 "$IMAGE" >/dev/null

for _ in {1..30}; do
  curl -fsS "http://127.0.0.1:$NEXT_PORT/readyz" >/dev/null && break
  sleep 2
done
curl -fsS "http://127.0.0.1:$NEXT_PORT/readyz" >/dev/null
curl -fsS "http://127.0.0.1:$NEXT_PORT/api/moods" | grep -q '焦虑'

printf 'upstream qujing_active { server 127.0.0.1:%s; keepalive 32; }\n' "$NEXT_PORT" > "$ROOT/current-upstream.conf.tmp"
mv "$ROOT/current-upstream.conf.tmp" "$ROOT/current-upstream.conf"
sudo nginx -t
sudo systemctl reload nginx
sleep 2
curl -fsS "${APP_ORIGIN}/healthz" >/dev/null
curl -fsS "${APP_ORIGIN}/version" | grep -q "$COMMIT"
printf '%s\n' "$NEXT" > "$ROOT/active-slot"
install -m 0755 "$0" "$ROOT/bin/deploy.sh"
printf '%s %s %s %s\n' "$(date -u +%FT%TZ)" "$COMMIT" "$IMAGE" "$PREVIOUS_IMAGE" >> "$ROOT/releases.log"
tail -n 10 "$ROOT/releases.log" > "$ROOT/releases.log.tmp" && mv "$ROOT/releases.log.tmp" "$ROOT/releases.log"
trap - ERR
nohup sh -c "sleep 900; docker rm -f '$OLD_CONTAINER' >/dev/null 2>&1 || true" >/dev/null 2>&1 &
echo "deployed $COMMIT to $NEXT using $IMAGE"
