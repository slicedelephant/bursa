# Plan 015 — ESG/CSR Audit-Trail & CSRD-Compliance-Reporting (E14)

**Branch:** `015-csrd-reporting` · **Stack:** NestJS 11 + Prisma 6 (API),
Angular 20 + Tailwind (Web). Wie das ganze Repo: pure Kerne zuerst (TDD), dünner
Service darüber, Per-Path-80%-Gates.

## Wiederverwendung (kein Neubau)

- **E12 `LedgerService` (read-only)** — Single Source of Truth für jede Geldbewegung.
  E14 liest (`listForSchool`, `viewForSchool`, ein neuer read-only `listAllForReporting`).
  **Kein Append/Update/Delete in E14, kein zweites Ledger.** Tags hängen additiv über
  `EsgTag.ledgerEntryId`; der Ledger-Eintrag bleibt byte-identisch.
- **E5 `corporate/pdf.util.ts` `buildSimplePdf`** + **CSV-`cell()`-Linie aus
  `corporate/esg.util.ts`** — direkt für die Report-Exporte. Keine neue Library.
- **E6 `SecurityModule` → `AuditService.record`** — Tag-Setzen, Report-Generierung,
  Grant-Erstellung/-Nutzung werden protokolliert (PII-redacted, fail-soft).
- **E7 `ObservabilityModule` → `AnalyticsService.record`** — `esg.tagged`,
  `report.generated`, `report.exported`, `auditor.grant_created`, `auditor.portal_viewed`
  fire-and-forget.
- **E8 `onboarding-token.ts`-Muster** — gespiegelt in `auditor-access-token.ts`
  (SHA-256-Hash gespeichert, timing-safe Validierung, injizierbare Zeit/Random).

## Pure Kerne (TDD, je `.spec.ts` + Per-Path-80%-Gate)

1. **`esg/esg-category.ts`** — `EsgCategory`-Validierung (`isEsgCategory`,
   `parseEsgCategory` → 400-tauglich am Boundary), Label-Map, Kategorie-Verteilung
   aus getaggten Einträgen.
2. **`esg/age-band.ts`** — `birthYear` (+ Referenzjahr) → Altersband; null-safe.
3. **`esg/diversity-aggregator.ts`** — aus Profilen: Gender-Verteilung + femaleShare,
   Land-Verteilung + countriesReached, Altersband-Verteilung, firstGenShare,
   scholarCount. Immutabel.
4. **`esg/data-quality.ts`** — je Feld `captured/total → pct`, Gesamtnote, "collect more"-
   Flag unter Zielschwelle.
5. **`esg/esg-aggregate.ts`** — baut das neutrale `EsgAggregate` (investierte EUR-Cents,
   Donation-/Payout-Counts aus dem Ledger, Diversity-Verteilungen, ESG-Tag-Verteilung)
   für einen Zeitraum.
6. **`esg/esg-standard-mapper.ts`** — `EsgAggregate` → gemappte Kennzahlen je Standard
   (GRI_2024 / CSRD_ESRS / SASB / UN_SDG), inkl. der Quell-Referenzen je Kennzahl.
7. **`esg/audit-annotation.ts`** — Fußnoten-Builder: je Kennzahl `[n] entryHash/seq/amount`,
   Annotations-Block ans Report-Ende; plus die CSV-/PDF-Zeilen-Komposition (über E5-Utils).
8. **`esg/esg-trend.ts`** — Year-over-Year-Serie (EUR/Scholar/Diversity je Jahr) + Delta.
9. **`esg/auditor-access-token.ts`** — `createAuditorToken` / `validateAuditorToken`
   (E8-Muster, TTL default 48h, Hash + revoked + expired).

## Service / Controller / Modul

- **`esg/esg.service.ts`** — orchestriert: Ledger read-only laden, Profile laden,
  Tags lesen/schreiben (`EsgTag`), `EsgReport` persistieren, `AuditorAccessGrant`
  erstellen/validieren/revoken, Exporte über E5-Utils zusammensetzen, Audit + Analytics
  emittieren. Dünn — die Rechen-/Mapping-Logik liegt in den Kernen.
- **`esg/esg-admin.controller.ts`** (ADMIN, `JwtAuthGuard`+`RolesGuard`):
  - `POST /admin/esg/tags` (FR-1/2)
  - `PUT  /admin/esg/diversity/:studentProfileId` (FR-3)
  - `GET  /admin/esg/report?standard=&year=` (FR-5)
  - `POST /admin/esg/reports` (Snapshot persistieren)
  - `GET  /admin/esg/reports` (Liste)
  - `GET  /admin/esg/reports/:id/export.csv|.pdf` (FR-6, `@Res()`)
  - `GET  /admin/esg/data-quality` (FR-8)
  - `GET  /admin/esg/trend` (FR-9)
  - `POST /admin/esg/auditor-grants`, `POST …/:id/revoke`, `GET …` (FR-7)
- **`esg/audit-portal.controller.ts`** (öffentlich, token-gegatet, read-only):
  - `GET /audit-portal/:token` → gescopter Audit-Trail-Auszug; abgelaufen/widerrufen → 401/403.
- **`esg/esg.module.ts`** — importiert `LedgerModule`, `SecurityModule`,
  `ObservabilityModule`, `PrismaModule`; in `app.module.ts` registriert.
- **DTOs** (`esg/dto/`): `tag-entry.dto.ts`, `diversity.dto.ts`, `create-grant.dto.ts`,
  `generate-report.dto.ts` — Boundary-Validierung (whitelist, type-coercion off).

## Datenfluss

1. **Tagging:** `POST /admin/esg/tags {ledgerEntryId, category, note?}` → Kategorie
   validieren (Kern) → `EsgTag` upsert (unique `ledgerEntryId`) → Audit + Analytics.
   Ledger-Eintrag bleibt unverändert.
2. **Report:** `GET /admin/esg/report?standard=GRI_2024&year=2026` → Ledger read-only +
   Profile + Tags laden → `esg-aggregate` → `esg-standard-mapper` → `audit-annotation`
   → `{ standard, period, metrics[], annotations[] }`. `POST /reports` persistiert den
   Snapshot (`EsgReport.metricsJson`).
3. **Export:** `GET /admin/esg/reports/:id/export.pdf` → Snapshot laden → Zeilen +
   Fußnoten bauen (Kern) → `buildSimplePdf` → `@Res()` stream.
4. **Auditor:** `POST /admin/esg/auditor-grants {label, ttlHours?}` → `createAuditorToken`
   → `AuditorAccessGrant` (nur Hash) → Raw-Token einmalig in Response.
   `GET /audit-portal/:token` → Grant per Hash finden → `validateAuditorToken` → bei
   gültig: `lastUsedAt` setzen + read-only Trail; sonst 401/403.

## Constitution-Checks

- **II Trust:** Geld bleibt schulgebunden; Reporting ändert keinen Geld-Pfad. Jede
  Compliance-Aktion ist über `AuditService` auditierbar.
- **IV Immutability:** Ledger append-only, E14 read-only; Tags additiv; alle Kerne pur,
  returnen neue Werte. Dateien 200-400 Zeilen.
- **V Boundary:** DTO-Validierung auf allen Writes; Kategorie/Standard/TTL am Boundary
  geprüft; `{success,data?,error?}`-Envelope auf JSON-Routen (Exporte via `@Res()`).

## Frontend (Angular)

- **Erweiterung `features/corporate/`** (ESG-Dashboard-Area) + neue ADMIN-Seite
  `features/admin/csrd/`:
  - Pure Helfer (Per-Path-Gate): `csrd-format.ts` (Standard-Labels, Kennzahl-Format),
    `data-quality-format.ts` (Score-Klassen/Hinweise), `trend-format.ts` (Delta-Pfeile/
    -Klassen), `auditor-grant-format.ts` (Ablauf/Status-Chips).
  - Komponenten (Per-Path-Gate): `report-builder.component.ts` (Standard-Picker +
    Generate + CSV/PDF-Export), `data-quality-panel.component.ts`,
    `trend-chart.component.ts`, `auditor-access-panel.component.ts`.
  - Seite `csrd.page.ts` (ADMIN, `/admin/csrd`), Route + Nav-Link.
  - `ApiService` + `models.ts` um die CSRD-Calls/Typen ergänzen.

## Prisma

- Neue Modelle: `EsgTag`, `EsgReport`, `AuditorAccessGrant`. Neue Enums: `EsgCategory`,
  `ReportStandard`, `Gender`. `StudentProfile` += `gender Gender?`, `birthYear Int?`,
  `firstGen Boolean?`. Relationen: `EsgTag.ledgerEntry → LedgerEntry` (read-only ref),
  `EsgTag.taggedBy → User?`, `EsgReport.createdBy → User?`, `AuditorAccessGrant.createdBy → User?`.
- Migration `csrd_reporting` (non-interaktiv via `migrate diff` → `migrate deploy`).
- `seed.ts`: ESG-getaggte Einträge, Scholar-Diversity-Demo, ein erzeugter `EsgReport`,
  ein Demo-`AuditorAccessGrant`. Idempotent; **E12-Ledger-Einträge nicht mutieren**.

## Verifikation

- `npm --prefix apps/api run test:cov` + `npm --prefix apps/web run test:cov` grün
- `npm --prefix apps/api run build` + `npm --prefix apps/web run build` grün
- `npm --prefix apps/api run seed` sauber
- `prisma migrate status` up to date; `migrate diff --exit-code` → "No difference detected"
- `prettier --check` clean in beiden Apps
