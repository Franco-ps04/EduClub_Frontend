import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { AlumnoService, TallerAlumno } from '../../../services/alumno.service';

@Component({
  selector: 'app-inicio-alumno',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './inicio.html',
  styleUrl: './inicio.css'
})
export class InicioAlumno implements OnInit {
  talleres: TallerAlumno[] = [];
  idsInscritos = new Set<number>();
  loading = true;
  error = '';

  // Valores de presentación de la pantalla aprobada en Figma.
  readonly stats = [
    { label: 'Estudiantes activos', value: '320+', icon: 'bi-people-fill', tone: 'green' },
    { label: 'Talleres realizados', value: '28+', icon: 'bi-calendar2-check-fill', tone: 'blue' },
    { label: 'Tutores capacitados', value: '15,000+', icon: 'bi-award-fill', tone: 'yellow' }
  ];

  constructor(public auth: AuthService, private alumno: AlumnoService) { }

  ngOnInit(): void {
    this.alumno.talleres().subscribe({
      next: data => {
        this.talleres = (data ?? []).slice(0, 3);
        this.loading = false;
      },
      error: err => {
        this.error = err?.error?.message ?? 'No se pudieron cargar los talleres.';
        this.loading = false;
      }
    });
    if (this.auth.currentUser?.rol === 'alumno') this.alumno.misInscripciones().subscribe({
      next: data => this.idsInscritos = new Set((data ?? [])
        .filter(i => !['cancelado', 'anulado'].includes(this.key(i.estado_inscripcion)))
        .map(i => Number(i.id_taller))),
      error: () => this.idsInscritos.clear()
    });
  }

  private key(value: string | null | undefined): string {
    return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  }

  isInscrito(taller: TallerAlumno): boolean { return this.idsInscritos.has(Number(taller.id_taller)); }
  isPresencial(taller: TallerAlumno): boolean { return this.key(taller.modalidad) === 'presencial'; }
  isVirtual(taller: TallerAlumno): boolean { return this.key(taller.modalidad) === 'virtual'; }
  hasMap(taller: TallerAlumno): boolean { return this.isPresencial(taller) && taller.latitud != null && taller.longitud != null && Number.isFinite(Number(taller.latitud)) && Number.isFinite(Number(taller.longitud)); }
  formatLabel(taller: TallerAlumno): string { return this.key(taller.tipo_evento) === 'seminario' ? 'Seminario' : 'Sesión'; }
  statusLabel(value: string): string {
    const key = this.key(value);
    if (key === 'en curso') return 'En curso';
    if (key === 'finalizado') return 'Finalizado';
    if (key === 'cancelado') return 'Cancelado';
    return 'Próximo';
  }
  canEnroll(): boolean { return !this.auth.currentUser || this.auth.currentUser.rol === 'alumno'; }
  isAlumno(): boolean { return this.auth.currentUser?.rol === 'alumno'; }
  image(taller: TallerAlumno): string {
    return taller.imagen_url || 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=900&q=80';
  }
  date(value: string): string {
    if (!value) return 'Fecha por confirmar';
    const date = new Date(`${value}T12:00:00`);
    return Number.isNaN(date.getTime()) ? value :
      new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }).format(date).replace('.', '');
  }
  time(taller: TallerAlumno): string { return `${taller.hora ?? '--:--'} – ${taller.hora_fin ?? taller.hora ?? '--:--'}`; }
  days(taller: TallerAlumno): string {
    return (taller.dias_semana ?? []).join(' – ') || (this.key(taller.tipo_evento) === 'seminario' ? 'Una sesión' : 'Según cronograma');
  }
  freeSeats(taller: TallerAlumno): number { return Math.max(0, Number(taller.capacidad ?? 0) - Number(taller.inscritos ?? 0)); }
  occupiedPct(taller: TallerAlumno): number {
    return taller.capacidad > 0 ? Math.min(100, Math.round(Number(taller.inscritos ?? 0) / taller.capacidad * 100)) : 0;
  }
  statusClass(value: string): string {
    const key = this.key(value);
    return key === 'en curso' ? 'bg-primary-subtle text-primary' : 'bg-success-subtle text-success';
  }
}
