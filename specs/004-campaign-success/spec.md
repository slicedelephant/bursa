# Feature 004 — Kampagnen-Erfolgs-Engine (Story/Video + Onboarding-Split + Share-Toolkit)

## WHY

Der Onboarding-Flow existiert (Profil -> Kampagne -> Submit), aber es fehlt das
geführte Story-/Video-Gerüst — der stärkste einzelne Erfolgsfaktor im Bildungs-
Crowdfunding. Video-Kampagnen sammeln im Schnitt rund 50% mehr als reine
Text/Bild-Kampagnen, und Erfolg hängt direkt daran, die eigene Story zu
vermarkten und ins Netzwerk zu tragen. Lange Single-Step-Formulare sind ein
typischer Abbruchpunkt (Feldreduktion 11 -> 4 hat Abschlüsse um 120% gesteigert).
Ohne reibungsloses Teilen bleibt die Gallery passiv: die ersten Spender aus dem
inneren Kreis erzeugen das Momentum, das Fremde nachzieht.

## WHAT (Scope dieses Epics — gelieferter Kern)

- **Geführtes Story-Framework** statt leerem Textfeld: drei Vorher/Nachher-
  Prompts (Background, Challenge/Funding-Gap, Vision) führen den Studierenden;
  die Antworten werden zur Kampagnen-Story komponiert und einzeln persistiert,
  sodass sie später strukturiert weiter-editierbar sind.
- **Pitch-Video als Embed per URL** (YouTube/Vimeo) — KEIN File-Upload. Die URL
  wird am Boundary validiert (nur einbettbare YouTube/Vimeo-Links) und auf der
  Kampagnenseite als responsives Embed angezeigt.
- **Mehrstufiges Onboarding** (Basics -> Story -> Video/Review) mit
  Fortschrittsanzeige und Zwischenspeichern (Autosave pro Schritt, übersteht
  Reload), nur Pflichtfelder pro Schritt.
- **Ein-Tap Share-Toolkit**: WhatsApp / Telegram / Facebook Deeplinks + Copy-Link
  mit vorformulierten Nachrichten (EN + DE), mobile-first und daumenfreundlich.
- **"Erste 3 Spender werden"-Flow**: im Studi-Dashboard ein gezielter Aufruf an
  den inneren Kreis/Diaspora, solange < 3 Spenden vorhanden sind.
- **Mobile-first Share-/Donate-CTAs** auf Profil- und Kampagnenseite.

## User Stories

- **US1 (Studierende):** Ich werde durch mein Story-Gerüst geführt (Prompts,
  nicht leeres Feld) und kann ein Pitch-Video per Link einbetten, damit meine
  Kampagne glaubwürdig und emotional wirkt. (P1)
- **US2 (Studierende):** Ich fülle mein Onboarding in Schritten aus, verliere bei
  Reload keinen Fortschritt und sehe, wie weit ich bin. (P1)
- **US3 (Studierende):** Ich teile meine Kampagne mit einem Tap in meine
  WhatsApp-/Telegram-Gruppen mit fertigem Text, um die ersten 3 Spender aus
  meinem Netzwerk zu gewinnen. (P1)
- **US4 (Einzelspender):** Ich sehe ein Video und eine strukturierte Story statt
  eines leeren Profils, was die Hürde zum Spenden senkt. (P2)
- **US5 (Corporate):** Konsistent erzählte, hochwertige Kampagnen liefern das
  Marken-/DEI-Storytelling-Material für Named-Sponsoring. (P3)

## Key Entities

- **Campaign** — neue Felder `videoUrl` (Embed-Link), `storyBackground`,
  `storyChallenge`, `storyVision` (strukturierte Story-Bausteine). Alle nullbar;
  `story` bleibt die kanonische Anzeige-Story (aus den Bausteinen komponiert).

## Success Criteria

- Studierende können ein YouTube/Vimeo-Video per URL einbetten; ungültige Links
  werden am Boundary abgelehnt; gültige werden auf der Kampagnenseite gerendert.
- Story-Onboarding nutzt geführte Prompts; die komponierte Story erfüllt die
  Mindestlänge und wird mit den Bausteinen gespeichert.
- Onboarding ist mehrstufig mit Fortschrittsanzeige; Eingaben überstehen einen
  Reload (Autosave).
- Share-Toolkit erzeugt korrekte WhatsApp/Telegram/Facebook-Deeplinks mit
  vorformuliertem Text; Copy-Link funktioniert; mobil bedienbar.
- Studi-Dashboard zeigt den "erste 3 Spender"-Aufruf bei < 3 Spenden.
- Alle Tests grün, >=80% Coverage auf neuem Code (Per-Path-Gates), beide Builds
  grün, Prisma-Migration committet, Seed läuft (inkl. Beispiel-Videos).

## Out of Scope (ehrliche Abgrenzung)

- Echter Video-Upload/-Hosting (nur Embed per URL).
- Mehrsprachige Story-Übersetzung (Share-Texte gibt es EN+DE; Story selbst bleibt
  in der vom Studierenden gewählten Sprache).
- Server-seitiger Draft-Speicher mit Teil-Validierung — Zwischenspeichern läuft
  client-seitig (localStorage), die Kampagne wird am Ende in einem Call erstellt.
