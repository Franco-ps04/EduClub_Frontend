import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-recuperar-contrasenia',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './recuperar-contrasena.html',
  styleUrl: './recuperar-contrasena.css',
})
export class RecuperarContrasena {
  paso: 1 | 2 | 3 = 1;

  form = { email: '', codigo: '', password: '', confirmPassword: '' };

  submitted = false;
  sending = false;
  success = false;
  errorMessage = '';
  infoMessage = '';

  private readonly api = `${environment.apiUrl}/auth/recuperar-contrasena`;

  constructor(private http: HttpClient, private router: Router) { }

  isEmailValid(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  }

  isCodeValid(code: string): boolean {
    return /^\d{6}$/.test(code.trim());
  }

  isPasswordStrong(password: string): boolean {
    const value = password.trim();
    return value.length >= 8 && /[A-Za-z]/.test(value) && /\d/.test(value);
  }

  private resetMensajes(): void {
    this.errorMessage = '';
    this.infoMessage = '';
    this.success = false;
  }

  /** Paso 1: pedir el código por correo */
  enviarCodigo(): void {
    this.submitted = true;
    this.resetMensajes();

    if (!this.isEmailValid(this.form.email)) {
      this.errorMessage = 'Ingresa un correo válido.';
      return;
    }

    this.sending = true;
    this.http.post<any>(`${this.api}/solicitar`, { email: this.form.email.trim() })
      .pipe(finalize(() => this.sending = false))
      .subscribe({
        next: (res) => {
          this.infoMessage = res?.message ?? 'Enviamos un código a tu correo.';
          this.submitted = false;
          this.paso = 2;
        },
        error: (err) => {
          this.errorMessage = err?.error?.message ?? 'No se pudo enviar el código.';
        }
      });
  }

  /** Paso 2: verificar el código */
  verificarCodigo(): void {
    this.submitted = true;
    this.resetMensajes();

    if (!this.isCodeValid(this.form.codigo)) {
      this.errorMessage = 'El código debe tener 6 dígitos.';
      return;
    }

    this.sending = true;
    this.http.post<any>(`${this.api}/verificar`, {
      email: this.form.email.trim(),
      codigo: this.form.codigo.trim()
    }).pipe(finalize(() => this.sending = false))
      .subscribe({
        next: () => { this.submitted = false; this.paso = 3; },
        error: (err) => {
          this.errorMessage = err?.error?.message ?? 'Código incorrecto o vencido.';
        }
      });
  }

  /** Paso 3: guardar la nueva contraseña */
  cambiarContrasena(): void {
    this.submitted = true;
    this.resetMensajes();

    if (!this.isPasswordStrong(this.form.password)) {
      this.errorMessage = 'La contraseña debe tener al menos 8 caracteres, una letra y un número.';
      return;
    }
    if (this.form.password !== this.form.confirmPassword) {
      this.errorMessage = 'Las contraseñas no coinciden.';
      return;
    }

    this.sending = true;
    this.http.post<any>(this.api, {
      email: this.form.email.trim(),
      codigo: this.form.codigo.trim(),
      nuevaContrasena: this.form.password
    }).pipe(finalize(() => this.sending = false))
      .subscribe({
        next: () => {
          this.success = true;
          setTimeout(() => this.router.navigate(['/ingresar']), 1800);
        },
        error: (err) => {
          this.errorMessage = err?.error?.message ?? 'No se pudo actualizar la contraseña.';
        }
      });
  }

  volverAlCorreo(): void {
    this.resetMensajes();
    this.form.codigo = '';
    this.submitted = false;
    this.paso = 1;
  }
}