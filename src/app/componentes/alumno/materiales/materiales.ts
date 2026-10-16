import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { AlumnoService, InscripcionAlumno, RecursoSesionAlumno, SesionRecursosAlumno } from '../../../services/alumno.service';

interface TallerMateriales {
  inscripcion: InscripcionAlumno;
  sesiones: SesionRecursosAlumno[];
  cargandoRecursos: boolean;
  errorRecursos: string;
}

@Component({
  selector: 'app-materiales-alumno',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './materiales.html',
  styleUrl: './materiales.css',
})
export class MaterialesAlumno implements OnInit {
  talleres = signal<TallerMateriales[]>([]);
  seleccionado = signal<number | null>(null);
  loading = true;
  error = '';

  constructor(private alumno: AlumnoService) { }

  ngOnInit(): void {
    this.alumno.misInscripciones().subscribe({
      next: inscripciones => {
        const activas = (inscripciones ?? []).filter(item =>
          !['cancelado', 'anulado'].includes(this.key(item.estado_inscripcion))
        );
        const talleres: TallerMateriales[] = activas.map(inscripcion => ({
          inscripcion,
          sesiones: [],
          cargandoRecursos: true,
          errorRecursos: '',
        }));
        this.talleres.set(talleres);
        this.loading = false;

        talleres.forEach(taller => this.cargarRecursos(taller));
      },
      error: err => {
        this.error = err?.error?.message ?? 'No se pudieron cargar tus talleres inscritos.';
        this.loading = false;
      },
    });
  }

  private cargarRecursos(taller: TallerMateriales): void {
    this.alumno.recursosTaller(taller.inscripcion.id_taller).subscribe({
      next: sesiones => {
        const seminario = this.key(taller.inscripcion.tipo_evento) === 'seminario';
        const maxSesiones = seminario ? 1 : 6;
        const permitidas = Array.from({ length: maxSesiones }, (_, index) => {
          const numero = index + 1;
          const sesionRecursos = (sesiones ?? []).find(s => Number(s.numero_sesion) === numero);
          const sesionInscripcion = (taller.inscripcion.sesiones ?? [])
            .find(s => Number(s.numero_sesion) === numero);

          return {
            id_sesion: sesionRecursos?.id_sesion ?? sesionInscripcion?.id_sesion ?? -numero,
            numero_sesion: numero,
            fecha: sesionRecursos?.fecha ?? sesionInscripcion?.fecha ?? taller.inscripcion.fecha,
            titulo: sesionRecursos?.titulo ?? sesionInscripcion?.titulo ?? null,
            recursos: sesionRecursos?.recursos ?? [],
          };
        });

        this.actualizarTaller(taller.inscripcion.id_taller, {
          sesiones: permitidas,
          cargandoRecursos: false,
          errorRecursos: '',
        });
      },
      error: err => {
        this.actualizarTaller(taller.inscripcion.id_taller, {
          cargandoRecursos: false,
          errorRecursos: err?.error?.message ?? 'No se pudieron cargar los materiales de este taller.',
        });
      },
    });
  }

  private actualizarTaller(idTaller: number, cambios: Partial<TallerMateriales>): void {
    this.talleres.update(items => items.map(item =>
      item.inscripcion.id_taller === idTaller ? { ...item, ...cambios } : item
    ));
  }

  toggleTaller(idTaller: number): void {
    this.seleccionado.update(actual => actual === idTaller ? null : idTaller);
  }

  cantidadRecursos(taller: TallerMateriales): number {
    return taller.sesiones.reduce((total, sesion) => total + sesion.recursos.length, 0);
  }

  area(taller: TallerMateriales): string {
    return taller.inscripcion.area?.trim() || 'Área general';
  }

  imagen(taller: TallerMateriales): string | null {
    return taller.inscripcion.imagen_url?.trim() || null;
  }

  docente(taller: TallerMateriales): string {
    return this.key(taller.inscripcion.rol_docente) === 'administrador'
      ? 'Administrador'
      : taller.inscripcion.docente?.trim() || 'Docente por asignar';
  }

  estadoLabel(estado: string | undefined): string {
    const normalized = this.key(estado);
    if (normalized === 'finalizado') return 'Completado';
    if (normalized === 'en curso') return 'En curso';
    return 'Próximo';
  }

  estadoClass(estado: string | undefined): string {
    const normalized = this.key(estado);
    if (normalized === 'finalizado') return 'material-status-completed';
    if (normalized === 'en curso') return 'material-status-progress';
    return 'material-status-upcoming';
  }

  tipoIcono(recurso: RecursoSesionAlumno): string {
    if (recurso.enlace_url) return 'bi bi-link-45deg';
    if (this.key(recurso.tipo) === 'imagen') return 'bi bi-image';
    if (this.key(recurso.tipo) === 'pdf') return 'bi bi-file-earmark-pdf';
    return 'bi bi-file-earmark-word';
  }

  tipoLabel(recurso: RecursoSesionAlumno): string {
    if (recurso.enlace_url) return 'Enlace';
    if (this.key(recurso.tipo) === 'imagen') return 'Foto';
    if (this.key(recurso.tipo) === 'pdf') return 'Ficha PDF';
    return 'Ficha';
  }

  recursoUrl(recurso: RecursoSesionAlumno): string | null {
    if (recurso.enlace_url) return recurso.enlace_url;
    return recurso.archivo_descarga_url || recurso.archivo_url || null;
  }

  detalle(recurso: RecursoSesionAlumno, sesion: SesionRecursosAlumno): string {
    const fecha = sesion.fecha ? this.fecha(sesion.fecha) : 'Fecha por confirmar';
    return `${this.tipoLabel(recurso)} · Ses. ${sesion.numero_sesion} · ${fecha}`;
  }

  fecha(value: string): string {
    const date = new Date(`${value}T12:00:00`);
    return Number.isNaN(date.getTime())
      ? value
      : new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short' })
        .format(date)
        .replace('.', '');
  }

  key(value: string | null | undefined): string {
    return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  }
}
