# Bursa - Payment-Design (All-or-Nothing + Corporate Full Sponsorship)

## 1. Kurzfazit / Empfehlung

Beide Fragen haben eine saubere Antwort, die deinen Trust- und Rechts-USP nicht verwäsert.

**Frage 1 (Geld erst bei Goal-Erreichung):** Nutze NICHT Auth+Capture (`capture_method=manual`). Karten-Autorisierungen halten nur ~7 Tage (Visa MIT sogar nur 5 Tage), Extended Auth maximal 30 Tage - viel zu kurz für Kampagnen über Wochen oder Monate. Stattdessen das Kickstarter-Muster: Während der Kampagne nur die Zahlungsmethode speichern und SCA/3DS sofort erfassen (`SetupIntent` bzw. Checkout im `setup`-mode, `usage=off_session`). Erst bei Erreichen des Studiengebühren-Ziels off_session abbuchen. Scheitert die Kampagne, entsteht nie ein Charge - es gibt nichts zu halten, nichts zu erstatten, kein Fremdgeld. Stripe nennt genau diesen Crowdfunding-Fall wörtlich als SetupIntent-Use-Case.

**Frage 2 (Corporate Full Tuition):** Ein dominanter "Studium komplett finanzieren"-CTA mit exaktem Restbetrag plus Gift-Tiers (Semester / Jahr / Komplett). Der 100%-Fall ist zahlungstechnisch der einfachste: Ziel sofort erreicht heißt sofortiger Capture, kein All-or-Nothing-Konstrukt, kein Auth-Hold-Risiko. Recognition-Optionen (Logo, named Scholarship) sichtbar machen, weil sie steuerlich aus Spende -> Sponsoring kippen.

**Auszahlung:** MVP ohne Stripe Connect (Träger sammelt, zahlt manuell via SEPA/Flywire/Wise aus), Skalierung auf Connect Separate Charges & Transfers für Partnerschulen im US/UK/EEA/CA/CH-Korridor.

---

## 2. Frage 1: Geld erst bei Goal-Erreichung einziehen

### Warum manual capture (Auth+Capture) NICHT geht

Die naheliegende Idee - Karte beim Pledge autorisieren und erst bei Goal-Erreichung capturen - scheitert an den Autorisierungsfenstern der Kartennetze. Eine Auth hält nur kurz:

| Kartennetz | Card-not-present CIT | Card-not-present MIT |
|---|---|---|
| Visa | 7 Tage | 5 Tage (exakt 4 Tage 18 Std., seit 14.04.2024) |
| Mastercard | 7 Tage | 7 Tage |
| American Express | 7 Tage | 7 Tage |
| Discover | 7 Tage | 7 Tage |

Default für einen uncaptured PaymentIntent (Online-Karte): 7 Tage, danach wird die Autorisierung automatisch storniert (Status `canceled`, Mittel werden freigegeben). Der pro-Charge gültige Ablauf steht im Feld `payment_method_details.card.capture_before` - darauf verlassen, nicht auf eine pauschale Annahme.

Selbst **Extended Authorization** dehnt das Fenster nur auf bis zu 30 Tage (Visa 29 Tage 18 Std., MC/Amex/Discover 30 Tage), und nur für Customer-Initiated Transactions, mit IC+/Interchange-Plus-Pricing als Voraussetzung. Für nicht-native MCCs (also alles außer Hotel/Mietwagen/Airline/Cruise) fällt zusätzlich +0,08% pro Transaktion an. Eine typische All-or-Nothing-Kampagne läuft 30-60 Tage - selbst 30 Tage reichen also strukturell nicht. Dazu blockiert ein langer Auth-Hold das Kreditlimit des Spenders.

Fazit: Auth+Capture ist für Bursa strukturell unbrauchbar.

### Das empfohlene Muster: Zahlungsmethode + SCA jetzt erfassen, Charge off_session bei Goal-Erreichung

Das ist das Kickstarter-Modell, und Stripe empfiehlt es wörtlich für Crowdfunding: *"A crowdfunding website that collects card details to be charged later, only if the campaign reaches a certain amount."*

**Ablauf:**

1. **Pledge-Phase (Spender sagt zu):** `SetupIntent` (oder Checkout `mode=setup`) mit `usage=off_session`. Das speichert die Zahlungsmethode am Customer UND authentifiziert sofort per 3DS/SCA. Es entsteht KEIN Charge. Mandat/AGB-Zustimmung (Erlaubnis, Frequenz, Betragslogik) muss der Spender hier akzeptieren.
2. **Goal erreicht:** off_session `PaymentIntent` (`off_session: true`, gespeicherte `payment_method` + `customer`). Stripe markiert das als Merchant-Initiated Transaction (MIT) und fordert beim Issuer eine SCA-Exemption an, sodass der Spender nicht erneut online sein muss.
3. **Goal verfehlt:** Es passiert gar nichts. Kein PaymentIntent, kein Geldfluss, kein Refund.

Vorteile: keine Haltefrist, beliebig lange Kampagnen, kein Kreditlimit-Block, und - zentral für Bursa - in der Sammelphase fließt nie Geld, also kein Fremdgeld.

### Edge Cases

- **SCA-Re-Auth (Restrisiko):** Die Exemption ist nicht garantiert. Der Issuer entscheidet final. Lehnt er ab, kommt `authentication_required` zurück - der Spender muss on-session zum 3DS zurück. Beim verzögerten Charge ist er aber nicht mehr da. **Pflicht-Fallback:** E-Mail-Link "Bitte bestätige deine Zahlung". Deshalb die SCA bereits beim Pledge sauber erfassen (`usage=off_session`), das maximiert die Erfolgsquote der späteren MIT.
- **MIT vs. CIT-Klassifizierung:** Erfolgt über Signale, nicht nur den `off_session`-Parameter. Wenn z.B. ein CVC präsent ist, gilt es als CIT (kürzeres Fenster, andere Haftung). Beim off_session-Charge daher keinen CVC mitgeben.
- **Fehlgeschlagene Charges:** Karte abgelaufen, gesperrt, Limit. Brauchst Retry-Logik + Spender-Benachrichtigung + eine Frist, bis wann nachgebessert werden muss, sonst zählt der Pledge nicht zum Ziel.
- **Teil-Finanzierung:** All-or-Nothing heißt: unter 100% wird niemand belastet. Du musst entscheiden, ob ein Corporate die Restlücke füllen kann (siehe Abschnitt 5) und wie knapp verfehlte Kampagnen behandelt werden.
- **Deadline:** Beim Goal-Check am Kampagnenende alle Pledges gebündelt off_session abbuchen. Rechne mit einer Fehlerquote und einer Nachfrist für die Fallback-Bestätigungen, bevor du final "finanziert" markierst.

### Alternative charge-now-refund-if-failed - und warum schlechter

Sofort abbuchen, bei Goal-Verfehlung zurückerstatten. Technisch simpel, aber zwei harte Nachteile:

1. **Gebühren verloren:** Stripe erstattet die Processing-Fee der Originaltransaktion bei einem Refund NICHT (EEA-Karten ~1,5% + 0,25 EUR). Der Refund selbst kostet zwar keine Extra-Gebühr, aber die Ursprungsgebühr ist weg. Bei All-or-Nothing mit relevanter Fail-Quote frisst das die Marge eines gemeinnützigen Trägers.
2. **Fremdgeld:** Du hältst kurzzeitig fremdes Geld auf deiner Balance - genau das, was der ZAG-Schutzwall vermeiden soll. Untergräbt den USP.

### Tabelle: Optionen-Vergleich

| Option | Kampagnendauer-tauglich | Fremdgeld in Sammelphase | Gebühren bei Fail | SCA-Risiko | Verdikt |
|---|---|---|---|---|---|
| Auth+Capture (`manual`) | Nein (max 7-30 Tage) | Nein (nur Auth) | - | niedrig | Ungeeignet |
| **SetupIntent + off_session (Kickstarter)** | **Ja (beliebig lang)** | **Nein** | **keine (kein Charge)** | mittel (Fallback nötig) | **Empfehlung** |
| charge-now-refund-if-failed | Ja | Ja (kurzzeitig) | Processing-Fee verloren | niedrig | Schlecht (Marge + USP) |

---

## 3. Auszahlung an die Schule ohne Fremdgeld zu halten

Es gibt zwei Lager bei Crowdfunding-Plattformen, und Bursa muss konsequent im richtigen bleiben:

- **Lager A (Kickstarter):** Belasten erst bei Erfolg, KEIN Halten. Stripe Connect routet direkt an den Empfänger. Plattform hält nie Spendergeld.
- **Lager B (Indiegogo, Crowdcube/Seedrs):** Plattform hält Beiträge/Investorengeld auf Treuhand-/Client-Accounts. Genau das löst ZAG-/E-Geld-Lizenz (DE, BaFin) bzw. Money-Transmitter-Pflicht (US) aus.

Bursa gehört klar in Lager A. Der direkte Präzedenzfall ist **Feenix** (Bildungs-Crowdfunding Südafrika): eingesammelte Mittel gehen direkt an die Universität für Studiengebühren, nie an den Studenten. Das ist exakt dein USP.

### ZAG-Bereichsausnahme (DE)

Die Plattform ist NICHT erlaubnispflichtig, wenn ein lizenziertes Zahlungsinstitut (Stripe) den Zahlungsfluss abwickelt, die Vertragspartei (Schule/Spender) einen eigenen Vertrag mit dem Institut hat und die Plattform KEINEN Einfluss auf den Zahlungsfluss nimmt. Stripe Connect verlagert Lizenzen, KYC und Sanktions-Checks auf Stripe.

**Wichtig:** Bei jedem Indirect-Charge-Modell transitiert das Geld kurz die Stripe-Balance des Trägers. Ob das mit dem ZAG-Schutzwall vereinbar ist, ist eine Rechtsfrage für Counsel, kein reines Tech-Detail (unbestätigt - mit Anwalt absichern). Der saubere Pfad: Geld landet nie auf dem eigenen Bankkonto des Trägers und nie beim Studierenden.

### Connect vs. Träger-sammelt-manuell

| Aspekt | Stripe Connect (Separate Charges & Transfers) | Träger sammelt + manuell auszahlen |
|---|---|---|
| Geldfluss | Spender -> Stripe -> Schule (Transfer) | Spender -> Stripe-Balance Träger -> manuelle Auszahlung |
| Schule onboarden | Ja, als Connected Account mit `transfers`-Capability (KYB/KYC vor Payout) | Nein |
| Cross-Border | NUR US/UK/EEA/CA/CH. Schule in z.B. Indien/Nigeria nicht bezahlbar | Jede Schul-Location (SEPA/Flywire/Wise) |
| Auszahlungswege außerhalb Korridor | Nicht möglich (Global Payouts nur für US/UK-Plattformen, für dt. gGmbH nicht nutzbar) | Flywire (240+ Länder, 140+ Währungen, Tuition-Spezialist), Wise (Batch bis 1.000), SEPA |
| Kosten | 2 USD/Monat pro aktivem Account + 0,25% + 25 ct (bei plattformseitigem Pricing) | Stripe-Standardgebühr + Transferkosten Flywire/Wise |
| Fremdgeld | Geld landet nie auf Träger-Bankkonto, auditierbar | Geld liegt kurz in Träger-Balance/-Konto |
| Aufwand | Per-Schule-KYB, Onboarding-Flow | Kein Per-Schule-Onboarding |

**Der Killer ist Cross-Border:** Studierende aus einkommensschwachen Ländern haben ihre Schule oft außerhalb des Stripe-Korridors. Connect kann diese Schulen schlicht nicht bezahlen. Deshalb:

- **MVP:** Kein Connect. Träger sammelt via SetupIntent-All-or-Nothing, zahlt nach Goal-Erreichung manuell/halbautomatisch aus (SEPA für EEA-Schulen ~0 Kosten, Flywire/Wise für den Rest). Fremdgeld-Mitigation: sofortige, nicht-diskretionäre Weiterleitung, treuhandartig getrennte Verbuchung, mit Counsel absichern.
- **Skalierung:** Wiederkehrende Partnerschulen im US/UK/EEA/CA/CH-Korridor als Express-Connected-Accounts onboarden. `createPayout` -> Stripe Transfer (Separate Charges & Transfers). Geld nie auf gGmbH-Bankkonto, voll auditierbar. Korridor-externe Schulen bleiben auf Flywire/Wise.

Separate Charges & Transfers passt besser als Destination Charges, weil du erst chargest (Ziel erreicht), dann die Schule bestätigst/onboardest und dann transferierst - und es Cross-Border ohne `on_behalf_of` unterstützt (`on_behalf_of` ist mit Cross-Border inkompatibel). **Vermeiden:** Stripe `delayed payout` (hält Gelder bis 90 Tage) - nähert sich Fremdgeld-Halten.

---

## 4. Wie das in unsere PaymentProvider-Abstraktion passt

Die bestehende Abstraktion (`createCardCharge` / `createSepaPledge` / `createPayout`) wird leicht erweitert, sodass der Provider tauschbar bleibt (Mock -> Stripe -> später Connect) und die Domänenlogik nichts von Stripe-Internas weiß.

### Empfohlene Methoden

| Methode | Zweck | Stripe-Mapping |
|---|---|---|
| `authorizeOrSavePledge(pledge)` | Zahlungsmethode speichern + SCA jetzt erfassen, kein Charge | SetupIntent (`usage=off_session`) bzw. Checkout `mode=setup`; SEPA-Mandat |
| `captureOnGoalReached(pledgeId)` | Bei Goal-Erreichung off_session abbuchen | off_session PaymentIntent (`off_session: true`, gespeicherte `payment_method` + `customer`) |
| `chargeImmediately(sponsorship)` | Corporate Full Tuition / 100%-Fall sofort einziehen | PaymentIntent automatic capture |
| `payoutToSchool(campaignId, schoolRef)` | Auszahlung an die Schule | MVP: SEPA/Flywire/Wise-Adapter. Skalierung: Stripe Transfer (Separate Charges & Transfers) |
| `requestReauth(pledgeId)` | Fallback bei `authentication_required` | on-session Link an Spender |

### Campaign-/Pledge-States

```
Pledge:    PLEDGED ----captureOnGoalReached()----> CAPTURED
              |                                        |
              | (Goal verfehlt / Deadline)             | (Charge failed)
              v                                        v
           EXPIRED                              CHARGE_FAILED --requestReauth()--> PLEDGED
                                                                                  (oder EXPIRED)

Campaign:  COLLECTING --> GOAL_REACHED --> CHARGING --> FUNDED --> PAID_OUT
                |
                +--> FAILED (unter 100% bei Deadline, keine Charges)
```

Wichtige Invariante für den Rechts-USP: Zwischen `PLEDGED` und `CAPTURED` existiert KEIN Geldfluss. Erst `FUNDED` -> `PAID_OUT` bewegt echtes Geld, und zwar direkt Richtung Schule. So bleibt "Bursa hält kein Fremdgeld" auch im Code eine prüfbare Eigenschaft.

SEPA braucht zwei sichtbare Zustände (siehe Abschnitt 5): `PLEDGED` (Mandat erfasst) vs. `CAPTURED`/settled (eingegangen, ~5 Bankarbeitstage, rückbuchbar).

---

## 5. Frage 2: Corporate Full Tuition - UX

### Konkrete Interface-Vorschläge

**1. Dual-CTA auf dem Studierenden-Profil.** Über dem Fortschritt zwei getrennte Pfade: links Privatspender ("Beitrag wählen", Presets EUR 25 / 100 / 500, Karte), rechts eine visuell dominante Corporate-Karte "Studium komplett finanzieren". Trennt Kleinbetrag sauber von Vollfinanzierung.

**2. "Restlücke schließen"-Button mit exaktem Betrag.** Dynamischer CTA "Lücke schließen - EUR 23.600" (Muster: Kiva-Restbetrag, DonorsChoose verwendet Mittel erst bei 100%). Ein Klick = Goal auf 100%. Immer mit konkreter Zahl beschriften, nicht "Voll finanzieren".

**3. Gift-Level-Karten (Tiers).** Drei Karten: "Ein Semester (EUR X)", "Ein Studienjahr (EUR Y)", "Komplettes Studium (EUR Z)" - letztere mit Badge "Höchste Wirkung".

**4. Corporate-Add-ons im Bestätigungs-Flow** (nach Auswahl Vollfinanzierung):
- **Named Scholarship:** Toggle "Stipendium benennen" -> "Das [Firma]-Stipendium für [Name]".
- **Logo/Recognition:** Opt-in Logo-Platzierung "Mit Unterstützung von [Logo]". ACHTUNG: löst steuerlich Sponsoring aus.
- **Matching:** Alternative "Jede Spende verdoppeln" für Corporates, die hebeln statt voll finanzieren wollen.
- **Impact-Report:** Toggle "Quartals-Fortschrittsbericht erhalten".
- **Steuerbeleg-Verzweigung sichtbar machen:** reine Spende ohne Gegenleistung -> Zuwendungsbestätigung (gGmbH darf ausstellen). Mit Logo/Recognition -> Sponsoring -> Rechnung mit ausgewiesener USt. Trade-off offen kommunizieren: Sponsoring ist für Unternehmen unbegrenzt als Betriebsausgabe absetzbar, Spende nur in Höchstgrenzen.

**5. Trust-Reinforcement im Corporate-Flow wiederholen:** "100% gehen direkt an die [Business School]. Bursa hält kein Geld." Genau dort, wo große Beträge fließen, stützt das den Schutzwall.

### Payment-Implikation: 100%-Zusage = sofortiger Capture

Der 100%-Fall ist technisch der einfachste. Da der Corporate das Ziel in einer Transaktion füllt und das Geld direkt zur Schule geht, gibt es kein Sammelfenster. Stripe-Default ist **automatic capture**: Geld wird sofort eingezogen, sobald der Corporate bestätigt. Du brauchst KEINEN Auth-Hold (`capture_method=manual`) und kein All-or-Nothing-Konstrukt - das wäre nur nötig, wenn man auf das Erreichen eines Ziels warten müsste. Damit umgehst du auch das 7-Tage-Auth-Ablaufrisiko komplett (`chargeImmediately()` aus Abschnitt 4).

**Corporate-SEPA** (`createSepaPledge`): SEPA unterstützt keine getrennte Auth/Capture und settlet asynchron (~5 Bankarbeitstage, rückbuchbar). Deshalb im UI zwei Zustände:
- **Karte:** sofort "voll finanziert" anzeigen.
- **SEPA:** zuerst "zugesagt" (Pledge erfasst), Profil erst nach Settlement als "voll finanziert" markieren ("eingegangen").

### ASCII-Mockup der Spenden-/Sponsor-Box

```
+--------------------------------------------------------------+
|  Amara N. - MBA, INSEAD                                       |
|  Verifiziert + zugelassen                                    |
|                                                              |
|  EUR 18.400 von EUR 42.000 gedeckt                           |
|  [###############------------------------]  44%              |
|  Geld geht zu 100% direkt an die Business School.            |
|--------------------------------------------------------------|
|                                                              |
|  PRIVAT SPENDEN            |   STUDIUM KOMPLETT FINANZIEREN   |
|                           |   ============================   |
|  [ EUR 25 ]               |   +--------------------------+   |
|  [ EUR 100 ]              |   |  Lücke schließen         |   |
|  [ EUR 500 ]              |   |       EUR 23.600         |   |
|  [ Eigener Betrag ___ ]   |   |  [ Jetzt sponsern ]      |   |
|                           |   +--------------------------+   |
|  Zahlung: Karte           |                                  |
|  Abbuchung erst, wenn     |   oder Gift-Tier wählen:         |
|  das Ziel erreicht ist.   |   ( ) Ein Semester    EUR 7.000  |
|                           |   ( ) Ein Studienjahr EUR 14.000 |
|  [ Beitrag zusagen ]      |   (o) Komplett        EUR 23.600 |
|                           |       [Höchste Wirkung]          |
|                           |   Zahlung: Karte / SEPA          |
+--------------------------------------------------------------+
|  Nach Auswahl "Komplett":                                    |
|   [x] Stipendium benennen: "Das [Firma]-Stipendium"          |
|   [ ] Logo-Recognition  (-> Sponsoring, Rechnung mit USt)    |
|   [ ] Quartals-Impact-Report erhalten                        |
|   Steuerbeleg: ( ) Zuwendungsbestätigung  ( ) Sponsoring-Rg  |
+--------------------------------------------------------------+
```

---

## 6. Empfohlene nächste Schritte (priorisiert)

1. **PaymentProvider-Abstraktion erweitern** um `authorizeOrSavePledge`, `captureOnGoalReached`, `chargeImmediately`, `payoutToSchool`, `requestReauth` und die States `PLEDGED/CAPTURED/EXPIRED/CHARGE_FAILED` plus Campaign-States. Mock-Provider zuerst, damit die Domänenlogik steht.
2. **Stripe-Adapter für den Pledge-Flow** bauen: SetupIntent (`usage=off_session`) + Mandatstext im Pledge-Schritt, off_session PaymentIntent bei Goal-Erreichung. Fallback-Link für `authentication_required` von Anfang an mitbauen.
3. **Corporate-Flow als automatic-capture-Pfad** umsetzen (sofortiger Charge, kein All-or-Nothing). UI mit Dual-CTA, "Lücke schließen"-Betrag und Recognition/Steuerbeleg-Verzweigung.
4. **Auszahlung MVP** über SEPA/Flywire/Wise-Adapter hinter `payoutToSchool`. Erst manuell/halbautomatisch, Geld nie auf gGmbH-Bankkonto.
5. **Rechtsberatung einholen** (Counsel) zur ZAG-Bereichsausnahme und zur Frage, ob die kurzfristige Balance-Transition beim Träger-sammelt-Modell den Schutzwall hält. Das entscheidet, ob das MVP wirklich sauber ist (unbestätigt bis Counsel).
6. **SEPA-Settlement-States im UI** ("zugesagt" vs. "eingegangen") und Retry-/Nachfrist-Logik für fehlgeschlagene off_session-Charges.
7. **Später:** Stripe Connect (Express + Separate Charges & Transfers) für wiederkehrende Partnerschulen im US/UK/EEA/CA/CH-Korridor.

---

## 7. Quellen

- [Stripe - Place a hold on a payment method (Auth-Fenster, capture_before)](https://docs.stripe.com/payments/place-a-hold-on-a-payment-method)
- [Stripe - The Setup Intents API (Crowdfunding-Use-Case, usage=off_session)](https://docs.stripe.com/payments/setup-intents)
- [Stripe - Save and reuse payment methods](https://docs.stripe.com/payments/save-and-reuse)
- [Stripe - Extended Authorization (bis 30 Tage, IC+, +0,08%)](https://docs.stripe.com/payments/extended-authorization)
- [Stripe - SCA enforcement (MIT-Markierung, Mandat)](https://docs.stripe.com/strong-customer-authentication/sca-enforcement)
- [Stripe - Manual confirmation for off-session payments requiring SCA](https://support.stripe.com/questions/manual-confirmation-for-off-session-payments-requiring-strong-customer-authentication-(sca))
- [Stripe - Understanding fees for refunded payments](https://support.stripe.com/questions/understanding-fees-for-refunded-payments)
- [Stripe - PaymentIntents (automatic capture default)](https://docs.stripe.com/payments/payment-intents)
- [Stripe Connect - Charge types](https://docs.stripe.com/connect/charges)
- [Stripe Connect - Destination charges](https://docs.stripe.com/connect/destination-charges)
- [Stripe Connect - Separate charges and transfers](https://docs.stripe.com/connect/separate-charges-and-transfers)
- [Stripe Connect - Cross-border payouts (Korridor US/UK/EEA/CA/CH)](https://docs.stripe.com/connect/cross-border-payouts)
- [Stripe Connect - Account capabilities (transfers, KYB)](https://docs.stripe.com/connect/account-capabilities)
- [Stripe Connect - Identity verification / Onboarding](https://docs.stripe.com/connect/identity-verification)
- [Stripe Connect - Pricing](https://stripe.com/connect/pricing)
- [Kickstarter - Making payments easier (all-or-nothing, Charge bei Erfolg)](https://www.kickstarter.com/blog/making-payments-easier-for-creators-and-backers)
- [Stripe Customers - Kickstarter (Stripe Connect routing)](https://stripe.com/customers/kickstarter)
- [Indiegogo - Funding types (Plattform hält Gelder)](https://support.indiegogo.com/hc/en-us/articles/205138007-Choose-Your-Funding-Type-Can-I-Keep-My-Money)
- [Crowdcube - Was passiert beim Investieren (Escrow/Client-Account)](https://help.crowdcube.com/hc/en-us/articles/206709590-What-happens-when-I-become-a-Crowdcube-investor)
- [Feenix - Bildungs-Crowdfunding, direkt an die Uni (Standard Bank)](https://www.standardbank.co.za/southafrica/personal/learn/help-pay-your-student-debt-through-feenix-crowdfunding)
- [Stripe - Was ist ein Money Transmitter](https://stripe.com/resources/more/what-is-a-money-transmitter)
- [BaFin - Merkblatt ZAG (Bereichsausnahme)](https://www.bafin.de/SharedDocs/Veroeffentlichungen/DE/Merkblatt/mb_111222_zag.html)
- [Flywire - Education / Tuition (240+ Länder)](https://www.flywire.com/industries/education)
- [Wise vs. Flywire (Batch-Transfers)](https://wise.com/us/blog/flywire-vs-wise)
- [DonorsChoose - Mittelverwendung erst bei 100%](https://help.donorschoose.org/hc/en-us/articles/202000337-What-happens-to-donations-when-a-project-isn-t-funded)
- [Givebutter - Corporate Sponsorship](https://givebutter.com/blog/corporate-sponsorship)
- [Spende vs. Sponsoring (bpb - Absetzbarkeit)](https://www.bpb.de/die-bpb/foerderung/akquisos/265595/spende-vs-sponsoring-ein-entscheidender-unterschied/)
- [Stiftungsland - Spende vs. Sponsoring (Beleg/USt)](https://www.stiftungsland.de/spenden/unternehmen/ihre-fragen-zu-spende-und-sponsoring/)
