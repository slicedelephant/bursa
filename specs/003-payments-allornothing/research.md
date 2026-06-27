# Research / Clarify — 003 Payments All-or-Nothing

Offene Fragen wurden autonom entschieden (kein User-Input), informiert durch
`docs/payments-design.md`.

## Entscheidungen

1. **Auth+Capture vs. SetupIntent?** → SetupIntent-Muster. Karten-Autorisierungen
   halten nur ~7 Tage (Visa MIT ~5), Kampagnen laufen Wochen. Daher: Zahlungs-
   methode + SCA jetzt erfassen (`savePledge`), Charge erst bei Zielerreichung
   (`captureOnGoalReached`, off_session). Kein Fremdgeld in der Sammelphase.
   (Quelle: payments-design.md §2, Stripe SetupIntent Crowdfunding-Use-Case.)

2. **Zählt ein Pledge sofort zum Ziel?** → Ja. `raisedCents` wird beim Pledge
   erhöht, damit Fortschrittsbalken/Goal-Gradient stimmen. Geld fliesst trotzdem
   erst beim Capture. Invariante: zwischen PLEDGED und CAPTURED bewegt sich kein
   Geld (Constitution II).

3. **Wann wird captured?** → Sobald die Summe der Pledges das Ziel erreicht
   (`isGoalReached`). Dann werden ALLE offenen Pledges der Kampagne gebündelt
   off_session abgebucht (CAPTURED), Kampagne → FUNDED, SYSTEM-Update + Beleg.

4. **Capture-Fehler (SCA-Re-Auth/abgelaufene Karte)?** → Fehlgeschlagene Captures
   bleiben PLEDGED und werden in der `CaptureSummary.failedIds` gemeldet; der
   Fallback (Re-Auth-Link) ist als spätere Ausbaustufe dokumentiert. Der Kern
   blockiert nicht.

5. **Stripe-Auswahl ohne Keys?** → Factory wählt Stripe NUR bei
   `PAYMENT_PROVIDER=stripe` UND vorhandenem `STRIPE_SECRET_KEY`. Sonst Mock.
   Schlägt die Stripe-Konstruktion fehl (SDK fehlt), fällt die Factory auf Mock
   zurück → App stürzt nie ab. Das `stripe`-SDK wird lazy via `require` geladen,
   damit Build/Tests ohne die optionale Dependency grün bleiben.

6. **Auszahlung (payout)?** → `payoutToSchool` gespiegelt auf bestehendes
   `createPayout` (Mock: SENT). Connect/SEPA-Cross-Border bleibt späterer Scope
   (payments-design.md §3).

7. **Corporate SEPA?** → Bleibt Sofort-Erfassung (SUCCEEDED) wie bisher; die
   100%-Vollfinanzierung ist zahlungstechnisch der einfachste Fall (automatic
   capture), kein All-or-Nothing-Konstrukt nötig.

## Bewusste Auslassungen (ehrliche Lücken, kein Blocker)

- Wallet-Checkout (Apple/Google Pay) — UI/Provider-Detail, später.
- Echte off_session-Retry-/Nachfrist-Logik + Re-Auth-Mail — dokumentiert, nicht
  implementiert.
- StripePaymentProvider ist gegen das echte SDK gebaut, aber als
  Integrations-nur eingestuft (kein Per-Path-Coverage-Gate, da echte API/Keys
  nötig sind).
