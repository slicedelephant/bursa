# Data Model — Feature 015 CSRD-Reporting (E14)

Additive Erweiterung des bestehenden Prisma-Schemas. **Keine Mutation** am E12-`LedgerEntry`.
Alle neuen Diversity-Felder am `StudentProfile` sind nullable.

## Neue Enums

```prisma
enum EsgCategory {
  QUALITY_EDUCATION
  GENDER_EQUALITY
  GEOGRAPHIC_REACH
  POVERTY_REDUCTION
  ECONOMIC_GROWTH
}

enum ReportStandard {
  GRI_2024
  CSRD_ESRS
  SASB
  UN_SDG
}

enum Gender {
  FEMALE
  MALE
  NON_BINARY
  UNDISCLOSED
}
```

## Neue Modelle

### EsgTag

Additives Compliance-Tag auf einen unveränderlichen Ledger-Eintrag. Eindeutig pro
`ledgerEntryId` (Re-Tag ersetzt). Referenziert den Eintrag, ohne ihn zu verändern.

```prisma
model EsgTag {
  id            String      @id @default(cuid())
  ledgerEntryId String      @unique
  category      EsgCategory
  note          String?
  taggedByUserId String?
  createdAt     DateTime    @default(now())

  ledgerEntry LedgerEntry @relation(fields: [ledgerEntryId], references: [id], onDelete: Cascade)
  taggedBy    User?       @relation("EsgTagTagger", fields: [taggedByUserId], references: [id], onDelete: SetNull)

  @@index([category])
}
```

### EsgReport

Persistierter Kennzahl-Snapshot eines erzeugten Reports (für Liste + Export).

```prisma
model EsgReport {
  id              String         @id @default(cuid())
  standard        ReportStandard
  periodStart     DateTime
  periodEnd       DateTime
  /// Gemappte Kennzahlen + Annotationen als Snapshot (illustratives Mapping).
  metricsJson     Json
  createdByUserId String?
  createdAt       DateTime       @default(now())

  createdBy User? @relation("EsgReportCreator", fields: [createdByUserId], references: [id], onDelete: SetNull)

  @@index([standard, createdAt])
}
```

### AuditorAccessGrant

Zeitlich begrenzter, read-only Auditor-Zugang. Nur der SHA-256-Hash des Tokens wird
gespeichert (E8-Muster); der Raw-Token wird einmalig zurückgegeben.

```prisma
model AuditorAccessGrant {
  id              String    @id @default(cuid())
  label           String
  tokenHash       String    @unique
  /// Optionaler Scope-Hinweis (z.B. Schul-ID); im Prototyp informativ.
  scope           String?
  expiresAt       DateTime
  revokedAt       DateTime?
  lastUsedAt      DateTime?
  createdByUserId String?
  createdAt       DateTime  @default(now())

  createdBy User? @relation("AuditorGrantCreator", fields: [createdByUserId], references: [id], onDelete: SetNull)

  @@index([expiresAt])
}
```

## Erweiterung bestehender Modelle

### StudentProfile (+= optionale Diversity-Felder)

```prisma
model StudentProfile {
  // … bestehende Felder …
  // ---- E14: optionale Diversity-Felder (CSRD/Diversity-Reporting) ----
  gender    Gender?
  birthYear Int?
  firstGen  Boolean?
}
```

### LedgerEntry (+= Back-Relation, KEIN Feld-Change)

Nur eine Back-Relation für `EsgTag`. Die hashrelevanten Felder bleiben unverändert —
die Hash-Chain-Integrität ist davon unberührt (Relationen werden nicht gehasht).

```prisma
model LedgerEntry {
  // … bestehende Felder unverändert …
  esgTag EsgTag?
}
```

### User (+= Back-Relations)

```prisma
model User {
  // … bestehende Felder …
  // ---- E14: ESG/CSRD reporting (acted-on records) ----
  esgTags         EsgTag[]             @relation("EsgTagTagger")
  esgReports      EsgReport[]          @relation("EsgReportCreator")
  auditorGrants   AuditorAccessGrant[] @relation("AuditorGrantCreator")
}
```

## Invarianten

- `EsgTag.category` ∈ `EsgCategory` (am Boundary validiert).
- `EsgTag` ist **additiv**: Setzen/Ersetzen eines Tags ändert nie den referenzierten
  `LedgerEntry`. Die Hash-Chain bleibt verifizierbar identisch.
- `AuditorAccessGrant`: nur `tokenHash` gespeichert; `expiresAt > createdAt`; ein Grant
  ist gültig, solange `revokedAt == null && expiresAt > now`.
- Diversity-Felder sind nullable → kein Bruch von E8-Onboarding / E11-KYC.
- `metricsJson` ist ein Snapshot (illustratives Mapping), kein normkonformes Schema.
