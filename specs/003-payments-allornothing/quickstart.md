# Quickstart — 003 Payments All-or-Nothing

## Voraussetzungen

```bash
cd /Users/dennisvocke/dev/se_projects/fundingApp
npm run db:up                      # Postgres (Docker)
npm --prefix apps/api run seed     # synthetische Demo-Daten
```

## Payment-Provider wählen

```bash
# Default (ohne Keys, deterministisch):
PAYMENT_PROVIDER=mock

# Echtes Stripe (nur wenn Key gesetzt; sonst Fallback Mock):
PAYMENT_PROVIDER=stripe
STRIPE_SECRET_KEY=sk_test_xxx
# benötigt zusätzlich: npm --prefix apps/api i stripe
```

## All-or-Nothing manuell durchspielen (Mock)

1. Web starten (`npm --prefix apps/web start`), Kampagne öffnen.
2. Kartenbeitrag UNTER dem Ziel zusagen → Donation `PLEDGED`, keine Abbuchung,
   Restsumme/Meilenstein aktualisiert.
3. Weitere Beiträge zusagen, bis das Ziel erreicht ist → alle Pledges werden
   `CAPTURED`, Kampagne `FUNDED`, Zuwendungsbeleg erscheint.
4. Fehlerpfad: Betrag mit Endung `.13` (z.B. 50,13 €) → `PAYMENT_FAILED`.

## Tests / Verify

```bash
npm --prefix apps/api test
npm --prefix apps/web run test:cov
npm --prefix apps/api run build
npm --prefix apps/web run build
```

Alle vier müssen grün sein. Neue Pfade sind als 80%-Gate konfiguriert
(`apps/api/package.json` jest.coverageThreshold, `apps/web/jest.config.js`).
