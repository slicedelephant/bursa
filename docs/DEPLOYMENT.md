# Bursa - Deployment auf littleBrother (Docker + Traefik)

Bursa laeuft als eigener Service-Stack hinter dem bestehenden Traefik auf **littleBrother**
(`slicedelephant.de`, IP `37.120.187.6`). Muster wie die anderen Services dort: eigener Ordner,
`proxy`-Netzwerk fuer HTTPS, `internal`-Netzwerk fuer die DB, TLS via `mytlschallenge`.

**Topologie:** `web` (nginx, liefert das Angular-Build aus + proxyt `/api` an den Backend-Container)
ist das einzige nach aussen sichtbare Stueck. `api` (NestJS) und `db` (Postgres) sind nur intern.
Eine Subdomain, ein Origin, kein CORS.

```
Internet ──HTTPS──> Traefik ──> web (nginx) ──/api──> api (NestJS) ──> db (Postgres)
                                  └ liefert Angular + /seed/*.png
```

## 1. DNS-Eintrag setzen

Subdomain auf die littleBrother-IP zeigen lassen (lokal, Netcup-Creds aus `06_IT/.env`):

```bash
dns-add slicedelephant.de bursa A 37.120.187.6
dns-list slicedelephant.de | grep bursa   # pruefen
```

(Oder im Netcup-Webinterface: A-Record `bursa` -> `37.120.187.6`.)

## 2. Code auf den VPS bringen

```bash
ssh dennisvocke@littleBrother        # bzw. dennisvocke@37.120.187.6
git clone https://github.com/slicedelephant/fundingApp.git ~/apps/bursa
cd ~/apps/bursa
```

## 3. Prod-Env anlegen

```bash
cp .env.prod.example .env
# .env editieren: POSTGRES_PASSWORD und JWT_SECRET setzen (z.B. `openssl rand -hex 32`),
# SUBDOMAIN/DOMAIN_NAME pruefen (Default: bursa.slicedelephant.de).
```

## 4. Starten (baut die Images auf dem VPS, arm64-nativ)

Das `proxy`-Netzwerk existiert bereits (Traefik laeuft). Dann:

```bash
docker compose -f docker-compose.prod.yml --env-file .env up -d --build
```

Beim Start des `api`-Containers laufen automatisch:
- `prisma migrate deploy` (Schema), dann
- der Seed (wenn `SEED_ON_START=true`) -> 11 Kampagnen + die mitcommitteten KI-Portraits.

Traefik holt das Let's-Encrypt-Zertifikat automatisch (kann 30-60 s dauern).

## 5. Pruefen

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f api    # "Bursa API ready"
```

Dann im Browser: **https://bursa.slicedelephant.de**
Demo-Login (`bursa1234`): `admin@bursa.test`, `sponsor@acme.test`, `donor@bursa.test`, `amara@bursa.test`.

## Betrieb

```bash
# Update nach git push:
cd ~/apps/bursa && git pull && docker compose -f docker-compose.prod.yml up -d --build

# Demo-Daten manuell neu seeden (falls SEED_ON_START=false):
docker compose -f docker-compose.prod.yml exec api npm run seed

# Stoppen / Logs:
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml logs -f web
```

**Hinweis Demo-Daten:** Bei `SEED_ON_START=true` werden die Demo-Daten bei **jedem** Container-Neustart
zurueckgesetzt (sauberer oeffentlicher Demo-Zustand). Sollen Spenden/Aenderungen ueber Neustarts hinweg
erhalten bleiben, `SEED_ON_START=false` setzen und den Seed einmalig manuell laufen lassen.

## Wichtig: nur ein Demo-Prototyp

Payments sind **gemockt** (keine echten Zahlungen; Betraege endend auf `.13` schlagen absichtlich fehl).
Die Daten/Gesichter sind synthetisch. Vor einem echten Public-Launch braucht es echte Payments
(Stripe Connect statt `MockPaymentProvider`), echte Verifizierung und ein Rechtskonstrukt - siehe
`docs/WALKTHROUGH.md` und die Marktrecherche.

## Troubleshooting

- **Kein Zertifikat / 404 von Traefik:** DNS noch nicht propagiert, oder `proxy`-Netzwerk fehlt
  (`docker network ls | grep proxy`). Traefik-Logs: `docker logs traefik`.
- **`web` erreichbar, aber API-Fehler:** `docker compose ... logs api` (DB-Verbindung? Migration?).
- **Port-/Build-Fehler beim ersten `up --build`:** genug Platz? `docker system df`. Build dauert beim
  ersten Mal ein paar Minuten (Angular + NestJS).
- **Bilder fehlen:** die Portraits liegen committed unter `apps/web/public/seed/` und werden vom
  nginx als `/seed/*.png` ausgeliefert; ein frischer Clone hat sie dabei.
