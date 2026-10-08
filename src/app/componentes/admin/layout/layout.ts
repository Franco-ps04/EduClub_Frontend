import { Component, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { AuthService } from '../../../services/auth.service';
import { MensajeService } from '../../../services/mensaje.service';

@Component({
  selector: 'app-admin-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './layout.html',
  styleUrl: './layout.css',
})
export class Layout implements OnInit, OnDestroy {
  private navSub?: Subscription;

  constructor(
    public auth: AuthService,
    private router: Router,
    public mensajeService: MensajeService
  ) { }

  isAdministrador(): boolean {
    return this.auth.currentUser?.rol === 'administrador';
  }

  isDocente(): boolean {
    return this.auth.currentUser?.rol === 'docente';
  }

  get rolLabel(): string {
    return this.isAdministrador() ? 'Administrador' : 'Docente';
  }

  getEmail(): string {
    return this.auth.currentUser?.email ?? '';
  }

  getNombre(): string {
    return this.auth.currentUser?.nombres ?? '';
  }

  getInitials(): string {
    const parts = this.getNombre().trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '--';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  /** Badge de mensajes sin leer para el usuario actual. */
  get sinLeer(): number {
    return this.mensajeService.sinLeer();
  }

  ngOnInit(): void {
    // Igual que GreenUnity: al cambiar de sección se refresca el contador
    // de mensajes para reflejar inmediatamente los mensajes recibidos.
    this.navSub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => this.mensajeService.refresh());
  }

  ngOnDestroy(): void {
    this.navSub?.unsubscribe();
  }

  cerrarSesion(): void {
    this.auth.logout();
  }
}
