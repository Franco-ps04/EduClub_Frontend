import { Component, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { AlumnoService, InscripcionAlumno, TallerAlumno } from '../../../services/alumno.service';
import { MapaVista } from '../../publico/mapa-vista/mapa-vista';
import { TarjetaTallerAlumno } from '../tarjeta-taller/tarjeta-taller';

@Component({ selector: 'app-eventos-alumno', standalone: true, imports: [FormsModule, MapaVista, TarjetaTallerAlumno], templateUrl: './eventos.html', styleUrl: './eventos.css' })
export class EventosAlumno implements OnInit {
  @ViewChild(MapaVista) mapView?: MapaVista;
  talleres: TallerAlumno[] = [];
  areas: { id_area: number; nombre: string }[] = [];
  buscar = ''; idArea = ''; modalidad = 'Todos'; formato = 'Todos';
  loading = false; error = '';
  idsInscritos = new Set<number>();
  selected: TallerAlumno | null = null;
  infoTaller: TallerAlumno | null = null;
  confirmTaller: TallerAlumno | null = null;
  submitting = false; success = false; errorInscripcion = '';
  markers: { lat: number; lng: number; label: string }[] = [];
  constructor(private alumno: AlumnoService, private route: ActivatedRoute, public auth: AuthService, private router: Router) { }

  ngOnInit(): void {
    this.loading = true;
    this.alumno.catalogos().subscribe({ next: c => this.areas = c.areas ?? [], error: () => this.areas = [] });
    this.alumno.talleres().subscribe({
      next: data => { this.talleres = data ?? []; this.rebuildMarkers(); this.loading = false; this.loadInscripciones(); this.openQueryTaller(); },
      error: err => { this.error = err?.error?.message ?? 'No se pudieron cargar los talleres.'; this.loading = false; }
    });
  }
  private loadInscripciones(): void {
    if (this.auth.currentUser?.rol !== 'alumno') return;
    this.alumno.misInscripciones().subscribe({
      next: data => {
        this.idsInscritos = new Set(data.filter(i => !['cancelado', 'anulado'].includes(this.key(i.estado_inscripcion))).map(i => Number(i.id_taller)));
      }, error: () => this.idsInscritos.clear()
    });
  }
  private openQueryTaller(): void {
    this.route.queryParamMap.subscribe(params => {
      const id = Number(params.get('taller'));
      if (id > 0) { const t = this.talleres.find(x => x.id_taller === id); if (t) { if (params.get('accion') === 'inscribir') this.beginEnrollment(t); else this.openInfo(t); } }
    });
  }
  get filtered(): TallerAlumno[] {
    const q = this.buscar.trim().toLocaleLowerCase();
    return this.talleres.filter(t => {
      const searchOk = !q || [t.nombre, t.descripcion, t.ubicacion, t.area, t.tipo_evento, t.modalidad, t.docente, t.estado].some(x => String(x ?? '').toLocaleLowerCase().includes(q));
      const areaOk = !this.idArea || Number(t.id_area) === Number(this.idArea);
      const modOk = this.modalidad === 'Todos' || this.key(t.modalidad) === this.key(this.modalidad);
      const formatOk = this.formato === 'Todos' || this.key(t.tipo_evento) === this.key(this.formato);
      return searchOk && areaOk && modOk && formatOk && !['finalizado', 'cancelado'].includes(this.key(t.estado));
    });
  }
  private key(value: string | null | undefined): string { return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase(); }
  filtersChanged(): void { this.rebuildMarkers(); }
  private rebuildMarkers(): void {
    this.markers = this.filtered.filter(t => this.hasMap(t))
      .map(t => ({ lat: Number(t.latitud), lng: Number(t.longitud), label: t.nombre }));
  }
  select(t: TallerAlumno): void { this.selected = t; if (this.hasMap(t)) this.mapView?.panTo(Number(t.latitud), Number(t.longitud)); }
  openInfo(t: TallerAlumno): void { this.infoTaller = t; this.selected = t; if (this.hasMap(t)) this.mapView?.panTo(Number(t.latitud), Number(t.longitud)); }
  closeInfo(): void { this.infoTaller = null; }
  isPresencial(t: TallerAlumno): boolean { return this.key(t.modalidad) === 'presencial'; }
  hasMap(t: TallerAlumno): boolean { return this.isPresencial(t) && t.latitud != null && t.longitud != null && Number.isFinite(Number(t.latitud)) && Number.isFinite(Number(t.longitud)); }
  modalidadLabel(t: TallerAlumno): string { return this.isPresencial(t) ? 'Presencial' : 'Virtual'; }
  formatoLabel(t: TallerAlumno): string { return this.key(t.tipo_evento) === 'seminario' ? 'Seminario' : 'Sesión'; }
  estadoLabel(t: TallerAlumno): string {
    const k = this.key(t.estado);
    if (k === 'en curso') return 'En curso';
    if (k === 'cancelado') return 'Cancelado';
    if (k === 'finalizado') return 'Finalizado';
    return 'Próximo';
  }
  estadoClass(t: TallerAlumno): string {
    const k = this.key(t.estado);
    if (k === 'en curso') return 'bg-primary-subtle text-primary';
    if (k === 'cancelado') return 'bg-danger-subtle text-danger';
    if (k === 'finalizado') return 'bg-secondary-subtle text-secondary';
    return 'bg-success-subtle text-success';
  }
  displayDocente(t: TallerAlumno): string {
    return this.key(t.rol_docente) === 'administrador' ? 'Administrador' : (t.docente || 'Equipo EduTaller');
  }
  isInscrito(t: TallerAlumno): boolean { return this.idsInscritos.has(Number(t.id_taller)); }
  image(t: TallerAlumno): string { return t.imagen_url || 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&q=80'; }
  date(value: string): string { if (!value) return 'Por confirmar'; const d = new Date(`${value}T12:00:00`); return Number.isNaN(d.getTime()) ? value : new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }).format(d).replace('.', ''); }
  hora(t: TallerAlumno): string { return `${t.hora || '--:--'} – ${t.hora_fin || t.hora || '--:--'}`; }
  getDays(t: TallerAlumno): string { return (t.dias_semana ?? []).join(' – ') || (this.key(t.tipo_evento) === 'seminario' ? 'Una sesión' : 'Según cronograma'); }
  freeSeats(t: TallerAlumno): number { return Math.max(0, Number(t.capacidad || 0) - Number(t.inscritos || 0)); }
  occupiedPct(t: TallerAlumno): number { return t.capacidad > 0 ? Math.min(100, Math.round(t.inscritos / t.capacidad * 100)) : 0; }
  canEnroll(): boolean { return !this.auth.currentUser || this.auth.currentUser.rol === 'alumno'; }
  isAlumno(): boolean { return this.auth.currentUser?.rol === 'alumno'; }
  beginEnrollment(t: TallerAlumno): void {
    this.errorInscripcion = ''; this.success = false;
    if (!this.auth.hasValidSession() || !this.auth.currentUser) { this.router.navigate(['/ingresar']); return; }
    if (this.auth.currentUser.rol !== 'alumno') return;
    if (this.isInscrito(t)) { this.confirmTaller = t; this.errorInscripcion = 'Ya tienes una inscripción activa en este taller.'; return; }
    if (this.freeSeats(t) <= 0) { this.confirmTaller = t; this.errorInscripcion = 'Este taller alcanzó su capacidad máxima.'; return; }
    this.confirmTaller = t;
  }
  confirmEnrollment(): void {
    const t = this.confirmTaller; if (!t || this.submitting || this.errorInscripcion) return;
    this.submitting = true;
    this.alumno.inscribirse(t.id_taller).subscribe({
      next: () => {
        this.submitting = false; this.success = true; this.idsInscritos.add(t.id_taller); t.inscritos += 1;
        setTimeout(() => { this.confirmTaller = null; this.success = false; }, 1500);
      },
      error: err => { this.submitting = false; this.errorInscripcion = err?.error?.message ?? 'No se pudo realizar la inscripción.'; }
    });
  }
  closeConfirm(): void { if (!this.submitting) { this.confirmTaller = null; this.success = false; this.errorInscripcion = ''; } }
}
