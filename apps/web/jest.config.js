// Jest config for the Bursa web app (Angular 20 + jest-preset-angular 17).
// Runs headless on jsdom — no browser/Chrome needed, so it is reliable in CI.
// The preset wires up testEnvironment: jsdom, the Angular transform and
// transformIgnorePatterns, and points the transform at tsconfig.spec.json.
/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-preset-angular',
  setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],
  testMatch: ['<rootDir>/src/**/*.spec.ts'],
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/dist/'],
  coverageDirectory: '<rootDir>/coverage',
  collectCoverageFrom: [
    'src/app/**/*.ts',
    '!src/app/**/*.spec.ts',
    '!src/app/**/*.routes.ts',
    '!src/main.ts',
  ],
  coverageReporters: ['text-summary', 'text', 'html', 'lcov'],
  coverageThreshold: {
    // Floor for the whole app today: existing/untested code must not regress,
    // but is not yet held to 80%. New code is gated per-path below.
    global: {
      statements: 0,
      branches: 0,
      functions: 0,
      lines: 0,
    },
    // New code (Trust Layer + freshly tested modules) must hold >= 80%.
    // Add each new file/dir here as it gains tests, e.g.:
    //   './src/app/features/trust/**/*.ts': { statements: 80, ... }
    './src/app/core/money.pipe.ts': {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
    './src/app/features/campaign/relative-time.ts': {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
    './src/app/shared/trust-badges.component.ts': {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
    './src/app/features/campaign/trust-panel.component.ts': {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
    './src/app/features/campaign/payout-proof.component.ts': {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
    './src/app/features/campaign/goal-math.ts': {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
    './src/app/features/campaign/campaign-progress.component.ts': {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
    // E3 — Kampagnen-Erfolgs-Engine (new code, held to >= 80%).
    './src/app/features/campaign/video-embed.ts': {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
    './src/app/features/campaign/share-links.ts': {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
    './src/app/features/campaign/campaign-video.component.ts': {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
    './src/app/features/campaign/share-toolkit.component.ts': {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
    './src/app/features/student/story-framework.ts': {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
    './src/app/features/student/campaign-wizard.storage.ts': {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
    './src/app/features/student/campaign-wizard.component.ts': {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
    // E4 — Donor Retention Loop (new code, held to >= 80%).
    './src/app/features/donor/donor-summary.ts': {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
    './src/app/features/donor/notification-format.ts': {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
    './src/app/features/donor/tribute-display.ts': {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
    './src/app/features/donor/notifications-feed.component.ts': {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
    './src/app/features/donor/donation-history.component.ts': {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
    './src/app/features/donor/recurring-list.component.ts': {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
    // E5 — Corporate Channel (new code, held to >= 80%).
    './src/app/features/corporate/gift-tiers.ts': {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
    './src/app/features/corporate/esg-format.ts': {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
    './src/app/features/corporate/recognition-banner.component.ts': {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
    './src/app/features/corporate/esg-dashboard.component.ts': {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
    './src/app/features/corporate/corporate-sponsor-box.component.ts': {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
    // E6 — Security-Hardening (new code, held to >= 80%).
    './src/app/core/password-strength.ts': {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
    './src/app/core/pii-mask.ts': {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
    './src/app/features/account/account-security.ts': {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
    './src/app/features/auth/password-strength-meter.component.ts': {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
    './src/app/features/account/privacy-panel.component.ts': {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
    // E7 — Observability & funnel analytics (new code, held to >= 80%).
    './src/app/core/visitor-id.ts': {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
    './src/app/core/analytics-consent.ts': {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
    './src/app/core/funnel-events.ts': {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
    './src/app/core/analytics.service.ts': {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
    './src/app/features/admin/observability/funnel-format.ts': {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
    './src/app/features/admin/observability/metrics-format.ts': {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
    './src/app/features/admin/observability/slo-format.ts': {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
    './src/app/features/admin/observability/funnel-chart.component.ts': {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
    './src/app/features/admin/observability/metrics-panel.component.ts': {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
    './src/app/features/admin/observability/slo-panel.component.ts': {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
    './src/app/shared/consent-banner.component.ts': {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
    // E8 — School Self-Serve Portal (pure helpers, held to >= 80%).
    './src/app/features/school/onboarding-progress.ts': {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
    './src/app/features/school/admission-status.ts': {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
    './src/app/features/school/school-dashboard-format.ts': {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
    // E9 — Trust-and-Safety console (pure helpers, held to >= 80%).
    './src/app/features/admin/trust-safety/risk-format.ts': {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
    './src/app/features/admin/trust-safety/moderation-format.ts': {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
    './src/app/features/admin/trust-safety/chargeback-format.ts': {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
    './src/app/features/student/ai-coach.helpers.ts': {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
    // E11 — KYC & Verification Pipeline (new code, held to >= 80%).
    './src/app/features/student/kyc-status.ts': {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
    './src/app/features/student/kyc-verification.component.ts': {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
    './src/app/features/admin/kyc/kyc-review-format.ts': {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
    './src/app/features/admin/kyc/kyc-review-queue.component.ts': {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
    './src/app/features/sponsor/aml-status.ts': {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
    './src/app/features/sponsor/aml-status.component.ts': {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
    // E12 — Payout Reconciliation & Transparency (new code, held to >= 80%).
    './src/app/features/school/reconciliation-format.ts': {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
    './src/app/features/school/reconciliation-panel.component.ts': {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
    './src/app/features/transparency/transparency-format.ts': {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
    './src/app/features/transparency/transparency.page.ts': {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
    // E13 — Employer Matching (new code, held to >= 80%).
    './src/app/features/matching/match-format.ts': {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
    './src/app/features/matching/employer-label.ts': {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
    './src/app/features/matching/match-offer.component.ts': {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
    './src/app/features/matching/match-balance.component.ts': {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
    './src/app/features/matching/claim-history.component.ts': {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
    // E14 — ESG/CSRD reporting (pure helpers + presentational components).
    './src/app/features/corporate/csrd-format.ts': {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
    './src/app/features/corporate/data-quality-format.ts': {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
    './src/app/features/corporate/trend-format.ts': {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
    './src/app/features/corporate/auditor-grant-format.ts': {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
    './src/app/features/corporate/data-quality-panel.component.ts': {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
    './src/app/features/corporate/trend-chart.component.ts': {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
    './src/app/features/corporate/auditor-access-panel.component.ts': {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
    './src/app/features/corporate/report-builder.component.ts': {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
    // E16 — Donor Portfolio & Giving-Streaks (pure helpers + presentational components).
    './src/app/features/donor/streak-format.ts': {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
    './src/app/features/donor/portfolio-stats.ts': {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
    './src/app/features/donor/streak-banner.component.ts': {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
    './src/app/features/donor/portfolio-stats.component.ts': {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
    './src/app/features/donor/portfolio-grid.component.ts': {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
  },
};
