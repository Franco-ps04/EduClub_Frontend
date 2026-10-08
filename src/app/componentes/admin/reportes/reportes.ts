import { Component, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReporteService } from '../../../services/reporte.service';
import { colorPorArea } from '../../../shared/colores';

interface StatTaller {
  titulo: string;
  area: string;
  inscritos: number;
  capacidad: number;
  pct: number;
}

interface BarItem {
  label: string;
  value: number;
  pct: number;
  color: string;
}

interface ReporteTallerFila {
  id: number;
  titulo: string;
  area: string;
  fecha: string;
  capacidad: number;
  inscritos: number;
  asistieron: number;
  noAsistieron: number;
  pctOcupacion: number;
  pctAsistencia: number;
  estado: string;
  color: string;
}

const AREAS = ['Matemática', 'Ciencias', 'Comunicación', 'Ciencias Sociales', 'Informática', 'Humanidades'];

@Component({
  selector: 'app-admin-reportes',
  imports: [DatePipe, FormsModule],
  templateUrl: './reportes.html',
  styleUrl: './reportes.css',
})
export class Reportes implements OnInit {
  constructor(private reporteService: ReporteService) { }

  cargando = false;
  error = '';
  exportando = false;

  totalTalleres = 0;
  totalInscritos = 0;
  pctAsistencia = 0;

  topTalleres: StatTaller[] = [];
  areaStats: { area: string; count: number; pct: number }[] = [];
  alumnosTop: { nombre: string; talleres: number; iniciales: string; color: string }[] = [];
  reporteTalleres: ReporteTallerFila[] = [];
  filtroReporte: 'todos' | 'Finalizado' | 'Proximo' | 'En curso' = 'todos';

  areaBarras: BarItem[] = [];
  tallerBarras: BarItem[] = [];

  ngOnInit(): void {
    this.cargando = true;
    this.reporteService.resumen().subscribe({
      next: ({ resumen, talleres, alumnos }) => {
        this.cargando = false;
        this.totalTalleres = resumen.totalTalleres;
        this.totalInscritos = resumen.totalInscritos;

        this.reporteTalleres = talleres.map(t => {
          const inscritos = Number(t.inscritos ?? 0);
          const capacidad = Number(t.capacidad ?? 0);
          const asistieron = Number(t.asistieron ?? 0);
          const noAsistieron = Number(t.noAsistieron ?? 0);
          return {
            id: t.id_taller,
            titulo: t.nombre,
            area: t.area,
            fecha: t.fecha,
            capacidad, inscritos, asistieron, noAsistieron,
            pctOcupacion: capacidad > 0 ? Math.round(inscritos / capacidad * 100) : 0,
            pctAsistencia: inscritos > 0 ? Math.round(asistieron / inscritos * 100) : 0,
            estado: t.estado,
            color: colorPorArea(t.area).border
          };
        }).sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

        this.topTalleres = talleres
          .map(t => ({
            titulo: t.nombre, area: t.area,
            inscritos: Number(t.inscritos ?? 0), capacidad: Number(t.capacidad ?? 0),
            pct: Number(t.capacidad ?? 0) > 0 ? Math.round(Number(t.inscritos ?? 0) / Number(t.capacidad) * 100) : 0
          }))
          .sort((a, b) => b.pct - a.pct)
          .slice(0, 5);

        const conteos = AREAS.map(a => ({ area: a, count: talleres.filter(t => t.area === a).length }));
        const maxCount = Math.max(...conteos.map(c => c.count), 1);
        this.areaStats = conteos.map(c => ({ ...c, pct: Math.round(c.count / maxCount * 100) }));
        this.areaBarras = conteos.filter(c => c.count > 0).map(c => ({
          label: c.area, value: c.count, pct: Math.round(c.count / maxCount * 100), color: colorPorArea(c.area).border
        }));

        const maxInscritos = Math.max(...talleres.map(t => Number(t.inscritos ?? 0)), 1);
        this.tallerBarras = [...talleres]
          .sort((a, b) => Number(b.inscritos ?? 0) - Number(a.inscritos ?? 0))
          .slice(0, 6)
          .map(t => ({
            label: t.nombre, value: Number(t.inscritos ?? 0),
            pct: Math.round(Number(t.inscritos ?? 0) / maxInscritos * 100),
            color: colorPorArea(t.area).border
          }));

        const colores = ['#2d9e5f', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#14b8a6'];
        this.alumnosTop = alumnos.map((a, i) => ({
          nombre: a.nombres,
          talleres: Number(a.talleres ?? 0),
          iniciales: a.nombres.split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase(),
          color: colores[i % colores.length]
        }));

        const finalizados = this.reporteTalleres.filter(r => new Date(r.fecha).getTime() <= Date.now());
        const totalF = finalizados.reduce((s, r) => s + r.inscritos, 0);
        const totalAsist = finalizados.reduce((s, r) => s + r.asistieron, 0);
        this.pctAsistencia = totalF > 0 ? Math.round(totalAsist / totalF * 100) : 0;
      },
      error: (err) => {
        this.cargando = false;
        this.error = err.error?.message || 'No se pudo cargar el reporte.';
      }
    });
  }

  private estadoKey(estado: string): string {
    return String(estado ?? '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  reporteFiltrado(): ReporteTallerFila[] {
    const items = this.reporteTalleres;
    if (this.filtroReporte === 'todos') return items;
    if (this.filtroReporte === 'Finalizado') return items.filter(r => this.estadoNormalizado(r.estado) === 'finalizado');
    if (this.filtroReporte === 'En curso') return items.filter(r => this.estadoNormalizado(r.estado) === 'en curso');
    return items.filter(r => this.estadoNormalizado(r.estado) === 'proximo');
  }

  estadoNormalizado(estado: string): string {
    return String(estado ?? '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  estadoClass(estado: string): string {
    const key = this.estadoNormalizado(estado);
    if (key === 'en curso') return 'report-estado-en-curso';
    if (key === 'finalizado') return 'report-estado-finalizado';
    if (key === 'cancelado') return 'report-estado-cancelado';
    return 'report-estado-proximo';
  }

  totalParticipacion(): number {
    return this.reporteFiltrado().reduce((s, r) => s + r.asistieron, 0);
  }

  colorBorde(area: string): string {
    return colorPorArea(area).border;
  }
  colorFondo(area: string): string {
    return colorPorArea(area).bg;
  }

  exportar(formato: 'xlsx' | 'pdf'): void {
    this.exportando = true;
    this.reporteService.exportar(formato).subscribe({
      next: (blob) => {
        this.exportando = false;
        const fecha = new Date().toISOString().slice(0, 10);
        this.reporteService.descargarBlob(blob, `reporte_${fecha}.${formato}`);
      },
      error: () => { this.exportando = false; }
    });
  }
}
