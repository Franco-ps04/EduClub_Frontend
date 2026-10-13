import { Component, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { MensajeService } from '../../services/mensaje.service';
import { AuthUser } from '../../models/UserRole';

@Component({ selector: 'app-menu-alumno', standalone: true, imports: [RouterLink, RouterLinkActive], templateUrl: './menu.html', styleUrl: './menu.css' })
export class MenuAlumno implements OnInit, OnDestroy {
  mobileOpen = false;
  user: AuthUser | null = null;
  private navSub?: Subscription;
  private userSub?: Subscription;
  constructor(public auth: AuthService, public mensajes: MensajeService, private router: Router) { }
  ngOnInit(): void {
    this.userSub = this.auth.user$.subscribe(user => this.user = user);
    this.navSub = this.router.events.pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => this.mensajes.refresh());
  }
  ngOnDestroy(): void { this.navSub?.unsubscribe(); this.userSub?.unsubscribe(); }
  toggleMenu(): void { this.mobileOpen = !this.mobileOpen; }
  closeMenu(): void { this.mobileOpen = false; }
  isAlumno(): boolean { return this.user?.rol === 'alumno'; }
  isStaff(): boolean { return this.user?.rol === 'administrador' || this.user?.rol === 'docente'; }
  getFirstName(): string { return (this.user?.nombres ?? 'Usuario').trim().split(/\s+/).slice(0, 2).join(' '); }
  getRolLabel(): string { return this.user?.rol === 'administrador' ? 'Administrador' : this.user?.rol === 'docente' ? 'Docente' : 'Alumno'; }
  logout(): void { this.auth.logout(undefined, 0, '/ingresar'); this.closeMenu(); }
}
