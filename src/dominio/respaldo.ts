// Validación del archivo de respaldo antes de importarlo.

import type { Respaldo } from '../datos';

function esTexto(v: unknown): v is string {
  return typeof v === 'string' && v.length > 0;
}

function esNumero(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

/** Devuelve el respaldo si es válido, o un mensaje con el problema. */
export function validarRespaldo(datos: unknown): Respaldo | string {
  if (!datos || typeof datos !== 'object') return 'El archivo no es un respaldo válido.';
  const r = datos as Partial<Respaldo>;
  if (r.app !== 'rutina-gym') return 'El archivo no es un respaldo de esta app.';
  if (r.version !== 1) return `Versión de respaldo no soportada (${String(r.version)}).`;
  if (!Array.isArray(r.ejercicios) || !Array.isArray(r.sesiones) || !Array.isArray(r.series)) {
    return 'Al respaldo le faltan datos.';
  }
  if (!r.ejercicios.every((e) => esTexto(e?.id) && typeof e.nombre === 'string')) return 'Hay ejercicios inválidos.';
  if (
    !r.sesiones.every(
      (s) => esTexto(s?.id) && esTexto(s.fecha) && esNumero(s.dia) && Array.isArray(s.completados) && s.tecnica,
    )
  ) {
    return 'Hay sesiones inválidas.';
  }
  if (
    !r.series.every(
      (s) => esTexto(s?.id) && esTexto(s.sesionId) && esTexto(s.ejercicioId) && esNumero(s.peso) && esNumero(s.reps),
    )
  ) {
    return 'Hay series inválidas.';
  }
  return r as Respaldo;
}
