#!/usr/bin/env bash
# 在已运行的 xhblogs-mysql 容器内建库、建表（幂等，可重复执行）
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

CONTAINER="${MYSQL_CONTAINER:-xhblogs-mysql}"
USER="${MYSQL_USER:-root}"
PASS="${MYSQL_ROOT_PASSWORD:-root}"

if ! docker ps --format '{{.Names}}' | grep -qx "$CONTAINER"; then
  echo "容器未运行: $CONTAINER（先执行 docker compose up -d mysql）" >&2
  exit 1
fi

echo "→ 在 $CONTAINER 中执行 init_mysql.sql（建库 + 建表）..."
docker exec -i "$CONTAINER" mysql -u"$USER" -p"$PASS" --default-character-set=utf8mb4 \
  < "$ROOT/scripts/migrations/init_mysql.sql"

echo "→ 当前表："
docker exec "$CONTAINER" mysql -u"$USER" -p"$PASS" -N -e "USE ${MYSQL_DATABASE:-xhblogs}; SHOW TABLES;"
