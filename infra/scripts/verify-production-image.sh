#!/usr/bin/env bash
set -Eeuo pipefail

IMAGE=${1:?usage: verify-production-image.sh IMAGE}
MAX_COMPRESSED_BYTES=${MAX_COMPRESSED_BYTES:-461373440}
ARCHIVE=$(mktemp)
trap 'rm -f "$ARCHIVE"' EXIT

[[ $(docker image inspect --format '{{.Config.User}}' "$IMAGE") == node ]] || {
  echo 'production image must run as node' >&2
  exit 1
}

docker run --rm --entrypoint node "$IMAGE" -e '
  for (const dependency of ["playwright", "vitest"]) {
    try {
      require.resolve(dependency);
      console.error(`${dependency} must not be present in the production image`);
      process.exitCode = 1;
    } catch (error) {
      if (error?.code !== "MODULE_NOT_FOUND") throw error;
    }
  }
'

docker save "$IMAGE" | gzip -1 > "$ARCHIVE"
COMPRESSED_BYTES=$(stat -c %s "$ARCHIVE")
printf 'compressed production image: %s bytes (limit: %s)\n' \
  "$COMPRESSED_BYTES" "$MAX_COMPRESSED_BYTES"
(( COMPRESSED_BYTES <= MAX_COMPRESSED_BYTES )) || {
  echo 'production image exceeds compressed size limit' >&2
  exit 1
}
