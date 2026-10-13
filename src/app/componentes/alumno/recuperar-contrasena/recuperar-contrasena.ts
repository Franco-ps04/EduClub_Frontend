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
  form = {
    email: '',
    telefono: '',
    password: '',
    confirmPassword: ''
  };

  submitted = false;
  sending = false;
  success = false;
  errorMessage = '';

  constructor(
    private http: HttpClient,
    private router: Router
  ) { }

  isEmailValid(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  }

  isPhoneValid(phone: string): boolean {
    return /^\d{9}$/.test(phone.trim());
  }

  isPasswordStrong(password: string): boolean {
    const value = password.trim();
    return value.length >= 8 && /[A-Za-z]/.test(value) && /\d/.test(value);
  }

  private validate(): string {
    const email = this.form.email.trim();
    const telefono = this.form.telefono.trim();
    const password = this.form.password;
    const confirmPassword = this.form.confirmPassword;

    if (!email) return 'El correo electrónico es obligatorio.';
    if (!this.isEmailValid(email)) return 'Ingresa un correo válido.';
    if (!telefono) return 'El teléfono es obligatorio.';
    if (!this.isPhoneValid(telefono)) return 'El teléfono debe tener 9 dígitos.';
    if (!password) return 'Ingresa tu nueva contraseña.';
    if (!this.isPasswordStrong(password)) return 'La contraseña debe tener al menos 8 caracteres, una letra y un número.';
    if (password !== confirmPassword) return 'Las contraseñas no coinciden.';

    return '';
  }

  submit(): void {
    this.submitted = true;
    this.success = false;
    this.errorMessage = '';

    const validationError = this.validate();
    if (validationError) {
      this.errorMessage = validationError;
      return;
    }

    this.sending = true;

    this.http.post<any>(`${environment.apiUrl}/auth/recuperar-contrasena`, {
      email: this.form.email.trim(),
      telefono: this.form.telefono.trim(),
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
}
