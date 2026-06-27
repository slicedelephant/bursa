import { setupZoneTestEnv } from 'jest-preset-angular/setup-env/zone';

// Bursa web still runs zone.js (see angular.json polyfills), so use the zone-based
// Angular test environment. Switch to setup-env/zoneless if we drop zone.js later.
setupZoneTestEnv();
