export interface SesionResumen {
  id_sesion: number;
  numero_sesion: number;
}

export interface TallerInscripcion {
  id_taller: number;
  nombre: string;
  fecha: string;
  hora: string;
  estado: string;
  inscritos: number;
  total_sesiones: number;
  tipo_evento: string;
  sesiones: SesionResumen[];
}

export interface AlumnoSesion {
  id_inscripcion: number;
  id_usuario: number;
  nombres: string;
  asistio: boolean | null;
}

export interface SesionInfo {
  id_sesion: number;
  numero_sesion: number;
  id_taller: number;
  taller_nombre: string;
}

export interface SesionConAlumnos {
  sesion: SesionInfo;
  alumnos: AlumnoSesion[];
}

export interface ResumenSesionAlumno {
  numero_sesion: number;
  asistio: boolean | null;
}

export interface ResumenAlumno {
  id_inscripcion: number;
  id_usuario: number;
  nombres: string;
  sesiones: ResumenSesionAlumno[];
  porcentaje: number;
  constancia: string | null;
}

export interface ResumenTaller {
  totalSesiones: number;
  numerosSesion: number[];
  alumnos: ResumenAlumno[];
}
