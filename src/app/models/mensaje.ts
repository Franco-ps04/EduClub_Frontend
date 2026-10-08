export interface RespuestaMensaje {
  id_respuesta?: number;
  texto: string;
  fecha: string;
  tipo: 'admin' | 'alumno';
}

export interface Mensaje {
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
  emailRemitente: string;
  destinatario: string;
  rolDestinatario: string;
  tallerRelacionado: string | null;
  historial: RespuestaMensaje[];
}
