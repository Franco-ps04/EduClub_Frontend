export interface TipoEvento {
  id_tipo: number;
  nombre: string; // 'Sesión' | 'Seminario'
}

export interface TipoArea {
  id_area: number;
  nombre: string;
}

export interface Taller {
  id_taller: number;
  nombre: string;
  descripcion: string;
  fecha: string;   // YYYY-MM-DD
  hora: string;    // HH:MM
  hora_fin: string;
  dias_semana: string[];
  ubicacion: string;
  capacidad: number;
  inscritos: number;
  modalidad: 'Presencial' | 'Virtual';
  estado: string;
  archivado: boolean;
  latitud: number | null;
  longitud: number | null;
  institucion: string;
  imagen_url: string | null;
  id_area: number;
  area: string;
  id_tipo: number;
  tipo_evento: string;
  id_docente: number;
  docente: string;
  id_usuario_docente: number;
  docente_institucion: string;
  total_sesiones: number;
  requisitos: string[];
}

export interface DocenteActivo {
  id_docente: number;
  id_usuario: number;
  nombres: string;
  email: string;
  institucion: string;
}

export interface TallerEstadisticas {
  totalTalleres: number;
  proximos: number;
  activos: number;
  totalInscritos: number;
  alumnosPorTipo: { area: string; total: number }[];
  tallerPorTipo: { area: string; total: number }[];
}

export interface Sesion {
  id_sesion: number;
  id_taller: number;
  numero_sesion: number;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  dia_semana: string;
  titulo: string | null;
}

export interface Recurso {
  id_recurso: number;
  id_sesion: number;
  tipo: 'word' | 'pdf' | 'imagen';
  titulo: string;
  descripcion: string | null;
  archivo_url: string | null;
  archivo_descarga_url?: string | null;
  enlace_url: string | null;
  fecha_subida: string;
}

export interface SesionConRecursos extends Sesion {
  recursos: Recurso[];
}

export interface TallerStats {
  total_sesiones: number;
  sesiones_con_registro: number;
  total_asistencias: number;
  total_marcas: number;
  promedio_asistencia: number;
}

export interface TallerDocente extends Taller {
  stats: TallerStats;
}

export interface MisTalleresResumen {
  alumnosInscritos: number;
  sesionesRealizadas: number;
  promedioAsistencia: number;
}

export interface ReglaDiploma {
  id_regla_diploma: number;
  nombre_nivel: string;
  porcentaje_minimo: number;
  porcentaje_maximo: number;
  descripcion: string;
  activo: boolean;
  color: string;
  icono: string;
}
