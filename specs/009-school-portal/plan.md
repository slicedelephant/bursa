# Implementation Plan — Feature 009 School-Self-Serve-Portal (E8)

## Architektur-Überblick

Das bestehende `schools`-Modul wird vom dünnen CRUD (list/create/verify-payout)
zum vollständigen Self-Serve-Portal ausgebaut — hochkohäsiv in einem Feature-
Ordner, mit ALLER reinen Logik in puren Util-Dateien (je `.spec.ts` +
Per-Path-Gate) und externen Integrationen hinter kleinen, austauschbaren
Interfaces (Mock by default, wie `PaymentProvider`). Bestehende Module werden
nur minimal-invasiv berührt (PayoutsModule emittiert zusätzlich `payout.sent`).
Keine neue externe Infra; alles in der bestehenden Postgres-DB.

```
apps/api/src/schools/
  onboarding-token.ts            (pure)   create/hash/validate Einmal-Token
  onboarding-token.spec.ts
  onboarding-status.ts           (pure)   State-Machine + Readiness-Prädikate
  onboarding-status.spec.ts
  admission-import.ts            (pure)   CSV parse/validate/dedupe
  admission-import.spec.ts
  payout-status.ts               (pure)   Auszahlungsstatus-Derivation + Label
  payout-status.spec.ts
  school-dashboard.ts            (pure)   Aggregation (Totals/Geo/Studierende)
  school-dashboard.spec.ts
  school-webhook-events.ts       (pure)   Event-Envelope-Builder
  school-webhook-events.spec.ts
  e-signature.provider.interface.ts        EsignatureProvider + Symbol
  mock-e-signature.provider.ts             deterministischer Mock
  mock-e-signature.provider.spec.ts
  e-signature.provider.factory.ts          env-Auswahl (DocuSign→Mock-Fallback)
  e-signature.provider.factory.spec.ts
  registrar.provider.interface.ts          RegistrarProvider + Symbol
  mock-registrar.provider.ts               deterministischer Mock
  mock-registrar.provider.spec.ts
  school-webhook.service.ts                Stub-Emitter (persist + log)
  school-webhook.service.spec.ts
  school-onboarding.service.ts             Payout/Sign/Token/hosted Flow
  school-onboarding.service.spec.ts
  school-admissions.service.ts             Import/verify/reject (+ Registrar)
  school-admissions.service.spec.ts
  school-campaigns.service.ts              schul-skopierte Approval
  school-campaigns.service.spec.ts
  school-portal.service.ts                 resolve School + Dashboard
  school-portal.service.spec.ts
  school-portal.controller.ts              /school/* (SCHOOL_ADMIN)
  school-onboarding.controller.ts          /school/onboarding/:token (public)
  schools.controller.ts        + POST /schools/:id/onboarding-link (ADMIN)
  schools.module.ts            + alle Provider/Controller/Token-Seams
  dto/ save-payout · sign-agreement · import-admissions · reject-reason ·
       approve-campaign · complete-onboarding · generate-onboarding-link

apps/api/src/payouts/payouts.service.ts  + emit payout.sent (fire-and-forget)
apps/api/src/payouts/payouts.module.ts    + import SchoolsModule
apps/api/prisma/schema.prisma             + Role.SCHOOL_ADMIN, SchoolOnboardingStatus,
                                            School-Felder, SchoolAdmin, AdmissionRecord,
                                            SchoolOnboardingToken, SchoolWebhookEvent,
                                            Donation.donorCountry
apps/api/prisma/seed.ts                   + Schul-Admin + Onboarding + Admissions +
                                            Webhook-Log + hosted-Link

apps/web/src/app/features/school/
  onboarding-progress.ts         (pure) Status-Label/Class + Checklist-Progress
  admission-status.ts            (pure) Status-Label/Class + Import-Summary
  school-dashboard-format.ts     (pure) EUR/Tiles/Payout-Chips/Geo-Bars
  school-dashboard.component.ts        KPI/Studierende/Geografie
  student-list.component.ts            Import + verify/reject
  payout-form.component.ts             Auszahlungsdaten + Sign
  campaign-approval.component.ts       Approval-Queue
  webhooks-panel.component.ts          Event-Log
  school.page.ts                       gebrandeter Shell + Onboarding-Banner + Tabs
  onboarding.page.ts                   öffentlicher hosted Flow (Token-Route)
apps/web/src/app/core/{models.ts, api.service.ts, auth.service.ts}  + E8-Typen/Methoden/Route
apps/web/src/app/app.routes.ts        + /school + /school/onboarding/:token
```

## TDD-Reihenfolge (Tests zuerst, RED → GREEN → REFACTOR)

Pure Kerne zuerst (leicht 80%, höchster Wert), dann Provider-Mocks, dann
Services (mit Prisma-Mock), zuletzt dünne Wiring-Schicht + Frontend.

1. **onboarding-token** (pure) — Einmal-Token-Kern, von Onboarding genutzt.
2. **onboarding-status** (pure) — State-Machine + Readiness.
3. **admission-import** (pure) — CSV parse/validate/dedupe.
4. **payout-status** (pure) → **school-dashboard** (pure) — Aggregation.
5. **school-webhook-events** (pure) — Envelope-Builder.
6. **Provider-Mocks**: e-signature (+factory), registrar.
7. **Services** (mit Prisma-Mock): webhook → onboarding → admissions →
   campaigns → portal.
8. **Wiring**: Controller (portal/onboarding), schools.controller-Endpoint,
   schools.module; PayoutsService-`payout.sent`.
9. **Prisma-Migration** `school_portal` + Seed-Erweiterung.
10. **Frontend** pure Helfer (onboarding-progress/admission-status/
    school-dashboard-format) + Komponenten + Routen + api.service/auth.service.
11. **VERIFY**: api test, web test:cov, beide build, seed; Per-Path-Gates eintragen.

## Risiko-/Stabilitäts-Leitplanken

- **Geld-Pfad unangetastet:** Genehmigung nutzt dieselbe
  Verifizierungs-Transition wie der Admin-Pfad; `payout.sent` hängt nur als
  fire-and-forget-Emit hinter dem geprüften Disburse-Transaction-Block (der
  Emitter schluckt eigene Fehler → kann Disburse nie brechen).
- **Constitution II:** Aktivierung setzt `payoutVerified`, das bestehende
  Trust-Gate, das Kampagnen live gehen lässt — Geld weiterhin nur an die Schule.
- **Migration additiv** (neue Tabellen + nullable Spalten + ein zusätzlicher
  Enum-Wert) → keine Datenmigration nötig.
- **Externe Nähte gemockt:** e-Signatur/Registrar machen nie einen Netzwerk-
  Call; die Factory fällt bei nicht-implementiertem DocuSign auf Mock zurück.
- **Skopierung:** jede Portal-Route löst zuerst die Schule des Aufrufers auf;
  fremde IDs sind nicht erreichbar.

## Complexity Tracking

- **Ausbau des `schools`-Moduls statt neuem Modul:** gerechtfertigt — die neue
  Funktionalität ist dieselbe Domäne (Schulen); ein zweites Modul würde
  Kohäsion senken. Datei-Disziplin (<400 Zeilen, eine Verantwortung je Datei)
  bleibt gewahrt durch Aufteilung in fünf fokussierte Services.
- **Vier neue Tabellen + Migration:** gerechtfertigt — Self-Serve-Onboarding
  braucht persistente Admins, Zulassungslisten, Einmal-Token und ein Event-Log;
  gleiche DB, keine neue Infra.
- **`donorCountry` auf Donation:** minimal-invasive, nullable Spalte, nur für
  die Dashboard-Geografie; im selben Migration-Schritt; im Out-of-Scope ehrlich
  abgegrenzt (kein Capture im Donate-Flow).
- **Dependency-freie Eigenbauten** (Token-HMAC/Hash, CSV-Parser, State-Machine):
  bewusst statt Libraries, um Netzwerk-Installs zu vermeiden und 100% testbaren
  Code zu halten — Linie von E5/E6/E7.
