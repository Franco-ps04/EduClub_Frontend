/**
 * Un color distinto por área/tipo (igual idea que GreenUnity: Limpieza
 * azul claro, Reforestación verde, etc.) — aquí por nombre de TipoArea,
 * con un color por defecto para cualquier área no listada.
 */
const COLORES_AREA: Record<string, { bg: string; text: string; border: string }> = {
  'Matemática': { bg: '#e7f0ff', text: '#2563eb', border: '#2563eb' },
  'Ciencias': { bg: '#e3f8ec', text: '#1e7a48', border: '#1e7a48' },
  'Comunicación': { bg: '#fdf1cf', text: '#92680a', border: '#92680a' },
  'Ciencias Sociales': { bg: '#fde2e2', text: '#b42318', border: '#b42318' },
  'Informática': { bg: '#ece7ff', text: '#6d4fd6', border: '#6d4fd6' },
  'Humanidades': { bg: '#fce7f3', text: '#be185d', border: '#be185d' },
};

const COLOR_DEFAULT = { bg: '#eef2f7', text: '#475569', border: '#475569' };

export function colorPorArea(nombreArea: string): { bg: string; text: string; border: string } {
  return COLORES_AREA[nombreArea] ?? COLOR_DEFAULT;
}

/** Color hexadecimal para el ícono de cada nivel de ReglaDiploma, según su campo `color`. */
const COLORES_REGLA: Record<string, string> = {
  warning: '#f4b400',
  success: '#2d9e5f',
  primary: '#2563eb',
  danger: '#dc2626',
  secondary: '#9aa4b2',
};

export function colorPorRegla(color: string): string {
  return COLORES_REGLA[color] ?? COLORES_REGLA['secondary'];
}
