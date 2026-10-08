import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  DocenteActivo, MisTalleresResumen, ReglaDiploma, Recurso, SesionConRecursos,
  Taller, TallerDocente, TallerEstadisticas, TipoArea, TipoEvento
} from '../models/taller';

export interface TallerFormData {
  nombre: string;
  descripcion: string;
  fecha: string;
  hora: string;
  ubicacion: string;
  institucion: string;
  modalidad: string;
  capacidad: number;
  idArea: number;
  idTipo: number;
  latitud: number | null;
  longitud: number | null;
  requisitos: string; // "uno por línea"
  dias: string[]; // días de semana (1 a 3) para talleres tipo "Sesión"
  imagen?: File | null;
}

@Injectable({ providedIn: 'root' })
export class TallerService {
  private readonly base = `${environment.apiUrl}/talleres`;

  constructor(private http: HttpClient) { }

  listar(filtros: { buscar?: string; idArea?: number; idTipo?: number } = {}): Observable<Taller[]> {
    let params = '';
    const entries = Object.entries(filtros).filter(([, v]) => v !== undefined && v !== '');
    if (entries.length) {
      params = '?' + entries.map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join('&');
    }
    return this.http.get<Taller[]>(`${this.base}${params}`);
  }

  listarPublico(filtros: { buscar?: string; idArea?: number; modalidad?: string } = {}): Observable<Taller[]> {
    let params = '';
    const entries = Object.entries(filtros).filter(([, v]) => v !== undefined && v !== '');
    if (entries.length) {
      params = '?' + entries.map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join('&');
    }
    return this.http.get<Taller[]>(`${this.base}/publico${params}`);
  }

  listarMisTalleres(): Observable<Taller[]> {
    return this.http.get<Taller[]>(`${this.base}/mis-talleres`);
  }

  obtener(id: number): Observable<Taller> {
    return this.http.get<Taller>(`${this.base}/${id}`);
  }

  catalogos(): Observable<{ tiposEvento: TipoEvento[]; areas: TipoArea[] }> {
    return this.http.get<{ tiposEvento: TipoEvento[]; areas: TipoArea[] }>(`${this.base}/catalogos`);
  }

  docentesDisponibles(): Observable<DocenteActivo[]> {
    return this.http.get<DocenteActivo[]>(`${this.base}/docentes`);
  }

  estadisticas(): Observable<TallerEstadisticas> {
    return this.http.get<TallerEstadisticas>(`${this.base}/estadisticas`);
  }

  private toFormData(data: TallerFormData): FormData {
    const fd = new FormData();
    fd.append('nombre', data.nombre);
    fd.append('descripcion', data.descripcion);
    fd.append('fecha', data.fecha);
    fd.append('hora', data.hora);
    fd.append('ubicacion', data.ubicacion);
    fd.append('institucion', data.institucion);
    fd.append('modalidad', data.modalidad);
    fd.append('capacidad', String(data.capacidad));
    fd.append('idArea', String(data.idArea));
    fd.append('idTipo', String(data.idTipo));
    if (data.latitud !== null) fd.append('latitud', String(data.latitud));
    if (data.longitud !== null) fd.append('longitud', String(data.longitud));
    fd.append('requisitos', data.requisitos ?? '');
    fd.append('dias', JSON.stringify(data.dias ?? []));
    if (data.imagen) fd.append('imagen', data.imagen);
    return fd;
  }

  crear(data: TallerFormData): Observable<Taller> {
    return this.http.post<Taller>(this.base, this.toFormData(data));
  }

  actualizar(id: number, data: TallerFormData): Observable<Taller> {
    return this.http.put<Taller>(`${this.base}/${id}`, this.toFormData(data));
  }

  archivar(id: number): Observable<{ ok: boolean }> {
    return this.http.delete<{ ok: boolean }>(`${this.base}/${id}`);
  }

  cambiarEstado(id: number, estado: string): Observable<{ ok: boolean }> {
    return this.http.patch<{ ok: boolean }>(`${this.base}/${id}/estado`, { estado });
  }

  // --- Mis talleres / Recursos ---
  misTalleres(): Observable<{ resumen: MisTalleresResumen; talleres: TallerDocente[] }> {
    return this.http.get<{ resumen: MisTalleresResumen; talleres: TallerDocente[] }>(`${environment.apiUrl}/mis-talleres`);
  }

  listarRecursosPorTaller(idTaller: number): Observable<SesionConRecursos[]> {
    return this.http.get<SesionConRecursos[]>(`${this.base}/${idTaller}/recursos`);
  }

  crearRecurso(data: {
    idSesion: number; tipo: 'word' | 'pdf' | 'imagen'; titulo: string; tituloSesion?: string;
    descripcion?: string; enlace?: string; archivo: File;
  }): Observable<Recurso> {
    const fd = new FormData();
    fd.append('idSesion', String(data.idSesion));
    fd.append('tipo', data.tipo);
    fd.append('titulo', data.titulo);
    if (data.tituloSesion) fd.append('tituloSesion', data.tituloSesion);
    if (data.descripcion) fd.append('descripcion', data.descripcion);
    if (data.enlace) fd.append('enlace', data.enlace);
    fd.append('archivo', data.archivo);
    return this.http.post<Recurso>(`${environment.apiUrl}/recursos`, fd);
  }

  eliminarRecurso(id: number): Observable<{ ok: boolean }> {
    return this.http.delete<{ ok: boolean }>(`${environment.apiUrl}/recursos/${id}`);
  }

  // --- Reglas de diploma ---
  listarReglasDiploma(): Observable<ReglaDiploma[]> {
    return this.http.get<ReglaDiploma[]>(`${environment.apiUrl}/reglas-diploma`);
  }

  actualizarReglaDiploma(id: number, data: Partial<ReglaDiploma> & { nombreNivel: string; porcentajeMinimo: number; porcentajeMaximo: number }): Observable<ReglaDiploma> {
    return this.http.put<ReglaDiploma>(`${environment.apiUrl}/reglas-diploma/${id}`, data);
  }

  actualizarActivoReglaDiploma(id: number, activo: boolean): Observable<{ ok: boolean }> {
    return this.http.patch<{ ok: boolean }>(`${environment.apiUrl}/reglas-diploma/${id}/activo`, { activo });
  }
}
