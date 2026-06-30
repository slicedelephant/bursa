# Plan 018 — Multi-Channel Impact-Feed (E17)

## Wiederverwendung (kein Neubau)

- **E4 Notifications/Donors** (`apps/api/src/notifications/`, `apps/api/src/donors/`): der
  E-Mail-Danke-Pfad (`onDonation` → `thankYouNotification` → `EmailLogger`) bleibt **komplett
  unangetastet**. E17 liest E4-`Notification`/`UpdateSubscription`/`CampaignUpdate` als
  Feed-Quelle, ruft den E4-Pfad nicht neu auf und ersetzt ihn nicht. Der `impact-feed`-Service
  hängt am bestehenden Donor-Account.
- **E9 Trust-&-Safety** (`apps/api/src/trust-safety/ofac-keyword-matcher.ts`): `normalizeText`
  + `matchSuspiciousKeywords` werden in `voice-moderation.ts` wiederverwendet (kein zweiter
  Filter). Slur-Wortliste ergänzt.
- **E16 Gamification** (`apps/api/src/gamification/streak.util.ts`): `computeMonthlyStreak`
  wird von `read-streak.ts` für die Update-Read-Streak gefüttert (kein zweiter Streak-Kern).
- **E4 `CampaignUpdate` / Milestones**: die Studierenden-Meilensteine sind die Feed-Quelle;
  `crossedMilestones`/`milestone.util` (E4) bleibt die Milestone-Wahrheit.
- **E2 PaymentProvider-Naht** als Vorbild für die neue `MessagingProvider`-Naht (Mock-Default,
  Real-Skeleton hinter Env-Flag, reine Factory).
- **Common**: `DomainException`, `CurrentUser`, `Roles`/`RolesGuard`,
  `{success,data}`-Interceptor — unverändert.

## Messaging-Provider-Naht (Kern-Design)

`apps/api/src/impact-feed/messaging/`:
- `messaging-provider.interface.ts` — `MessagingChannel` (`WHATSAPP|TELEGRAM|MESSENGER|PUSH`),
  `OutboundMessage { channel; to; subject?; body }`, `SendResult { ok; channel; ref?; reason? }`,
  `MessagingProvider` (Interface) + `MESSAGING_PROVIDER` Symbol-Token.
- `mock-messaging.provider.ts` — `MockMessagingProvider`: deterministisch, kein Netz, hält ein
  In-Memory-`sent`-Log (`count`, `recent(n)`), liefert immer `{ ok: true, ref: 'mock_…' }`.
  **Wird im Prototyp UND in allen Tests benutzt.**
- `whatsapp-messaging.provider.ts` — `WhatsAppMessagingProvider`-Skeleton: lazy `fetch` gegen
  die WhatsApp-Business-Cloud-API (`graph.facebook.com`), Token aus Env. Kompiliert, läuft nie
  in Tests.
- `telegram-messaging.provider.ts` — `TelegramMessagingProvider`-Skeleton: lazy `fetch` gegen
  `api.telegram.org/bot<token>/sendMessage`. Kompiliert, läuft nie in Tests.
- `messaging-provider.factory.ts` — reine `createMessagingProvider(env)`-Factory:
  `MESSAGING_PROVIDER=mock|whatsapp|telegram` (+ Credentials-Check), Fallback auf Mock. Unter
  dem 80%-Gate.

## Reusable Pure-Logic (TDD, je `.spec.ts` + Per-Path-80%-Gate)

`apps/api/src/impact-feed/` — rein, immutable, kein `Date.now()` in reinen Funktionen
(Referenzzeit injiziert):

1. `notification-timing.ts` — `decideSendTiming({ lastSentAt, now, minIntervalHours,
   quietHours })` → `{ allowed; reason }` (min-interval, quiet-hours; deterministisch).
2. `channel-router.ts` — `routeChannels(prefs)` → Ziel-Kanäle (In-App immer; Rest opt-in);
   `messengerChannels(prefs)` → nur die externen Opt-in-Kanäle.
3. `feed-builder.ts` — `buildFeed(sources, ref)` → sortierte `FeedItem[]` (Story-Cards aus
   updates/milestones/voices), `feedItemKey(item)` (stabiler Read-Key).
4. `voice-moderation.ts` — `moderateVoice({ text, videoUrl?, voiceUrl? })` →
   `{ decision: 'APPROVE'|'REJECT'; reasons; }` (reuse E9 keyword-matcher; URL-/Längen-Check).
5. `inactivity.ts` — `detectInactivity({ lastDonationAt, now, thresholdDays })` →
   `{ inactive; daysSince; shouldRemind }`.
6. `digest.ts` — `buildDigest(items, opts)` → `{ count; periodLabel; topItems; body }`.
7. `read-streak.ts` — `computeReadStreak(readTimestamps, ref)` → benennt E16
   `computeMonthlyStreak` als Update-Read-Streak (dünner Wrapper).

Jede Funktion gibt **neue** Objekte zurück, mutiert keine Eingabe, ruft kein I/O.

## Service / Controller / Modul

`apps/api/src/impact-feed/`:

- `impact-feed.service.ts` — Prisma-I/O hinter den Primitiven + Messaging-Provider:
  - `feed(userId, now)` — sammelt Quellen (abonnierte/unterstützte Kampagnen-`CampaignUpdate`,
    abgeleitete Milestones, APPROVED `StudentMessage`), baut über `buildFeed` + liefert die
    Read-Streak (`computeReadStreak` aus `FeedRead`).
  - `markRead(userId, feedItemKey, now)` — upsert `FeedRead` (Read-Unique → idempotent).
  - `channelPrefs(userId)` / `setChannelPref(userId, dto)` — `NotificationChannelPref` lesen/setzen.
  - `submitVoice(userId, campaignId, dto, now)` — Owner-skopiert; `moderateVoice` → bei APPROVE
    `StudentMessage` (APPROVED) speichern **und** über `routeChannels`/Messaging-Provider an die
    Opt-in-Spender fächern (Timing über `decideSendTiming`); bei REJECT Gründe zurück, kein Send.
  - `inactivity(userId, now)` — `detectInactivity` aus letzter Spende → Reminder-Entscheidung.
- `impact-feed.controller.ts` — `@Controller('feed')` (DONOR) für Feed/Read/Prefs/Inactivity;
  `@Controller('campaigns/:id')` (STUDENT) für `POST /voice`.
- `impact-feed.module.ts` — Provider/Controller; bindet `MESSAGING_PROVIDER` via Factory
  (useFactory), importiert nichts vom E4-E-Mail-Pfad außer dem read-only `PrismaService`; in
  `app.module.ts` registriert.

`impact-feed.service.ts` selbst ist kein reiner Kern (Prisma-/Provider-I/O) und steht nicht
unter dem 80%-Gate; sein Verhalten wird über die gegateten Primitive + ein Service-Spec
(gemocktes Prisma + Mock-Provider) abgedeckt.

## Datenfluss

1. Spender öffnet Feed → `GET /feed` → Service sammelt `CampaignUpdate` + Milestones +
   APPROVED `StudentMessage` der unterstützten Kampagnen → `buildFeed` → sortierte Story-Cards
   + `computeReadStreak` aus `FeedRead`.
2. Spender liest Card → `POST /feed/:itemId/read` → `FeedRead`-Upsert → Read-Streak wächst.
3. Spender setzt Kanal-Opt-in → `PUT /feed/channel-prefs` → `NotificationChannelPref`-Upsert.
4. Studierende sendet Voice → `POST /campaigns/:id/voice` → `moderateVoice` → APPROVE:
   `StudentMessage` speichern + `routeChannels` → für jeden externen Opt-in-Kanal
   `decideSendTiming` + `MessagingProvider.send` (gemockt). **Geld unangetastet.**
5. Inaktivität → `GET /feed/inactivity` → `detectInactivity` → Reminder mit 1-Tap-Donate-CTA.

## Constitution-Checks

- **Geld an die Schule:** E17 schreibt nie auf `Donation`/`Payout`. Reminder verlinkt nur den
  bestehenden Donate-Flow. Voice/Feed sind money-frei.
- **Externe Services gemockt:** jeder Messenger-Versand läuft über `MessagingProvider`; Default
  Mock, kein Netz; Tests immer Mock.
- **Immutability:** alle Primitive geben neue Objekte zurück; kein In-Place-Mutate.
- **Validate at the boundary:** DTOs (`class-validator`) auf allen Write-Routen; Voice-Länge +
  Video-/Voice-URL validiert; Quiet-Hours/Intervall geprüft.
- **Kleine Module:** je Datei < 400 Zeilen, je Funktion < 50 Zeilen; organisiert nach Feature.
- **Envelope:** `{ success, data?, error? }` auf JSON-Routen (Interceptor).

## Frontend (Angular)

`apps/web/src/app/features/donor/`:
- `feed-card-format.ts` (rein, gegated) — Card-Title/Body/Kind-Label/Relative-Time/CTA-Label.
- `channel-pref-format.ts` (rein, gegated) — Kanal-Labels + Opt-in-Status-Text.
- `read-streak-format.ts` (rein, gegated) — Read-Streak-Text + Inaktivitäts-Hinweis.
- `impact-feed.component.ts` — swipebarer Story-Card-Feed (mark-as-read).
- `channel-prefs.component.ts` — Opt-in-Toggles WhatsApp/Telegram/E-Mail-Digest/Push.
- `inactivity-reminder.component.ts` — Reminder-Banner mit 1-Tap-Donate-CTA.

`apps/web/src/app/features/student/`:
- `voice-message.helpers.ts` (rein, gegated) — Client-Vorvalidierung (Länge/URL) + Moderations-
  Hinweis-Text.
- `student-voice.component.ts` — "Send a thank-you message"-Fläche (Text + Video-/Voice-URL).

`models.ts`: neue E17-Typen (Feed/Channel/Voice/Read-Streak/Inactivity). `api.service.ts`:
`feed`, `markFeedRead`, `channelPrefs`, `setChannelPref`, `inactivity`, `submitVoice`.
Einhängen in `donor.page.ts` (Feed + Prefs + Reminder) und die Studierenden-Seite (Voice).

## Prisma

Neue Modelle `StudentMessage`, `NotificationChannelPref`, `FeedRead` + Enums
`StudentMessageStatus`, `FeedChannel`. `FeedItem` ist ein reiner View-Typ (kein DB-Modell;
abgeleitet aus `CampaignUpdate`/Milestones/`StudentMessage`). Backrefs an `User`/`Campaign`.
`NotificationChannel` (E4) bleibt für die E-Mail/In-App-Notifications; der neue `FeedChannel`-
Enum deckt die zusätzlichen Opt-in-Kanäle. Migration `impact_feed`. Seed: Feed-Items
(`CampaignUpdate` existieren bereits), eine moderierte (APPROVED) Student-Voice, Donor-
Kanal-Präferenzen (WhatsApp/Telegram opt-in), eine Read-Streak — idempotent.

## Verifikation

`test:cov` (api+web) grün · beide `build` grün · `seed` clean · `migrate status` up-to-date ·
`migrate diff --exit-code` → "No difference detected" · `prettier --check` clean (api+web).
