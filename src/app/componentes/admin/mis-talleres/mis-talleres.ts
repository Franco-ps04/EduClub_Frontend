import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { TallerService } from '../../../services/taller.service';
import { MisTalleresResumen, Recurso, SesionConRecursos, TallerDocente } from '../../../models/taller';
import { colorPorArea } from '../../../shared/colores';

type TipoRecurso = 'word' | 'pdf' | 'imagen';

const ACCEPT_POR_TIPO: Record<TipoRecurso, string> = {
  word: '.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  pdf: '.pdf,application/pdf',
  imagen: 'image/*'
};

@Component({
  selector: 'app-admin-mis-talleres',
  imports: [CommonModule, FormsModule],
  templateUrl: './mis-talleres.html',
  styleUrl: './mis-talleres.css',
})
export class MisTalleres implements OnInit {
  cargando = false;
  error = '';
  resumen: MisTalleresResumen | null = null;
  talleres: TallerDocente[] = [];
  buscar = '';

  tallerExpandidoId: number | null = null;
  sesionesDelTaller: SesionConRecursos[] = [];
  cargandoRecursos = false;

  mostrarModalSubir = false;
  tallerParaSubir: TallerDocente | null = null;
  guardandoRecurso = false;
  formError = '';
  form = {
    idSesion: null as number | null,
    tituloSesion: '',
    titulo: '',
    descripcion: '',
    tipo: null as TipoRecurso | null,
    enlace: '',
    archivo: null as File | null,
    archivoNombre: ''
  };

  recursoAEliminar: Recurso | null = null;
  eliminando = false;

  recursoPreview: Recurso | null = null;

  constructor(
    private tallerService: TallerService,
    private sanitizer: DomSanitizer,
    private router: Router
  ) { }

  colorArea(nombreArea: string) {
    return colorPorArea(nombreArea);
  }

  /** Lleva a Inscripción y abre directo el registro de asistencia de este taller. */
  irAGestionarAsistencia(t: TallerDocente, ev: Event): void {
    ev.stopPropagation();
    this.router.navigate(['/admin/inscripcion'], { queryParams: { taller: t.id_taller } });
  }

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando = true;
    this.error = '';
    this.tallerService.misTalleres().subscribe({
      next: (data) => {
        this.resumen = data.resumen;
        this.talleres = data.talleres;
        this.cargando = false;
      },
      error: (err) => {
        this.cargando = false;
        this.error = err.error?.message || 'No se pudieron cargar tus talleres.';
      }
    });
  }

  get talleresFiltrados(): TallerDocente[] {
    const q = this.buscar.trim().toLowerCase();
    if (!q) return this.talleres;
    return this.talleres.filter(t => t.nombre.toLowerCase().includes(q) || t.area.toLowerCase().includes(q));
  }

  // ---------- Click en la tarjeta: expande/colapsa materiales ----------

  onCardClick(t: TallerDocente): void {
    if (this.tallerExpandidoId === t.id_taller) {
      this.tallerExpandidoId = null;
      this.sesionesDelTaller = [];
      return;
    }
    this.tallerExpandidoId = t.id_taller;
    this.cargandoRecursos = true;
    this.tallerService.listarRecursosPorTaller(t.id_taller).subscribe({
      next: (sesiones) => { this.sesionesDelTaller = sesiones; this.cargandoRecursos = false; },
      error: () => { this.cargandoRecursos = false; }
    });
  }

  private refrescarExpandido(): void {
    const id = this.tallerExpandidoId;
    if (!id) return;
    this.tallerService.listarRecursosPorTaller(id).subscribe({
      next: (sesiones) => this.sesionesDelTaller = sesiones,
      error: () => void 0
    });
  }

  // ---------- Subir recurso (dentro del taller expandido) ----------

  abrirSubirRecurso(t: TallerDocente, ev: Event): void {
    ev.stopPropagation(); // no colapsar la tarjeta al abrir el modal
    this.formError = '';
    this.tallerParaSubir = t;
    this.form = { idSesion: null, tituloSesion: '', titulo: '', descripcion: '', tipo: null, enlace: '', archivo: null, archivoNombre: '' };
    this.mostrarModalSubir = true;
  }

  cerrarSubirRecurso(): void {
    this.mostrarModalSubir = false;
    this.tallerParaSubir = null;
  }

  /** Sesión ya elegida: si ya tiene título, se muestra fijo (solo se puede poner una vez). */
  get sesionSeleccionada(): SesionConRecursos | undefined {
    return this.sesionesDelTaller.find(s => s.id_sesion === this.form.idSesion);
  }
  get sesionYaTieneTitulo(): boolean {
    return !!this.sesionSeleccionada?.titulo;
  }

  onSesionChange(): void {
    // Si la sesion ya tiene titulo, lo reflejamos (informativo, de solo lectura).
    this.form.tituloSesion = this.sesionSeleccionada?.titulo ?? '';
  }

  get acceptActual(): string {
    return this.form.tipo ? ACCEPT_POR_TIPO[this.form.tipo] : '';
  }

  onTipoChange(): void {
    // Cambiar el tipo limpia el archivo ya elegido (puede no coincidir).
    this.form.archivo = null;
    this.form.archivoNombre = '';
  }

  onArchivoSeleccionado(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (this.form.tipo && !this.archivoCoincideConTipo(file)) {
      this.formError = `El archivo elegido no es de tipo ${this.form.tipo}.`;
      input.value = '';
      return;
    }
    this.formError = '';
    this.form.archivo = file;
    this.form.archivoNombre = file.name;
  }

  private archivoCoincideConTipo(file: File): boolean {
    if (this.form.tipo === 'pdf') return file.type === 'application/pdf';
    if (this.form.tipo === 'imagen') return file.type.startsWith('image/');
    if (this.form.tipo === 'word') {
      return file.type === 'application/msword' ||
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    }
    return false;
  }

  guardarRecurso(): void {
    this.formError = '';
    if (!this.form.idSesion) { this.formError = 'Selecciona la sesión relacionada.'; return; }
    if (!this.form.tipo) { this.formError = 'Selecciona el tipo de recurso.'; return; }
    if (this.form.titulo.trim().length < 3) { this.formError = 'Ingresa el título del recurso.'; return; }
    if (!this.form.archivo) { this.formError = 'Adjunta el documento.'; return; }

    this.guardandoRecurso = true;
    this.tallerService.crearRecurso({
      idSesion: this.form.idSesion,
      tipo: this.form.tipo,
      titulo: this.form.titulo.trim(),
      tituloSesion: this.sesionYaTieneTitulo ? undefined : (this.form.tituloSesion.trim() || undefined),
      descripcion: this.form.descripcion.trim() || undefined,
      enlace: this.form.enlace.trim() || undefined,
      archivo: this.form.archivo
    }).subscribe({
      next: () => {
        this.guardandoRecurso = false;
        this.mostrarModalSubir = false;
        this.tallerParaSubir = null;
        this.cargar();
        this.refrescarExpandido();
      },
      error: (err) => {
        this.guardandoRecurso = false;
        this.formError = err.error?.message || 'No se pudo subir el recurso.';
      }
    });
  }

  // ---------- Eliminar recurso ----------

  pedirEliminar(r: Recurso, ev: Event): void {
    ev.stopPropagation();
    this.recursoAEliminar = r;
  }

  confirmarEliminar(): void {
    if (!this.recursoAEliminar) return;
    this.eliminando = true;
    this.tallerService.eliminarRecurso(this.recursoAEliminar.id_recurso).subscribe({
      next: () => {
        this.eliminando = false;
        this.recursoAEliminar = null;
        this.refrescarExpandido();
      },
      error: () => { this.eliminando = false; this.recursoAEliminar = null; }
    });
  }

  // ---------- Vista previa ----------

  abrirPreview(r: Recurso, ev: Event): void {
    ev.stopPropagation();
    this.recursoPreview = r;
  }

  cerrarPreview(): void {
    this.recursoPreview = null;
  }

  get previewEsVisible(): boolean {
    return this.recursoPreview?.tipo === 'pdf' || this.recursoPreview?.tipo === 'imagen';
  }

  get previewUrlSegura(): SafeResourceUrl | null {
    if (!this.recursoPreview?.archivo_url) return null;
    return this.sanitizer.bypassSecurityTrustResourceUrl(this.recursoPreview.archivo_url);
  }

  iconoRecurso(tipo: string): string {
    if (tipo === 'pdf') return 'bi-file-earmark-pdf-fill text-danger';
    if (tipo === 'imagen') return 'bi-file-earmark-image-fill text-primary';
    return 'bi-file-earmark-word-fill text-primary';
  }
}
