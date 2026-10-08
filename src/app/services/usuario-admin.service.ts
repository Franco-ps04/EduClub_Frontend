import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { UsuarioAdmin } from '../models/usuario-admin';

export interface NuevoDocenteData {
  nombres: string; email: string; password: string; telefono: string; institucion: string;
}
export interface EditarUsuarioData {
  nombres: string; email: string; telefono: string; rol: string; institucion?: string;
}

@Injectable({ providedIn: 'root' })
export class UsuarioAdminService {
  private readonly base = `${environment.apiUrl}/usuarios`;

  constructor(private http: HttpClient) { }

  listar(filtros: { rol?: string; buscar?: string } = {}): Observable<UsuarioAdmin[]> {
    const entries = Object.entries(filtros).filter(([, v]) => v);
    const q = entries.length ? '?' + entries.map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join('&') : '';
    return this.http.get<UsuarioAdmin[]>(`${this.base}${q}`);
  }

  crearDocente(data: NuevoDocenteData): Observable<UsuarioAdmin> {
    return this.http.post<UsuarioAdmin>(this.base, data);
  }

  actualizar(id: number, data: EditarUsuarioData): Observable<UsuarioAdmin> {
    return this.http.put<UsuarioAdmin>(`${this.base}/${id}`, data);
  }

  cambiarEstado(id: number, activo: boolean): Observable<{ ok: boolean }> {
    return this.http.patch<{ ok: boolean }>(`${this.base}/${id}/estado`, { activo });
  }

  exportar(formato: 'xlsx' | 'pdf', opts: { id?: number; rol?: string; buscar?: string } = {}): Observable<Blob> {
    const params = new URLSearchParams({ formato, ...(opts.id ? { id: String(opts.id) } : {}) });
    if (opts.rol) params.set('rol', opts.rol);
    if (opts.buscar) params.set('buscar', opts.buscar);
    return this.http.get(`${this.base}/exportar?${params.toString()}`, { responseType: 'blob' });
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
