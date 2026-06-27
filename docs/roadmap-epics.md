# Bursa - Nächste Epics (Stakeholder-Abstimmung)

## Kurzfazit (was zeige ich wem)

Der Prototyp kann bereits den ganzen Fluss zeigen, aber drei Dinge fehlen, um aus der Demo ein Produkt zu machen: Der Trust-USP passiert im Backend und ist für den Spender unsichtbar, die Payments sind gemockt, und es gibt noch keinen Mechanismus, der aus einem Erstspender einen Wiederkehrer und aus einer Firma einen Großsponsor macht. Studierenden zeigst Du die Kampagnen-Erfolgs-Engine (Story/Video, Sharing, Goal-Mechanik), weil ihr Geld unter All-or-Nothing binär von der Zielerreichung abhängt. Einzelspendern zeigst Du den sichtbaren Trust-Layer (Verification-Badge plus Direktauszahlungs-Beleg) und die All-or-Nothing-Mechanik als Vertrauens-Feature, nicht als Payment-Detail. Corporate-Sponsoren zeigst Du den B2B-Channel mit ESG-Dashboard, Named Scholarship und Full-Tuition-CTA, weil das die einzigen großen Tickets sind, die Procurement und Legal überhaupt durchwinken. Reihenfolge: erst Vertrauen sichtbar machen, dann echtes Geld fließen lassen, dann Nachschub an Kampagnen und Wiederkehr sichern, zuletzt den Corporate-Channel öffnen.

## Die Epics

### E1 - Trust-Layer sichtbar machen (Verification-Badges + Direktfluss-Beweis)

**Problem / Warum jetzt:** Der gesamte USP von Bursa ist Vertrauen, aber die Verifizierung (Admin -> LIVE), die Direktauszahlung an die Schule und der Zuwendungsbeleg laufen heute im Backend und werden dem Spender VOR der Spende nie gezeigt. Rund ein Drittel der Spender misstraut Wohltätigkeit grundsätzlich, Transparenz über Mittelverwendung ist mit 53% der stärkste einzelne Vertrauenstreiber. Der USP verpufft, solange er nur Kleingedrucktes ist. Dieses Epic recycelt bereits gebaute Backend-Funktionen und macht sie zum sichtbaren Conversion-Treiber, also hoher Hebel bei kleinem Build.

**Was es liefert (Scope):**
- Verifizierungs-Badges am Profil und an der Kampagne (Identität geprüft, Zulassung verifiziert, Schule bestätigt) mit Erklär-Tooltip
- Visualisierter Direktfluss Spender -> Schule auf der Kampagnenseite ("Bursa hält kein Fremdgeld")
- "Auszahlung an [Schule] bestätigt"-Beleg öffentlich sichtbar nach Goal-Erreichung
- Trust-Sektion oberhalb des Spenden-CTAs statt im Footer
- Wieder-verwendbare Trust-Komponente für Gallery-Karten (Badge-Vorschau schon in der Liste)

**Größe:** S/M

| Stakeholder | Konkreter Benefit |
|---|---|
| Studierende | Kann die Admin-Verifizierung aktiv als Verkaufsargument nutzen und sich vom anonymen GoFundMe-Bettelprofil abheben, bevor Skepsis zum Abbruch führt. |
| Einzelspender | Sieht sofort "echt, geprüft, zugelassen" plus schwarz auf weiß, dass 100% bei der Schule landet, das adressiert die größte Angst (Versickern in Overhead) vor dem ersten Klick. |
| Corporate | Sichtbar dokumentierte Direktauszahlung an die Schule ist genau das Compliance-Argument (kein Self-Dealing, keine Fremdgeld-Haltung), das Legal/Compliance für große Tickets braucht. |

**Erfolgsindikatoren:** Conversion-Rate Gallery-Besuch -> Spendenstart steigt messbar; Anteil der Kampagnen mit vollständig angezeigtem Badge-Set bei 100%.

### E2 - Stripe All-or-Nothing Zahl-Engine + Goal-Mechanik

**Problem / Warum jetzt:** Payments sind gemockt, es fließt kein echtes Geld. Die Recherche-Empfehlung liegt vor: Stripe SetupIntent All-or-Nothing, also Karte erst belasten, wenn das Studiengebühren-Ziel erreicht ist. Genau das ist nicht nur Payment-Mechanik, sondern ein Vertrauensargument ("Du zahlst nur, wenn [Name] wirklich studieren kann"). Unter All-or-Nothing ist die Auszahlung binär, deshalb entscheiden Fortschritts- und Dringlichkeitsmechanik direkt darüber, ob der Studierende überhaupt Geld bekommt. Wallets und automatischer Beleg gehören von Tag eins dazu, sonst bricht der mobile Diaspora-Spender ab.

**Was es liefert (Scope):**
- Stripe SetupIntent-Integration hinter der bestehenden PaymentProvider-Abstraktion, Karte autorisiert, Abbuchung erst bei Goal-Erreichung
- Wallet-Checkout (Apple Pay / Google Pay / PayPal) mobil-optimiert
- Progress-Bar / Thermometer mit Restsumme, Countdown bis Studienstart, Meilenstein-Trigger bei 80/90%
- All-or-Nothing als Vertrauens-Feature kommuniziert ("Belastung nur bei Zielerreichung")
- Automatischer, korrekter Zuwendungsbeleg sofort nach erfolgreicher Abbuchung (Format je Spenderland)
- Sauberes Scheitern-Handling: Ziel verfehlt = keine Belastung, klare Kommunikation an Spender

**Größe:** L

| Stakeholder | Konkreter Benefit |
|---|---|
| Studierende | Mobilisiert über Goal-Gradient und Deadline-Druck die letzten kritischen Prozente auf der Zielgeraden, wo unter All-or-Nothing die Auszahlung entschieden wird. |
| Einzelspender | Risikofrei spenden, das Geld verpufft nie in einer halbfinanzierten Kampagne, plus sofortiger Steuerbeleg und reibungsloser Wallet-Checkout am Handy. |
| Corporate | Die gleiche All-or-Nothing-Logik macht Matching-Kampagnen und Full-Tuition-Tickets planbar, weil Mittel zweckgebunden erst bei Zielerreichung fließen. |

**Erfolgsindikatoren:** Anteil erfolgreich abgeschlossener (geht-live -> ausgezahlt) Kampagnen; mobiler Checkout-Abschluss-Rate >= Desktop; Zuwendungsbeleg in 100% der Abbuchungen automatisch erzeugt.

### E3 - Kampagnen-Erfolgs-Engine (Story/Video + Onboarding-Split + Share-Toolkit)

**Problem / Warum jetzt:** Der Onboarding-Flow existiert (Profil+Kampagne+Submit), aber es gibt kein geführtes Story-/Video-Gerüst, der stärkste einzelne Erfolgsfaktor fehlt damit. Video-Kampagnen sammeln im Schnitt rund 50% mehr als reine Text/Bild-Kampagnen, und Erfolg im Bildungs-Crowdfunding hängt direkt an der Fähigkeit, die eigene Story zu vermarkten und ins Netzwerk zu tragen. Lange Single-Step-Formulare sind ein typischer Abbruchpunkt (Reduktion von 11 auf 4 Felder hat Abschlüsse um 120% gesteigert). Ohne reibungsloses Teilen bleibt die Gallery passiv.

**Was es liefert (Scope):**
- Geführtes Story-Framework (Vorher/Nachher-Struktur, Prompts statt leerem Textfeld) plus Pitch-Video-Upload
- Mehrstufiges Onboarding mit Zwischenspeichern, nur Pflichtfelder, Fortschrittsanzeige
- Ein-Tap Share-Toolkit (WhatsApp/Telegram/Facebook-Deeplinks) mit vorformulierten Nachrichten in mehreren Sprachen
- "Bitte die ersten 3 Spender werden"-Flow für den inneren Kreis und die Diaspora
- Mobile-first, daumenfreundliche Teilen-/Spenden-CTAs am Profil

**Größe:** M/L

| Stakeholder | Konkreter Benefit |
|---|---|
| Studierende | Sammelt deutlich mehr Geld durch starke Story plus Video und erzeugt frühes Momentum über das eigene Netzwerk, ohne am weißen Blatt zu scheitern. |
| Einzelspender | Bekommt eine emotionale, glaubwürdige Story mit Video statt eines leeren Profils, das senkt die Hürde, überhaupt zu spenden. |
| Corporate | Hochwertige, konsistent erzählte Kampagnen liefern das Marken- und DEI-Storytelling-Material, das ein Named-Sponsoring kommunizierbar macht. |

**Erfolgsindikatoren:** Anteil eingereichter Kampagnen mit Video; Onboarding-Abschlussquote (gestartet -> submitted); Anteil Kampagnen mit >= 3 Spenden in den ersten 7 Tagen.

### E4 - Donor Retention Loop (Account, Recurring, Impact-Updates, Tribute)

**Problem / Warum jetzt:** Sponsor-Impact ist als einmaliges Ergebnis gebaut, aber nicht als laufender Kommunikationskanal. Erstspender-Retention liegt bei nur rund 19% gegenüber rund 53% bei Wiederholern, Recurring-Spender haben fast den doppelten Lifetime-Value. Eine 10%-Verbesserung der Bindung kann bis zu 200% mehr Spenden bringen, eine Danksagung binnen 48h macht Wiederholung um 39% wahrscheinlicher. Ein Spender-Account ist zugleich die technische Voraussetzung dafür, dass Impact-Updates, Steuerbelege und Recurring überhaupt beim richtigen Spender ankommen.

**Was es liefert (Scope):**
- Spender-Account mit Spenden-Historie und gespeicherten Belegen
- Wiederkehrende Update-Schleife der Studierenden (z.B. "Semester 1 begonnen") plus automatischer Dank binnen 48h
- "Monatlich beitragen / Sponsor a Student"-Toggle neben der Einmal-Spende (Stripe-Recurring)
- Tribute-/Widmungs-Spende (Geburtstag, Gedenken) und Anonymitäts-Wahl
- Meilenstein-Benachrichtigungen ("Du hast X% erreicht", "live geschaltet")

**Größe:** M

| Stakeholder | Konkreter Benefit |
|---|---|
| Studierende | Sichert Folgespenden und langfristige Förderbeziehungen (relevant für Folgesemester und Lebenshaltung), informierte Spender geben häufiger erneut und teilen weiter. |
| Einzelspender | Bekommt die emotionale Belohnung (sieht den eingeschriebenen MBA-Studenten), kann in schmerzlose Monatsbeiträge aufteilen, anonym oder benannt geben und im Namen anderer spenden. |
| Corporate | Recurring-Mandate sind die Basis für Multi-Year-Commitments und planbare CSR-Budgets statt Einmal-Aktionen. |

**Erfolgsindikatoren:** Wiederspender-Quote (Anteil Spender mit >= 2 Spenden); Anteil Recurring an Gesamtspenden; Update-Öffnungs-/Klickrate.

### E5 - Corporate Channel (B2B-Payment + ESG-Dashboard + Named Scholarship + Full-Tuition-CTA)

**Problem / Warum jetzt:** Firmen können nicht per Privat-Kreditkarte spenden. Ohne Rechnung, SEPA, USt-ID, Bestellnummer und unterzeichnetes Gift-Agreement kommt Procurement gar nicht erst durch die Freigabe. CSR-/ESG-Teams brauchen exportierbare Impact-Daten für CSRD/ESRS-Reporting, nicht eine Danke-Mail, und ohne Named Scholarship plus Logo-Recognition fehlt der Business-Case fürs Marketing. Die Payment-Empfehlung enthält bereits den Corporate-Full-Tuition-CTA. Der Channel hängt sich hinter die bestehende PaymentProvider-Abstraktion, ohne den Gallery-/Kartenfluss zu berühren.

**Was es liefert (Scope):**
- B2B-Payment-Strecke: Rechnung, SEPA-Überweisung/-Lastschrift, USt-ID, PO-Feld, Gift-/Sponsorship-Agreement
- ESG-/CSR-Impact-Dashboard (geförderte Studierende, Länder, ausgezahlte Summe an Schule, Fortschritt) mit PDF/CSV-Export
- Named Scholarship: benanntes Stipendium plus Firmenlogo auf Kampagnen-/Gallery-Seite und teilbares Impact-Badge
- Firmentaugliche Belege (Zuwendungsbestätigung nach amtlichem Muster bzw. Sponsoring-Rechnung, USt-ID, Direktauszahlungs-Nachweis)
- Full-Tuition-CTA ("Sponsor a full scholarship") mit Diversity-/Social-Mobility-Framing
- Optional opt-in Talent-Profil-Kanal als spätere Ausbaustufe

**Größe:** L

| Stakeholder | Konkreter Benefit |
|---|---|
| Studierende | Bekommt Zugang zu den größten Tickets (ganze Studiengebühr), die unter All-or-Nothing die Zielerreichung am sichersten machen, plus potenziellen Recruiting-Kontakt. |
| Einzelspender | Optionaler Arbeitgeber-Match vervielfacht die eigene Wirkung (Match steigert Response-Rate um 71%), das macht aus einer Spende mehrere. |
| Corporate | Kann B2B-konform per Rechnung/SEPA zeichnen, liefert dem Board audit-fähige ESG-Kennzahlen, sichert den Spendenabzug und gewinnt Markensichtbarkeit über das Named Scholarship. |

**Erfolgsindikatoren:** Anzahl abgeschlossener Corporate-Tickets pro Quartal und durchschnittliches Ticketvolumen; Anzahl exportierter ESG-Reports.

## Stakeholder-Mapping: nächste 1-2 Epics je Gruppe

### Studierende
- **E3 - Kampagnen-Erfolgs-Engine:** "Du startest nicht mehr mit leerem Profil. Bursa führt Dich durch Deine Story, Du lädst ein kurzes Video hoch und teilst Deine Kampagne mit zwei Taps in Deine WhatsApp-Gruppen. Video-Kampagnen sammeln im Schnitt rund 50% mehr, und Deine ersten Spender bringen das Momentum, das Fremde nachzieht."
- **E2 - Stripe All-or-Nothing + Goal-Mechanik:** "Du siehst genau, wie viel noch fehlt und wie viel Zeit bis Studienstart bleibt. Die Fortschrittsanzeige und der Meilenstein-Push bei 80% mobilisieren genau die letzten Prozente, die unter All-or-Nothing über Deine Auszahlung entscheiden."

### Einzelspender
- **E1 - Trust-Layer sichtbar machen:** "Du siehst sofort: diese Person ist geprüft, an der Schule zugelassen, und Dein Geld geht direkt an die Business School, Bursa hält kein Fremdgeld. Kein Versickern in Overhead, kein Risiko, kein anonymes Bettelprofil."
- **E2 - All-or-Nothing als Vertrauens-Feature:** "Deine Karte wird erst belastet, wenn das Studiengebühren-Ziel wirklich erreicht ist. Du zahlst nur, wenn [Name] auch studieren kann, und bekommst sofort einen korrekten Steuerbeleg."

### Corporate
- **E5 - Corporate Channel:** "Du zeichnest per Rechnung und SEPA mit USt-ID und Gift-Agreement, bekommst prüfsichere Belege für den Spendenabzug und ein exportierbares ESG-Dashboard für Dein CSRD-Reporting. Dein Name steht auf dem Stipendium, Dein Logo auf der Kampagne."
- **E1 - Trust-Layer / Compliance-Beweis:** "Bursa zahlt nachweislich direkt an die Schule aus und hält nie Fremdgeld. Genau dieser dokumentierte Direktfluss ist das Argument, mit dem Deine Legal- und Compliance-Abteilung das Ticket freigibt."

## Empfohlene Reihenfolge + Begründung

| Reihenfolge | Epic | Begründung |
|---|---|---|
| 1 | E1 Trust-Layer | Billigster Build mit höchstem Conversion-Hebel, recycelt vorhandenes Backend und macht den Kern-USP für ALLE drei Stakeholder sofort sichtbar und demoable. Voraussetzung für die Vertrauens-Story aller folgenden Epics. |
| 2 | E2 Stripe All-or-Nothing | Die echte Geld-Engine, ersetzt den Mock und ist der längste/riskanteste Build, deshalb früh starten. Baut auf E1 auf, weil All-or-Nothing als Vertrauens-Feature die Trust-Inszenierung aus E1 voraussetzt. |
| 3 | E3 Kampagnen-Erfolgs-Engine | Sobald echtes Geld fließt, braucht die Plattform Nachschub an gut erzählten, teilbaren Kampagnen, sonst bleibt die Gallery leer. Treibt die Nachfrageseite. |
| 4 | E4 Donor Retention Loop | Macht aus Erstspendern Wiederkehrer und aus Einmal-Spenden Recurring, der größte Hebel auf Plattform-Stabilität. Setzt echte Payments (E2) und Accounts voraus. |
| 5 | E5 Corporate Channel | Größte Tickets, aber eigener B2B-Pfad mit Compliance-, Reporting- und Branding-Aufwand. Sinnvoll erst, wenn Trust-Beweis (E1), echte Auszahlung (E2) und belegbare Wirkung (E4) stehen, weil genau die das Corporate-Argument tragen. |

## Quellen

- Storytelling und Engagement im Crowdfunding: https://www.sciencedirect.com/science/article/abs/pii/S0167811620300288
- Video-Kampagnen sammeln mehr: https://wenimate.com/blog/crowdfunding-video-storytelling/
- Bildungs-Crowdfunding für internationale Studierende: https://www.afterschoolafrica.com/79697/crowdfunding-for-education-a-guide-for-international-students/
- BBB Give.org Donor Trust Report (Verifizierung, Transparenz, Plattform-Vertrauen): https://give.org/news/donor-trust-in-giving-platforms ; https://give.org/donor-trust-report
- Social-Media-Donation-Scams und Plattform-Pflichten: https://charitylawyerblog.com/2026/01/26/social-media-donation-scams-legal-duties-of-platforms-and-charities-in-2026/
- Charity Navigator Overhead-Myth: https://www.charitynavigator.org/donor-basics/giving-101/Overhead/
- Goal-Gradient-Hypothese (Jensen et al., J. Applied Social Psychology): https://onlinelibrary.wiley.com/doi/abs/10.1111/jasp.12152
- Goal-Proximity Verhaltensdaten: https://agitator.thedonorvoice.com/behavior_science/goal-proximity/
- Donation Progress Bars: https://paymattic.com/donation-progress-bar/
- Peer-to-Peer-Fundraising-Guide (erste Spender, Momentum): https://pro.gofundme.com/c/blog/the-complete-peer-to-peer-campaign-guide-for-fundraising-success/
- Donor Retention und Impact-Storytelling: https://neonone.com/resources/blog/donor-retention/ ; https://nonprofitstorytellingconference.com/donor-impact-storytelling-guide/
- Donor-Retention-Studie (Althoff & Leskovec, DonorsChoose): https://homes.cs.washington.edu/~althoff/docs/donor_retention.pdf
- Recurring-Giving-Statistiken (LTV, Retention): https://neonone.com/resources/blog/recurring-giving-statistics/
- Donation-Form-Optimierung (Feldreduktion, Abbruchquoten): https://fundraiseup.com/blog/Optimizing-Donation-Landing-Pages/ ; https://www.donorperfect.com/nonprofit-technology-blog/fundraising-software/donation-form-optimization-cro/
- Mobile Giving und Digital Wallets: https://www.charitytimes.com/ct/Most-online-giving-is-via-mobile-phones-for-the-first-time.php ; https://www.nptechforgood.com/101-best-practices/online-fundraising-statistics-for-nonprofits/
- SEPA Direct Debit für Spenden (B2B, niedrige Gebühren): https://donorbox.org/nonprofit-blog/sepa-direct-debit-donations ; https://fundraiseup.com/blog/sepa-direct-debit/
- ESG-KPI-Frameworks (CSRD/ESRS, GRI, SASB): https://ctrlprint.com/news/a-comprehensive-guide-to-esg-kpis-and-metrics-turning-data-into-measurable-impact-1 ; https://www.tekmon.com/25-esg-kpi-examples
- Named Scholarships und Recognition-ROI: https://www.mykaleidoscope.com/insights/hosting-scholarship-for-brand-and-business/
- Deutsche Steuerregeln zum Spendenabzug: https://germantaxes.de/tax-tips/deduct-donations-from-taxes/ ; https://taxsummaries.pwc.com/germany/corporate/deductions ; https://www.winheller.com/en/nonprofit-organizations/sponsoring/corporate-donations.html
- Matching-Gift-Statistiken: https://doublethedonation.com/matching-gift-statistics/ ; https://doublethedonation.com/corporate-matching-gift-programs/
- Tribute-Gifts und Anonymität: https://www.dojiggy.com/blog/the-ins-and-outs-of-tribute-gifts/ ; https://www.nature.com/articles/s41467-019-11852-z
- Talent-Pipeline über Stipendien: https://scholarshipamerica.org/blog/building-your-talent-pipeline-through-scholarships/ ; https://news.okstate.edu/articles/communications/2024/loves_travel_stops_gift_establishes_tom_love_scholars_program_at_osu.html

## Phase-2-Epics: Entwickler/Betreiber (E6, E7)

**Kurzfazit Betreibersicht:** Ab E2/E5 bewegt Bursa echtes Geld über Stripe und verarbeitet sensible Personendaten (Identitäts-, Zulassungs- und Schulnachweise, Spender-PII quer über Ländergrenzen). Aus Betreiber-/Dev-Sicht ist das nächste Engpassthema deshalb nicht "noch ein Feature", sondern Betreibbarkeit. Zwei Dinge entscheiden ab hier, ob die Plattform live bleibt und ob der Trust-USP hält: dass sie nicht kompromittiert oder als Karten-Test-Wiese missbraucht wird (E6), und dass der Betreiber überhaupt sieht, was passiert - Funnel, Zahlungsfehler, Ausfälle (E7). Marketing/SEO und internes Admin-Tooling sind real, aber nachrangig: SEO-Wachstum ist wertlos, solange ein Sicherheitsvorfall den Vertrauenskern zerstört oder niemand merkt, dass der Checkout seit zwei Stunden 500er wirft. E3 deckt den Share-/Growth-Hebel bereits ab, und Admin-Tooling ist eher Effizienz als Existenzfrage.

### E6 - Security-Hardening (OWASP, Rate-Limiting, Secrets, Auth-Härtung, PCI/GDPR)

**Problem / Warum jetzt:** Bursas gesamter USP ist Vertrauen, und ab E2 fließt echtes Geld über Stripe plus sensible PII (Identitäts-, Zulassungs- und Schulnachweise, Spenderdaten über Ländergrenzen). Genau diese Kombination ist ein Top-Angriffsziel: Spenden-/Wohltätigkeitsplattformen sind überproportional von Card-Testing betroffen - rund 11% aller von Stripe beobachteten Card-Testing-Attacken zielen auf Charities, weil dort Kleinbeträge erlaubt sind und auf dem Kontoauszug seltener auffallen. Jeder durchgelassene Karten-Test produziert Chargebacks, Stripe-Risk-Flags und im Extremfall eine Account-Sperre, die die ganze Zahl-Engine stilllegt. PCI DSS 4.0 ist seit März 2025 für jeden verpflichtend, der Kartenzahlungen verarbeitet; GDPR-Bußgelder treffen auch die grenzüberschreitende Diaspora-Spende, und Datenpannen haben den Nonprofit-Sektor bereits zweistellige Millionenbeträge an Vergleichen gekostet. Security-Misconfiguration ist laut OWASP 2025 zum zweithäufigsten realen Breach-Grund aufgestiegen. Ein einziger sichtbarer Vorfall zerstört den Trust-USP nachhaltiger, als jedes Feature ihn aufbaut - deshalb jetzt, bevor echtes Volumen fließt.

**Was es liefert (Scope):**
- Rate-Limiting und Bot-/Abuse-Abwehr auf allen geld- und auth-nahen Endpunkten (Donation-Intent, Login, Registrierung, Passwort-Reset) plus CAPTCHA/Challenge und Velocity-Limits gegen Card-Testing
- OWASP-Top-10-Härtung: serverseitige Input-Validierung/Sanitizing (z.B. Zod), Output-Encoding gegen XSS, parametrisierte Queries, Security-Header (CSP, HSTS) und sichere Defaults gegen Misconfiguration
- Auth-Härtung: robuste Session-/Token-Handhabung, Brute-Force-Schutz, saubere Rollen-/Rechte-Trennung (Spender, Studierende, Admin) und MFA für Admin- und Auszahlungs-Funktionen
- Secrets-Management: Stripe-Keys, DB-Credentials und Webhook-Secrets aus dem Code raus in Env/Vault, Key-Rotation und verpflichtende Stripe-Webhook-Signaturprüfung
- PII-/GDPR-Schutz: Verschlüsselung at-rest und in-transit für Verifizierungs- und Spenderdaten, Lösch-/Aufbewahrungskonzept, Zugriffsprotokollierung und PII-Minimierung in Logs
- Dependency-/Supply-Chain-Scanning (SCA/SAST, Dependabot) und eine wiederholbare Security-Checkliste als Release-Gate

**Benefit für Betreiber:** Schützt die einzige Existenzgrundlage der Plattform - das Vertrauen - und hält die Zahl-Engine betriebsfähig, indem Card-Testing und Chargebacks unter der Stripe-Risk-Schwelle bleiben und ein PII-Leak (mit Millionen-Settlement-Risiko und GDPR-Bußgeld) vermieden wird. Macht Bursa zugleich Compliance-erzählbar (PCI DSS 4.0, GDPR) und schaltet damit direkt den Corporate-Channel (E5) frei, weil Procurement und Legal ohne diesen Nachweis nicht zeichnen.

**Größe:** M/L

**Erfolgsindikatoren:** Card-Testing-/Chargeback-Rate unter der Stripe-Risk-Schwelle; null kritische Findings aus dem Dependency-/SAST-Scan beim Release; alle Secrets aus dem Code entfernt und rotierbar; Security-Checkliste als verpflichtendes Release-Gate etabliert.

### E7 - Observability & Funnel-Analytics (Logging, Metrics, Payment-Monitoring, Uptime/SLO)

**Problem / Warum jetzt:** Jede einzelne Erfolgskennzahl, die E1-E5 versprechen ("Conversion-Rate steigt messbar", "mobile Checkout-Abschluss-Rate", "Onboarding-Abschlussquote", "Wiederspender-Quote", "Update-Öffnungsrate"), ist heute schlicht nicht messbar, weil keine Instrumentierung existiert. Der Betreiber fliegt blind: Bricht der Stripe-Checkout, merkt es niemand, bis sich Spender beschweren - und unter All-or-Nothing mit Deadline bis Studienstart bedeutet jede Stunde Checkout-Ausfall verlorene Kampagnen, die nicht nachgeholt werden können. Funnel-Daten (Visitor -> Checkout geöffnet -> Spende abgeschlossen) sind der Standard-Hebel, um zu sehen, wo Spender abspringen; gehäufter Abbruch in der Payment-Stufe ist oft das erste Signal für ein Gateway- oder Vertrauensproblem. Ohne Logs, Metrics und Alerting gibt es keine Vorfallserkennung, keine Datengrundlage für die Conversion-Optimierung der gesamten Roadmap und keinen Beleg für die ESG-/Impact-Zahlen, die der Corporate-Channel (E5) exportieren soll.

**Was es liefert (Scope):**
- Strukturiertes Logging (korrelierte Request-IDs, PII-arm) über Frontend, API und Stripe-Webhooks, zentral durchsuchbar
- Metrics und Dashboards für Geschäfts- und Systemkennzahlen: Donation-Funnel (Visitor -> Checkout -> Erfolg), Zahlungs-Erfolgs-/Fehlerrate, Auszahlungs-Status, API-Latenz und Fehlerquote
- Funnel-/Drop-off-Analytics je Schritt (Gallery -> Kampagne -> Spendenstart -> Abschluss) und je Onboarding-Schritt, als gemeinsame Wahrheit für die E1-E5-Erfolgsindikatoren
- Payment-/Webhook-Monitoring mit Alerting auf fehlgeschlagene Charges, hängende SetupIntents und nicht zugestellte oder abgelehnte Stripe-Webhooks
- Uptime-/Synthetic-Monitoring der kritischen Pfade (Spenden-Flow, Login) plus SLO, Error-Budget und Multi-Window-Burn-Rate-Alerting, damit Ausfälle erkannt werden, bevor Kampagnen-Deadlines reißen
- Datenschutzkonforme Produkt-Analytics (Consent, IP-/PII-Schonung) als Grundlage für die belegbaren Impact-/ESG-Exporte aus E5

**Benefit für Betreiber:** Verwandelt Blindflug in Steuerbarkeit. Der Betreiber erkennt Zahlungs- und Webhook-Ausfälle in Minuten statt über Beschwerden, schützt unter All-or-Nothing direkt auszahlungsrelevante Kampagnen und bekommt endlich die Datengrundlage, um die Conversion-Versprechen aus E1-E5 zu messen und zu optimieren, statt sie nur zu behaupten. Nebenbei liefert die gleiche Instrumentierung die prüfbaren Zahlen für das ESG-/Impact-Reporting aus E5.

**Größe:** M

**Erfolgsindikatoren:** Mean-Time-to-Detect für Checkout-/Webhook-Ausfälle von Stunden auf Minuten; Donation-Funnel über alle E1-E5-Schritte durchgängig instrumentiert; SLO mit Burn-Rate-Alerting auf dem Spenden-Flow aktiv; alle E1-E5-Erfolgsindikatoren aus einem Dashboard ablesbar.

### Warum E6/E7 (und nicht Marketing/SEO oder Admin-Tooling)

Für eine vertrauensbasierte Spenden-Plattform, die echtes Geld und grenzüberschreitende PII verarbeitet, haben Security und Observability den höchsten Hebel: Security schützt den Vertrauenskern (ein Vorfall macht E1-E5 wertlos), Observability macht die Plattform überhaupt erst betreibbar und die Roadmap-Versprechen messbar. Marketing/SEO ist nachgelagert (E3 liefert bereits Share-Toolkit und Growth-Mechanik; OG-Tags/Sitemap sind ein kleiner Folge-Schritt) und internes Admin-Tooling ist eine Effizienz-, keine Existenzfrage - Teile davon entstehen ohnehin im ESG-Dashboard (E5) und in den Ops-Dashboards aus E7.

### Quellen (E6/E7)

- Stripe - Card-Testing-Fraud (Schutzmaßnahmen): https://stripe.com/resources/more/what-is-card-testing-fraud-heres-how-you-can-protect-your-business
- Stripe - Card-Testing-Welle & Charities-Anteil (Rate-Limiter-Reaktion): https://stripe.com/newsroom/news/card-testing-surge
- Stripe Docs - Protect yourself from card testing: https://docs.stripe.com/disputes/prevention/card-testing
- OWASP Top 10 (Web): https://owasp.org/www-project-top-ten/
- OWASP Top 10 Privacy Risks: https://owasp.org/www-project-top-10-privacy-risks/
- Nonprofit Donor Data Security 2026 (PCI DSS 4.0, Settlement-Kosten): https://stratuslive.com/blog/nonprofit-donor-data-security-guide/
- Fundraise Up - Nonprofit Cybersecurity / Donor-Data: https://fundraiseup.com/blog/nonprofit-cybersecurity/
- Fundraise Up Insights - Funnel (Visitors/Checkout/Supporters/Conversion): https://fundraiseup.com/docs/insights/
- Google Analytics für Donor-Funnel & Drop-off: https://www2.fundsforngos.org/articles-searching-grants-and-donors/how-to-use-google-analytics-to-track-donor-engagement/
- Google SRE - Alerting on SLOs / Burn-Rate: https://sre.google/workbook/alerting-on-slos/
- OneUptime - Error-Alerting auf OTel-Metrics & SLO (Payment-Beispiel): https://oneuptime.com/blog/post/2026-02-06-error-alerting-policies-otel-metrics-slo/view
- incident.io - Incident Management Best Practices 2026: https://incident.io/blog/incident-management-best-practices-2026
