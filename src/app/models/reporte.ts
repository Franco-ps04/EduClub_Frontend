export interface ReporteTaller {
  id_taller: number;
  nombre: string;
  descripcion: string;
  fecha: string;
  hora: string;
  ubicacion: string;
  capacidad: number;
  estado: string;
  area: string;
  docente: string;
  institucion: string;
  inscritos: number;
  asistieron: number;
  noAsistieron: number;
}

export interface ReporteAlumno {
  id_usuario: number;
  nombres: string;
  talleres: number;
}

export interface ReporteResumen {
  totalTalleres: number;
  totalInscritos: number;
  pctAsistencia: number;
}

export interface ReporteResponse {
  resumen: ReporteResumen;
  talleres: ReporteTaller[];
  alumnos: ReporteAlumno[];
}
