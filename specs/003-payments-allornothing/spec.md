# Feature 003 — Stripe All-or-Nothing Zahl-Engine + Goal-Mechanik

## WHY

Heute werden Kartenspenden sofort (gemockt) abgebucht. Das verwässert den
Trust-/Rechts-USP: in der Sammelphase darf KEIN Geld fliessen, und ein Spender
soll nur belastet werden, wenn das Studiengebühren-Ziel wirklich erreicht wird.
Das ist nicht nur Payment-Mechanik, sondern ein Vertrauensargument ("Du zahlst
nur, wenn die Person auch studieren kann"). Unter All-or-Nothing ist die
Auszahlung binär, daher entscheidet die Fortschritts-/Deadline-Mechanik direkt
über den Erfolg.

## WHAT (Scope dieses Epics — gelieferter Kern)

- PaymentProvider-Abstraktion erweitert um `savePledge` (Zahlungsmethode + SCA
  jetzt erfassen, NICHT abbuchen — SetupIntent-Konzept), `captureOnGoalReached`
  (off_session Abbuchung bei Zielerreichung) und `payoutToSchool`.
- Kartenspende wird als **PLEDGE** erfasst (Donation.status = PLEDGED), zählt
  sofort zum Ziel, wird aber nicht abgebucht.
- Bei Zielerreichung: alle offenen Pledges werden off_session **captured**
  (Donation.status = CAPTURED), Kampagne → FUNDED, Zuwendungsbeleg wird erzeugt.
- Sauberes Scheitern: Ziel verfehlt ⇒ keine Belastung (Pledges bleiben/erlöschen).
- Zwei Provider: `MockPaymentProvider` (Default, deterministisch, läuft ohne
  Keys) + `StripePaymentProvider` (echtes stripe-node-SDK) hinter Env-Flag
  `PAYMENT_PROVIDER=stripe|mock`. Ohne Key greift automatisch Mock.
- Frontend Goal-/Deadline-Mechanik: Restsumme, Meilenstein bei 80/90%,
  Countdown bis Studienstart, All-or-Nothing-Vertrauenshinweis.

## User Stories

- **US1 (Einzelspender):** Ich sage einen Kartenbeitrag zu und werde erst
  belastet, wenn das Ziel erreicht ist; verfehlt die Kampagne das Ziel, zahle
  ich nie. (P1)
- **US2 (Studierende):** Ich sehe Restsumme + Meilenstein-Push (80/90%) +
  Deadline, um die letzten Prozente zu mobilisieren. (P1)
- **US3 (Betreiber):** Ich kann Stripe per Env-Flag aktivieren, ohne Domänencode
  zu ändern; ohne Keys läuft alles deterministisch auf dem Mock. (P1)
- **US4 (Corporate):** SEPA-Sofortspende bleibt funktionsfähig und kann das Ziel
  in einer Transaktion füllen. (P2)

## Key Entities

- **Donation** — neue Status `PLEDGED`, `CAPTURED`, `EXPIRED`; neue Felder
  `pledgeRef`, `capturedAt`.
- **Campaign** — Statuslauf LIVE → FUNDED → DISBURSED bleibt; FUNDED wird durch
  Pledge-Erreichung + Capture ausgelöst.
- **PaymentProvider** — erweiterte Schnittstelle (Pledge/Capture/Payout).

## Success Criteria

- Kartenspende erzeugt PLEDGE ohne Geldfluss; Capture erst bei Goal.
- Ziel verfehlt ⇒ kein Capture, kein Charge (prüfbar im Code/Test).
- Mock läuft ohne Keys; Stripe nur bei Flag + Key, sonst Fallback Mock.
- Frontend zeigt Restsumme, 80/90%-Meilenstein, Deadline, AoN-Hinweis.
- Alle Tests grün, ≥80% Coverage auf neuem Code, beide Builds grün, Seed läuft.
