import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TallerAlumno } from '../../../services/alumno.service';

/** Tarjeta reutilizable del catálogo. Mantiene la presentación existente de Eventos. */
@Component({
  selector: 'app-tarjeta-taller-alumno',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tarjeta-taller.html',
  styleUrl: './tarjeta-taller.css'
})
export class TarjetaTallerAlumno {
  @Input({ required: true }) taller!: TallerAlumno;
  @Input() selected = false;
  @Input() inscrito = false;
  @Input() puedeInscribirse = true;

  @Output() seleccionar = new EventEmitter<TallerAlumno>();
  @Output() informacion = new EventEmitter<TallerAlumno>();
  @Output() inscribir = new EventEmitter<TallerAlumno>();

  private key(value: string | null | undefined): string {
    return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
  }

  isPresencial(): boolean { return this.key(this.taller.modalidad) === 'presencial'; }
  hasMap(): boolean {
    return this.isPresencial() && this.taller.latitud != null && this.taller.longitud != null &&
      Number.isFinite(Number(this.taller.latitud)) && Number.isFinite(Number(this.taller.longitud));
  }
  modalidadLabel(): string { return this.isPresencial() ? 'Presencial' : 'Virtual'; }
  formatoLabel(): string { return this.key(this.taller.tipo_evento) === 'seminario' ? 'Seminario' : 'Sesión'; }
  image(): string { return this.taller.imagen_url || 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&q=80'; }
  hora(): string { return `${this.taller.hora || '--:--'} – ${this.taller.hora_fin || this.taller.hora || '--:--'}`; }
  getDays(): string {
    return (this.taller.dias_semana ?? []).join(' – ') || (this.key(this.taller.tipo_evento) === 'seminario' ? 'Una sesión' : 'Según cronograma');
  }
  freeSeats(): number { return Math.max(0, Number(this.taller.capacidad || 0) - Number(this.taller.inscritos || 0)); }
  occupiedPct(): number { return this.taller.capacidad > 0 ? Math.min(100, Math.round(this.taller.inscritos / this.taller.capacidad * 100)) : 0; }
}
