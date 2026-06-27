#!/bin/sh
set -e

echo "[bursa-api] Applying database migrations..."
npx prisma migrate deploy

if [ "$SEED_ON_START" = "true" ]; then
  echo "[bursa-api] Seeding demo data (SEED_ON_START=true)..."
  npm run seed || echo "[bursa-api] seed failed — continuing without it"
fi

echo "[bursa-api] Starting API..."
exec node dist/main.js
