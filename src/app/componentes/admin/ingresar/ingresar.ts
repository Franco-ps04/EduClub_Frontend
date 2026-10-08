import { Component, OnInit, signal } from '@angular/core';
import { AuthService } from '../../../services/auth.service';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-ingresar-admin',
  imports: [FormsModule, RouterLink],
  templateUrl: './ingresar.html',
  styleUrl: './ingresar.css',
})
export class IngresarAdmin implements OnInit {
  email = '';
  password = '';
  showPass = signal(false);
  error = '';
  loading = false;

  constructor(private auth: AuthService, private router: Router) { }

  ngOnInit(): void {
    // Si ya esta autenticado como docente o administrador, redirigir al panel
    const user = this.auth.currentUser;
    if (user && (user.rol === 'docente' || user.rol === 'administrador')) {
      this.router.navigate(['/admin/talleres']);
    }
  }

  submit(): void {
    this.error = '';
    const email = this.email.trim();
    const password = this.password.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email) {
      this.error = 'Ingresa el correo del administrador o docente.';
      return;
    }
    if (!emailRegex.test(email)) {
      this.error = 'Ingresa un correo valido.';
      return;
    }
    if (!password) {
      this.error = 'Ingresa la contrasena.';
      return;
    }
    if (password.length < 8) {
      this.error = 'La contrasena debe tener al menos 8 caracteres.';
      return;
    }

    this.loading = true;
    this.auth.login(email, password).subscribe({
      next: (user) => {
        this.loading = false;
        if (user.rol === 'docente' || user.rol === 'administrador') {
          this.router.navigate(['/admin/talleres']);
          return;
        }
        this.error = 'No tienes permisos de administracion.';
        this.auth.logout();
      },
      error: (err) => {
        this.loading = false;
        this.error =
          err.error?.message ||
          'Credenciales invalidas.';
      }
    });
  }
}
