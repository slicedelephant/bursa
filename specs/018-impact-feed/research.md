# Research & Clarify — Feature 018 Multi-Channel Impact-Feed (E17)

## Entscheidung 1 — Klare Abgrenzung gegen E4 (kein Neubau des E-Mail-Danks)

**Entscheidung:** E17 fasst den E4-Pfad nicht an. `NotificationsService.onDonation`,
`thankYouNotification`, `EmailLogger`, `Notification`-Modell und der In-App-Notifications-
Feed (`/notifications`) bleiben unverändert. E17 baut einen **eigenen** `impact-feed`-Modul-
Layer obendrauf.

**Begründung:** Der Auftrag ist explizit: "DO NOT rebuild the E4 email thank-you. E17 adds
ONLY: the new mobile channel, an in-app feed, and a student-voice-loop." E4 ist getestet und
gemergt; ein Neubau wäre Regression-Risiko + Constitution-Verstoß (kein Duplikat).

**Konsequenz:** Was NEU ist: `impact-feed`-Modul (Feed/Channel-Routing/Student-Voice/
Inaktivität), Messaging-Provider-Naht, vier neue Prisma-Modelle. Was WIEDERVERWENDET wird:
E4-`NotificationsService` (read-only Kontext), E9-Keyword-Filter, E16-`streak.util`. Was
UNANGETASTET bleibt: der komplette E4-E-Mail-Danke-Pfad.

## Entscheidung 2 — Messaging-Provider hinter austauschbarer Naht (gemockt by default)

**Entscheidung:** Ein `MessagingProvider`-Interface (`send(channel, message): Promise<SendResult>`)
plus Symbol-Token `MESSAGING_PROVIDER`. Default-Binding ist `MockMessagingProvider`
(deterministisch, kein Netz, zeichnet jeden Send in einem In-Memory-Log auf). Echte
`WhatsAppMessagingProvider` + `TelegramMessagingProvider` sind kompilierende **Skeletons**
(lazy `fetch` gegen die jeweilige Business-/Bot-API), die nie in Tests laufen. Eine reine
`createMessagingProvider`-Factory wählt anhand `MESSAGING_PROVIDER=mock|whatsapp|telegram`
(Fallback auf Mock, wenn Credentials fehlen).

**Begründung:** Exakt die im Repo etablierte E2-`PaymentProvider`-/E10-`TextGenerationProvider`-
/E8-`EsignatureProvider`-Linie: Mock als Default lauffähig ohne Keys, Real-Adapter hinter
Env-Flag, dieselbe Abstraktion. Constitution: "external services behind swappable mock
interfaces".

**Konsequenz:** Tests injizieren immer `MockMessagingProvider`. Kein Netzaufruf in der
Test-Suite. Die Factory (rein) steht unter dem 80%-Gate; der Mock-Provider ebenfalls.

## Entscheidung 3 — Smart-Notification-Timing als reiner, deterministischer Scheduler

**Entscheidung:** `notification-timing.ts` (rein) entscheidet aus `{ lastSentAt, now,
minIntervalHours, quietHours }`, ob jetzt gesendet werden darf. `now` wird **injiziert** —
kein `Date.now()` in der reinen Funktion. Quiet-Hours sind ein `[startHour, endHour)`-Fenster
(lokale Stunde des injizierten `now`); innerhalb wird verschoben.

**Begründung:** Der Auftrag verlangt "deterministic scheduler (inject reference time; no
`Date.now()` in pure logic)". Das vermeidet flaky Zeit-Tests und hält die Logik testbar. Die
Roadmap nennt "A/B-optimiertes Timing" — bewusst auf einen deterministischen Min-Intervall-/
Quiet-Hours-Scheduler reduziert (kein Experiment-Framework, s. Out-of-Scope).

**Konsequenz:** Kein Cron/Worker. Das Timing wird **on read / on trigger** ausgewertet, wenn
ein Send-Versuch ansteht. `notification-timing.ts` ist unter dem 80%-Gate.

## Entscheidung 4 — Channel-Routing rein, In-App immer, Rest nur Opt-in

**Entscheidung:** `channel-router.ts` (rein) mappt eine Notification + die Donor-
Kanal-Präferenzen auf die Liste der Ziel-Kanäle. **In-App ist immer dabei** (der Feed ist die
Primär-Fläche); E-Mail-Digest, Push, WhatsApp, Telegram, Messenger nur, wenn der Spender den
jeweiligen Kanal explizit per `NotificationChannelPref.optIn` aktiviert hat.

**Begründung:** Diaspora-Opt-in ist die Roadmap-Kernidee; gleichzeitig darf nie ungefragt auf
einen Messenger gepusht werden (Privacy/Consent, Linie E7). In-App immer hält den Feed als
verlässliche Fläche.

**Konsequenz:** Die reine Router-Funktion ist trivial testbar (Pref-Matrix → Kanalliste) und
steht unter dem 80%-Gate. Der Service ruft danach für jeden Nicht-In-App-Kanal den
Messaging-Provider.

## Entscheidung 5 — Feed-Items abgeleitet aus E4-`CampaignUpdate` + Milestones + Student-Voice

**Entscheidung:** Der Feed ist **kein** zweiter Update-Speicher. `feed-builder.ts` (rein)
projiziert vorhandene `CampaignUpdate`-Zeilen (E4), abgeleitete Milestone-Ereignisse und
APPROVED `StudentMessage`-Zeilen auf eine einheitliche `FeedItem`-Story-Card-Form und sortiert
chronologisch (neueste zuerst, deterministischer Tie-Break).

**Begründung:** Wie in E16 (abgeleiteter State driftet nicht): die Studierenden-Meilensteine
existieren bereits als `CampaignUpdate`. Eine eigene Feed-Tabelle wäre Duplikat. Nur die
Student-Voice ist neuer Content und braucht eine eigene Tabelle (Moderation + Media-URLs).

**Konsequenz:** Nur **eine** wirklich neue Content-Tabelle (`StudentMessage`); `FeedItem` ist
ein reiner View-Typ, kein DB-Modell (FeedRead trackt nur das Gelesen-Sein per Item-Key).

## Entscheidung 6 — Student-Voice-Moderation über die E9-Keyword-Filter

**Entscheidung:** `voice-moderation.ts` (rein) wiederverwendet `normalizeText` +
`matchSuspiciousKeywords` aus `trust-safety/ofac-keyword-matcher.ts` (E9) und ergänzt eine
kleine Slur-/Profanity-Wortliste. Es entscheidet APPROVE/REJECT, liefert Gründe und validiert
Textlänge + optionale Video-/Voice-URL-Form (http(s), plausible Länge).

**Begründung:** Der Auftrag verlangt explizit "reuse the E9 moderation/slur-filter logic to
moderate student voice messages". E9 hat die deterministische Keyword-Heuristik bereits; ein
zweiter Filter wäre Duplikat. Kein ML-Modell (Out-of-Scope).

**Konsequenz:** `voice-moderation.ts` importiert die E9-Util und steht selbst unter dem
80%-Gate. Die Wortliste ist illustrativ (wie die E9-`SUSPICIOUS_KEYWORDS`).

## Entscheidung 7 — Inaktivitäts-Detektor + Reminder rein, Geld unangetastet

**Entscheidung:** `inactivity.ts` (rein) entscheidet aus `{ lastDonationAt, now,
thresholdDays }` → `{ inactive, daysSince, shouldRemind }`. Der Reminder ist eine Notification
mit einem CTA-Link auf den **bestehenden** Donate-Flow (1-Tap). `now` injiziert.

**Begründung:** Roadmap: "Pattern-Erkennung bei Inaktivität, gentle Reminder plus 1-Tap-
Spende". Als reiner Rechner ist es deterministisch + testbar. Der Reminder verändert **nie**
eine Spende — er verlinkt nur den geprüften Donate-Pfad.

**Konsequenz:** Constitution "Geld an die Schule" bleibt trivial gewahrt: E17 schreibt nie auf
`Donation`/`Payout`. `inactivity.ts` unter dem 80%-Gate.

## Entscheidung 8 — Update-Read-Streak über E16 `computeMonthlyStreak`

**Entscheidung:** `read-streak.ts` (rein) füttert die Read-Timestamps (aus `FeedRead`) in
E16 `computeMonthlyStreak(timestamps, referenceDate)` und benennt das Ergebnis als
"update-read streak". Kein zweiter Streak-Algorithmus.

**Begründung:** Der Auftrag verlangt "reuse the E16 `streak.util` for the update-read streak".
E16 hat den monatlichen Streak-Kern donation-frei gebaut (kennt nur Timestamps + Referenz) —
genau dafür gedacht.

**Konsequenz:** `read-streak.ts` ist ein dünner, getesteter Wrapper; das injizierte
Referenzdatum hält ihn deterministisch.

## Entscheidung 9 — Digest-Aggregator rein

**Entscheidung:** `digest.ts` (rein) fasst N `FeedItem`s zu einem Digest zusammen:
Top-Items (max N), Gesamt-Count, Perioden-Label, ein kompakter Text-Body für den E-Mail-/
Messenger-Digest.

**Begründung:** Roadmap nennt "Email-Digest" als einen der Kanäle. Als reiner Aggregator ist er
ohne I/O testbar und vom Channel-Router/Provider wiederverwendbar.

**Konsequenz:** `digest.ts` unter dem 80%-Gate; vom Service an den Messaging-Provider übergeben.
