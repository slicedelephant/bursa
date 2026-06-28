# Quickstart — Feature 008 (Observability & Funnel-Analytics)

## Voraussetzungen
```bash
cd /Users/dennisvocke/dev/se_projects/fundingApp
npm run db:up            # Postgres (fundingapp-db)
cd apps/api && npx prisma migrate dev --name observability_analytics && npm run seed
```

## Lokaler Lauf
```bash
npm run dev              # api :3000, web :4200
```

## Smoke (kritische Pfade)
```bash
# Health (öffentlich, für Synthetic-Monitoring)
curl -s localhost:3000/api/health | jq

# Funnel-Event melden (anonym)
curl -s -X POST localhost:3000/api/analytics/events \
  -H 'content-type: application/json' \
  -d '{"type":"campaign_view","visitorId":"v_demo","campaignId":"demo"}' | jq

# Request-ID-Korrelation (Response spiegelt x-request-id)
curl -si localhost:3000/api/health | grep -i x-request-id

# Admin-Dashboard-Endpunkte (Bearer ADMIN-Token nötig)
TOKEN=... ; curl -s localhost:3000/api/observability/funnel  -H "authorization: Bearer $TOKEN" | jq
curl -s localhost:3000/api/observability/metrics -H "authorization: Bearer $TOKEN" | jq
curl -s localhost:3000/api/observability/slo     -H "authorization: Bearer $TOKEN" | jq
curl -s localhost:3000/api/observability/payment-alerts -H "authorization: Bearer $TOKEN" | jq
```

## Tests / Verify
```bash
npm --prefix apps/api test
npm --prefix apps/web run test:cov
npm --prefix apps/api run build
npm --prefix apps/web run build
```

## Bewusste Grenzen (Betrieb)
- In-memory Metrics/SLO sind per-Instanz; bei horizontaler Skalierung Store gegen geteilten Store
  tauschen (gleiche Schnittstelle). SLO rechnet auf dem laufenden Sample-Fenster (kein Zeitreihen-
  Backend) — als Annäherung dokumentiert.
- Alerts werden berechnet + im Dashboard/Log ausgegeben; kein externer Versand (kein SMTP/PagerDuty).
- `GET /health` ist der Probe-Endpunkt; das eigentliche Synthetic-Polling macht ein externer Monitor.
- Produkt-Analytics ist consent-gegated (Default: nur essentielle Events) und PII-arm (anonyme
  visitorId statt IP, redacted Metadaten).
