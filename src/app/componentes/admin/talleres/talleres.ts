import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TallerService, TallerFormData } from '../../../services/taller.service';
import { AuthService } from '../../../services/auth.service';
import { ReglaDiploma, Taller, TallerEstadisticas, TipoArea, TipoEvento } from '../../../models/taller';
import { MapaPicker } from '../../shared/mapa-picker/mapa-picker';
import { colorPorArea, colorPorRegla } from '../../../shared/colores';

type Tab = 'eventos' | 'estadisticas' | 'reglas';

interface FormState {
  id_taller: number | null;
  nombre: string;
  descripcion: string;
  idArea: number | null;
  capacidad: number;
  fecha: string;
  hora: string;
  idTipo: number | null;
  modalidad: string;
  ubicacion: string;
  latitud: number | null;
  longitud: number | null;
  institucion: string;
  requisitos: string;
  dias: string[];
  imagen: File | null;
  imagenPreview: string | null;
}

function formVacio(): FormState {
  return {
    id_taller: null, nombre: '', descripcion: '', idArea: null, capacidad: 30,
    fecha: '', hora: '', idTipo: null, modalidad: 'Presencial', ubicacion: '',
    latitud: null, longitud: null, institucion: '',
    requisitos: '', dias: [], imagen: null, imagenPreview: null
  };
}

export const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

const HORA_MIN = '08:00';
const HORA_MAX = '20:00';
const CAPACIDAD_MAX = 30;

@Component({
  selector: 'app-admin-talleres',
  imports: [CommonModule, FormsModule, MapaPicker],
  templateUrl: './talleres.html',
  styleUrl: './talleres.css',
})
export class Talleres implements OnInit {
  tab: Tab = 'eventos';

  talleres: Taller[] = [];
  cargando = false;
  error = '';
  buscar = '';

  tiposEvento: TipoEvento[] = [];
  areas: TipoArea[] = [];

  estadisticas: TallerEstadisticas | null = null;

  reglas: ReglaDiploma[] = [];
  reglaEditando: ReglaDiploma | null = null;
  reglaForm = { nombreNivel: '', porcentajeMinimo: 0, porcentajeMaximo: 0, descripcion: '' };
  guardandoRegla = false;
  actualizandoActivoId: number | null = null;

  mostrarFormTaller = false;
  guardandoTaller = false;
  submitted = false;
  errorGeneral = '';
  form: FormState = formVacio();

  tallerAArchivar: Taller | null = null;
  archivando = false;

  tallerAccion: Taller | null = null;
  accionEstado: 'Finalizado' | 'Cancelado' = 'Finalizado';
  procesandoAccion = false;
  tallerObservado: Taller | null = null;

  readonly diasSemana = DIAS_SEMANA;
  readonly horaMin = HORA_MIN;
  readonly horaMax = HORA_MAX;
  readonly capacidadMax = CAPACIDAD_MAX;

  constructor(
    private tallerService: TallerService,
    public auth: AuthService
  ) { }

  isAdmin(): boolean { return this.auth.currentUser?.rol === 'administrador'; }

  ngOnInit(): void {
    this.cargarCatalogos();
    this.cargarTalleres();
  }

  /** Texto fijo que se muestra en el campo "Docente" (nunca se elige). */
  get docenteDisplay(): string {
    return this.auth.isAdministrador() ? 'Administrador' : (this.auth.currentUser?.nombres ?? '');
  }

  cambiarTab(t: Tab): void {
    this.tab = t;
    if (t === 'estadisticas' && !this.estadisticas) this.cargarEstadisticas();
    if (t === 'reglas' && this.reglas.length === 0) this.cargarReglas();
  }

  cargarCatalogos(): void {
    this.tallerService.catalogos().subscribe({
      next: (c) => { this.tiposEvento = c.tiposEvento; this.areas = c.areas; },
      error: () => void 0
    });
  }

  cargarTalleres(): void {
    this.cargando = true;
    this.error = '';
    this.tallerService.listar().subscribe({
      next: (t) => { this.talleres = t; this.cargando = false; },
      error: (err) => {
        this.cargando = false;
        this.error = err.error?.message || 'No se pudieron cargar los talleres.';
      }
    });
  }

  get talleresVisibles(): Taller[] {
    const q = this.normalizar(this.buscar.trim());
    if (!q) return this.talleres;

    return this.talleres
      .map(t => ({ taller: t, score: this.puntajeBusqueda(t, q) }))
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score || a.taller.nombre.localeCompare(b.taller.nombre))
      .map(x => x.taller);
  }

  private normalizar(valor: string): string {
    return valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }

  private puntajeBusqueda(t: Taller, q: string): number {
    const campos = [t.nombre, t.tipo_evento, t.area, t.institucion, t.docente].map(v => this.normalizar(v ?? ''));
    let mejor = 0;
    for (const texto of campos) {
      if (texto === q) mejor = Math.max(mejor, 1000);
      else if (texto.startsWith(q)) mejor = Math.max(mejor, 700);
      else if (texto.includes(q)) mejor = Math.max(mejor, 400);
      else {
        const palabras = texto.split(/\s+/);
        if (palabras.some(p => p.startsWith(q))) mejor = Math.max(mejor, 250);
      }
    }
    return mejor;
  }

  formatFecha(fecha: string): string {
    const [y, m, d] = String(fecha ?? '').slice(0, 10).split('-').map(Number);
    if (!y || !m || !d) return fecha;
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${String(d).padStart(2, '0')} ${meses[m - 1]}, ${y}`;
  }

  formatDias(dias: string[] | undefined): string {
    if (!dias?.length) return '—';
    const mapa: Record<string, string> = {
      Lunes: 'Lun', Martes: 'Mar', Miércoles: 'Mie', Jueves: 'Jue',
      Viernes: 'Vie', Sábado: 'Sab', Domingo: 'Dom'
    };
    return dias.map(d => mapa[d] ?? d).join(' – ');
  }

  formatHorario(t: Taller): string {
    return `${t.hora} – ${t.hora_fin || t.hora}`;
  }

  estadoClass(estado: string): string {
    if (estado === 'En curso') return 'et-estado-en-curso';
    if (estado === 'Finalizado') return 'et-estado-finalizado';
    if (estado === 'Cancelado') return 'et-estado-cancelado';
    return 'et-estado-proximo';
  }

  esPropietario(t: Taller): boolean {
    return Number(t.id_usuario_docente) === Number(this.auth.currentUser?.id);
  }

  private estadoNormalizado(estado: string): string {
    return String(estado ?? '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  puedeEditar(t: Taller): boolean {
    const pendiente = this.estadoNormalizado(t.estado) === 'proximo';
    // Docente y administrador tienen las mismas acciones sobre un taller propio.
    return (this.auth.isDocente() || this.auth.isAdministrador()) && this.esPropietario(t) && pendiente;
  }

  puedeCambiarEstado(t: Taller): boolean {
    const estado = this.estadoNormalizado(t.estado);
    if (!['proximo', 'en curso'].includes(estado)) return false;

    // El creador (docente o administrador) puede finalizar/cancelar su taller
    // desde Próximo o En curso.
    if (this.auth.isDocente() || this.auth.isAdministrador()) {
      if (this.esPropietario(t)) return true;
    }

    // Además, el administrador puede intervenir sobre un taller ajeno una vez
    // que ya está En curso, igual que en la lógica administrativa anterior.
    return this.auth.isAdministrador() && estado === 'en curso';
  }

  puedeObservar(t: Taller): boolean {
    const estado = this.estadoNormalizado(t.estado);

    // El administrador puede observar talleres ajenos tanto Próximos como En curso,
    // incluso cuando en En curso también tenga las acciones de gestión.
    if (this.auth.isAdministrador() && !this.esPropietario(t)) return true;

    // El creador observa cuando ya terminó/canceló (además de poder archivar).
    if (['finalizado', 'cancelado'].includes(estado)) return true;

    return !this.puedeEditar(t) && !this.puedeCambiarEstado(t);
  }

  puedeArchivar(t: Taller): boolean {
    const terminal = ['finalizado', 'cancelado'].includes(this.estadoNormalizado(t.estado));
    return terminal && (this.auth.isAdministrador() || this.esPropietario(t));
  }

  abrirObservacion(t: Taller): void {
    this.tallerObservado = t;
  }

  cerrarObservacion(): void {
    this.tallerObservado = null;
  }

  pedirCambioEstado(t: Taller, estado: 'Finalizado' | 'Cancelado'): void {
    if (!this.puedeCambiarEstado(t)) return;
    this.tallerAccion = t;
    this.accionEstado = estado;
  }

  cerrarCambioEstado(): void {
    if (!this.procesandoAccion) this.tallerAccion = null;
  }

  confirmarCambioEstado(): void {
    if (!this.tallerAccion) return;
    this.procesandoAccion = true;
    this.tallerService.cambiarEstado(this.tallerAccion.id_taller, this.accionEstado).subscribe({
      next: () => {
        this.procesandoAccion = false;
        this.tallerAccion = null;
        this.cargarTalleres();
      },
      error: (err) => {
        this.procesandoAccion = false;
        this.error = err.error?.message || 'No se pudo actualizar el estado del taller.';
        this.tallerAccion = null;
      }
    });
  }

  cargarEstadisticas(): void {
    this.tallerService.estadisticas().subscribe({
      next: (e) => this.estadisticas = e,
      error: () => void 0
    });
  }

  cargarReglas(): void {
    this.tallerService.listarReglasDiploma().subscribe({
      next: (r) => this.reglas = r,
      error: () => void 0
    });
  }

  get totalProximos(): number {
    return this.talleres.filter(t => t.estado === 'Proximo' || t.estado === 'Próximo').length;
  }
  get totalActivos(): number {
    return this.talleres.filter(t => t.estado === 'En curso').length;
  }
  get totalInscritosSuma(): number {
    return this.talleres.reduce((acc, t) => acc + t.inscritos, 0);
  }

  colorArea(nombreArea: string) {
    return colorPorArea(nombreArea);
  }
  colorRegla(color: string): string {
    return colorPorRegla(color);
  }

  // ---------- Fecha/hora límite para los inputs nativos ----------

  private toIsoDate(d = new Date()): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  /** La fecha debe ser estrictamente posterior a hoy -> el mínimo seleccionable es mañana. */
  get fechaMinima(): string {
    const manana = new Date();
    manana.setDate(manana.getDate() + 1);
    return this.toIsoDate(manana);
  }

  // ---------- Validación (mismo patrón Bootstrap del proyecto anterior) ----------

  get errores(): Record<string, string> {
    const e: Record<string, string> = {};

    if (!this.form.nombre.trim()) e['nombre'] = 'El título es obligatorio.';
    if (!this.form.descripcion.trim()) e['descripcion'] = 'La descripción es obligatoria.';
    if (!this.form.idArea) e['idArea'] = 'El tipo de actividad es obligatorio.';
    if (!this.form.idTipo) e['idTipo'] = 'El tipo de evento es obligatorio.';

    if (!this.form.fecha.trim()) {
      e['fecha'] = 'La fecha es obligatoria.';
    } else if (this.form.fecha <= this.toIsoDate()) {
      e['fecha'] = 'La fecha debe ser posterior al día de hoy.';
    }

    if (!this.form.hora.trim()) {
      e['hora'] = 'La hora es obligatoria.';
    } else if (this.form.hora < HORA_MIN || this.form.hora > HORA_MAX) {
      e['hora'] = `La hora debe estar entre las ${HORA_MIN} y las ${HORA_MAX}.`;
    }

    const cap = Number(this.form.capacidad);
    if (!Number.isFinite(cap) || cap < 1) {
      e['capacidad'] = 'Debe haber al menos 1 alumno.';
    } else if (cap > CAPACIDAD_MAX) {
      e['capacidad'] = `El máximo permitido es ${CAPACIDAD_MAX} alumnos.`;
    }

    if (!this.esSeminario && (this.form.dias.length < 1 || this.form.dias.length > 3)) {
      e['dias'] = 'Selecciona entre 1 y 3 días de la semana.';
    }

    if (this.form.modalidad === 'Presencial' && !this.form.ubicacion.trim()) e['ubicacion'] = 'La ubicación es obligatoria.';
    if (!this.form.institucion.trim()) e['institucion'] = 'La institución es obligatoria.';

    return e;
  }

  get formularioValido(): boolean {
    return Object.keys(this.errores).length === 0;
  }

  // ---------- Alta/edición de taller ----------

  abrirNuevoTaller(): void {
    this.form = formVacio();
    this.submitted = false;
    this.errorGeneral = '';

    if (this.auth.isDocente()) {
      // Institución se autocompleta desde el perfil del docente (igual que
      // para crear la cuenta de Docente se exige ese campo).
      this.form.institucion = this.auth.currentUser?.institucion ?? '';
    }
    this.mostrarFormTaller = true;
  }

  abrirEditarTaller(t: Taller): void {
    this.form = {
      id_taller: t.id_taller,
      nombre: t.nombre,
      descripcion: t.descripcion,
      idArea: t.id_area,
      capacidad: t.capacidad,
      fecha: t.fecha,
      hora: t.hora,
      idTipo: t.id_tipo,
      modalidad: t.modalidad,
      ubicacion: t.ubicacion,
      latitud: t.latitud,
      longitud: t.longitud,
      institucion: this.auth.isDocente() ? (this.auth.currentUser?.institucion ?? t.institucion) : t.institucion,
      requisitos: (t.requisitos ?? []).join('\n'),
      dias: (t.dias_semana ?? []).slice(),
      imagen: null,
      imagenPreview: t.imagen_url
    };
    this.submitted = false;
    this.errorGeneral = '';
    this.mostrarFormTaller = true;
  }

  cerrarFormTaller(): void {
    this.mostrarFormTaller = false;
  }

  onImagenSeleccionada(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.form.imagen = file;
    const reader = new FileReader();
    reader.onload = () => this.form.imagenPreview = reader.result as string;
    reader.readAsDataURL(file);
  }

  onUbicacionElegida(coords: { lat: number; lng: number }): void {
    this.form.latitud = coords.lat;
    this.form.longitud = coords.lng;
  }

  onModalidadChange(): void {
    if (this.form.modalidad === 'Virtual') {
      this.form.ubicacion = 'Virtual';
      this.form.latitud = null;
      this.form.longitud = null;
    } else if (this.form.ubicacion === 'Virtual') {
      this.form.ubicacion = '';
    }
  }

  get tipoEventoSeleccionadoNombre(): string {
    return this.tiposEvento.find(t => t.id_tipo === this.form.idTipo)?.nombre ?? '';
  }
  get esSeminario(): boolean {
    return this.tipoEventoSeleccionadoNombre.toLowerCase().startsWith('semin');
  }

  toggleDia(dia: string): void {
    const idx = this.form.dias.indexOf(dia);
    if (idx >= 0) {
      this.form.dias.splice(idx, 1);
    } else if (this.form.dias.length < 3) {
      this.form.dias.push(dia);
    }
  }

  guardarTaller(): void {
    this.submitted = true;
    this.errorGeneral = '';
    if (!this.formularioValido) return;

    const data: TallerFormData = {
      nombre: this.form.nombre.trim(),
      descripcion: this.form.descripcion.trim(),
      fecha: this.form.fecha,
      hora: this.form.hora,
      ubicacion: this.form.ubicacion.trim(),
      institucion: this.form.institucion.trim(),
      modalidad: this.form.modalidad,
      capacidad: this.form.capacidad,
      idArea: this.form.idArea!,
      idTipo: this.form.idTipo!,
      latitud: this.form.latitud,
      longitud: this.form.longitud,
      requisitos: this.form.requisitos,
      dias: this.form.dias,
      imagen: this.form.imagen
    };

    this.guardandoTaller = true;
    const obs = this.form.id_taller
      ? this.tallerService.actualizar(this.form.id_taller, data)
      : this.tallerService.crear(data);

    obs.subscribe({
      next: () => {
        this.guardandoTaller = false;
        this.mostrarFormTaller = false;
        this.cargarTalleres();
      },
      error: (err) => {
        this.guardandoTaller = false;
        this.errorGeneral = err.error?.message || 'No se pudo guardar el taller.';
      }
    });
  }

  // ---------- Archivar ("eliminar") ----------

  pedirArchivar(t: Taller): void {
    this.tallerAArchivar = t;
  }

  confirmarArchivar(): void {
    if (!this.tallerAArchivar) return;
    this.archivando = true;
    this.tallerService.archivar(this.tallerAArchivar.id_taller).subscribe({
      next: () => {
        this.archivando = false;
        this.tallerAArchivar = null;
        this.cargarTalleres();
      },
      error: () => {
        this.archivando = false;
        this.error = 'No se pudo archivar el taller.';
        this.tallerAArchivar = null;
      }
    });
  }

  // ---------- Reglas de constancia ----------

  toggleActivo(r: ReglaDiploma): void {
    this.actualizandoActivoId = r.id_regla_diploma;
    const nuevoValor = !r.activo;
    this.tallerService.actualizarActivoReglaDiploma(r.id_regla_diploma, nuevoValor).subscribe({
      next: () => {
        r.activo = nuevoValor;
        this.actualizandoActivoId = null;
      },
      error: () => { this.actualizandoActivoId = null; }
    });
  }

  abrirEditarRegla(r: ReglaDiploma): void {
    this.reglaEditando = r;
    this.reglaForm = {
      nombreNivel: r.nombre_nivel,
      porcentajeMinimo: r.porcentaje_minimo,
      porcentajeMaximo: r.porcentaje_maximo,
      descripcion: r.descripcion ?? ''
    };
  }

  cerrarEditarRegla(): void {
    this.reglaEditando = null;
  }

  guardarRegla(): void {
    if (!this.reglaEditando) return;
    this.guardandoRegla = true;
    this.tallerService.actualizarReglaDiploma(this.reglaEditando.id_regla_diploma, {
      nombreNivel: this.reglaForm.nombreNivel,
      porcentajeMinimo: this.reglaForm.porcentajeMinimo,
      porcentajeMaximo: this.reglaForm.porcentajeMaximo,
      descripcion: this.reglaForm.descripcion,
      color: this.reglaEditando.color,
      icono: this.reglaEditando.icono
    } as any).subscribe({
      next: () => {
        this.guardandoRegla = false;
        this.reglaEditando = null;
        this.cargarReglas();
      },
      error: () => { this.guardandoRegla = false; }
    });
  }
}
