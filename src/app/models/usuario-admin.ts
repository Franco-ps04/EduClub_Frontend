export type UserRolAdmin = 'alumno' | 'docente' | 'administrador';
export type UserEstado = 'activo' | 'suspendido';

export interface UsuarioAdmin {
  id_usuario: number;
  nombres: string;
  email: string;
  telefono: string;
  rol: UserRolAdmin;
  activo: boolean;
  institucion: string | null;
  talleres_alumno: number;
  talleres_docente: number;
  creado_en: string;
}
