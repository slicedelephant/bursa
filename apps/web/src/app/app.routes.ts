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
    path: 'account',
    canActivate: [authGuard],
    loadComponent: () => import('./features/account/account.page').then((m) => m.AccountPage),
  },
  { path: '**', redirectTo: 'campaigns' },
];
