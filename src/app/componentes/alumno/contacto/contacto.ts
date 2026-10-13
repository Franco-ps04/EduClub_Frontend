import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../services/auth.service';
import { environment } from '../../../../environments/environment';

@Component({ selector: 'app-contacto-alumno', standalone: true, imports: [FormsModule], templateUrl: './contacto.html', styleUrl: './contacto.css' })
export class ContactoAlumno implements OnInit {
  form = { nombre: '', telefono: '', email: '', asunto: '', mensaje: '' };
  subjects = ['Consulta general', 'Consulta sobre un taller', 'Problema con una inscripción', 'Reporte de problema', 'Sugerencia', 'Otro'];
  submitted = false; sending = false; success = false; errorMessage = '';
  constructor(public auth: AuthService, private http: HttpClient) { }
  ngOnInit(): void {
    this.form.nombre = this.auth.currentUser?.nombres ?? '';
    this.form.telefono = this.auth.currentUser?.telefono ?? '';
    this.form.email = this.auth.currentUser?.email ?? '';
  }
  isEmailValid(value: string): boolean { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()); }
  isPhoneValid(value: string): boolean { return /^\d{9}$/.test(value.trim()); }
  normalizePhone(value: string): string { return String(value ?? '').replace(/\D/g, '').slice(0, 9); }
  private validate(): string {
    if (this.form.nombre.trim().length < 3) return 'Ingresa tu nombre completo.';
    if (!this.isPhoneValid(this.form.telefono)) return 'El teléfono debe tener 9 dígitos.';
    if (!this.isEmailValid(this.form.email)) return 'Ingresa un correo electrónico válido.';
    if (!this.form.asunto.trim()) return 'Selecciona un asunto.';
    if (this.form.mensaje.trim().length < 10) return 'El mensaje debe tener al menos 10 caracteres.';
    if (this.form.mensaje.trim().length > 700) return 'El mensaje no debe superar 700 caracteres.';
    return '';
  }
  submit(): void {
    this.submitted = true; this.success = false; this.errorMessage = '';
    const validation = this.validate(); if (validation) { this.errorMessage = validation; return; }
    this.sending = true;
    this.http.post<{ ok: boolean }>(`${environment.apiUrl}/contacto`, {
      nombre: this.form.nombre.trim(), telefono: this.form.telefono.trim(), email: this.form.email.trim(),
      asunto: this.form.asunto.trim(), mensaje: this.form.mensaje.trim()
    }).subscribe({
      next: () => { this.sending = false; this.success = true; this.submitted = false; this.form = { nombre: this.auth.currentUser?.nombres ?? '', telefono: this.auth.currentUser?.telefono ?? '', email: this.auth.currentUser?.email ?? '', asunto: '', mensaje: '' }; },
      error: err => { this.sending = false; this.errorMessage = err?.error?.message ?? 'No se pudo enviar el correo. Inténtalo más tarde.'; }
    });
  }
}
