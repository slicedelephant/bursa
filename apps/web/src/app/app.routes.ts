import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'campaigns' },
  {
    path: 'campaigns',
    loadComponent: () => import('./features/gallery/gallery.page').then((m) => m.GalleryPage),
  },
  {
    path: 'campaigns/:id',
    loadComponent: () => import('./features/campaign/campaign.page').then((m) => m.CampaignPage),
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/register.page').then((m) => m.RegisterPage),
  },
  {
    path: 'student',
    canActivate: [authGuard],
    data: { roles: ['STUDENT'] },
    loadComponent: () => import('./features/student/student.page').then((m) => m.StudentPage),
  },
  {
    path: 'sponsor',
    canActivate: [authGuard],
    data: { roles: ['SPONSOR'] },
    loadComponent: () => import('./features/sponsor/sponsor.page').then((m) => m.SponsorPage),
  },
  {
    path: 'donor',
    canActivate: [authGuard],
    data: { roles: ['DONOR'] },
    loadComponent: () => import('./features/donor/donor.page').then((m) => m.DonorPage),
  },
  {
    path: 'admin',
    canActivate: [authGuard],
    data: { roles: ['ADMIN'] },
    loadComponent: () => import('./features/admin/admin.page').then((m) => m.AdminPage),
  },
  {
    path: 'admin/observability',
    canActivate: [authGuard],
    data: { roles: ['ADMIN'] },
    loadComponent: () =>
      import('./features/admin/observability/observability-dashboard.component').then(
        (m) => m.ObservabilityDashboardComponent,
      ),
  },
  {
    path: 'admin/trust-safety',
    canActivate: [authGuard],
    data: { roles: ['ADMIN'] },
    loadComponent: () =>
      import('./features/admin/trust-safety/trust-safety.page').then((m) => m.TrustSafetyPage),
  },
  {
    path: 'admin/kyc',
    canActivate: [authGuard],
    data: { roles: ['ADMIN'] },
    loadComponent: () =>
      import('./features/admin/kyc/kyc-review.page').then((m) => m.KycReviewPage),
  },
  {
    path: 'admin/csrd',
    canActivate: [authGuard],
    data: { roles: ['ADMIN'] },
    loadComponent: () => import('./features/admin/csrd/csrd.page').then((m) => m.CsrdPage),
  },
  {
    path: 'account',
    canActivate: [authGuard],
    loadComponent: () => import('./features/account/account.page').then((m) => m.AccountPage),
  },
  {
    // Groups engine (E18): cohort teams + giving circles, for any signed-in user.
    path: 'groups',
    canActivate: [authGuard],
    loadComponent: () => import('./features/groups/groups.page').then((m) => m.GroupsPage),
  },
  {
    // Public hosted onboarding flow (token-gated) — declared before /school.
    path: 'school/onboarding/:token',
    loadComponent: () =>
      import('./features/school/onboarding.page').then((m) => m.SchoolOnboardingPage),
  },
  {
    path: 'school',
    canActivate: [authGuard],
    data: { roles: ['SCHOOL_ADMIN'] },
    loadComponent: () => import('./features/school/school.page').then((m) => m.SchoolPage),
  },
  {
    // Public, embeddable per-school transparency page (no auth).
    path: 'transparency/:schoolId',
    loadComponent: () =>
      import('./features/transparency/transparency.page').then((m) => m.TransparencyPage),
  },
  { path: '**', redirectTo: 'campaigns' },
];
