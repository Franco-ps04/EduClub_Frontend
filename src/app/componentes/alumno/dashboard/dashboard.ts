import { CommonModule } from '@angular/common';
import { Component, computed, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { AlumnoService, DiplomaAlumno, InscripcionAlumno, ReconocimientoAlumno, SesionAlumno } from '../../../services/alumno.service';
import { colorPorArea, colorPorRegla } from '../../../shared/colores';
import { MaterialesAlumno } from '../materiales/materiales';

@Component({
  selector: 'app-dashboard-alumno',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MaterialesAlumno],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class DashboardAlumno implements OnInit {
  inscripciones = signal<InscripcionAlumno[]>([]);
  diplomas = signal<DiplomaAlumno[]>([]);
  diplomasCount = signal<number | null>(null);
  reconocimientos = signal<ReconocimientoAlumno[]>([]);
  reconocimientosCount = signal<number | null>(null);
  loadingReconocimientos = false;
  activeSection: 'inscripciones' | 'portafolio' | 'materiales' = 'inscripciones';
  loading = true;
  error = '';
  searchText = '';
  cancelTarget: InscripcionAlumno | null = null;
  cancelando = false;
  cancelError = '';
  readonly currentYear = new Date().getFullYear();

  totalPremios = computed(() => {
    const dCount = this.diplomasCount() ?? 0;
    const rCount = this.reconocimientosCount() ?? 0;
    return dCount + rCount;
  });

  enrolledCount = computed(() => this.inscripciones().filter(i =>
    !['cancelado', 'anulado'].includes(this.key(i.estado_inscripcion))
  ).length);

  completedCount = computed(() => this.inscripciones().filter(i =>
    !['cancelado', 'anulado'].includes(this.key(i.estado_inscripcion)) &&
    this.key(i.estado_taller) === 'finalizado'
  ).length);

  attendedCount = computed(() => this.inscripciones().reduce((total, i) =>
    total + (i.sesiones?.filter(s => s.asistio === true).length ?? Number(i.asistencias ?? 0)), 0));

  absentCount = computed(() => this.inscripciones().reduce((total, i) =>
    total + (i.sesiones?.filter(s => s.asistio === false).length ?? 0), 0));

  unregisteredCount = computed(() => this.inscripciones().reduce((total, i) =>
    total + (i.sesiones?.filter(s => s.asistio === null || s.asistio === undefined).length ?? 0), 0));

  attendanceRate = computed(() => {
    const registered = this.attendedCount() + this.absentCount();
    return registered ? Math.round(this.attendedCount() / registered * 100) : 0;
  });

  constructor(public auth: AuthService, private alumno: AlumnoService) { }

  ngOnInit(): void {
    this.load();
    this.loadDiplomas();
    this.loadReconocimientos();
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.alumno.misInscripciones().subscribe({
      next: data => {
        this.inscripciones.set(data ?? []);
        this.loading = false;
      },
      error: err => {
        this.error = err?.error?.message ?? 'No se pudo cargar tu historial de talleres.';
        this.loading = false;
      }
    });
  }

  private loadDiplomas(): void {
    this.alumno.diplomas().subscribe({
      next: data => {
        const lista = Array.isArray(data) ? data : [];
        this.diplomas.set(lista);
        this.diplomasCount.set(lista.length);
      },
      error: () => this.diplomasCount.set(null)
    });
  }


  private loadReconocimientos(): void {
    this.loadingReconocimientos = true;
    this.alumno.reconocimientos().subscribe({
      next: data => {
        const lista = Array.isArray(data) ? data : [];
        this.reconocimientos.set(lista);
        this.reconocimientosCount.set(lista.length);
        this.loadingReconocimientos = false;
      },
      error: () => {
        this.reconocimientos.set([]);
        this.reconocimientosCount.set(null);
        this.loadingReconocimientos = false;
      }
    });
  }

  recognitionColor(reconocimiento: ReconocimientoAlumno): string {
    const color = (reconocimiento.color ?? 'secondary').trim().toLowerCase();
    if (/^#[0-9a-f]{3,8}$/i.test(color)) return color;
    const colors: Record<string, string> = {
      success: '#2d9e5f', primary: '#2563eb', info: '#0891b2',
      warning: '#d99a00', danger: '#dc2626', secondary: '#64748b'
    };
    return colors[color] ?? colors['secondary'];
  }

  recognitionTypeLabel(reconocimiento: ReconocimientoAlumno): string {
    return this.key(reconocimiento.tipo) === 'taller_completado'
      ? 'Taller completado'
      : 'Asistencia acumulada';
  }

  recognitionImage(reconocimiento: ReconocimientoAlumno): string | null {
    const image = (reconocimiento.imagen_url ?? '').trim();
    if (!image || image.startsWith('bi bi-') || image.startsWith('bi-')) return null;
    return /^(https?:\/\/|data:image\/|assets\/|\/)/i.test(image) ? image : null;
  }

  recognitionIcon(reconocimiento: ReconocimientoAlumno): string {
    const icon = (reconocimiento.imagen_url ?? '').trim();
    if (icon.startsWith('bi bi-')) return icon;
    if (icon.startsWith('bi-')) return `bi ${icon}`;
    return this.key(reconocimiento.tipo) === 'taller_completado'
      ? 'bi bi-trophy-fill'
      : 'bi bi-award-fill';
  }

  get firstName(): string {
    return (this.auth.currentUser?.nombres ?? 'Alumno').trim().split(/\s+/)[0];
  }

  get fullName(): string {
    return (this.auth.currentUser?.nombres ?? 'Alumno').trim() || 'Alumno';
  }

  key(value: string | null | undefined): string {
    return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  }

  filtered(): InscripcionAlumno[] {
    const query = this.searchText.trim().toLocaleLowerCase();
    return this.inscripciones().filter(i => !query ||
      String(i.titulo ?? '').toLocaleLowerCase().includes(query) ||
      String(i.ubicacion ?? '').toLocaleLowerCase().includes(query) ||
      String(i.area ?? '').toLocaleLowerCase().includes(query));
  }

  date(value: string | null | undefined): string {
    if (!value) return '—';
    const date = new Date(`${value}T12:00:00`);
    return Number.isNaN(date.getTime()) ? value :
      new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }).format(date).replace('.', '');
  }

  formatLabel(value: string | undefined): string { return this.key(value) === 'seminario' ? 'Seminario' : 'Sesión'; }

  formatClass(value: string | undefined): string {
    return this.key(value) === 'seminario' ? 'et-format-seminario' : 'et-format-sesion';
  }

  modalityLabel(value: string | undefined): string {
    return this.key(value) === 'virtual' ? 'Virtual' : 'Presencial';
  }

  modalityClass(value: string | undefined): string {
    return this.key(value) === 'virtual' ? 'et-modality-virtual' : 'et-modality-presencial';
  }

  displayDocente(item: InscripcionAlumno): string {
    return this.key(item.rol_docente) === 'administrador' ? 'Administrador' : (item.docente || 'Docente');
  }

  schedule(item: InscripcionAlumno): string {
    const days = (item.dias_semana ?? []).join(' – ');
    const hours = `${item.hora || '—'} – ${item.hora_fin || item.hora || '—'}`;
    return days ? `${days} / ${hours}` : hours;
  }

  private areaCanonica(value: string | undefined): string {
    const key = this.key(value);
    const areas: Record<string, string> = {
      'matematica': 'Matemática', 'matematicas': 'Matemática',
      'ciencias': 'Ciencias', 'comunicacion': 'Comunicación',
      'ciencia sociales': 'Ciencias Sociales', 'ciencias sociales': 'Ciencias Sociales',
      'informatica': 'Informática', 'humanidades': 'Humanidades'
    };
    return areas[key] ?? value ?? '';
  }

  colorArea(value: string | undefined): { bg: string; text: string; border: string } {
    return colorPorArea(this.areaCanonica(value));
  }

  stateLabel(state: string | undefined): string {
    const key = this.key(state);
    if (key === 'proximo') return 'Próximo';
    if (key === 'en curso') return 'En curso';
    if (key === 'finalizado') return 'Finalizado';
    if (key === 'cancelado') return 'Cancelado';
    return state || 'Sin estado';
  }

  stateClass(state: string | undefined): string {
    const key = this.key(state);
    if (key === 'finalizado') return 'bg-secondary-subtle text-secondary';
    if (key === 'cancelado' || key === 'anulado') return 'bg-danger-subtle text-danger';
    if (key === 'en curso') return 'bg-warning-subtle text-warning-emphasis';
    if (key === 'proximo') return 'bg-primary-subtle text-primary';
    return 'bg-secondary-subtle text-secondary';
  }

  canCancel(item: InscripcionAlumno): boolean {
    return !['cancelado', 'anulado', 'finalizado'].includes(this.key(item.estado_inscripcion)) &&
      !['finalizado', 'cancelado'].includes(this.key(item.estado_taller));
  }

  attendance(item: InscripcionAlumno): string {
    const sessions = item.sesiones ?? [];
    if (!sessions.length) return 'Sin registrar';
    const checked = sessions.filter(s => s.asistio === true || s.asistio === false).length;
    const attended = sessions.filter(s => s.asistio === true).length;
    return checked ? `${attended}/${checked} sesiones marcadas` : 'Sin registrar';
  }

  attendedSessions(item: InscripcionAlumno): number {
    return (item.sesiones ?? []).filter(s => s.asistio === true).length;
  }

  absentSessions(item: InscripcionAlumno): number {
    return (item.sesiones ?? []).filter(s => s.asistio === false).length;
  }

  pendingSessions(item: InscripcionAlumno): number {
    return (item.sesiones ?? []).filter(s => s.asistio === null || s.asistio === undefined).length;
  }

  attendancePercent(item: InscripcionAlumno): number {
    if (item.porcentaje_asistencia != null) return Math.max(0, Math.min(100, Number(item.porcentaje_asistencia)));
    const total = item.sesiones?.length ?? 0;
    return total ? Math.round(this.attendedSessions(item) / total * 100) : 0;
  }

  sessionLabel(session: SesionAlumno): string {
    return session.titulo?.trim() || `Sesión ${session.numero_sesion}`;
  }

  sessionStateLabel(session: SesionAlumno): string {
    if (session.asistio === true) return 'Presente';
    if (session.asistio === false) return 'Ausente';
    return 'Pendiente';
  }

  sessionStateClass(session: SesionAlumno): string {
    if (session.asistio === true) return 'et-session-presente';
    if (session.asistio === false) return 'et-session-ausente';
    return 'et-session-pendiente';
  }

  sessionMeta(session: SesionAlumno): string {
    const day = session.dia_semana || '';
    const date = this.date(session.fecha);
    const hours = session.hora_inicio ? `${session.hora_inicio}${session.hora_fin ? ` – ${session.hora_fin}` : ''}` : '';
    return [day, date, hours].filter(Boolean).join(' · ');
  }

  diplomaColor(diploma: DiplomaAlumno): string {
    const color = diploma.color ?? 'secondary';
    return /^#[0-9a-f]{3,8}$/i.test(color) ? color : colorPorRegla(color);
  }

  diplomaIcon(diploma: DiplomaAlumno): string {
    const icon = (diploma.icono ?? '').trim();
    if (icon.startsWith('bi bi-')) return icon;
    if (icon.startsWith('bi-')) return `bi ${icon}`;
    if (/^[a-z0-9-]+$/i.test(icon)) return `bi bi-${icon}`;
    return 'bi bi-award-fill';
  }

  diplomaFor(item: InscripcionAlumno): DiplomaAlumno | undefined {
    return this.diplomas().find(d => Number(d.id_taller) === Number(item.id_taller));
  }

  pedirCancelacion(item: InscripcionAlumno): void {
    this.cancelTarget = item;
    this.cancelError = '';
  }

  closeCancel(): void {
    if (!this.cancelando) {
      this.cancelTarget = null;
      this.cancelError = '';
    }
  }

  confirmarCancelacion(): void {
    if (!this.cancelTarget || this.cancelando) return;
    const id = this.cancelTarget.id_inscripcion;
    this.cancelando = true;
    this.cancelError = '';
    this.alumno.cancelarInscripcion(id).subscribe({
      next: () => {
        this.inscripciones.update(list => list.map(item => item.id_inscripcion === id
          ? { ...item, estado_inscripcion: 'Cancelado' }
          : item));
        this.cancelando = false;
        this.cancelTarget = null;
      },
      error: err => {
        this.cancelando = false;
        this.cancelError = err?.error?.message ?? 'No se pudo cancelar la inscripción.';
      }
    });
  }
}
