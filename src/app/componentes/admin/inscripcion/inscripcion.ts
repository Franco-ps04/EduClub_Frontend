import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { InscripcionService } from '../../../services/inscripcion.service';
import { AlumnoSesion, ResumenTaller, TallerInscripcion } from '../../../models/inscripcion';

@Component({
  selector: 'app-admin-inscripcion',
  imports: [CommonModule, FormsModule],
  templateUrl: './inscripcion.html',
  styleUrl: './inscripcion.css',
})
export class Inscripcion implements OnInit {
  talleres = signal<TallerInscripcion[]>([]);
  cargando = false;
  error = '';
  searchText = '';
  pageSize = 10;
  currentPage = 1;

  // Modal: Resumen (talleres con mas de 1 sesion)
  showResumenModal = signal(false);
  resumenTallerNombre = '';
  resumenTallerId: number | null = null;
  resumen: ResumenTaller | null = null;
  cargandoResumen = false;

  // Modal: Registro de asistencia (1 sesion puntual)
  showAsistenciaModal = signal(false);
  asistenciaTitulo = ''; // "Nombre del taller — Sesión N"
  asistenciaSesionId: number | null = null;
  alumnosModal: AlumnoSesion[] = [];
  cargandoAsistencia = false;
  guardadoAsistencia = false;

  // Modal: Crear notificación
  showNotifModal = signal(false);
  selectedTallerId: number | null = null;
  notifTitle = '';
  notifMessage = '';
  sent = signal(false);
  enviandoNotif = false;
  notifError = '';

  constructor(
    private inscripcionService: InscripcionService,
    private route: ActivatedRoute
  ) { }

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando = true;
    this.error = '';
    this.inscripcionService.listarTalleres().subscribe({
      next: (data) => {
        this.talleres.set(data);
        this.cargando = false;
        this.abrirDesdeQueryParam();
      },
      error: (err) => {
        this.cargando = false;
        this.error = err.error?.message || 'No se pudieron cargar los talleres.';
      }
    });
  }

  /** Si se llega con ?taller=ID (desde "Gestionar Asistencia" en Mis talleres), abre directo ese taller. */
  private abrirDesdeQueryParam(): void {
    const idParam = this.route.snapshot.queryParamMap.get('taller');
    if (!idParam) return;

    const id = Number(idParam);
    const taller = this.talleres().find(t => t.id_taller === id);
    if (taller) this.abrirInscritos(taller);
  }

  // ---------- Búsqueda y paginación (igual patrón que GreenUnity) ----------

  filteredTalleres(): TallerInscripcion[] {
    const q = this.searchText.trim().toLowerCase();
    const items = this.talleres();
    if (!q) return items;
    return items.filter(t => t.nombre.toLowerCase().includes(q));
  }

  paginatedTalleres(): TallerInscripcion[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredTalleres().slice(start, start + this.pageSize);
  }

  totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredTalleres().length / this.pageSize));
  }

  paginationPages(): number[] {
    return Array.from({ length: this.totalPages() }, (_, i) => i + 1);
  }

  goPage(page: number): void {
    this.currentPage = Math.min(Math.max(1, page), this.totalPages());
  }

  onSearchChange(): void {
    this.currentPage = 1;
  }

  pageEnd(total: number): number {
    return Math.min(this.currentPage * this.pageSize, total);
  }

  // ---------- Estado del taller ----------

  private estadoKey(estado: string): string {
    return String(estado ?? '')
      .trim().toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  isTerminal(t: TallerInscripcion): boolean {
    const key = this.estadoKey(t.estado);
    return key === 'finalizado' || key === 'cancelado';
  }

  estadoBadge(t: TallerInscripcion): { texto: string; clase: string } {
    const key = this.estadoKey(t.estado);
    if (key === 'cancelado') return { texto: 'Cancelado', clase: 'bg-danger-subtle text-danger' };
    if (key === 'finalizado') return { texto: 'Finalizado', clase: 'bg-secondary-subtle text-secondary' };
    return { texto: t.estado || 'Próximo', clase: 'bg-primary-subtle text-primary' };
  }

  // ---------- Abrir inscritos: Seminario -> directo; Sesión -> Resumen ----------

  abrirInscritos(t: TallerInscripcion): void {
    if (t.sesiones.length === 0) {
      this.error = 'Este taller todavía no tiene sesiones generadas.';
      return;
    }
    if (t.sesiones.length === 1) {
      this.abrirAsistenciaPorSesion(t.sesiones[0].id_sesion, t.nombre);
    } else {
      this.abrirResumen(t);
    }
  }

  abrirResumen(t: TallerInscripcion): void {
    this.resumenTallerNombre = t.nombre;
    this.resumenTallerId = t.id_taller;
    this.resumen = null;
    this.cargandoResumen = true;
    this.showResumenModal.set(true);

    this.inscripcionService.resumenTaller(t.id_taller).subscribe({
      next: (data) => { this.resumen = data; this.cargandoResumen = false; },
      error: () => { this.cargandoResumen = false; }
    });
  }

  /** Desde el Resumen, clic en una sesión concreta abre el registro de esa sesión. */
  abrirSesionDesdeResumen(numeroSesion: number): void {
    const taller = this.talleres().find(t => t.id_taller === this.resumenTallerId);
    const sesion = taller?.sesiones.find(s => s.numero_sesion === numeroSesion);
    if (!sesion || !taller) return;
    this.showResumenModal.set(false);
    this.abrirAsistenciaPorSesion(sesion.id_sesion, `${taller.nombre} — Sesión ${numeroSesion}`);
  }

  // ---------- Registro de asistencia (1 sesión) ----------

  abrirAsistenciaPorSesion(idSesion: number, tituloBase: string): void {
    this.asistenciaSesionId = idSesion;
    this.asistenciaTitulo = tituloBase;
    this.guardadoAsistencia = false;
    this.cargandoAsistencia = true;
    this.showAsistenciaModal.set(true);

    this.inscripcionService.listarPorSesion(idSesion).subscribe({
      next: (data) => {
        this.cargandoAsistencia = false;
        this.alumnosModal = data.alumnos;
        if (!tituloBase.includes('—')) {
          this.asistenciaTitulo = `${data.sesion.taller_nombre} — Sesión ${data.sesion.numero_sesion}`;
        }
      },
      error: () => { this.cargandoAsistencia = false; }
    });
  }

  toggleAsistencia(a: AlumnoSesion): void {
    if (a.asistio === null) a.asistio = true;
    else a.asistio = !a.asistio;
  }

  getAsistioClass(a: AlumnoSesion): string {
    if (a.asistio === null) return 'btn-outline-secondary';
    return a.asistio ? 'btn-success' : 'btn-danger';
  }
  getAsistioLabel(a: AlumnoSesion): string {
    if (a.asistio === null) return 'Sin registrar';
    return a.asistio ? 'Asistió' : 'No asistió';
  }
  getAsistioIcon(a: AlumnoSesion): string {
    if (a.asistio === null) return 'bi-dash-circle';
    return a.asistio ? 'bi-check-circle-fill' : 'bi-x-circle-fill';
  }

  countAsistieron(): number {
    return this.alumnosModal.filter(a => a.asistio === true).length;
  }
  countNoAsistieron(): number {
    return this.alumnosModal.filter(a => a.asistio === false).length;
  }

  guardarAsistencia(): void {
    if (!this.asistenciaSesionId) return;
    const idSesion = this.asistenciaSesionId;
    const pendientes = this.alumnosModal.filter(a => a.asistio !== null);

    if (!pendientes.length) {
      this.guardadoAsistencia = true;
      setTimeout(() => this.showAsistenciaModal.set(false), 1200);
      return;
    }

    let done = 0;
    const terminar = () => {
      if (++done === pendientes.length) {
        this.guardadoAsistencia = true;
        this.cargar();
        setTimeout(() => this.showAsistenciaModal.set(false), 1200);
      }
    };

    pendientes.forEach(a => {
      this.inscripcionService.registrarAsistencia(a.id_inscripcion, idSesion, a.asistio as boolean).subscribe({
        next: terminar,
        error: terminar
      });
    });
  }

  // ---------- Crear notificación ----------

  openNotif(idTaller: number): void {
    this.selectedTallerId = idTaller;
    this.notifTitle = '';
    this.notifMessage = '';
    this.sent.set(false);
    this.enviandoNotif = false;
    this.notifError = '';
    this.showNotifModal.set(true);
  }

  sendNotif(): void {
    this.notifError = '';
    const titulo = this.notifTitle.trim();
    const mensaje = this.notifMessage.trim();
    if (!titulo || !mensaje || !this.selectedTallerId) {
      this.notifError = 'Completa el título, el mensaje y selecciona un taller.';
      return;
    }
    if (titulo.length > 150) { this.notifError = 'El título no debe superar 150 caracteres.'; return; }
    if (mensaje.length > 5000) { this.notifError = 'El mensaje es demasiado largo.'; return; }

    this.enviandoNotif = true;
    this.inscripcionService.crearNotificacion(this.selectedTallerId, titulo, mensaje).subscribe({
      next: () => {
        this.enviandoNotif = false;
        this.sent.set(true);
        setTimeout(() => this.showNotifModal.set(false), 1200);
      },
      error: (err) => {
        this.enviandoNotif = false;
        this.notifError = err.error?.message ?? 'No se pudo enviar la notificación.';
      }
    });
  }
}
