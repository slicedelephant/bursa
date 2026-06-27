# Bursa API (NestJS + Prisma). Debian-slim base (glibc) for painless Prisma engines.
# Builds natively on arm64 (littleBrother) or amd64.
FROM node:24-slim

WORKDIR /app

# Prisma needs openssl at build (generate) and runtime (migrate/query).
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production

# Install ALL deps incl. dev (nest CLI for build, ts-node for seed) — needed even
# though NODE_ENV=production. npm install (not ci) tolerates optional-dep lock drift.
COPY package*.json ./
RUN npm install --include=dev

COPY . .

# Generate the Prisma client and compile the NestJS app.
RUN npx prisma generate && npm run build

RUN chmod +x docker-entrypoint.sh

EXPOSE 3000

CMD ["./docker-entrypoint.sh"]
