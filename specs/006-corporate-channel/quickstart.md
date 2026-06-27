# Quickstart — 006 Corporate Channel

## Voraussetzungen
- DB läuft: `npm run db:up` (im Repo-Root).
- Migration angewandt: `cd apps/api && npx prisma migrate dev` (Migration
  `corporate_channel`). Seed: `npm --prefix apps/api run seed`.

## Demo-Konten (Passwort `bursa1234`)
- `sponsor@acme.test` (SPONSOR) — Corporate-Channel + ESG-Dashboard
- `donor@bursa.test` (DONOR), `admin@bursa.test` (ADMIN)

## Full-Tuition-Flow (Happy Path)
1. Als `sponsor@acme.test` einloggen, eine **LIVE** Kampagne öffnen.
2. In der Corporate-Box "Studium komplett finanzieren" (Full-Tuition, exakter
   Restbetrag) wählen, Methode **Karte**, optional Stipendium benennen + Logo
   freigeben + USt-ID/PO eintragen → "Jetzt sponsern".
3. Erwartung: Kampagne sofort **FUNDED**, Donation `SUCCEEDED`, Rechnung
   `PAID`; bei Logo-Freigabe Beleg = **Sponsoring (19% USt)**, sonst
   **Zuwendungsbestätigung**. Offene Spender-Pledges werden mitgecaptured.
4. Kampagnenseite zeigt den **Recognition-Banner** (Stipendien-Name + Firma).

## SEPA-Flow
1. Methode **SEPA** wählen → Donation `SUCCEEDED`, Rechnung **PENDING**
   ("zugesagt").
2. Im Sponsor-Dashboard die Rechnung **settlen** → `PAID` ("eingegangen").

## ESG-Dashboard + Export
1. Als Sponsor das Dashboard (`/sponsor`) öffnen → Metrik-Kacheln
   (Studierende, Länder, Schulen, committet Summe, Voll-/Named-Stipendien).
2. **CSV** und **PDF** exportieren (echte Downloads).

## Tests
- Backend: `npm --prefix apps/api test` (bzw. `run test:cov`).
- Frontend: `npm --prefix apps/web run test:cov`.
- Builds: `npm --prefix apps/api run build` && `npm --prefix apps/web run build`.
