# API Contracts — Feature 022 Payroll-Match & HRIS-Kopplung (E21)

Alle Antworten im globalen `{success, data, error}`-Envelope (via `ApiResponseInterceptor`).
Boundary-Fehler werden als `DomainException(code, message, status)` geworfen. Money-Endpunkte
zielen ausschließlich auf die SCHULE (Constitution II).

## Payroll & HRIS (`@Controller('payroll')`)

### POST /payroll/connect (`SPONSOR` / `ADMIN`)
Koppelt ein HRIS an das eingeloggte Corporate-Profil. Die angeforderten Scopes werden read-only-
validiert; ein Write-Scope wird abgelehnt.
```
Body: { corporateProfileId, provider: "MOCK"|"ADP"|..., scopes: string[], programName }
200:  { connectionId, provider, status: "CONNECTED", scopes, programId }
400:  INVALID_SCOPES  — der Scope-Satz enthält einen Schreib-/Payroll-Write-Scope
404:  NOT_FOUND       — Corporate-Profil nicht gefunden
```

### POST /payroll/sync (`SPONSOR` / `ADMIN`)
Zieht Mitarbeiter über den `EmployeeDataProvider` (Mock) und legt/aktualisiert `EmployeePayrollProfile`s an.
```
Body: { connectionId }
200:  { connectionId, status: "SYNCED", employeeCount, syncedAt }
404:  NOT_FOUND       — Verbindung nicht gefunden
409:  NOT_CONNECTED   — Verbindung ist nicht im Status CONNECTED/SYNCED
```

### POST /payroll/rule (`SPONSOR` / `ADMIN`)
Setzt/aktualisiert die firmenweite Match-Regel eines Programms.
```
Body: { programId, matchRatio: number (×100), perEmployeeCapCents: number }
200:  { programId, matchRatio, perEmployeeCapCents }
400:  INVALID_RULE    — matchRatio/cap negativ
404:  NOT_FOUND       — Programm nicht gefunden
```

### GET /payroll/employees/:connectionId (`SPONSOR` / `ADMIN`)
Listet die synchronisierten Mitarbeiter + Aktivierungsstatus + verbleibendes Budget.
```
200:  { activatedCount, totalCount, employees: [{ id, employeeExternalId, active, remainingCents, payrollCycle }] }
404:  NOT_FOUND
```

### POST /payroll/activate (eingeloggt)
Employee-seitiges Payroll-Giving-Opt-in.
```
Body: { employeeProfileId }
200:  { employeeProfileId, active: true, remainingCents }
404:  NOT_FOUND
```

### POST /payroll/campaign (`SPONSOR` / `ADMIN`)
Löst eine Payroll-Giving-Campaign ("Match Month") aus: berechnet für jeden aktiven Mitarbeiter das
E13-Match, bucht die gematchte `CORPORATE`-Donation auf die Schul-Kampagne, schreibt den Ledger-Trail
und emittiert das Mock-Payroll-Line-Item. Money an die SCHULE.
```
Body: { programId, campaignId, defaultContributionCents, preTax? }
200:  { programId, campaignId, contributions: number, totalContributionCents, totalMatchCents, totalToSchoolCents }
400:  INVALID_AMOUNT  — Beitrag < 1
404:  NOT_FOUND       — Programm/Kampagne nicht gefunden
409:  NO_RULE         — keine Match-Regel konfiguriert
409:  NO_ACTIVE_EMPLOYEES — keine aktivierten Mitarbeiter
```

### GET /payroll/trail?corporateProfileId= (`SPONSOR` / `ADMIN`)
Read-only Compliance-/Sync-Trail (E6-Audit-Einträge `payroll.*`).
```
200:  [{ action, targetType, targetId, createdAt, metadata }]
```

## HRIS-Sync Webhook (`@Controller('payroll')`, `HrisWebhookGuard`, rawBody)

### POST /payroll/webhook (signatur-geprüft)
Mock-HRIS-Statusmeldung (z.B. Sync abgeschlossen / Fehler). Signatur im E6-Muster.
```
Header: x-hris-signature: t=<unix>,v1=<hmac-sha256>
Body:   { connectionId, status: "SYNCED"|"ERROR", note? }
200:    { connectionId, status }
400:    INVALID_SIGNATURE — Signaturprüfung fehlgeschlagen (fail-closed)
404:    NOT_FOUND
```

## Fehler-Codes

| Code | Status | Bedeutung |
|---|---|---|
| `INVALID_SCOPES` | 400 | Scope-Satz enthält einen Schreib-/Payroll-Write-Scope |
| `INVALID_RULE` | 400 | Match-Ratio/Cap negativ |
| `INVALID_AMOUNT` | 400 | Beitrag < 1 minor unit |
| `NOT_FOUND` | 404 | Ressource (Profil/Verbindung/Programm/Kampagne) nicht gefunden |
| `NOT_CONNECTED` | 409 | HRIS-Verbindung nicht im gültigen Status |
| `NO_RULE` | 409 | Programm hat keine Match-Regel |
| `NO_ACTIVE_EMPLOYEES` | 409 | keine aktivierten Mitarbeiter für die Campaign |
| `INVALID_SIGNATURE` | 400 | Webhook-Signaturprüfung fehlgeschlagen |

## Muster (kein Endpoint)

- **Provider-Seam:** Employee-Daten ausschließlich über `EMPLOYEE_DATA_PROVIDER` (Mock-Default).
- **Matching:** Betrag über E13 `computeMatch` (Ratio + Per-Mitarbeiter-Cap).
- **Payout:** gematchte Donation über E2-`PaymentProvider` an die Schule; append-only `LedgerEntry` (E12).
- **Audit:** jeder Schritt schreibt über den E6-`AuditService` (`payroll.*`).
