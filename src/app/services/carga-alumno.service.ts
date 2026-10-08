import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { RegistrarCargaResponse, ValidarCargaResponse } from '../models/carga-alumno';

@Injectable({ providedIn: 'root' })
export class CargaAlumnoService {
  private readonly base = `${environment.apiUrl}/carga-alumnos`;

  constructor(private http: HttpClient) { }

  descargarPlantilla(): Observable<Blob> {
    return this.http.get(`${this.base}/plantilla`, { responseType: 'blob' });
  }

  validar(archivo: File): Observable<ValidarCargaResponse> {
    const fd = new FormData();
    fd.append('archivo', archivo);
    return this.http.post<ValidarCargaResponse>(`${this.base}/validar`, fd);
  }

  registrar(idCarga: number): Observable<RegistrarCargaResponse> {
    return this.http.post<RegistrarCargaResponse>(`${this.base}/${idCarga}/registrar`, {});
  }
}
