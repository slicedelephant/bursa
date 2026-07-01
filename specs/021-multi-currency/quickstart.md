# Quickstart — Feature 021 Multi-Currency & lokale Zahlungsmethoden (E20)

Voraussetzung: Postgres läuft (docker compose, Host-Port 5433), `DATABASE_URL` gesetzt.
**Jeder Payout in diesem Flow geht an die Schule, nie an einen Studierenden.**

## 1. Migration + Seed

```bash
cd apps/api
npx prisma migrate dev --name multi_currency   # oder migrate diff → deploy (siehe plan.md)
npm run seed                                    # idempotent: KES/M-Pesa-Demo
```

Der Seed legt an: eine Schule mit einem lokalen KES-Auszahlungskonto (Virtual-IBAN), eine
Kampagne, die in KES angezeigt werden kann, eine lokale M-Pesa-Spende mit fixiertem
FX-Kurs (USD→KES) und einen `DISBURSEMENT`-Ledger-Eintrag **an die Schule** in KES.

## 2. Unterstützte Währungen + Kurs abrufen

```bash
curl localhost:3000/fx/currencies
# → EUR, USD, KES, NGN, GHS, BDT, PHP, VND (mit decimals/symbol/name)

curl "localhost:3000/fx/quote?base=USD&quote=KES"
# → { base:"USD", quote:"KES", rate:129.5, quotedAt:"…" }
```

## 3. Lokale Methoden + Labels (Donor-Deposit-Seite)

```bash
curl "localhost:3000/fx/methods?country=KE"
# → { country:"KE", methods:["MPESA","LOCAL_BANK_TRANSFER","CARD"] }

curl "localhost:3000/fx/labels?locale=sw"
# → Swahili-Labels für den Donate-Flow (Fallback en bei fehlendem Key)
```

## 4. Lokalen Deposit initiieren (Spender)

```bash
curl -X POST localhost:3000/fx/deposits -H 'Content-Type: application/json' -d '{
  "campaignId":"<id>","amountMinor":5000,"depositCurrency":"USD",
  "method":"MPESA","country":"KE","payoutCurrency":"KES"
}'
# → { depositRef, status:"PENDING", lockedRate:129.5, payoutAmountMinor:647500 }
```

Der Kurs ist jetzt fixiert; der Betrag, den die **Schule** erhält, ist in KES berechnet.

## 5. Deposit per signiertem Webhook abschließen (Mock-Gateway)

```bash
# Signatur wie E6: t=<ts>,v1=<hmac(secret, "<ts>.<rawBody>")>
curl -X POST localhost:3000/fx/webhook \
  -H 'x-local-payment-signature: t=…,v1=…' -H 'Content-Type: application/json' \
  -d '{"depositRef":"<ref>","status":"SUCCEEDED"}'
# → localDepositStatus: PENDING → SUCCEEDED  (ohne gültige Signatur: 400 INVALID_SIGNATURE)
```

## 6. Lokales Auszahlungskonto der Schule setzen (SCHOOL_ADMIN)

```bash
curl -X POST localhost:3000/fx/school-accounts -H "Authorization: Bearer <school_admin>" \
  -H 'Content-Type: application/json' -d '{
  "schoolId":"<id>","country":"KE","currency":"KES",
  "bankName":"Equity Bank","accountNumber":"01234567890","virtualIban":"KE29…"
}'
```

## 7. Payout an die Schule in Landeswährung (ADMIN)

```bash
curl -X POST localhost:3000/fx/payouts -H "Authorization: Bearer <admin>" \
  -H 'Content-Type: application/json' -d '{
  "schoolId":"<id>","amountMinor":647500,"payoutCurrency":"KES",
  "payoutCountry":"KE","reason":"tuition disbursement"
}'
# → { route:"LOCAL_BANK", payoutRef, ledgerSequence, currency:"KES" }
```

Route ist `LOCAL_BANK` (Konto in KE+KES vorhanden), sonst `INTERNATIONAL`. Der Betrag landet
über `PaymentProvider.createPayout` bei der Schule und wird als `DISBURSEMENT` im Ledger
festgehalten.

## 8. Frontend

- `/donate/:campaignId/local` (öffentlich) — Währungs-/Methoden-Auswahl je Land, Swahili-/
  Yoruba-/…-Labels, FX-Anzeige ("Du zahlst 50 USD → Schule erhält 6.475 KES").
- `/school/currency` (SCHOOL_ADMIN) — lokales Auszahlungskonto (Landeswährung, lokale Bank /
  Virtual-IBAN) verwalten.

## Erwartete Invarianten

- Kein Endpoint zahlt an einen Studierenden — jeder Payout targetet die verifizierte Schule.
- Geld ist immer integer Minor-Units; Konvertierung ist round-half-up, gleiche Währung No-Op.
- `localDepositStatus` wechselt nur per signatur-geprüftem Webhook.
- Der Ledger wird nur append-t, nie mutiert.
