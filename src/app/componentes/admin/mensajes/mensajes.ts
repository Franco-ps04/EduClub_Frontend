import { DatePipe } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Mensaje } from '../../../models/mensaje';
import { MensajeService } from '../../../services/mensaje.service';

type Filtro = 'todos' | 'sin-leer' | 'alumnos';

@Component({
  selector: 'app-admin-mensajes',
  imports: [DatePipe, FormsModule],
  templateUrl: './mensajes.html',
  styleUrl: './mensajes.css',
})
export class Mensajes implements OnInit {
  selected = signal<Mensaje | null>(null);
  filtro: Filtro = 'todos';
  respuestaTexto = '';
  enviando = false;
  loading = false;
  error = '';

  pageSize = 10;
  currentPage = 1;

  private lista: Mensaje[] = [];

  constructor(private mensajeService: MensajeService) { }

  ngOnInit(): void {
    this.cargar();
  }

  private cargar(): void {
    this.loading = true;
    this.error = '';
    this.mensajeService.panel().subscribe({
      next: (data) => {
        this.loading = false;
        this.lista = data;
        const lista = this.paginated();
        if (lista.length > 0) this.select(lista[0]);
      },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.message || 'No se pudieron cargar los mensajes.';
      }
    });
  }

  filtrados(): Mensaje[] {
    return this.lista.filter(m => {
      if (this.filtro === 'sin-leer') return !m.leido;
      if (this.filtro === 'alumnos') return true; // todos los mensajes son de alumnos en este panel
      return true;
    });
  }

  paginated(): Mensaje[] {
    const items = this.filtrados();
    const start = (this.currentPage - 1) * this.pageSize;
    return items.slice(start, start + this.pageSize);
  }

  totalPages(): number {
    return Math.max(1, Math.ceil(this.filtrados().length / this.pageSize));
  }

  paginationPages(): number[] {
    return Array.from({ length: this.totalPages() }, (_, i) => i + 1);
  }

  goPage(page: number): void {
    this.currentPage = Math.min(Math.max(1, page), this.totalPages());
  }

  sinLeer(): number {
    return this.lista.filter(m => !m.leido).length;
  }

  select(m: Mensaje): void {
    this.respuestaTexto = '';
    this.enviando = false;
    this.selected.set({ ...m, leido: true });

    if (!m.leido) {
      this.mensajeService.marcarLeido(m.id_mensaje).subscribe({
        next: () => {
          this.lista = this.lista.map(x => x.id_mensaje === m.id_mensaje ? { ...x, leido: true } : x);
        }
      });
    }
  }

  responder(): void {
    const m = this.selected();
    if (!this.respuestaTexto.trim() || !m) return;

    const texto = this.respuestaTexto.trim();
    this.mensajeService.responder(m.id_mensaje, texto).subscribe({
      next: () => {
        const nuevoHistorial = [...(m.historial ?? []), {
          texto, fecha: new Date().toISOString(), tipo: 'admin' as const
        }];
        const actualizado = { ...m, respondido: true, historial: nuevoHistorial };
        this.lista = this.lista.map(x => x.id_mensaje === m.id_mensaje ? actualizado : x);
        this.selected.set(actualizado);
        this.respuestaTexto = '';
        this.enviando = true;
        setTimeout(() => (this.enviando = false), 2000);
      },
      error: (err) => {
        this.error = err.error?.message || 'No se pudo enviar la respuesta.';
      }
    });
  }
}
