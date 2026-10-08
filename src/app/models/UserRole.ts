export type UserRole = 'alumno' | 'docente' | 'administrador';

export interface AuthUser {
  id: number;
  nombres: string;
  email: string;
  telefono: string;
  rol: UserRole;
  institucion?: string | null; // solo presente cuando rol = 'docente'
  token: string;
}
