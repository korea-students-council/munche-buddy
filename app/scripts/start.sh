#!/bin/sh
# 컨테이너 시작: DB 마이그레이션 → (선택) 디스코드 봇 → 웹 서버
set -e

echo "[start] DB 마이그레이션"
npx prisma migrate deploy

if [ -n "$DISCORD_BOT_TOKEN" ]; then
  echo "[start] 디스코드 봇 시작"
  # 봇이 죽어도 웹은 계속 돌고, 봇만 5초 뒤 다시 켠다
  (
    while true; do
      npx tsx bot/index.ts || true
      echo "[bot] 종료됨. 5초 뒤 다시 시작해요."
      sleep 5
    done
  ) &
else
  echo "[start] DISCORD_BOT_TOKEN이 없어 봇은 켜지 않아요."
fi

echo "[start] 웹 서버 시작 (포트 ${PORT:-3000})"
exec npx next start -H 0.0.0.0 -p "${PORT:-3000}"
