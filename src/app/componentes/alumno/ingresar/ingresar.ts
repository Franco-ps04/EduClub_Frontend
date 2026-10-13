import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
@Component({ selector: 'app-ingresar-alumno', standalone: true, imports: [FormsModule, RouterLink], templateUrl: './ingresar.html', styleUrl: './ingresar.css' })
export class IngresarAlumno implements OnInit {
  email = ''; password = ''; showPass = false; error = ''; loading = false;
  constructor(private auth: AuthService, private router: Router) { }
  ngOnInit(): void {
    const notice = this.auth.getPendingNotice();
    if (notice) { this.error = notice; this.auth.clearPendingNotice(); }
    const user = this.auth.currentUser;
    if (user && this.auth.hasValidSession()) this.redirectByRole(user.rol);
  }
  private redirectByRole(rol: string): void {
    if (rol === 'alumno') this.router.navigate(['/inicio']);
    else if (rol === 'administrador' || rol === 'docente') this.router.navigate(['/admin/talleres']);
  }
  submit(): void {
    this.error = '';
    const email = this.email.trim(); const password = this.password.trim();
    if (!email) { this.error = 'Ingresa tu correo electrónico.'; return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { this.error = 'Ingresa un correo válido.'; return; }
    if (!password) { this.error = 'Ingresa tu contraseña.'; return; }
    if (password.length < 8) { this.error = 'La contraseña debe tener al menos 8 caracteres.'; return; }
    this.loading = true;
    this.auth.login(email, password).subscribe({
      next: user => {
        this.loading = false;
        if (user.rol === 'alumno') { this.router.navigate(['/inicio']); return; }
        this.auth.logout('Esta página es para alumnos. Utiliza el acceso para docentes o administración.', 0, '/ingresar');
      },
      error: err => { this.loading = false; this.error = err?.error?.message ?? 'Correo o contraseña incorrectos.'; }
    });
  }
}
