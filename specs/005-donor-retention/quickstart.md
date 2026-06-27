# Quickstart — 005 Donor Retention Loop

## Setup
```bash
cd /Users/dennisvocke/dev/se_projects/fundingApp
npm run db:up
cd apps/api && npx prisma migrate dev && npm run seed
```

## Lokal starten
```bash
npm run dev   # web + api (Repo-Root)
```

## Demo-Flow (Spender-Bindung)
1. Login als `donor@bursa.test` (Passwort `bursa1234`).
2. Eine Kampagne öffnen, **mit Tribute** spenden ("In honour of …") — die Spende
   landet in der Historie (`/donor`), Beleg abrufbar; sofortiger Dank im Feed.
3. Auf der Kampagne "Make this monthly" aktivieren → Recurring-Pledge im Account.
4. Im Account "Simulate next charge" (`POST /donors/me/recurring/run`) → neue
   Spende + Recurring-Notification.
5. Als Studierender (`amara@bursa.test`) im Dashboard ein **Impact-Update**
   posten → der abonnierte Spender bekommt In-App- + (geloggte) E-Mail-
   Benachrichtigung.
6. Erreicht eine Kampagne 80/90/100%, erhalten Abonnenten Meilenstein-
   Notifications.

## Tests / Verify
```bash
npm --prefix apps/api test
npm --prefix apps/web run test:cov
npm --prefix apps/api run build
npm --prefix apps/web run build
```

## Wichtig
- Recurring ist SIMULIERT (Payment-Engine), kein echtes Billing.
- E-Mails werden nur als Notification-Zeile persistiert, nie versandt.
- Anonyme (nicht eingeloggte) Spende bleibt möglich; nur eingeloggte Spender
  bekommen Historie/Notifications.
