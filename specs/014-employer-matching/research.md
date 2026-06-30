# Research 014 — Employer Matching Auto-Detection (E13)

## Ausgangslage

E2 liefert den All-or-Nothing-Checkout (`DonationsService.donateCard`, Pledge →
Capture, Geld nur an die Schule) und E4 den Donor-Account (`DonorsService.history`,
Spendenhistorie + Lifetime-Impact). E13 setzt **obendrauf**, ohne den geprüften
Geld-Pfad anzufassen: ein Match-Angebot im Checkout, ein Claim, der committete
Match-Mittel als ganz normale CORPORATE-Spende auf dieselbe Kampagne bucht, und eine
Match-Balance + Claim-History im Account.

E5 (Corporate) hat bereits das Konzept "Arbeitgeber gibt Geld an die Schule" als
`CorporateSponsorship`/SEPA-Spende. E13 dupliziert das **nicht**: der committete
Match ist eine einfache `CORPORATE`-Donation (kein `CorporateSponsorship`-Record,
kein Invoice), weil es ein Programm-Match ist, kein verhandeltes B2B-Sponsoring.

## Inspirationsquellen (Konkurrenz)

- **Double the Donation** — Email-Domain-Check gegen eine 20.000+-Firmen-DB,
  Match-Ratio + Annual-Cap je Arbeitgeber, Integration-Level (Auto-Submission-Beta
  vs. pre-filled Antragslink vs. manuell). Vorbild für `EmployerMatchProgram` +
  `integrationLevel`.
- **Daffy** — Employer Matching mit Public/Private-Stock-Limits; Vorbild für die
  Jahres-Balance-Mechanik (verbleibendes Limit je Spender/Jahr).
- **Benevity / YourCause** — Match-Claim-Lifecycle (detected → claimed → submitted →
  approved); Vorbild für die `claim-status.ts`-State-Machine.

## Entscheidung 1 — Provider-Abstraktion exakt wie PaymentProvider

`EmployerMatchProvider` ist ein Symbol-Token-Interface (`lookupByDomain`), Default
ist der deterministische `MockEmployerMatchProvider` (statische ~30-Firmen-DB, kein
Netz, in **allen** Tests genutzt). Das echte `DoubleTheDonationProvider`-Skeleton
ruft die DTD-API über `fetch` (kein SDK-Dep), ist **nur** aktiv bei
`EMPLOYER_MATCH_PROVIDER=dtd` **und** vorhandenem `DTD_API_KEY`, fällt sonst auf Mock
zurück und wird in Tests nie ausgeführt. Pure Factory `createEmployerMatchProvider`
mit `shouldUseDtd`, gegated — 1:1 wie `createPaymentProvider` / `createAmlProvider`.

## Entscheidung 2 — Reine Cores, Provider dünn

Der Provider liefert nur das rohe Programm zu einer Domain. Alle Geschäfts-Logik
liegt in reinen, gegateten Cores:

- `email-domain.ts` — extrahiert + normalisiert die Domain aus einer E-Mail
  (lowercase, trim, `mailto:` weg, kein `@` → null). Stripped Subdomains optional
  nicht — wir matchen die volle registrierbare Domain wie sie der Seed hält.
- `employer-match-lookup.ts` — entscheidet Eligibility (Programm aktiv,
  `donationCents >= minDonationCents`) und liefert das Programm + Begründung.
- `match-amount.ts` — `matchCents = floor(donationCents × ratio/100)`, dann hart
  gedeckelt durch `remainingAnnualCents = max(0, annualCap − used)`; nie negativ,
  nie über Cap; gibt `capped`-Flag zurück.
- `claim-status.ts` — Status-State-Machine (erlaubte Übergänge) + Display-Helper.
- `match-labels.ts` — EN/DE/FR/ES-Texte für Offer/Claim/Balance (reiner Resolver,
  Fallback auf EN bei unbekannter Locale).

So bleibt jede Entscheidung deterministisch unit-testbar (Per-Path-80%), und der
Provider/Service bleibt dünn.

## Entscheidung 3 — Match als CORPORATE-Spende, kein Geld-Pfad-Umbau

Ein geclaimter Match wird als zusätzliche committete Mittel auf dieselbe Kampagne
modelliert: eine `Donation` mit `type=CORPORATE`, `method=SEPA`, `status=SUCCEEDED`,
`donorName=employerName`, `providerRef=mock_match_<claim>`. `Campaign.raisedCents`
wächst um den (Over-Funding-gekappten) Match-Betrag — dieselbe `splitContribution`-
Kappung wie E2. Es wird **kein** echter Charge ausgelöst (der Match kommt
konzeptionell vom Arbeitgeber, nicht vom Spender) und **kein** Geld an den
Studierenden bewegt. Damit bleibt der E2-Capture-Pfad unangetastet.

## Entscheidung 4 — Claim-Artefakt: Link ODER PDF nach integrationLevel

- `AUTO_SUBMIT` / `PORTAL` → ein pre-filled Antragslink aus `applyUrlTemplate`
  (Platzhalter `{amount}`, `{employer}` ersetzt; reine String-Substitution).
- `MANUAL` → eine Claim-Bestätigungs-PDF über die **wiederverwendete** E5-Util
  `buildSimplePdf` (keine neue Infra/Library).

So deckt der Prototyp beide Integration-Levels ab, ohne eine echte Einreichung.

## Entscheidung 5 — Jahres-Balance je Spender/Jahr ohne Cron

Die genutzte Match-Balance wird auf dem `User` als (`matchYear`, `matchUsedCents`)
gehalten. Beim Claim: wenn `matchYear != aktuellesJahr`, wird vor der Verbuchung auf
das neue Jahr zurückgesetzt (`used = 0`). So entsteht ein implizites Jahres-Reset
ohne Hintergrund-Job. Das verbleibende Limit = `annualCap − usedThisYear`.

## Entscheidung 6 — Multi-Language im Daten-Layer, App-Shell bleibt Englisch

Die Match-Feature-Labels tragen EN/DE/FR/ES-Daten (`match-labels.ts`); die App-Shell
und alle übrigen UI-Strings bleiben Englisch (Constitution: App-Sprache Englisch).
Die Locale kommt als optionaler Request-Parameter (`locale`), Default EN.

## Entscheidung 7 — Schwellen/Konstanten als benannte Werte

`MATCH_RATIO_SCALE = 100`, `DEFAULT_LOCALE = 'en'`, die unterstützten Locales und die
Mock-Firmen-DB sind benannte Konstanten — keine Magic Numbers im Code.

## Risiken / offene Punkte

- Doppel-Claim: über `MatchClaim.donationId @unique` + Service-Guard idempotent.
- Over-Funding: der committete Match wird wie E2 gekappt (`splitContribution`), damit
  eine fast volle Kampagne nicht über das Ziel hinaus-committet wird.
- Locale-Spoofing irrelevant (nur Text-Auswahl, keine Autorisierung).
