# Quickstart — Feature 010 Trust-and-Safety Operations Console (E9)

## Lokal starten

```bash
cd /Users/dennisvocke/dev/se_projects/fundingApp
npm run db:up                                   # Postgres (5433)
cd apps/api && npx prisma migrate dev           # wendet trust_safety an
npm run seed                                    # inkl. Trust-Safety-Demodaten
npm run dev                                     # api + web
```

Der Seed legt eine **auto-geflaggte Demo-Kampagne** (verdächtige Keywords), zwei
Demo-Chargebacks, Fraud-Signale/Donor-Risk-Scores und einen Community-Flag an und
gibt am Ende die Demo-Accounts aus.

## Demo-Accounts (Passwort: `bursa1234`)

- `admin@bursa.test` — Operator/Trust-and-Safety (→ `/admin/trust-safety`)
- `donor@bursa.test` · `sponsor@acme.test` · `amara@bursa.test` · `schooladmin@bursa.test`

## Tests

```bash
npm --prefix apps/api run test:cov    # Backend Jest + Per-Path-Coverage-Gates
npm --prefix apps/web run test:cov    # Frontend Jest + Per-Path-Coverage-Gates
npm --prefix apps/api run build
npm --prefix apps/web run build
```

## Operator-Flow manuell prüfen (ADMIN)

1. Als `admin@bursa.test` einloggen → `/admin/trust-safety`.
2. Tab **Dashboard**: Fraud-Trends, Chargeback-Rate, Moderations-Backlog,
   Risk-Heat-Map nach Geografie.
3. Tab **Moderation**: die auto-geflaggte Kampagne steht oben (höchster
   Risk-Score). **Approve / Reject / Escalate** mit Pflicht-Grund — Reject friert
   die Kampagne ein, jede Aktion landet im Audit-Log.
4. Tab **Chargebacks**: Demo-Disputes; **Evidence** hinterlegen,
   **Refund-Angebot** für niedrige Beträge auslösen.
5. **Audit-CSV**: `GET /api/trust-safety/audit.csv` exportiert alle
   Moderations-Aktionen.

## Chargeback-Webhook manuell prüfen (signiert)

```bash
SECRET=$(grep STRIPE_WEBHOOK_SECRET apps/api/.env | cut -d= -f2- | tr -d '"')
BODY='{"id":"evt_test","type":"charge.dispute.created","data":{"object":{"id":"dp_demo_1","amount":4500,"currency":"eur","reason":"fraudulent","metadata":{"campaignId":"<CAMPAIGN_ID>"}}}}'
TS=$(date +%s)
SIG=$(printf "%s.%s" "$TS" "$BODY" | openssl dgst -sha256 -hmac "$SECRET" | sed 's/^.* //')
curl -s -X POST localhost:3000/api/trust-safety/webhooks/chargeback \
  -H "content-type: application/json" \
  -H "stripe-signature: t=$TS,v1=$SIG" \
  -d "$BODY"
# → { success:true, data:{ received:true, chargebackId, campaignFrozen } }
# Ohne/mit falscher Signatur → 400 INVALID_SIGNATURE.
```

## Community-Flag manuell prüfen (öffentlich)

```bash
curl -s -X POST localhost:3000/api/campaigns/<CAMPAIGN_ID>/flags \
  -H 'content-type: application/json' \
  -d '{"reason":"SCAM","note":"Looks duplicated","visitorId":"anon-123"}'
# → 201; der Flag erscheint in /api/trust-safety/flags?status=OPEN
```
Oder im Browser: auf einer Kampagnen-Seite den **Report**-Button nutzen.

## Release-Checkliste (Folge-Arbeit, ehrlich abgegrenzt)

- [ ] **ML-Fraud-Scoring:** echtes Modell hinter `fraud-score.ts` (heute:
      deterministische Heuristik; GoFundMe/Stripe Radar als Vorbild).
- [ ] **Sanctions-Provider:** echte OFAC-/Sumsub-Anbindung hinter
      `ofac-keyword-matcher.ts` (heute: statische Länderliste; Synergie mit E11).
- [ ] **Echte Stripe-Disputes:** Dispute-API + echte Evidence-Submission +
      echter Refund-Vollzug (heute: gemockte Webhook-Events, Refund-Angebot ist
      ein Status).
- [ ] **Verteiltes Fraud-System:** Streaming/Echtzeit statt in-memory/heuristik,
      single-instance.
- [ ] **Flag-Endpoint härten:** CAPTCHA/Bot-Challenge (heute: E6-Rate-Limit).
