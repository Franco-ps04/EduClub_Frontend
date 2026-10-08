import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ReporteResponse } from '../models/reporte';

@Injectable({ providedIn: 'root' })
export class ReporteService {
  private readonly base = `${environment.apiUrl}/reportes`;

  constructor(private http: HttpClient) { }

  resumen(): Observable<ReporteResponse> {
    return this.http.get<ReporteResponse>(`${this.base}/resumen`);
  }

  exportar(formato: 'xlsx' | 'pdf'): Observable<Blob> {
    return this.http.get(`${this.base}/exportar?formato=${formato}`, { responseType: 'blob' });
  }

  descargarBlob(blob: Blob, nombreArchivo: string): void {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombreArchivo;
    a.click();
    window.URL.revokeObjectURL(url);
  }
}
