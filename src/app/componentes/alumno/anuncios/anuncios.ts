import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AlumnoService, NotificacionAlumno } from '../../../services/alumno.service';

function normalizarEstadoLectura(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return normalized === 'true' || normalized === '1';
  }
  return false;
}

@Component({
  selector: 'app-anuncios-alumno',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './anuncios.html',
  styleUrl: './anuncios.css',
})
export class AnunciosAlumno implements OnInit {
  anuncios = signal<NotificacionAlumno[]>([]);
  seleccionado = signal<NotificacionAlumno | null>(null);
  searchText = '';
  loading = true;
  error = '';

  constructor(private alumno: AlumnoService) { }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.alumno.notificaciones().subscribe({
      next: (data) => {
        const rows = (data ?? []).map((notification) => ({
          ...notification,
          leida: normalizarEstadoLectura(notification.leida),
        }));
        this.anuncios.set(rows);
        if (rows.length) {
          this.seleccionar(rows[0]);
        } else {
          this.seleccionado.set(null);
        }
        this.loading = false;
      },
      error: (err) => {
        this.error = err?.error?.message ?? 'No se pudieron cargar los anuncios.';
        this.loading = false;
      },
    });
  }

  filtered(): NotificacionAlumno[] {
    const query = this.searchText.trim().toLowerCase();
    return this.anuncios().filter(
      (announcement) =>
        !query ||
        announcement.titulo.toLowerCase().includes(query) ||
        announcement.taller.toLowerCase().includes(query) ||
        announcement.enviado_por.toLowerCase().includes(query),
    );
  }

  seleccionar(anuncio: NotificacionAlumno): void {
    this.seleccionado.set({ ...anuncio, leida: true });
    if (anuncio.leida) return;
    // Reflejar la lectura inmediatamente en la bandeja; si el servidor falla, recargar
    // para no dejar un estado visual distinto del que guarda la base de datos.
    this.anuncios.update(list => list.map(item => item.id_notificacion === anuncio.id_notificacion ? { ...item, leida: true } : item));
    this.alumno.marcarNotificacionLeida(anuncio.id_notificacion).subscribe({
      error: () => {
        this.anuncios.update(list => list.map(item => item.id_notificacion === anuncio.id_notificacion ? { ...item, leida: false } : item));
        if (this.seleccionado()?.id_notificacion === anuncio.id_notificacion) this.seleccionado.set({ ...anuncio, leida: false });
        this.error = 'No se pudo guardar la lectura del anuncio. Inténtalo nuevamente.';
      }
    });
  }

  sinLeer(): number {
    return this.anuncios().filter((announcement) => !announcement.leida).length;
  }

  fecha(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? value
      : new Intl.DateTimeFormat('es-PE', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
        .format(date)
        .replace('.', '');
  }
}
