import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ApiService } from './api.service';
import { AuthUser, Role, Session } from './models';

const TOKEN_KEY = 'bursa_token';
const USER_KEY = 'bursa_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  readonly user = signal<AuthUser | null>(this.restoreUser());
  readonly isLoggedIn = computed(() => this.user() !== null);
  readonly role = computed(() => this.user()?.role ?? null);

  get token(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  login(email: string, password: string): Observable<Session> {
    return this.api.login({ email, password }).pipe(tap((s) => this.persist(s)));
  }

  register(body: {
    email: string;
    password: string;
    displayName: string;
    role?: 'DONOR' | 'STUDENT' | 'SPONSOR';
  }): Observable<Session> {
    return this.api.register(body).pipe(tap((s) => this.persist(s)));
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.user.set(null);
    void this.router.navigate(['/']);
  }

  hasRole(...roles: Role[]): boolean {
    const r = this.user()?.role;
    return r ? roles.includes(r) : false;
  }

  homeForRole(): string {
    switch (this.user()?.role) {
      case 'STUDENT':
        return '/student';
      case 'SPONSOR':
        return '/sponsor';
      case 'ADMIN':
        return '/admin';
      default:
        return '/campaigns';
    }
  }

  private persist(s: Session): void {
    localStorage.setItem(TOKEN_KEY, s.token);
    localStorage.setItem(USER_KEY, JSON.stringify(s.user));
    this.user.set(s.user);
  }

  private restoreUser(): AuthUser | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? (JSON.parse(raw) as AuthUser) : null;
    } catch {
      return null;
    }
  }
}
