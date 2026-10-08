import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ResumenTaller, SesionConAlumnos, TallerInscripcion } from '../models/inscripcion';

@Injectable({ providedIn: 'root' })
export class InscripcionService {
  private readonly base = `${environment.apiUrl}/inscripcion`;

  constructor(private http: HttpClient) { }

  listarTalleres(buscar?: string): Observable<TallerInscripcion[]> {
    const q = buscar ? `?buscar=${encodeURIComponent(buscar)}` : '';
    return this.http.get<TallerInscripcion[]>(`${this.base}/talleres${q}`);
  }

  resumenTaller(idTaller: number): Observable<ResumenTaller> {
    return this.http.get<ResumenTaller>(`${this.base}/talleres/${idTaller}/resumen`);
  }

  listarPorSesion(idSesion: number): Observable<SesionConAlumnos> {
    return this.http.get<SesionConAlumnos>(`${this.base}/sesiones/${idSesion}`);
  }

  registrarAsistencia(idInscripcion: number, idSesion: number, asistio: boolean): Observable<{ ok: boolean }> {
    return this.http.put<{ ok: boolean }>(`${this.base}/asistencia`, { idInscripcion, idSesion, asistio });
  }

  crearNotificacion(idTaller: number, titulo: string, mensaje: string): Observable<{ id: number }> {
    return this.http.post<{ id: number }>(`${this.base}/notificaciones`, { idTaller, titulo, mensaje });
  }
}
