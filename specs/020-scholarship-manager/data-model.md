# Data Model — Feature 020 Scholarship Program Manager (E19)

Zehn neue Prisma-Modelle + vier Enums. Geld als `Int`-Cents, IDs `cuid()`,
`createdAt @default(now())`, `updatedAt @updatedAt` auf mutablen Modellen. Der Ledger wird
nicht per FK gekoppelt, sondern lose über `refType`/`refId` referenziert (E12-Linie).

## Neue Enums (4)

### Enum FieldType
```prisma
enum FieldType {
  TEXT
  LONG_TEXT
  NUMBER
  SELECT
  BOOLEAN
  EMAIL
}
```

### Enum ApplicationStatus
```prisma
enum ApplicationStatus {
  SUBMITTED
  UNDER_REVIEW
  SHORTLISTED
  AWARDED
  REJECTED
}
```

### Enum ScholarStatus
```prisma
enum ScholarStatus {
  AWARDED
  ENROLLED
  GRADUATED
  WORKING
  WITHDRAWN
}
```

### Enum AwardTrancheStatus
```prisma
enum AwardTrancheStatus {
  NONE      // no conditional tranche configured
  HELD      // configured, GPA condition not yet met
  RELEASED  // conditional tranche disbursed to the school
}
```

## Neue Modelle (10)

### ScholarshipProgram
```prisma
model ScholarshipProgram {
  id                 String   @id @default(cuid())
  corporateProfileId String
  name               String
  slug               String   @unique
  logoUrl            String?
  brandPrimary       String   @default("#4d977c")
  brandSecondary     String   @default("#6ca5c3")
  tagline            String?
  active             Boolean  @default(true)
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  corporateProfile CorporateProfile      @relation(fields: [corporateProfileId], references: [id], onDelete: Cascade)
  form             ApplicationForm?
  cycles           ProgramCycle[]
  reviewers        ProgramReviewer[]
  applications     Application[]
  awards           ScholarshipAward[]
  scholars         ScholarRelationship[]

  @@index([corporateProfileId])
}
```

### ProgramCycle
```prisma
model ProgramCycle {
  id          String    @id @default(cuid())
  programId   String
  year        Int
  budgetCents Int       @default(0)
  slots       Int       @default(0)
  awardCents  Int       @default(0)
  deadline    DateTime?
  closedAt    DateTime?
  createdAt   DateTime  @default(now())

  program ScholarshipProgram @relation(fields: [programId], references: [id], onDelete: Cascade)

  @@unique([programId, year])
  @@index([programId])
}
```

### ApplicationForm
```prisma
model ApplicationForm {
  id        String   @id @default(cuid())
  programId String   @unique
  title     String
  intro     String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  program ScholarshipProgram @relation(fields: [programId], references: [id], onDelete: Cascade)
  fields  FormField[]
}
```

### FormField
```prisma
model FormField {
  id            String    @id @default(cuid())
  formId        String
  fieldKey      String
  label         String
  type          FieldType
  required      Boolean   @default(false)
  options       String[]  @default([])
  rubricWeight  Int       @default(0)
  showIfFieldId String?
  showIfValue   String?
  order         Int       @default(0)
  createdAt     DateTime  @default(now())

  form ApplicationForm @relation(fields: [formId], references: [id], onDelete: Cascade)

  @@unique([formId, fieldKey])
  @@index([formId])
}
```

### Application
```prisma
model Application {
  id          String            @id @default(cuid())
  programId   String
  cycleId     String
  tokenHash   String            @unique
  applicantName  String
  applicantEmail String
  status      ApplicationStatus @default(SUBMITTED)
  consensusScore Int            @default(0)
  submittedAt DateTime          @default(now())
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt

  program ScholarshipProgram @relation(fields: [programId], references: [id], onDelete: Cascade)
  answers ApplicationAnswer[]
  scores  ReviewScore[]
  award   ScholarshipAward?

  @@index([programId, status])
}
```

### ApplicationAnswer
```prisma
model ApplicationAnswer {
  id            String @id @default(cuid())
  applicationId String
  fieldKey      String
  value         String

  application Application @relation(fields: [applicationId], references: [id], onDelete: Cascade)

  @@unique([applicationId, fieldKey])
}
```

### ProgramReviewer
```prisma
model ProgramReviewer {
  id           String   @id @default(cuid())
  programId    String
  reviewerName String
  reviewerEmail String
  createdAt    DateTime @default(now())

  program ScholarshipProgram @relation(fields: [programId], references: [id], onDelete: Cascade)
  scores  ReviewScore[]

  @@unique([programId, reviewerEmail])
  @@index([programId])
}
```

### ReviewScore
```prisma
model ReviewScore {
  id            String   @id @default(cuid())
  applicationId String
  reviewerId    String
  fieldKey      String
  score         Int
  comment       String?
  createdAt     DateTime @default(now())

  application Application     @relation(fields: [applicationId], references: [id], onDelete: Cascade)
  reviewer    ProgramReviewer @relation(fields: [reviewerId], references: [id], onDelete: Cascade)

  @@unique([applicationId, reviewerId, fieldKey])
  @@index([applicationId])
}
```

### ScholarshipAward
```prisma
model ScholarshipAward {
  id             String             @id @default(cuid())
  programId      String
  applicationId  String             @unique
  schoolId       String
  amountCents    Int
  currency       String             @default("EUR")
  payoutRef      String?
  ledgerRefId    String?
  // ---- conditional second tranche (still paid to the school) ----
  trancheCents   Int                @default(0)
  gpaThreshold   Float?
  trancheStatus  AwardTrancheStatus @default(NONE)
  tranchePayoutRef String?
  createdAt      DateTime           @default(now())
  updatedAt      DateTime           @updatedAt

  program     ScholarshipProgram   @relation(fields: [programId], references: [id], onDelete: Cascade)
  application Application          @relation(fields: [applicationId], references: [id], onDelete: Cascade)
  school      School              @relation(fields: [schoolId], references: [id])
  scholar     ScholarRelationship?

  @@index([programId])
  @@index([schoolId])
}
```

### ScholarRelationship
```prisma
model ScholarRelationship {
  id            String        @id @default(cuid())
  programId     String
  awardId       String        @unique
  scholarUserId String?
  fullName      String
  country       String?
  gpa           Float?
  status        ScholarStatus @default(AWARDED)
  alumniNetwork Boolean       @default(false)
  verificationCaseId String?
  enrolledAt    DateTime?
  graduatedAt   DateTime?
  employedAt    DateTime?
  withdrawnAt   DateTime?
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt

  program ScholarshipProgram @relation(fields: [programId], references: [id], onDelete: Cascade)
  award   ScholarshipAward   @relation(fields: [awardId], references: [id], onDelete: Cascade)
  scholar User?              @relation("ScholarUser", fields: [scholarUserId], references: [id], onDelete: SetNull)

  @@index([programId, status])
}
```

## Genutzte bestehende Modelle

- **CorporateProfile** (E5) — Programm-Owner. Neue Rückrelation `scholarshipPrograms`.
- **School** (E8) — Award-Ziel; `payoutVerified` + `payoutAccountRef` fürs Disbursement.
  Neue Rückrelation `scholarshipAwards`.
- **User** (E1) — optionaler Scholar (STUDENT). Neue Rückrelation `scholarRelationships`
  (Named-Relation `ScholarUser`).
- **LedgerEntry** (E12) — read-appended über `LedgerService.append`; lose referenziert via
  `refType: 'scholarship_award'` + `refId: awardId` (kein FK).
- **StudentProfile** (E14) — Diversity-Felder (`gender`, `birthYear`, `firstGen`,
  `country`) fürs Impact-Reporting via `aggregateDiversity`.

## View-Typen (rein, keine DB)

### Pure-Logic-Inputs/Outputs
- `FormFieldSpec` / `FormSchemaValidation` (`form-schema.validator.ts`)
- `VisibilityMap` (`conditional-logic.ts`)
- `AnswerValidation` (`answer.validator.ts`)
- `RubricResult { perField; consensus }` (`rubric-aggregator.ts`)
- `AwardDecision { winners; spentCents }` (`award-decision.ts`)
- `ReleaseDecision { decision; reason }` (`conditional-disbursement.ts`)
- `RenewalPlan` (`program-cycle.ts`)
- `ProgramOutcome` (`outcome-aggregator.ts`)

### Service-View-Typen (vom Service gebaut)
- `ProgramView`, `ApplicationView` (Answers + Konsens-Score), `ScholarView`,
  `ReportView` (Outcome + Diversity, an E5-PDF/CSV übergeben).

## Invarianten

- Ein `ScholarshipAward.schoolId` zeigt immer auf eine **verifizierte** Schule; ohne
  `payoutVerified` schlägt das Disbursement an der Grenze fehl. **Kein Auszahlungsziel ist
  je ein Scholar.**
- `Application.consensusScore` ist abgeleiteter State (aus `ReviewScore`), im Service beim
  Scoring aktualisiert — der reine Aggregator ist die Quelle der Wahrheit.
- `ProgramReviewer` ≤ 10 je Programm (Boundary-Check).
- `AwardTrancheStatus.RELEASED` ist nur über `decideConditionalRelease` (GPA erfüllt)
  erreichbar; keine doppelte Freigabe.
- `FormField.fieldKey` eindeutig je Formular; `showIfFieldId` zeigt auf ein Feld desselben
  Formulars (von `validateFormSchema` erzwungen).
- Ledger bleibt append-only; E19 schreibt nur `DISBURSEMENT`-Einträge, mutiert nie.
