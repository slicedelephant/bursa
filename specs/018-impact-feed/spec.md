# Feature 018 — Multi-Channel Impact-Feed (E17)

**Epic:** E17 · **Größe:** M · **Primär:** Einzelspender · **Hängt ab von:** E4 (Donor-Retention-Loop — wird NICHT neu gebaut) · **Letztes Epic der Welle B**

## Warum (Problem)

Spender vergessen eine Kampagne nach der ersten Spende. Die Diaspora — Bursas
Kernzielgruppe — lebt auf WhatsApp/Telegram/Messenger (~95% Open-Rate), nicht in der
E-Mail-Inbox. E4 hat den Retention-Loop bereits gebaut: E-Mail-Danke, Impact-Updates,
Milestone-Benachrichtigungen, In-App-Notifications. **E17 baut diesen E-Mail-Pfad NICHT
neu.** E17 ergänzt ausschließlich drei Dinge oben drauf:

1. **Den mobilen Kanal** — WhatsApp/Telegram/Messenger (Opt-in, Diaspora-bevorzugt) hinter
   einer austauschbaren, gemockten Messaging-Naht.
2. **Den personalisierten In-App-Impact-Feed** — chronologische Story-Cards aus den
   Studierenden-Meilensteinen (E4-`CampaignUpdate`), swipebar, mobile-first.
3. **Den Student-Voice-Loop** — kurze Dank-Nachrichten der Studierenden (Text, Video-URL
   ≤ 30s, Sprachnachricht-URL), moderiert über die E9-Slur-/Keyword-Filter, an die
   Spender ausgespielt über Feed + Opt-in-Messenger.

Klar gegen E4 abgegrenzt: **Der E4-E-Mail-Danke bleibt unangetastet.** Neu **und**
behalten ist nur Kanal + In-App-Feed + Student-Voice-Loop. Dazu kommen ein
deterministischer Smart-Notification-Timing-Scheduler, ein Inaktivitäts-Detektor mit
sanftem Recurring-Reminder und eine Update-Read-Streak (E16-`streak.util` wiederverwendet).

## User Stories

- Als Spender möchte ich regelmäßig wissen, wie es meinen Studierenden geht, damit ich
  emotional verbunden bleibe — über einen chronologischen, swipebaren In-App-Feed.
- Als Diaspora-Spender möchte ich Impact-Updates per WhatsApp/Telegram erhalten, damit sie
  in meinen natürlichen Kommunikations-Fluss kommen statt in einer ignorierten Inbox.
- Als Studierende möchte ich eine kurze Dank-Nachricht (Text/Video/Voice) an meine Spender
  senden, damit sie meinen Fortschritt direkt von mir hören — moderiert, bevor sie rausgeht.
- Als Spender möchte ich pro Kampagne und Kanal selbst entscheiden, ob ich Messenger-Updates
  bekomme (Opt-in), damit ich die Kontrolle behalte.
- Als wiederholender Spender möchte ich nach längerer Inaktivität einen sanften Reminder mit
  1-Tap-Spende bekommen, damit ich meine Streak nicht ungewollt breche.
- Als Spender möchte ich eine Update-Read-Streak sehen, damit das Dranbleiben am Feed
  belohnt wird.

## Scope (was wird gebaut)

**Messaging-Provider hinter austauschbarer Naht (Kern-Design, gemockt):**
- `MessagingProvider`-Interface (`send(channel, message)`) + Symbol-Token. `MockMessagingProvider`
  (deterministisch, kein Netz, zeichnet Sends auf — im Prototyp **und** in ALLEN Tests).
- Echte **Skeletons** `WhatsAppMessagingProvider` + `TelegramMessagingProvider` (kompilieren,
  laufen nie in Tests), gewählt über eine reine Factory, gegated per
  `MESSAGING_PROVIDER=mock|whatsapp|telegram` (Default `mock`). Linie der E2-`PaymentProvider`-Naht.

**Pure-Logic (rein, getestet, je `.spec.ts` + 80%-Per-Path-Gate, kein `Date.now()`):**
- **Notification-Timing-Scheduler** — entscheidet aus letzter Sendezeit + Quiet-Hours +
  Min-Intervall **deterministisch** (injiziertes `now`), ob jetzt gesendet werden darf (kein Spam).
- **Channel-Delivery-Router** — mappt eine Notification + Donor-Kanal-Präferenzen auf die
  Liste der Ziel-Kanäle (In-App immer, E-Mail/Push/Messenger nur bei Opt-in).
- **Feed-Item-Builder/Sorter** — baut aus `CampaignUpdate`/Milestones/Student-Voice die
  Story-Cards (Photo, Title, Body, CTA) und sortiert sie chronologisch (neueste zuerst).
- **Student-Message-Moderation** — wiederverwendung der E9-`matchSuspiciousKeywords`/
  `normalizeText`; entscheidet APPROVE/REJECT + Gründe, validiert Länge + Video-/Voice-URL.
- **Inaktivitäts-Detektor** — aus letztem Spendendatum + Schwelle (Tage) → `{ inactive, daysSince,
  shouldRemind }`; baut die sanfte Reminder-Entscheidung.
- **Digest-Aggregator** — fasst N Feed-Items zu einem E-Mail-/Messenger-Digest zusammen
  (Top-Items, Count, Periode).
- **Update-Read-Streak** — dünner Wrapper, der die Read-Timestamps in E16
  `computeMonthlyStreak` füttert (kein zweiter Streak-Algorithmus).

**Backend (`apps/api/src/impact-feed/`):**
- `GET /feed` — personalisierter Feed für den eingeloggten Spender (Story-Cards aus den
  abonnierten/unterstützten Kampagnen + freigegebene Student-Voices), Read-Streak.
- `POST /feed/:itemId/read` — markiert ein Feed-Item als gelesen (speist die Read-Streak).
- `GET /feed/channel-prefs` / `PUT /feed/channel-prefs` — Kanal-Opt-in pro Kanal lesen/setzen.
- `POST /campaigns/:id/voice` (STUDENT, Owner-skopiert) — Student-Voice senden; moderiert,
  bei APPROVE als Feed-Quelle gespeichert + an Opt-in-Spender über den Messaging-Provider
  gefächert (gemockt).
- `GET /feed/inactivity` — Inaktivitäts-Status + Reminder-Entscheidung für den Spender.

**Frontend (`apps/web/src/app/features/donor/` + `student/`):**
- Swipebarer In-App-Impact-Feed (Story-Cards), Read-Streak-Anzeige, Kanal-Präferenzen-Panel
  (Opt-in WhatsApp/Telegram/E-Mail-Digest/Push), Inaktivitäts-Reminder-Banner mit 1-Tap-CTA.
- Studierenden-Fläche "Send a thank-you message" (Text + optionale Video-/Voice-URL) mit
  Moderations-Feedback.
- Pure Helfer (Feed-Card-Format, Kanal-Labels, Read-Streak-Format, Moderations-Hinweis) mit
  Web-Coverage-Gates.

## Functional Requirements

- **FR-1 (E4 unangetastet):** Der E4-E-Mail-Danke (`onDonation` → `thankYouNotification` →
  `EmailLogger`) bleibt unverändert. E17 ruft E4-`NotificationsService` nur lesend/ergänzend.
- **FR-2 (Messaging-Naht):** Jeder externe Versand läuft über `MessagingProvider`; Default
  `MockMessagingProvider` (kein Netz). Provider-Wahl rein per Env-Factory. In Tests immer Mock.
- **FR-3 (Smart Timing):** Der Scheduler ist rein und deterministisch (injiziertes `now`):
  respektiert Min-Intervall + Quiet-Hours; kein `Date.now()` in der reinen Logik.
- **FR-4 (Channel-Routing):** In-App-Feed ist immer Ziel; E-Mail-Digest/Push/Messenger nur
  bei explizitem Opt-in pro Kanal (`NotificationChannelPref`).
- **FR-5 (Feed):** Feed-Items sind chronologisch (neueste zuerst), enthalten Photo, Title,
  Body, CTA, Kind, Timestamp; abgeleitet aus `CampaignUpdate`/Milestones/Student-Voice.
- **FR-6 (Student-Voice moderiert):** Eine Student-Voice wird über die E9-Keyword-Filter
  geprüft; nur APPROVE wird gespeichert + ausgespielt; REJECT liefert Gründe; Video-/Voice
  sind URLs (kein Upload). Länge/URL werden an der Grenze validiert.
- **FR-7 (Inaktivität):** Aus dem letzten Spendendatum + Schwelle wird rein entschieden, ob
  ein sanfter Reminder fällig ist; der Reminder bietet 1-Tap-Spende.
- **FR-8 (Read-Streak):** Read-Timestamps speisen E16 `computeMonthlyStreak`; keine zweite
  Streak-Engine.
- **FR-9 (Geld an die Schule):** Nichts in E17 berührt Betrag, Status oder Empfänger einer
  Spende. Reminder verlinkt nur den bestehenden Donate-Flow; Geld fließt an die Schule.
- **FR-10 (Envelope):** JSON-Routen nutzen `{ success, data?, error? }`; Validierung an der
  Grenze (DTOs); Fehler laut.

## Key Entities

- **FeedItem** — ein in den Feed eines Spenders projizierbares Ereignis: `kind`
  (MILESTONE/IMPACT_UPDATE/STUDENT_VOICE/GOAL_REACHED), `campaignId`, `title`, `body`,
  `ctaUrl?`, `photoUrl?`, `createdAt`. Quelle: `CampaignUpdate` + abgeleitete Milestones +
  `StudentMessage`.
- **StudentMessage** — moderierte Dank-Nachricht einer Studierenden: `campaignId`, `text`,
  `videoUrl?`, `voiceUrl?`, `status` (PENDING/APPROVED/REJECTED), `moderationReason?`,
  `createdAt`. Video/Voice sind URLs.
- **NotificationChannelPref** — Opt-in pro Spender + Kanal: `userId`, `channel`
  (IN_APP/EMAIL/PUSH/WHATSAPP/TELEGRAM/MESSENGER), `optIn`, `handle?` (z.B. Telegram-ID).
- **FeedRead** — Read-Tracking: `userId`, `feedItemKey`, `readAt`. Speist die Read-Streak.

## Success Criteria

- Feed-Engagement 35%+, Messenger-Open-Rate 65%+, Retention-Lift +12% nach erstem Update
  (Produktmetriken, im Prototyp nicht messbar).
- Im Prototyp: Feed + Channel-Routing + Student-Voice-Moderation + Inaktivitäts-Reminder +
  Read-Streak laufen end-to-end mit Seed-Daten; alle pure-logic-Dateien ≥ 80%
  Per-Path-Coverage; beide Builds grün; `migrate diff` sauber; Default `MESSAGING_PROVIDER=mock`
  läuft ohne Keys.

## Out of Scope (ehrlich)

- **Kein echter WhatsApp-/Telegram-/Push-Versand** — nur der `MockMessagingProvider` läuft;
  die Real-Provider sind kompilierende Skeletons, in Tests nie aktiv (E2-PaymentProvider-Linie).
- **Kein Scheduler/Cron-Worker** — das Timing wird **on read/on trigger** berechnet (reine
  Scheduler-Logik), kein Hintergrund-Job, kein Queue-/Pub-Sub-System.
- **Student-Video/-Voice sind URLs** — keine Upload-/Transcoding-/Storage-Pipeline; die 30s-
  Grenze ist eine deklarierte Validierung, kein gemessenes Mediendetail.
- **E4-E-Mail-Pfad unverändert** — der E-Mail-Danke wird nicht angefasst; E17 ergänzt nur den
  Kanal-/Feed-/Voice-Layer obendrauf.
- **Slur-Filter = E9-Keyword-Heuristik** — kein ML-Moderationsmodell; die wiederverwendete
  E9-Wortliste ist illustrativ, kein externer Trust-&-Safety-Provider.
- **Kein A/B-Timing-Experiment-Framework** — das "A/B-optimierte Timing" der Roadmap wird auf
  einen deterministischen Min-Intervall-/Quiet-Hours-Scheduler reduziert (keine Experiment-Engine).
- **Single-Instance** — keine verteilte Sende-Dedupe; die Read-Unique + die Idempotenz des
  Mock-Providers sind die Garantien.
