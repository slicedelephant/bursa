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
  },
};
