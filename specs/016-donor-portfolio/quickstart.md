# Quickstart — Feature 016 Spender-Portfolio & Giving-Streaks (E16)

## 1. Seed (keine Migration nötig)

```bash
cd apps/api
npm run seed            # idempotent; gibt donor@bursa.test eine Mehr-Monats-Historie
npx prisma migrate status   # up to date
npx prisma migrate diff --from-url "$DATABASE_URL" \
  --to-schema-datamodel prisma/schema.prisma --exit-code   # "No difference detected"
```

## 2. Tests + Builds

```bash
npm --prefix apps/api run test:cov   # inkl. Gamification-Primitive + portfolio-export
npm --prefix apps/web run test:cov   # inkl. streak-format/portfolio-stats + Komponenten
npm --prefix apps/api run build
npm --prefix apps/web run build
```

## 3. API-Smoke (DONOR-Token vorausgesetzt)

```bash
# Login als donor@bursa.test → TOKEN
curl -s -X POST localhost:3000/api/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"donor@bursa.test","password":"password123"}' | jq -r .data.token

# Portfolio
curl -s localhost:3000/api/donors/me/portfolio \
  -H "authorization: Bearer $TOKEN" | jq '.data.items | length, .data.streak, .data.badge'
```

## 4. Exporte

```bash
curl -s localhost:3000/api/donors/me/portfolio/export.csv \
  -H "authorization: Bearer $TOKEN" -o bursa-portfolio.csv
curl -s localhost:3000/api/donors/me/portfolio/export.pdf \
  -H "authorization: Bearer $TOKEN" -o bursa-portfolio.pdf
head -1 bursa-portfolio.pdf    # %PDF-1.4
```

## 5. Frontend

```bash
npm --prefix apps/web start
# /donor → Streak-Banner + Badge, kumulative Stats + Peer-Vergleich,
#          Portfolio-Grid "My students" (Foto/Name/Progress/Verified/Donate again),
#          Export-Buttons (CSV/PDF).
```

## Erwartete Invarianten

- `donor@bursa.test` zeigt ein Multi-Student-Portfolio mit sichtbarer Streak + Badge.
- Streak ist deterministisch (Tests mit fixem Referenzdatum, kein Monatsgrenz-Flackern).
- `prisma migrate diff --exit-code` → "No difference detected" (keine Schema-Änderung).
- `prettier --check "src/**/*.ts"` in beiden Apps clean.
