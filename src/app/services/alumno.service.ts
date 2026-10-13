import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface TallerAlumno {
  id_taller: number;
  nombre: string;
  descripcion: string;
  fecha: string;
  hora: string;
  hora_fin?: string;
  ubicacion?: string | null;
  capacidad: number;
  inscritos: number;
  modalidad: 'Virtual' | 'Presencial' | string;
  estado: string;
  latitud?: number | null;
  longitud?: number | null;
  institucion?: string | null;
  imagen_url?: string | null;
  id_area?: number;
  area?: string;
  id_tipo?: number;
  tipo_evento?: string;
  docente?: string;
  rol_docente?: string;
  id_usuario_docente?: number;
  dias_semana?: string[];
  total_sesiones?: number;
  requisitos?: string[];
}

export interface SesionAlumno {
  id_sesion: number;
  numero_sesion: number;
  fecha: string;
  dia_semana?: string;
  hora_inicio?: string;
  hora_fin?: string;
  titulo?: string;
  asistio?: boolean | null;
}

export interface InscripcionAlumno {
  id_inscripcion: number;
  estado_inscripcion: string;
  fecha_inscripcion: string;
  id_taller: number;
  titulo: string;
  descripcion: string;
  fecha: string;
  hora: string;
  ubicacion?: string | null;
  modalidad: string;
  capacidad: number;
  inscritos: number;
  imagen_url?: string | null;
  institucion?: string | null;
  area?: string;
  tipo_evento?: string;
  docente?: string;
  rol_docente?: string;
  id_usuario_docente?: number;
  hora_fin?: string;
  dias_semana?: string[];
  sesiones_marcadas?: number;
  asistencias?: number;
  estado_taller: string;
  total_sesiones?: number;
  total_asistencias?: number;
  porcentaje_asistencia?: number;
  sesiones: SesionAlumno[];
}


export interface DiplomaAlumno {
  id_diploma: number;
  id_alumno?: number;
  id_regla_diploma?: number | null;
  id_taller?: number | null;
  taller?: string | null;
  nombre_nivel?: string | null;
  descripcion?: string | null;
  color?: string | null;
  icono?: string | null;
  porcentaje_obtenido?: number | null;
  fecha_emision?: string | null;
  archivo_url?: string | null;
  archivo_descarga_url?: string | null;
}


export interface ReconocimientoAlumno {
  id_reconocimiento: number;
  id_alumno: number;
  id_regla: number;
  id_taller?: number | null;
  taller?: string | null;
  titulo: string;
  tipo: 'ASISTENCIA_ACUMULADA' | 'TALLER_COMPLETADO' | string;
  umbral: number;
  motivo?: string | null;
  color?: string | null;
  imagen_url?: string | null;
  fecha_emision?: string | null;
  archivo_url?: string | null;
  archivo_descarga_url?: string | null;
}

export interface NotificacionAlumno {
  id_notificacion: number;
  titulo: string;
  mensaje: string;
  fecha: string;
  id_taller: number;
  taller: string;
  estado_taller: string;
  enviado_por: string;
  leida: boolean;
}

export interface DestinatarioMensaje {
  id_usuario: number;
  nombres: string;
  email: string;
  rol: 'docente' | 'administrador';
}

export interface RespuestaMensajeAlumno {
  id_respuesta: number;
  texto: string;
  fecha: string;
  respondido_por: string;
  rol_usuario: string;
  tipo: 'alumno' | 'admin';
}

export interface MensajeAlumno {
  id_mensaje: number;
  asunto: string;
  mensaje: string;
  fecha: string;
  leido: boolean;
  leido_por_alumno: boolean;
  respondido: boolean;
  idRemitente: number;
  idDestinatario: number;
  remitente: string;
  destinatario: string;
  emailRemitente?: string;
  rolDestinatario: string;
  tallerRelacionado?: string | null;
  historial: RespuestaMensajeAlumno[];
}

@Injectable({ providedIn: 'root' })
export class AlumnoService {
  private readonly base = environment.apiUrl;
  constructor(private http: HttpClient) {}

  talleres(filtros: { buscar?: string; idArea?: number | null; modalidad?: string } = {}): Observable<TallerAlumno[]> {
    let params = new HttpParams();
    if (filtros.buscar?.trim()) params = params.set('buscar', filtros.buscar.trim());
    if (filtros.idArea) params = params.set('idArea', String(filtros.idArea));
    if (filtros.modalidad && filtros.modalidad !== 'Todos') params = params.set('modalidad', filtros.modalidad);
    return this.http.get<TallerAlumno[]>(`${this.base}/talleres/publico`, { params });
  }

  catalogos(): Observable<{ tiposEvento: { id_tipo: number; nombre: string }[]; areas: { id_area: number; nombre: string }[] }> {
    return this.http.get<any>(`${this.base}/talleres/catalogos`);
  }

  taller(id: number): Observable<TallerAlumno> {
    return this.http.get<TallerAlumno>(`${this.base}/talleres/${id}`);
  }

  sesiones(id: number): Observable<SesionAlumno[]> {
    return this.http.get<SesionAlumno[]>(`${this.base}/talleres/${id}/sesiones`);
  }

  misInscripciones(): Observable<InscripcionAlumno[]> {
    return this.http.get<InscripcionAlumno[]>(`${this.base}/inscripcion/mis`);
  }

  inscribirse(idTaller: number): Observable<{ ok: boolean; id_inscripcion: number; message: string }> {
    return this.http.post<any>(`${this.base}/inscripcion`, { idTaller });
  }

  cancelarInscripcion(id: number): Observable<{ ok: boolean; message: string }> {
    return this.http.patch<any>(`${this.base}/inscripcion/${id}/cancelar`, {});
  }

  notificaciones(): Observable<NotificacionAlumno[]> {
    return this.http.get<NotificacionAlumno[]>(`${this.base}/notificaciones/mis`);
  }

  marcarNotificacionLeida(id: number): Observable<{ ok: boolean }> {
    return this.http.patch<any>(`${this.base}/notificaciones/${id}/leida`, {});
  }

  destinatarios(): Observable<DestinatarioMensaje[]> {
    return this.http.get<DestinatarioMensaje[]>(`${this.base}/mensajes/destinatarios`);
  }

  mensajes(): Observable<MensajeAlumno[]> {
    return this.http.get<MensajeAlumno[]>(`${this.base}/mensajes/mis`);
  }

  enviarMensaje(data: { idUsuarioDestino: number; asunto: string; mensaje: string; idTaller?: number | null }): Observable<{ ok: boolean; id: number }> {
    return this.http.post<any>(`${this.base}/mensajes`, data);
  }

  seguimiento(id: number, texto: string): Observable<{ ok: boolean }> {
    return this.http.post<any>(`${this.base}/mensajes/${id}/seguimiento`, { texto });
  }

  marcarMensajeLeido(id: number): Observable<{ ok: boolean }> {
    return this.http.patch<any>(`${this.base}/mensajes/${id}/leido`, {});
  }


  reconocimientos(): Observable<ReconocimientoAlumno[]> {
    return this.http.get<ReconocimientoAlumno[]>(`${this.base}/reconocimientos/mis`);
  }

  diplomas(): Observable<DiplomaAlumno[]> {
    return this.http.get<DiplomaAlumno[]>(`${this.base}/diplomas/mis`);
  }

  perfil(): Observable<any> {
    return this.http.get<any>(`${this.base}/usuarios/mi-perfil`);
  }

  actualizarPerfil(data: { nombres: string; telefono: string }): Observable<any> {
    return this.http.patch<any>(`${this.base}/usuarios/mi-perfil`, data);
  }
}
