// Respaldo completo: datos de entrenamiento + preferencias (color de la app).

import type { Repositorios, Respaldo } from '../datos';
import { esColorValido } from '../temas-color';
import { catalogoDeRutina } from './catalogo';

function esTexto(v: unknown): v is string {
  return typeof v === 'string' && v.length > 0;
}

function esNumero(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

export async function crearRespaldo(repos: Repositorios, ahora = new Date()): Promise<Respaldo> {
  return {
    app: 'rutina-gym',
    version: 1,
    exportado: ahora.toISOString(),
    ...(await repos.respaldo.exportar()),
    preferencias: repos.preferencias.obtener(),
  };
}

/** Devuelve el respaldo si el objeto es válido, o un mensaje con el problema. */
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
      (s) =>
        esTexto(s?.id) &&
        esTexto(s.fecha) &&
        esNumero(s.dia) &&
        Array.isArray(s.completados) &&
        !!s.tecnica &&
        typeof s.tecnica === 'object',
    )
  ) {
    return 'Hay sesiones inválidas.';
  }
  if (
    !r.series.every(
      (s) =>
        esTexto(s?.id) &&
        esTexto(s.sesionId) &&
        esTexto(s.ejercicioId) &&
        esTexto(s.fecha) &&
        esNumero(s.numero) &&
        esNumero(s.peso) &&
        esNumero(s.reps),
    )
  ) {
    return 'Hay series inválidas.';
  }
  return r as Respaldo;
}

/** Lee el texto de un archivo de respaldo. No toca ningún dato. */
export function leerRespaldo(texto: string): Respaldo | string {
  try {
    return validarRespaldo(JSON.parse(texto));
  } catch {
    return 'No se pudo leer el archivo: no es un JSON válido.';
  }
}

/** Reemplaza todos los datos por los del respaldo (ya validado). */
export async function restaurarRespaldo(repos: Repositorios, respaldo: Respaldo): Promise<void> {
  const { ejercicios, sesiones, series } = respaldo;
  await repos.respaldo.importar({ ejercicios, sesiones, series });
  // Los nombres de la rutina actual mandan sobre los del archivo.
  await repos.ejercicios.sincronizar(catalogoDeRutina());
  if (esColorValido(respaldo.preferencias?.color)) repos.preferencias.guardar({ color: respaldo.preferencias.color });
}
