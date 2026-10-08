import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { AuthUser, UserRole } from '../models/UserRole';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly key = 'edutaller_user';
  private readonly noticeKey = 'edutaller_login_notice';
  private readonly logoutRouteKey = 'edutaller_logout_route';

  private userSubject = new BehaviorSubject<AuthUser | null>(this.getUserFromStorage());
  user$ = this.userSubject.asObservable();

  private sessionMonitor?: ReturnType<typeof setInterval>;

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (event) => this.onStorageEvent(event));
    }

    this.user$.subscribe(user => {
      this.configureSessionMonitor(user);
    });
  }

  // LOGIN REAL (sirve para alumno, docente y administrador)
  login(email: string, password: string): Observable<AuthUser> {
    return this.http.post<AuthUser>(`${environment.apiUrl}/auth/login`, {
      email,
      password
    }).pipe(
      tap(user => {
        this.clearNotice();
        this.saveUser(user);
      })
    );
  }

  // REGISTRO REAL (solo crea alumnos)
  register(data: {
    nombres: string;
    email: string;
    password: string;
    telefono: string;
  }): Observable<AuthUser> {
    return this.http.post<AuthUser>(`${environment.apiUrl}/auth/register`, data)
      .pipe(
        tap(user => {
          this.clearNotice();
          this.saveUser(user);
        })
      );
  }

  // PERFIL
  me(): Observable<AuthUser> {
    return this.http.get<AuthUser>(`${environment.apiUrl}/auth/me`);
  }

  /**
   * Cierra sesion. Si se provee mensaje y/o ruta, se usa para expulsiones
   * por cuenta suspendida o token invalido.
   */
  logout(message?: string, delayMs = 0, redirectTo?: string): void {
    const targetRoute = redirectTo ?? this.getLoginRoute();

    const exec = (): void => {
      try {
        if (message) {
          localStorage.setItem(this.noticeKey, message);
        } else {
          this.clearNotice();
        }
        localStorage.setItem(this.logoutRouteKey, targetRoute);
        localStorage.removeItem(this.key);
      } catch { /* noop */ }

      this.userSubject.next(null);

      if (redirectTo || targetRoute) {
        this.router.navigate([targetRoute]);
      }
    };

    if (delayMs > 0) {
      setTimeout(exec, delayMs);
    } else {
      exec();
    }
  }

  get currentUser(): AuthUser | null {
    return this.userSubject.value;
  }

  get token(): string | null {
    return this.currentUser?.token ?? null;
  }

  isLoggedIn(): boolean {
    return !!this.currentUser;
  }

  hasValidSession(): boolean {
    const token = this.token;
    if (!token) return false;
    return !this.isTokenExpired(token);
  }

  isAdministrador(): boolean {
    return this.currentUser?.rol === 'administrador';
  }

  isDocente(): boolean {
    return this.currentUser?.rol === 'docente';
  }

  hasRole(role: UserRole): boolean {
    return this.currentUser?.rol === role;
  }

  getPendingNotice(): string {
    try {
      const msg = localStorage.getItem(this.noticeKey);
      return msg ? msg : '';
    } catch {
      return '';
    }
  }

  clearPendingNotice(): void {
    this.clearNotice();
  }

  // Alumno usa /ingresar, docente/administrador usan /admin/ingresar
  getLoginRouteForRole(role?: UserRole | null): string {
    return role === 'administrador' || role === 'docente' ? '/admin/ingresar' : '/ingresar';
  }

  getLoginRoute(): string {
    return this.getLoginRouteForRole(this.currentUser?.rol ?? null);
  }

  private saveUser(user: AuthUser): void {
    localStorage.setItem(this.key, JSON.stringify(user));
    localStorage.removeItem(this.logoutRouteKey);
    this.userSubject.next(user);
  }

  /**
   * Actualiza los datos del usuario en sesion (ej. tras editar el propio
   * perfil) sin necesidad de cerrar sesion y volver a entrar. Cualquier
   * componente que muestre auth.currentUser (como el sidebar) se refresca
   * solo porque currentUser lee de userSubject reactivamente.
   */
  updateLocalUser(patch: Partial<AuthUser>): void {
    const current = this.currentUser;
    if (!current) return;
    this.saveUser({ ...current, ...patch });
  }

  private clearNotice(): void {
    try {
      localStorage.removeItem(this.noticeKey);
    } catch { /* noop */ }
  }

  private onStorageEvent(event: StorageEvent): void {
    if (event.key === this.key && !event.newValue) {
      // Otra pestana cerro sesion
      this.userSubject.next(null);
      this.configureSessionMonitor(null);
      const route = localStorage.getItem(this.logoutRouteKey) || '/ingresar';
      try { localStorage.removeItem(this.logoutRouteKey); } catch { /* noop */ }
      if (location.pathname !== route) {
        this.router.navigate([route]);
      }
      return;
    }

    if (event.key === this.key && event.newValue) {
      try {
        const user = JSON.parse(event.newValue) as AuthUser;
        this.userSubject.next(user);
      } catch {
        // ignore
      }
    }
  }

  private configureSessionMonitor(user: AuthUser | null): void {
    if (this.sessionMonitor) {
      clearInterval(this.sessionMonitor);
      this.sessionMonitor = undefined;
    }

    if (!user) return;

    this.sessionMonitor = setInterval(() => {
      const current = this.currentUser;
      if (!current) return;

      // Validacion silenciosa: si el backend responde 401/403, el
      // interceptor cerrara la sesion y redirigira automaticamente.
      this.me().subscribe({
        next: () => void 0,
        error: () => void 0
      });
    }, 15000);
  }

  private getUserFromStorage(): AuthUser | null {
    const data = localStorage.getItem(this.key);
    if (!data) return null;

    try {
      const user = JSON.parse(data) as AuthUser;
      if (user?.token && this.isTokenExpired(user.token)) {
        localStorage.removeItem(this.key);
        return null;
      }
      return user;
    } catch {
      localStorage.removeItem(this.key);
      return null;
    }
  }

  private isTokenExpired(token: string): boolean {
    const exp = this.getTokenExpiration(token);
    return !exp || Date.now() >= exp * 1000;
  }

  private getTokenExpiration(token: string): number | null {
    try {
      const part = token.split('.')[1] ?? '';
      const normalized = part.replace(/-/g, '+').replace(/_/g, '/');
      const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
      const payload = JSON.parse(atob(padded));
      return typeof payload.exp === 'number' ? payload.exp : null;
    } catch {
      return null;
    }
  }
}
