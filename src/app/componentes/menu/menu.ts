import { Component, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { MensajeService } from '../../services/mensaje.service';
import { AuthUser } from '../../models/UserRole';
import { AlumnoService, PerfilUsuarioAlumno } from '../../services/alumno.service';

@Component({ selector: 'app-menu-alumno', standalone: true, imports: [RouterLink, RouterLinkActive, FormsModule], templateUrl: './menu.html', styleUrl: './menu.css' })
export class MenuAlumno implements OnInit, OnDestroy {
  mobileOpen = false;
  user: AuthUser | null = null;
  perfilAbierto = false;
  perfilCargando = false;
  perfilGuardando = false;
  contrasenaGuardando = false;
  perfilError = '';
  contrasenaError = '';
  perfilExito = '';
  contrasenaExito = '';
  perfil: PerfilUsuarioAlumno | null = null;
  perfilForm = { nombres: '', telefono: '' };
  contrasenaForm = { actual: '', nueva: '', confirmar: '' };
  private navSub?: Subscription;
  private userSub?: Subscription;
  constructor(
    public auth: AuthService,
    public mensajes: MensajeService,
    private alumno: AlumnoService,
    private router: Router
  ) { }
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

  abrirPerfil(): void {
    this.closeMenu();
    this.perfilAbierto = true;
    this.perfilCargando = true;
    this.perfilError = '';
    this.perfilExito = '';
    this.contrasenaError = '';
    this.contrasenaExito = '';
    this.contrasenaForm = { actual: '', nueva: '', confirmar: '' };
    this.perfilForm = {
      nombres: this.user?.nombres ?? '',
      telefono: this.user?.telefono ?? '',
    };

    this.alumno.perfil().subscribe({
      next: perfil => {
        this.perfil = perfil;
        this.perfilForm = { nombres: perfil.nombres, telefono: perfil.telefono };
        this.perfilCargando = false;
      },
      error: err => {
        this.perfilError = err?.error?.message ?? 'No se pudieron cargar los datos del perfil.';
        this.perfilCargando = false;
      },
    });
  }

  cerrarPerfil(): void {
    this.perfilAbierto = false;
  }

  guardarPerfil(): void {
    const nombres = this.perfilForm.nombres.trim();
    const telefono = this.perfilForm.telefono.replace(/\D/g, '');
    if (nombres.length < 3 || nombres.length > 120) {
      this.perfilError = 'El nombre debe tener entre 3 y 120 caracteres.';
      return;
    }
    if (telefono.length !== 9) {
      this.perfilError = 'El teléfono debe tener 9 dígitos.';
      return;
    }

    this.perfilError = '';
    this.perfilExito = '';
    this.perfilGuardando = true;
    this.alumno.actualizarPerfil({ nombres, telefono }).subscribe({
      next: respuesta => {
        this.perfil = respuesta.perfil;
        this.perfilForm = { nombres: respuesta.perfil.nombres, telefono: respuesta.perfil.telefono };
        this.auth.updateLocalUser({ nombres: respuesta.perfil.nombres, telefono: respuesta.perfil.telefono });
        this.perfilGuardando = false;
        this.perfilExito = respuesta.message;
      },
      error: err => {
        this.perfilGuardando = false;
        this.perfilError = err?.error?.message ?? 'No se pudieron guardar los cambios.';
      },
    });
  }

  cambiarContrasena(): void {
    if (!this.contrasenaForm.actual) {
      this.contrasenaError = 'Ingresa tu contraseña actual.';
      return;
    }
    if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(this.contrasenaForm.nueva)) {
      this.contrasenaError = 'La nueva contraseña debe tener al menos 8 caracteres, una letra y un número.';
      return;
    }
    if (this.contrasenaForm.nueva !== this.contrasenaForm.confirmar) {
      this.contrasenaError = 'Las contraseñas nuevas no coinciden.';
      return;
    }

    this.contrasenaError = '';
    this.contrasenaExito = '';
    this.contrasenaGuardando = true;
    this.alumno.cambiarContrasena({
      contrasenaActual: this.contrasenaForm.actual,
      nuevaContrasena: this.contrasenaForm.nueva,
    }).subscribe({
      next: respuesta => {
        this.contrasenaGuardando = false;
        this.contrasenaForm = { actual: '', nueva: '', confirmar: '' };
        this.contrasenaExito = respuesta.message;
      },
      error: err => {
        this.contrasenaGuardando = false;
        this.contrasenaError = err?.error?.message ?? 'No se pudo actualizar la contraseña.';
      },
    });
  }
}
