# Data Model — Feature 016 Spender-Portfolio & Giving-Streaks (E16)

## Keine Persistenz-Änderung

E16 führt **keine** Prisma-Modelle, -Felder oder -Enums ein. `schema.prisma` bleibt
unverändert; `migrate diff --exit-code` muss "No difference detected" liefern. Alle
Werte werden on read aus bestehenden Modellen abgeleitet.

## Genutzte bestehende Modelle (read-only)

- **Donation** — `donorUserId`, `campaignId`, `amountCents`, `status`, `createdAt`.
  Gezählt werden nur `PLEDGED | CAPTURED | SUCCEEDED` (wie E4 `DonorsService.COUNTED`).
- **Campaign** — `title`, `raisedCents`, `goalCents`, `status`, plus `verification`
  (E1) für den Trust-State.
- **StudentProfile** — `fullName`, `photoUrl`, `country`.
- **School** — `name`.

## View-Typen (rein, keine DB)

### Gamification-Primitive (donation-frei)

```ts
// streak.util.ts
interface StreakState {
  currentMonths: number;        // Monate in Folge bis (einschl.) Referenzmonat/Vormonat
  longestMonths: number;        // längste je erreichte Serie
  currentMonthCovered: boolean; // ist der Referenzmonat bereits erfüllt?
  lastActiveMonth: string | null; // "YYYY-MM" oder null
}

// badge.util.ts
type Tier = 'NONE' | 'BRONZE' | 'SILVER' | 'GOLD';
interface BadgeProgress {
  tier: Tier;
  streakMonths: number;
  nextTier: Tier | null;        // null bei GOLD
  monthsToNextTier: number | null;
}

// leaderboard.util.ts
interface LeaderboardInput { id: string; label: string; score: number }
interface LeaderboardEntry extends LeaderboardInput { rank: number }

// cumulative.util.ts
interface ContributionInput { targetId: string; valueCents: number; at: Date | string }
interface CumulativeStats {
  totalCents: number;
  contributionCount: number;
  distinctTargets: number;
  impactPerTargetCents: number; // totalCents / distinctTargets (0 wenn keine)
  firstMonth: string | null;    // "YYYY-MM"
  lastMonth: string | null;
}

// peer-comparison.util.ts
interface PeerComparison {
  yourValue: number;
  peerAverage: number;          // auf 1 Dezimale gerundet
  ratio: number;                // yourValue / peerAverage (0 wenn avg 0)
  ahead: boolean;               // yourValue >= peerAverage
}
```

### Portfolio-View (donation-spezifisch, vom Service gebaut)

```ts
interface PortfolioItem {
  campaignId: string;
  studentName: string;
  photoUrl: string | null;
  country: string;
  schoolName: string;
  campaignTitle: string;
  raisedCents: number;
  goalCents: number;
  percent: number;              // 0..100, gerundet
  verified: boolean;            // E1 Trust-State
  yourContributionCents: number;
  canDonateAgain: boolean;      // Kampagne ist LIVE
}

interface PortfolioView {
  items: PortfolioItem[];
  streak: StreakState;
  badge: BadgeProgress;
  stats: CumulativeStats;
  peer: PeerComparison;
}
```

## Invarianten

- Portfolio-Items nur aus gezählten Spenden; `FAILED/EXPIRED/PENDING` erscheinen nie.
- `distinctTargets` (Stats) == Anzahl Portfolio-Items.
- `impactPerTargetCents == totalCents / distinctTargets` (ganzzahlig, 0 bei 0 Targets).
- Streak ist deterministisch zum injizierten Referenzdatum; identische Inputs → identischer
  Output (keine Zeit-Abhängigkeit in reiner Logik).
- Keine Mutation: alle Primitive/Utils geben neue Strukturen zurück.
