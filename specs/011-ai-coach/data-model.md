# Data Model — Feature 011 AI Fundraising Coach (E10)

Migration: `ai_coach` (additiv — zwei neue Tabellen + ein Enum + zwei Relations-Felder am
bestehenden `User`; keine Datenmigration nötig). Alle Beträge/Zähler sind ganzzahlige
Tokens (geschätzt, kein echtes Billing). IDs sind `cuid()`.

## Neu: enum AiGenerationKind

| Wert  | Bedeutung                          |
|-------|------------------------------------|
| TITLE | Titel-Generierung                  |
| STORY | Story-Draft (background/challenge/vision) |
| SHARE | Social-Share-Text (pro Kanal)      |

## Neu: AiTokenBudget

Ein Token-Budget pro Nutzer. Anker des Verbrauchs über Sessions hinweg.

| Feld         | Typ      | Notiz                                              |
|--------------|----------|----------------------------------------------------|
| id           | String   | `@id @default(cuid())`                             |
| userId       | String   | `@unique` — ein Budget pro Nutzer                  |
| limitTokens  | Int      | Kontingent (Standard via Seed/Default, z. B. 20000) |
| usedTokens   | Int      | `@default(0)` — kumulierter geschätzter Verbrauch  |
| generations  | Int      | `@default(0)` — Anzahl erfolgreicher Aufrufe       |
| createdAt    | DateTime | `@default(now())`                                  |
| updatedAt    | DateTime | `@updatedAt`                                       |

Relation: `user User @relation(fields: [userId], references: [id], onDelete: Cascade)`.
Index: `@@index([userId])`.

## Neu: AiGeneration

Eine schlanke, optionale Protokoll-Zeile pro Coach-Aufruf (Nachvollziehbarkeit/Analytics).
Berührt nie den Geld-Pfad.

| Feld         | Typ              | Notiz                                          |
|--------------|------------------|------------------------------------------------|
| id           | String           | `@id @default(cuid())`                         |
| userId       | String           | weiche fachliche Referenz auf den Nutzer       |
| kind         | AiGenerationKind | TITLE / STORY / SHARE                           |
| channel      | String?          | nur bei SHARE: `whatsapp` / `email` / `linkedin` |
| locale       | String           | `de` / `en`                                    |
| provider     | String           | `mock` / `claude` (welcher Provider lief)      |
| tokensCharged| Int              | dem Budget belastete geschätzte Tokens         |
| variantCount | Int              | Anzahl gelieferter Varianten                   |
| createdAt    | DateTime         | `@default(now())`                              |

Relation: `user User @relation(fields: [userId], references: [id], onDelete: Cascade)`.
Index: `@@index([userId, createdAt])`.

## Geändert: User (bestehend)

Nur neue Relations-Felder, keine neuen Money-/Verification-Spalten:

| Feld          | Typ             | Notiz                          |
|---------------|-----------------|--------------------------------|
| aiTokenBudget | AiTokenBudget?  | 0..1 Budget pro Nutzer         |
| aiGenerations | AiGeneration[]  | Protokoll-Historie             |

## Keine Schema-Änderung für

- **Campaign / StudentProfile (E3):** unverändert. Die Coach-Ausgabe fließt über den
  bestehenden Wizard-Payload (`title`, `storyBackground/-Challenge/-Vision`) in die
  Kampagne — es entsteht keine zweite Story-Tabelle.
- **Prompt-Bau, Tone-Post-Processor, Varianten-Ranking, Budget-Rechnung:** bewusst pur
  und persistenzfrei (`prompt-builder.ts`, `tone-postprocessor.ts`, `variant-ranking.ts`,
  `token-budget.ts`). Nur das Budget-Aggregat und die optionale Generierungs-Spur sind
  persistiert.
