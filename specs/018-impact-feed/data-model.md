# Data Model — Feature 018 Multi-Channel Impact-Feed (E17)

## Neue Prisma-Modelle (3) + Enums (2)

Drei schlanke Modelle. `FeedItem` ist **kein** DB-Modell, sondern ein reiner View-Typ
(`feed-builder.ts`), abgeleitet aus E4-`CampaignUpdate`, Milestones und `StudentMessage` —
abgeleiteter State driftet nicht (Linie E16). Migration: `impact_feed`.

### Enum `StudentMessageStatus`
```
PENDING    // eingereicht, noch nicht moderiert (defensiv; im Sync-Flow selten gesehen)
APPROVED   // Moderation bestanden → erscheint im Feed + wird an Opt-in-Spender gefächert
REJECTED   // Moderation abgelehnt (Slur/Keyword/URL) → nicht ausgespielt, mit Gründen
```

### Enum `FeedChannel`
Die zusätzlichen Opt-in-Kanäle des Impact-Feeds (E4-`NotificationChannel` bleibt für die
bestehenden In-App/E-Mail-Notifications).
```
IN_APP     // immer aktiv (Primär-Feed); nie abwählbar
EMAIL      // E-Mail-Digest (opt-in)
PUSH       // Web/Mobile-Push (opt-in, gemockt)
WHATSAPP   // WhatsApp Business (opt-in, gemockt)
TELEGRAM   // Telegram Bot (opt-in, gemockt)
MESSENGER  // FB Messenger (opt-in, gemockt)
```

### `StudentMessage`
Moderierte Dank-Nachricht einer Studierenden an ihre Spender. Video/Voice sind **URLs**
(kein Upload). Money-frei.
```
id               String              @id @default(cuid())
campaignId       String
text             String
videoUrl         String?
voiceUrl         String?
status           StudentMessageStatus @default(PENDING)
moderationReason String?
createdAt        DateTime            @default(now())

campaign         Campaign            @relation(fields: [campaignId], references: [id], onDelete: Cascade)

@@index([campaignId, status])
```

### `NotificationChannelPref`
Opt-in pro Spender + Kanal. Genau eine Zeile pro `(userId, channel)`. `handle` hält z.B. die
Telegram-Chat-ID / WhatsApp-Nummer (gemockt; nie ein Geheimnis im Feed).
```
id        String      @id @default(cuid())
userId    String
channel   FeedChannel
optIn     Boolean     @default(false)
handle    String?
updatedAt DateTime    @updatedAt
createdAt DateTime    @default(now())

user      User        @relation("DonorChannelPrefs", fields: [userId], references: [id], onDelete: Cascade)

@@unique([userId, channel])
@@index([userId])
```

### `FeedRead`
Read-Tracking pro Spender + Feed-Item-Key. `feedItemKey` ist der stabile Schlüssel aus
`feed-builder.feedItemKey(item)` (z.B. `update:<id>` / `voice:<id>` / `milestone:<campaign>:<pct>`).
`@@unique([userId, feedItemKey])` → idempotenter Read + Quelle der Read-Streak.
```
id          String   @id @default(cuid())
userId      String
feedItemKey String
readAt      DateTime @default(now())

user        User     @relation("DonorFeedReads", fields: [userId], references: [id], onDelete: Cascade)

@@unique([userId, feedItemKey])
@@index([userId, readAt])
```

### Relationen-Backrefs (bestehende Modelle)
- `User`: `channelPrefs NotificationChannelPref[] @relation("DonorChannelPrefs")`,
  `feedReads FeedRead[] @relation("DonorFeedReads")`
- `Campaign`: `studentMessages StudentMessage[]`

## Genutzte bestehende Modelle (read-only)

- `CampaignUpdate` (E4) — Primärquelle der Feed-Story-Cards (Studierenden-Meilensteine).
- `UpdateSubscription` / `Donation` (E4) — welche Kampagnen ein Spender unterstützt/abonniert.
- `StudentProfile` / `Campaign` — Photo (`photoUrl`), Name, Title für die Story-Card.
- `Notification` (E4) — der bestehende In-App/E-Mail-Notification-Feed bleibt unverändert;
  E17 fasst ihn nicht an.

## View-Typen (rein, keine DB)

### Pure-Logic-Inputs/Outputs (money-frei)
- `notification-timing.ts`: `TimingInput { lastSentAt: Date|null; now: Date; minIntervalHours;
  quietHours?: [number, number] }` → `TimingDecision { allowed; reason }`.
- `channel-router.ts`: `ChannelPref { channel: FeedChannelValue; optIn }` →
  `routeChannels(prefs)` → `FeedChannelValue[]` (IN_APP immer), `messengerChannels(prefs)`.
- `feed-builder.ts`: `FeedSource` (update | milestone | voice Varianten) →
  `FeedItem { key; kind; campaignId; title; body; ctaUrl?; photoUrl?; createdAt }[]`.
- `voice-moderation.ts`: `VoiceInput { text; videoUrl?; voiceUrl? }` →
  `VoiceModeration { decision: 'APPROVE'|'REJECT'; reasons: string[] }`.
- `inactivity.ts`: `InactivityInput { lastDonationAt: Date|null; now: Date; thresholdDays }` →
  `InactivityResult { inactive; daysSince: number|null; shouldRemind }`.
- `digest.ts`: `buildDigest(items: FeedItem[], opts)` → `Digest { count; periodLabel; topItems;
  body }`.
- `read-streak.ts`: `computeReadStreak(reads: (Date|string)[], ref)` → E16 `StreakState`.

### Service-View-Typen (vom Service gebaut)
- `FeedView { items: FeedItem[]; readStreak: StreakState; unreadCount }`.
- `ChannelPrefsView { prefs: { channel; optIn; handle? }[] }`.
- `VoiceSubmitView { id; status; reasons; delivered: number }` (delivered = gemockte Sends).
- `InactivityView { inactive; daysSince; shouldRemind; reminder?: { title; body; ctaUrl } }`.

## Invarianten

- **Geld:** kein E17-Modell enthält Betrag/Empfänger; E17 schreibt nie auf `Donation`/`Payout`.
- **E4 unangetastet:** `Notification`/`EmailLogger`/`onDonation` werden nicht verändert.
- **Moderation:** nur `APPROVED` `StudentMessage` erscheint im Feed / wird gefächert; REJECT
  speichert Status+Grund, sendet nichts.
- **Read-Dedupe:** `FeedRead @@unique([userId, feedItemKey])` ⇒ ein Item zählt einmal pro Spender.
- **Channel-Dedupe:** `NotificationChannelPref @@unique([userId, channel])` ⇒ eine Pref pro Kanal.
- **In-App immer:** `routeChannels` enthält immer `IN_APP`; Messenger nur bei Opt-in.
- **Mock-Default:** ohne `MESSAGING_PROVIDER` läuft der `MockMessagingProvider` (kein Netz).
- **Immutability:** alle Primitive geben neue Werte zurück.
