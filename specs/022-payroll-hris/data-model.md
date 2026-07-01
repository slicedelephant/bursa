# Data Model — Feature 022 Payroll-Match & HRIS-Kopplung (E21)

Additive Erweiterung des Prisma-Schemas: 3 neue Enums, 5 neue Modelle, 2 Relations-Ergänzungen an
`CorporateProfile` und `User`. Kein bestehendes Modell wird verändert außer um Rück-Relationen.

## Neue Enums (3)

### Enum HrisProvider
```
MOCK · ADP · WORKDAY · PAYCHEX · PAYLOCITY · UKG · BAMBOOHR
```
Das an eine `HrisConnection` gekoppelte HRIS. `MOCK` ist der Prototyp-Default.

### Enum HrisConnectionStatus
```
PENDING · CONNECTED · SYNCED · REVOKED · ERROR
```
Lifecycle einer HRIS-Kopplung. `PENDING` → `CONNECTED` (nach Scope-Check) → `SYNCED` (nach erstem
Employee-Sync). `REVOKED`/`ERROR` sind terminal.

### Enum PayrollCycle
```
WEEKLY · BIWEEKLY · SEMIMONTHLY · MONTHLY
```
Der Lohnzahlungs-Rhythmus eines Mitarbeiters; speist die reine `payroll-cycle.ts`-Scheduler-Entscheidung.

## Neue Modelle (5)

### HrisConnection
```
id                 String              @id @default(cuid())
corporateProfileId String
provider           HrisProvider
scopes             String[]            // read-only Scopes (validiert beim Connect)
status             HrisConnectionStatus @default(PENDING)
externalRef        String?             // Mock-Connection-Referenz (kein echtes OAuth-Token)
lastSyncedAt       DateTime?
createdAt          DateTime            @default(now())
updatedAt          DateTime            @updatedAt

corporateProfile   CorporateProfile    @relation(...)
program            PayrollGivingProgram?
employeeProfiles   EmployeePayrollProfile[]

@@index([corporateProfileId])
@@index([status])
```
Die OAuth2-Kopplung. `scopes` sind bereits read-only-validiert (sonst wäre die Verbindung
abgelehnt worden). `externalRef` ist eine Mock-Referenz — nie ein echtes Token.

### PayrollGivingProgram
```
id                 String   @id @default(cuid())
corporateProfileId String
hrisConnectionId   String   @unique
name               String
active             Boolean  @default(true)
createdAt          DateTime @default(now())

corporateProfile   CorporateProfile @relation(...)
hrisConnection     HrisConnection   @relation(...)
matchRule          PayrollMatchRule?
contributions      PayrollContribution[]

@@index([corporateProfileId])
```
Das Payroll-Giving-Programm eines Sponsors, an genau eine HRIS-Verbindung gebunden.

### PayrollMatchRule
```
id                   String   @id @default(cuid())
programId            String   @unique
matchRatio           Int      // ×100 (100 = 1:1, 200 = 2:1) — wie E13 MATCH_RATIO_SCALE
perEmployeeCapCents  Int      // Per-Mitarbeiter-Jahres-Cap in cents
createdAt            DateTime @default(now())
updatedAt            DateTime @updatedAt

program              PayrollGivingProgram @relation(...)
```
Die firmenweite Regel. `matchRatio`/`perEmployeeCapCents` speisen die E13-`computeMatch` — keine
zweite Rechnung.

### EmployeePayrollProfile
```
id                 String       @id @default(cuid())
hrisConnectionId   String
userId             String?      // wenn der Mitarbeiter zugleich Bursa-User ist (Opt-in)
employeeExternalId String       // Employee-ID aus dem HRIS (Mock)
salaryBandCents    Int          // Gehalts-Band (grob), integer cents
payrollCycle       PayrollCycle @default(MONTHLY)
preTaxEligible     Boolean      @default(false)
active             Boolean      @default(false)   // Payroll-Giving-Opt-in
matchYear          Int?         // Kalenderjahr des aktuellen Budgets
matchUsedCents     Int          @default(0)       // verbrauchtes Match-Budget im matchYear
createdAt          DateTime     @default(now())
updatedAt          DateTime     @updatedAt

hrisConnection     HrisConnection @relation(...)
user               User?          @relation(...)
contributions      PayrollContribution[]

@@unique([hrisConnectionId, employeeExternalId])
@@index([userId])
```
Ein aus dem Sync angelegter Mitarbeiter. `matchYear`/`matchUsedCents` tracken den Per-Mitarbeiter-
Cap-Verbrauch — direkt analog zu `User.matchYear`/`matchUsedCents` aus E13.

### PayrollContribution
```
id                 String   @id @default(cuid())
programId          String
employeeProfileId  String
campaignId         String
schoolId           String
contributionCents  Int      // Payroll-Deduction des Mitarbeiters (integer cents)
matchCents         Int      // gematchtes Firmen-Budget (E13 computeMatch, gedeckelt)
preTax             Boolean  @default(false)
matchDonationId    String?  @unique   // die gematchte CORPORATE-Donation an die Schule
ledgerSequence     Int?               // Sequenz des Ledger-Eintrags (Schule)
deductionRef       String?            // Mock-Payroll-Line-Item-Referenz (write-back)
year               Int
createdAt          DateTime @default(now())

program            PayrollGivingProgram   @relation(...)
employeeProfile    EmployeePayrollProfile @relation(...)
campaign           Campaign               @relation(...)
school             School                 @relation(...)
matchDonation      Donation?              @relation("PayrollMatchDonation", ...)

@@index([programId])
@@index([employeeProfileId])
@@index([campaignId])
```
Ein einzelner Payroll-Beitrag + das automatische Match. `matchDonationId` verlinkt die gematchte
`CORPORATE`-Donation, die an die SCHULE fließt; `ledgerSequence` den append-only Ledger-Eintrag.

## Erweiterte Modelle (2 Rück-Relationen)

### CorporateProfile (Ergänzung)
```
hrisConnections     HrisConnection[]
payrollPrograms     PayrollGivingProgram[]
```

### User (Ergänzung)
```
// ---- E21: payroll-giving profiles this user opted into ----
payrollProfiles     EmployeePayrollProfile[]
```

### Donation (Ergänzung — money geht weiter an die Schule, nie an den Mitarbeiter)
```
// ---- E21: payroll-match contribution this donation is the matched gift of ----
payrollContribution PayrollContribution? @relation("PayrollMatchDonation")
```

### Campaign / School (Ergänzung)
```
payrollContributions PayrollContribution[]
```

## Invarianten

- `matchRatio ≥ 0`, `perEmployeeCapCents ≥ 0`, `contributionCents ≥ 0`, `matchCents ≥ 0`.
- `matchCents ≤ perEmployeeCapCents − matchUsedCents (vorher)` — von E13 `computeMatch` garantiert.
- Jede `PayrollContribution` mit `matchCents > 0` hat eine `matchDonation` (Typ `CORPORATE`, Ziel
  = Schul-Kampagne) und einen Ledger-Eintrag auf die Schule. Nie an einen Mitarbeiter/Studierenden.
- `HrisConnection.scopes` enthält nur read-only Scopes (sonst Connect abgelehnt).
- Alle Geld-Felder sind integer minor units (cents). Kein Float auf dem Geld-Pfad.
