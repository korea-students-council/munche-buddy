# 웹 + 디스코드 봇을 한 컨테이너에서 실행한다 (Railway 등에서 서비스 1개로 배포)
FROM node:22-slim

RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma
# 봇 실행(tsx)과 마이그레이션(prisma)에 개발 의존성이 필요해서 전부 설치한다
RUN npm ci

COPY . .
RUN npx prisma generate && npm run build

ENV NODE_ENV=production
EXPOSE 3000
CMD ["sh", "scripts/start.sh"]
