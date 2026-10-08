export interface FilaCarga {
  id_detalle: number;
  nombre: string;
  correo: string;
  telefono: string;
  estado: string;
}

export interface ValidarCargaResponse {
  idCarga: number;
  filas: FilaCarga[];
  validos: number;
}

export interface RegistrarCargaResponse {
  filas: FilaCarga[];
}
