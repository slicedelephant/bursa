# Feature Specification: Trust-Layer (E1)

**Feature Branch**: `002-trust-layer`

**Created**: 2026-06-27

**Status**: Draft

**Input**: Epic E1 aus `docs/roadmap-epics.md` - Verification-Badges + Direktfluss-Beweis sichtbar machen.

## Context

Bursas USP ist Vertrauen, aber Verifizierung, Direktauszahlung an die Schule und Beleg laufen heute
unsichtbar im Backend. Dieses Epic macht die bereits gebauten Trust-Mechaniken vor der Spende
sichtbar (hoher Conversion-Hebel, kleiner Build). Keine neuen Domain-Entitaeten - es exponiert und
visualisiert vorhandene Daten (AdmissionVerification, School.payoutVerified, Payout).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Trust-Signale vor der Spende (Priority: P1)

Ein Spender oeffnet eine Kampagne und sieht OBERHALB des Spenden-CTAs einen Trust-Block:
Verifizierungs-Badges (Identitaet geprueft, Zulassung verifiziert, Schule bestaetigt) mit
Erklaer-Tooltip und die Aussage "Bursa zahlt direkt an die Schule, nie an den Studierenden".

**Independent Test**: Verifizierte Kampagne oeffnen -> Trust-Block mit allen Badges + Direktfluss-Aussage ist vor dem Spenden-CTA sichtbar.

**Acceptance Scenarios**:
1. **Given** eine verifizierte LIVE-Kampagne, **When** der Spender die Detailseite oeffnet, **Then** zeigt ein Trust-Block die Badges (Zulassung verifiziert, Schule bestaetigt) + "direct to school"-Aussage oberhalb des Spenden-CTAs.
2. **Given** eine Kampagne, deren Schule payout-verifiziert ist, **When** die Detailseite laedt, **Then** wird das "Schule bestaetigt"-Badge angezeigt; ist die Schule nicht verifiziert, fehlt es (aber LIVE setzt es ohnehin voraus).

### User Story 2 - Oeffentlicher Auszahlungs-Beleg (Priority: P1)

Nach Goal-Erreichung und Auszahlung sieht jeder oeffentlich einen Beleg "Ausgezahlt an [Schule]
am [Datum], Referenz [ref]" auf der Kampagnenseite.

**Independent Test**: Eine DISBURSED-Kampagne oeffnen -> Auszahlungs-Beleg (Schule, Datum, Referenz) ist oeffentlich sichtbar.

**Acceptance Scenarios**:
1. **Given** eine DISBURSED-Kampagne mit Payout, **When** die Detailseite laedt, **Then** zeigt ein Beleg-Block Schule, Betrag, Datum und Referenz der Auszahlung.
2. **Given** eine LIVE/FUNDED-Kampagne ohne Payout, **When** die Detailseite laedt, **Then** wird kein Beleg, sondern das Versprechen "Auszahlung erfolgt direkt an die Schule" gezeigt.

### User Story 3 - Badge-Vorschau in der Gallery (Priority: P2)

In der Gallery-Liste zeigt jede Karte bereits ein "verifiziert"-Badge, sodass Vertrauen schon vor
dem Klick sichtbar ist.

**Independent Test**: Gallery oeffnen -> jede Karte einer verifizierten Kampagne zeigt das Verified-Badge.

**Acceptance Scenarios**:
1. **Given** verifizierte Kampagnen, **When** die Gallery laedt, **Then** zeigt jede Karte das Verified-Badge (wiederverwendbare Komponente).

### Edge Cases
- Kampagne ohne Verifizierung erscheint nie oeffentlich (bestehende Invariante) -> Trust-Block nur fuer sichtbare Kampagnen.
- DISBURSED-Kampagne ohne Payout-Datensatz -> Beleg-Block faellt sauber auf die Versprechen-Variante zurueck.

## Requirements *(mandatory)*

### Functional Requirements
- **FR-001**: Die oeffentliche Kampagnen-Detail-Antwort MUSS Trust-Daten liefern: Verifizierungs-Status, ob die Schule payout-verifiziert ist, und (falls DISBURSED) den Payout-Beleg (Betrag, Methode, Referenz, Datum, Schulname).
- **FR-002**: Die Kampagnenseite MUSS einen Trust-Block oberhalb des Spenden-CTAs rendern: Badges + Erklaer-Tooltip + "direct to school"-Aussage.
- **FR-003**: Fuer DISBURSED-Kampagnen MUSS ein oeffentlicher Auszahlungs-Beleg angezeigt werden; sonst das Direktauszahlungs-Versprechen.
- **FR-004**: Die Gallery-Karte MUSS eine wiederverwendbare Trust/Badge-Komponente nutzen (Verified-Vorschau).
- **FR-005**: Eine "So funktioniert der Geldfluss"-Erklaerung (Spender -> Bursa-Traeger -> Schule, kein Fremdgeld) MUSS auf der Kampagnenseite zugaenglich sein (Sektion oder Tooltip/Panel).
- **FR-006**: Es duerfen KEINE nicht-oeffentlichen Daten exponiert werden (keine internen Verifizierer-IDs, keine Spender-PII ueber die bestehende Anonymitaetsregel hinaus).

### Key Entities *(include if feature involves data)*
- Keine neuen Entitaeten. Wiederverwendung: **AdmissionVerification** (status), **School** (payoutVerified, name), **Payout** (amount, reference, status, sentAt). Neue read-only **TrustSummary**-Projektion auf der Detail-Antwort.

## Success Criteria *(mandatory)*
- **SC-001**: 100% der oeffentlich sichtbaren Kampagnen zeigen das vollstaendige Badge-Set (Zulassung verifiziert + Schule bestaetigt).
- **SC-002**: Jede DISBURSED-Kampagne zeigt oeffentlich einen Auszahlungs-Beleg mit Schule, Datum und Referenz.
- **SC-003**: Der Trust-Block steht oberhalb des Spenden-CTAs (nicht im Footer) auf jeder Kampagnenseite.
- **SC-004**: Testabdeckung des Epics >= 80% (Backend-Trust-Projektion + Frontend-Trust-Komponenten).

## Assumptions
- Reuse der bestehenden Verifizierungs-/Payout-Daten; kein neues Schema, keine Migration noetig (ggf. nur Projektions-/DTO-Erweiterung).
- "Identitaet geprueft" wird im Prototyp aus dem VERIFIED-Status abgeleitet (symbolisch), keine echte Ident-Pruefung.
- Sprache der UI: Englisch (bestehende Konvention).
