import { CommonModule } from '@angular/common';
import { Component, input, OnDestroy, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { AlumnoService, DiplomaAlumno, InscripcionAlumno } from '../../../services/alumno.service';

type EstadoDiploma = 'disponible' | 'progreso' | 'sin-asistencia';

@Component({
  selector: 'app-diplomas-alumno',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './diplomas.html',
  styleUrl: './diplomas.css',
})
export class DiplomasAlumno implements OnDestroy {
  inscripciones = input.required<InscripcionAlumno[]>();
  diplomas = input.required<DiplomaAlumno[]>();
  nombreAlumno = input.required<string>();
  descargando = signal<number[]>([]);
  errorDescarga = signal<Record<number, string>>({});
  previewUrl = signal<SafeResourceUrl | null>(null);
  previewTitulo = signal('');
  private previewBlob: Blob | null = null;
  private previewObjectUrl: string | null = null;

  constructor(
    private alumno: AlumnoService,
    private sanitizer: DomSanitizer,
  ) {}

  talleres(): InscripcionAlumno[] {
    return this.inscripciones().filter(
      (item) => !['cancelado', 'anulado'].includes(this.key(item.estado_inscripcion)),
    );
  }

  sesionesEsperadas(item: InscripcionAlumno): number {
    return this.key(item.tipo_evento) === 'seminario' ? 1 : 6;
  }

  asistencias(item: InscripcionAlumno): number {
    return (item.sesiones ?? []).filter((sesion) => sesion.asistio === true).length;
  }

  porcentaje(item: InscripcionAlumno): number {
    return Math.round((this.asistencias(item) / this.sesionesEsperadas(item)) * 100);
  }

  estado(item: InscripcionAlumno): EstadoDiploma {
    if (this.puedeDescargar(item)) return 'disponible';
    if (this.asistencias(item) === 0) return 'sin-asistencia';
    return 'progreso';
  }

  diplomaDescargable(item: InscripcionAlumno): DiplomaAlumno | undefined {
    return this.diplomas().find(
      (diploma) =>
        Number(diploma.id_taller) === Number(item.id_taller) &&
        this.key(diploma.nombre_nivel).includes('excelencia') &&
        Number(diploma.porcentaje_obtenido) === 100 &&
        Number(diploma.id_diploma) > 0,
    );
  }

  puedeDescargar(item: InscripcionAlumno): boolean {
    return (
      this.estadoTallerFinalizado(item) &&
      (item.sesiones?.length ?? 0) === this.sesionesEsperadas(item) &&
      this.asistencias(item) === this.sesionesEsperadas(item)
    );
  }

  descargar(item: InscripcionAlumno): void {
    this.generarPdf(item, false);
  }

  vistaPrevia(item: InscripcionAlumno): void {
    this.generarPdf(item, true);
  }

  descargarPreview(): void {
    if (!this.previewBlob || !this.previewObjectUrl) return;
    this.descargarArchivo(this.previewObjectUrl, this.previewTitulo());
  }

  private generarPdf(item: InscripcionAlumno, abrirVistaPrevia: boolean): void {
    if (!this.puedeDescargar(item) || this.descargando().includes(item.id_taller)) return;

    this.descargando.update((ids) => [...ids, item.id_taller]);
    this.errorDescarga.update((errors) => ({ ...errors, [item.id_taller]: '' }));
    this.alumno.descargarDiploma(item.id_taller).subscribe({
      next: (archivo) => {
        if (abrirVistaPrevia) {
          this.cerrarPreview();
          this.previewBlob = archivo;
          this.previewObjectUrl = URL.createObjectURL(archivo);
          this.previewUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(this.previewObjectUrl));
          this.previewTitulo.set(item.titulo);
        } else {
          const url = URL.createObjectURL(archivo);
          this.descargarArchivo(url, item.titulo);
          window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        }
        this.descargando.update((ids) => ids.filter((id) => id !== item.id_taller));
      },
      error: (error) => this.manejarErrorDescarga(item.id_taller, error),
    });
  }

  private descargarArchivo(url: string, titulo: string): void {
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = `diploma-${this.nombreArchivo(titulo)}.pdf`;
    enlace.click();
  }

  private nombreArchivo(titulo: string): string {
    return titulo
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase();
  }

  private manejarErrorDescarga(idTaller: number, error: HttpErrorResponse): void {
    const finalizar = (mensaje: string): void => {
      this.errorDescarga.update((errors) => ({ ...errors, [idTaller]: mensaje }));
      this.descargando.update((ids) => ids.filter((id) => id !== idTaller));
    };

    if (error.error instanceof Blob) {
      error.error
        .text()
        .then((texto) => {
          try {
            const respuesta: unknown = JSON.parse(texto);
            if (
              typeof respuesta === 'object' &&
              respuesta !== null &&
              'message' in respuesta &&
              typeof respuesta.message === 'string'
            ) {
              finalizar(respuesta.message);
              return;
            }
          } catch {
            finalizar('El servidor no pudo generar el diploma. Inténtalo nuevamente.');
            return;
          }
          finalizar('El servidor no pudo generar el diploma. Inténtalo nuevamente.');
        })
        .catch(() => finalizar('No se pudo leer el error de generación del diploma.'));
      return;
    }

    finalizar(error.error?.message ?? 'No se pudo generar el diploma. Inténtalo nuevamente.');
  }

  cerrarPreview(): void {
    if (this.previewObjectUrl) URL.revokeObjectURL(this.previewObjectUrl);
    this.previewObjectUrl = null;
    this.previewBlob = null;
    this.previewUrl.set(null);
    this.previewTitulo.set('');
  }

  ngOnDestroy(): void {
    this.cerrarPreview();
  }

  etiquetaBoton(item: InscripcionAlumno): string {
    if (!this.estadoTallerFinalizado(item))
      return 'Disponible cuando el docente finalice la actividad';
    if (this.asistencias(item) === this.sesionesEsperadas(item)) return 'Diploma aún no disponible';
    return 'Sin disponibilidad';
  }

  estadoTallerFinalizado(item: InscripcionAlumno): boolean {
    return this.key(item.estado_taller_registrado) === 'finalizado';
  }

  esSeminario(item: InscripcionAlumno): boolean {
    return this.key(item.tipo_evento) === 'seminario';
  }

  key(value: string | number | null | undefined): string {
    return String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }
}
