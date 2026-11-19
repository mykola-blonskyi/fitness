#!/usr/bin/env bash
set -Eeuo pipefail

dir=$(cd "$(dirname "$0")" && pwd)
env_file="$dir/.env"
set -a
. "$env_file"
set +a

alert() {
  curl -fsS -m 20 "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
    --data-urlencode "chat_id=${TELEGRAM_CHAT_ID}" \
    --data-urlencode "text=Backup failed on $(hostname): $1" >/dev/null || true
}
trap 'rc=$?; alert "exited $rc, see $dir/backup.log"' ERR

# The MinIO service's own Coolify network, so the bucket is read without going through Traefik.
rclone() {
  docker run --rm --network 3jhjnrvkwf0oozjqo3sz0vsr --env-file "$env_file" "$@"
}

fresh=$(rclone -v /data/coolify/backups/databases/root-team-0:/dumps:ro rclone/rclone:1.76.0 --config "" lsf -R --files-only --max-age 26h /dumps)
if [ -z "$fresh" ]; then
  alert "no database dump newer than 26h"
  exit 1
fi

mkdir -p "$dir/photos/current" "$dir/photos/deleted"
rclone --user "$(id -u):$(id -g)" -v "$dir/photos:/photos" rclone/rclone:1.76.0 --config "" \
  sync minio:fitness-progress-photos /photos/current --backup-dir "/photos/deleted/$(date -u +%F)"
find "$dir/photos/deleted" -mindepth 1 -maxdepth 1 -mtime +30 -exec rm -rf {} +
echo "$(date -u +%FT%TZ) ok"
