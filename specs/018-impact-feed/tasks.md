# Tasks 018 — Multi-Channel Impact-Feed (E17)

## Phase 0 — Branch + Spec-Kit (Commit 1, docs)
- [x] T000 `git checkout -b 018-impact-feed` von `main`
- [x] T001 spec.md, research.md, plan.md, data-model.md, contracts/api.md, quickstart.md, tasks.md

## Phase 1 — Messaging-Provider-Naht (Tests zuerst) (Commit 2, feat(api))
- [x] T010 `impact-feed/messaging/messaging-provider.interface.ts` (Interface + `MESSAGING_PROVIDER`-Token + Typen)
- [x] T011 `impact-feed/messaging/mock-messaging.provider.spec.ts` + `mock-messaging.provider.ts`
      (deterministisch, In-Memory-Log, kein Netz)
- [x] T012 `impact-feed/messaging/whatsapp-messaging.provider.ts` (Skeleton, lazy fetch, kompiliert nur)
- [x] T013 `impact-feed/messaging/telegram-messaging.provider.ts` (Skeleton, lazy fetch, kompiliert nur)
- [x] T014 `impact-feed/messaging/messaging-provider.factory.spec.ts` + `messaging-provider.factory.ts`
      (`MESSAGING_PROVIDER=mock|whatsapp|telegram`, Fallback Mock)

## Phase 2 — Pure-Logic (Tests zuerst) (Commit 2)
- [x] T020 `impact-feed/notification-timing.spec.ts` + `notification-timing.ts` (`decideSendTiming`, injiziertes now)
- [x] T021 `impact-feed/channel-router.spec.ts` + `channel-router.ts` (`routeChannels`, `messengerChannels`)
- [x] T022 `impact-feed/feed-builder.spec.ts` + `feed-builder.ts` (`buildFeed`, `feedItemKey`, sort)
- [x] T023 `impact-feed/voice-moderation.spec.ts` + `voice-moderation.ts` (reuse E9 keyword-matcher + slur-Liste)
- [x] T024 `impact-feed/inactivity.spec.ts` + `inactivity.ts` (`detectInactivity`, injiziertes now)
- [x] T025 `impact-feed/digest.spec.ts` + `digest.ts` (`buildDigest`)
- [x] T026 `impact-feed/read-streak.spec.ts` + `read-streak.ts` (Wrapper über E16 `computeMonthlyStreak`)

## Phase 3 — Service / Controller / Modul (Commit 2)
- [x] T030 `impact-feed/dto/channel-pref.dto.ts`, `impact-feed/dto/student-voice.dto.ts`
- [x] T031 `impact-feed/impact-feed.service.ts` (Prisma-I/O + Messaging-Provider hinter den Primitiven):
      `feed`, `markRead`, `channelPrefs`, `setChannelPref`, `submitVoice`, `inactivity`
- [x] T032 `impact-feed/impact-feed.controller.ts` (Feed-DONOR + Voice-STUDENT)
- [x] T033 `impact-feed/impact-feed.module.ts` (+ `MESSAGING_PROVIDER` via Factory, in `app.module.ts` registriert)
- [x] T034 `impact-feed/impact-feed.service.spec.ts` (gemocktes Prisma + Mock-Provider — Verhalten/Moderation/Routing)

## Phase 4 — Prisma + Seed (Commit 2)
- [x] T040 `schema.prisma`: `StudentMessage`, `NotificationChannelPref`, `FeedRead`,
      Enums `StudentMessageStatus`, `FeedChannel`, Backrefs an User/Campaign
- [x] T041 Migration `impact_feed`
- [x] T042 `seed.ts`: moderierte (APPROVED) Student-Voice, Donor-Kanal-Präferenzen
      (WhatsApp/Telegram opt-in), eine Read-Streak — idempotent
- [x] T043 Per-Path-80%-Gates in `apps/api/package.json` für alle neuen pure-logic-Dateien + Mock-Provider + Factory

## Phase 5 — Frontend (Commit 3, feat(web))
- [x] T050 `donor/feed-card-format.spec.ts` + `feed-card-format.ts`
- [x] T051 `donor/channel-pref-format.spec.ts` + `channel-pref-format.ts`
- [x] T052 `donor/read-streak-format.spec.ts` + `read-streak-format.ts`
- [x] T053 `donor/impact-feed.component.spec.ts` + `impact-feed.component.ts` (swipebare Story-Cards, mark-read)
- [x] T054 `donor/channel-prefs.component.spec.ts` + `channel-prefs.component.ts` (Opt-in-Toggles)
- [x] T055 `donor/inactivity-reminder.component.spec.ts` + `inactivity-reminder.component.ts` (1-Tap-CTA)
- [x] T056 `student/voice-message.helpers.spec.ts` + `voice-message.helpers.ts`
- [x] T057 `student/student-voice.component.spec.ts` + `student-voice.component.ts`
- [x] T058 `models.ts` (E17-Typen), `api.service.ts` (Feed-/Voice-/Pref-Calls),
      `donor.page.ts` integriert Feed + Prefs + Reminder; Studierenden-Seite integriert Voice
- [x] T059 Per-Path-80%-Gates in `apps/web/jest.config.js` für alle neuen Dateien

## Phase 6 — Verify + PR (Commit 4, docs)
- [x] T060 `test:cov` (api+web) grün · beide `build` grün · `seed` clean
- [x] T061 `migrate status` up-to-date · `migrate diff --exit-code` sauber
- [x] T062 `prettier --check` clean (api+web)
- [x] T063 `docs/EPICS-PROGRESS.md` E17-Abschnitt + Status FERTIG; PR öffnen
