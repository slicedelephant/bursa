# Quickstart — Feature 009 School-Self-Serve-Portal (E8)

## Lokal starten

```bash
cd /Users/dennisvocke/dev/se_projects/fundingApp
npm run db:up                                   # Postgres (5433)
cd apps/api && npx prisma migrate dev           # wendet school_portal an
npm run seed                                    # inkl. School-Portal-Demodaten
npm run dev                                     # api + web
```

Der Seed gibt am Ende einen **hosted Onboarding-Demo-Link** für RSM aus
(`/school/onboarding/<token>`) und die Demo-Accounts.

## Demo-Accounts (Passwort: `bursa1234`)

- `schooladmin@bursa.test` — Schul-Admin für ESMT Berlin (→ `/school`)
- `admin@bursa.test` · `sponsor@acme.test` · `donor@bursa.test` · `amara@bursa.test`

## Tests

```bash
npm --prefix apps/api test            # Backend Jest
npm --prefix apps/web run test:cov    # Frontend Jest + Per-Path-Coverage-Gates
npm --prefix apps/api run build
npm --prefix apps/web run build
```

## Portal-Flow manuell prüfen (Schul-Admin)

1. Als `schooladmin@bursa.test` einloggen → landet auf `/school` (ESMT-Branding,
   Onboarding-Banner zeigt **Active / 100%**).
2. Tab **Students**: importiere eine Liste (Textarea), z.B.
   ```
   email,name,program,admissionRef
   sara@students.bursa.test,Sara Ahmed,MBA 2026,ADM-SARA
   ```
   → "1 imported". Verifiziere/lehne PENDING-Zeilen mit zwei Klicks ab.
3. Tab **Payout & agreement**: Auszahlungsdaten + Unterschrift (Mock-e-Signatur).
4. Tab **Campaigns**: Genehmige/lehne Kampagnen der eigenen Schule.
5. Tab **Dashboard**: Auszahlungsstatus pro Studierendem, Gesamtbudget,
   Spender-Geografie. Tab **Webhooks**: Event-Log.

## Hosted Onboarding manuell prüfen (öffentlich)

```bash
# Admin mintet einen Link für eine Schule:
TOKEN=$(curl -s -X POST localhost:3000/api/schools/<SCHOOL_ID>/onboarding-link \
  -H "authorization: Bearer <ADMIN_JWT>" -H 'content-type: application/json' \
  -d '{}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["data"]["token"])')

# State lesen (kein JWT):
curl -s localhost:3000/api/school/onboarding/$TOKEN

# Onboarding abschließen (aktiviert die Schule, verbraucht den Token):
curl -s -X POST localhost:3000/api/school/onboarding/$TOKEN/complete \
  -H 'content-type: application/json' \
  -d '{"bankAccountName":"RSM Foundation","iban":"NL91ABNA0417164300","taxId":"NL-RSM","contactName":"Bursar","contactEmail":"bursar@rsm.test","signerName":"Jane Bursar"}'
```
Oder im Browser: den vom Seed ausgegebenen Link `/school/onboarding/<token>`
öffnen, Formular ausfüllen, abschließen → "You're all set".

## Release-Checkliste (Folge-Arbeit, ehrlich abgegrenzt)

- [ ] **e-Signatur:** echten DocuSign-Adapter hinter `EsignatureProvider`
      implementieren (Factory wählt bei Flag+Key, fällt sonst auf Mock zurück).
- [ ] **Registrar:** echte SIS-/Registrar-API hinter `RegistrarProvider` (vgl.
      E11 KYC-Pipeline).
- [ ] **Webhook-Auslieferung:** Endpoint-Registry + HTTP-Delivery/Retries +
      Signatur (aktuell nur persistiert + geloggt).
- [ ] **Hosted-Endpoint härten:** Rate-Limit/Velocity auf
      `/school/onboarding/:token` (Token-Entropie ist heute der Schutz).
- [ ] **Spender-Geo:** `donorCountry` im öffentlichen Donate-Flow erfassen.
- [ ] **Multi-Tenant:** echte Subdomains/Hosts pro Schule (heute: pro-Schule-
      Ansicht unter einer Route).
