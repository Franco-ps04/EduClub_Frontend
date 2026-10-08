import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CargaAlumnoService } from '../../../services/carga-alumno.service';
import { FilaCarga } from '../../../models/carga-alumno';

const ESTADO_VALIDO = 'Válido: Listo para crear';
const ESTADO_CREADO = 'Creado exitosamente';

interface EstiloEstado {
  dot: string;
  bg: string;
  text: string;
}

const ESTILOS: Record<string, EstiloEstado> = {
  'Válido: Listo para crear': { dot: '#22c55e', bg: '#dcfce7', text: '#15803d' },
  'Correo ya existe en el sistema': { dot: '#f59e0b', bg: '#fef3c7', text: '#92400e' },
  'Datos incompletos o inválidos': { dot: '#ef4444', bg: '#fee2e2', text: '#b91c1c' },
  'Correo duplicado en el Excel': { dot: '#8b5cf6', bg: '#ede9fe', text: '#6d28d9' },
  'Creado exitosamente': { dot: '#3b82f6', bg: '#dbeafe', text: '#1d4ed8' },
};

@Component({
  selector: 'app-admin-enrollar',
  imports: [CommonModule],
  templateUrl: './enrollar.html',
  styleUrl: './enrollar.css',
})
export class Enrollar {
  archivo: File | null = null;
  archivoNombre = '';
  idCarga: number | null = null;
  filas: FilaCarga[] = [];
  cargando = false;
  registrando = false;
  error = '';
  registrado = false;
  cantidadRegistrada = 0;

  readonly leyenda = [
    { estado: ESTADO_VALIDO, label: 'Válido: Listo para crear' },
    { estado: 'Correo ya existe en el sistema', label: 'Correo ya existe en el sistema' },
    { estado: 'Datos incompletos o inválidos', label: 'Datos incompletos o inválidos' },
    { estado: 'Correo duplicado en el Excel', label: 'Correo duplicado en el Excel' },
    { estado: ESTADO_CREADO, label: 'Creado exitosamente' },
  ];

  constructor(private cargaService: CargaAlumnoService) { }

  estiloEstado(estado: string): EstiloEstado {
    return ESTILOS[estado] ?? { dot: '#94a3b8', bg: '#f1f5f9', text: '#475569' };
  }

  get validos(): number {
    return this.filas.filter(f => f.estado === ESTADO_VALIDO).length;
  }

  get hayArchivoCargado(): boolean {
    return this.filas.length > 0;
  }

  get todosCreados(): boolean {
    return this.filas.length > 0 && this.filas.every(f => f.estado === ESTADO_CREADO || f.estado !== ESTADO_VALIDO);
  }

  descargarPlantilla(): void {
    this.cargaService.descargarPlantilla().subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'plantilla_alumnos.xlsx';
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => { this.error = 'No se pudo descargar la plantilla.'; }
    });
  }

  onArchivoSeleccionado(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.subirArchivo(file);
  }

  onDrop(ev: DragEvent): void {
    ev.preventDefault();
    const file = ev.dataTransfer?.files?.[0];
    if (file) this.subirArchivo(file);
  }

  onDragOver(ev: DragEvent): void {
    ev.preventDefault();
  }

  private subirArchivo(file: File): void {
    this.error = '';
    this.archivo = file;
    this.archivoNombre = file.name;
    this.cargando = true;
    this.registrado = false;

    this.cargaService.validar(file).subscribe({
      next: (res) => {
        this.cargando = false;
        this.idCarga = res.idCarga;
        this.filas = res.filas;
      },
      error: (err) => {
        this.cargando = false;
        this.error = err.error?.message || 'No se pudo procesar el archivo.';
      }
    });
  }

  registrarAlumnos(): void {
    if (!this.idCarga || this.validos === 0) return;
    this.registrando = true;
    this.error = '';

    this.cargaService.registrar(this.idCarga).subscribe({
      next: (res) => {
        this.registrando = false;
        this.filas = res.filas;
        this.cantidadRegistrada = this.filas.filter(f => f.estado === ESTADO_CREADO).length;
        this.registrado = true;
      },
      error: (err) => {
        this.registrando = false;
        this.error = err.error?.message || 'No se pudo completar el registro.';
      }
    });
  }

  nuevaCarga(): void {
    this.archivo = null;
    this.archivoNombre = '';
    this.idCarga = null;
    this.filas = [];
    this.error = '';
    this.registrado = false;
    this.cantidadRegistrada = 0;
  }
}
