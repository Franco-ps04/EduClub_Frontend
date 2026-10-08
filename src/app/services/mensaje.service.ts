import { Injectable, computed, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { Mensaje } from '../models/mensaje';
import { AuthUser } from '../models/UserRole';

@Injectable({ providedIn: 'root' })
export class MensajeService {
  private readonly base = `${environment.apiUrl}/mensajes`;
  private readonly _mensajes = signal<Mensaje[]>([]);
  private readonly usuarioActual = signal<AuthUser | null>(null);

  /** Lista cacheada para que el layout pueda mostrar el badge sin abrir Mensajes. */
  readonly mensajes = this._mensajes.asReadonly();

  /**
   * Para alumno se usa leido_por_alumno; para docente/administrador se usa
   * leido, igual que la lógica del proyecto anterior.
   */
  readonly contadorSinLeer = computed(() => {
    const user = this.usuarioActual();
    if (!user) return 0;

    return this._mensajes().filter(m =>
      user.rol === 'alumno' ? !m.leido_por_alumno : !m.leido
    ).length;
  });

  constructor(
    private http: HttpClient,
    private auth: AuthService
  ) {
    this.auth.user$.subscribe(user => {
      this.usuarioActual.set(user);
      this.refresh();
    });
  }

  /** Contador cómodo para plantillas/componentes. */
  sinLeer(): number {
    return this.contadorSinLeer();
  }

  /**
   * Actualiza la lista según el rol del usuario actual.
   * - docente / administrador: mensajes dirigidos directamente a él.
   * - alumno: mensajes que él envió, necesarios para saber si una respuesta
   *   todavía no fue leída por el alumno.
   */
  refresh(): void {
    const user = this.usuarioActual();
    if (!user) {
      this._mensajes.set([]);
      return;
    }

    if (user.rol === 'alumno') {
      this.http.get<Mensaje[]>(`${this.base}/mis`).subscribe({
        next: data => this._mensajes.set(data),
        error: () => this._mensajes.set([])
      });
      return;
    }

    if (user.rol === 'docente' || user.rol === 'administrador') {
      this.http.get<Mensaje[]>(`${this.base}/panel`).subscribe({
        next: data => this._mensajes.set(data),
        error: () => this._mensajes.set([])
      });
      return;
    }

    this._mensajes.set([]);
  }

  // Docente / Administrador — solo lo dirigido al usuario en sesión.
  panel(): Observable<Mensaje[]> {
    return this.http.get<Mensaje[]>(`${this.base}/panel`).pipe(
      tap(data => this._mensajes.set(data))
    );
  }

  // Alumno — sus conversaciones.
  mis(): Observable<Mensaje[]> {
    return this.http.get<Mensaje[]>(`${this.base}/mis`).pipe(
      tap(data => this._mensajes.set(data))
    );
  }

  marcarLeido(id: number): Observable<{ ok: boolean }> {
    return this.http.patch<{ ok: boolean }>(`${this.base}/${id}/marcar-leido`, {}).pipe(
      tap(() => {
        this._mensajes.update(list =>
          list.map(m => m.id_mensaje === id ? { ...m, leido: true } : m)
        );
      })
    );
  }

  marcarLeidoAlumno(id: number): Observable<{ ok: boolean }> {
    return this.http.patch<{ ok: boolean }>(`${this.base}/${id}/leido`, {}).pipe(
      tap(() => {
        this._mensajes.update(list =>
          list.map(m => m.id_mensaje === id ? { ...m, leido_por_alumno: true } : m)
        );
      })
    );
  }

  responder(id: number, texto: string): Observable<{ ok: boolean }> {
    return this.http.post<{ ok: boolean }>(`${this.base}/${id}/responder`, { texto }).pipe(
      tap(() => {
        this.refresh();
      })
    );
  }
}
