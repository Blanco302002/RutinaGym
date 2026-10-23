// Respaldo completo: datos de entrenamiento, rutinas y preferencias (color).
// Versión 2 incluye rutinas. Un archivo de la versión 1 (sin rutinas) se
// sigue pudiendo importar: la rutina se arma como en la migración inicial.

import type { Repositorios, Respaldo } from '../datos';
import { esColorValido } from '../temas-color';
import { GestorRutinas, LIMITES } from './rutinas';

function esTexto(v: unknown): v is string {
  return typeof v === 'string' && v.length > 0;
}

function esNumero(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

export async function crearRespaldo(repos: Repositorios, ahora = new Date()): Promise<Respaldo> {
  return {
    app: 'rutina-gym',
    version: 2,
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
  if (r.version !== 1 && r.version !== 2) return `Versión de respaldo no soportada (${String(r.version)}).`;
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

  // Versión 1: no hay rutinas (se arman al restaurar).
  const rutinas = r.rutinas ?? [];
  const dias = r.dias ?? [];
  const items = r.ejerciciosEnRutina ?? [];
  if (!Array.isArray(rutinas) || !Array.isArray(dias) || !Array.isArray(items)) return 'Las rutinas están dañadas.';
  if (!rutinas.every((x) => esTexto(x?.id) && esTexto(x.nombre) && typeof x.activa === 'boolean')) {
    return 'Hay rutinas inválidas.';
  }
  if (
    !dias.every(
      (d) =>
        esTexto(d?.id) &&
        esTexto(d.rutinaId) &&
        esNumero(d.dia) &&
        d.dia >= 0 &&
        d.dia <= 6 &&
        (d.tipo === 'entrenamiento' || d.tipo === 'descanso') &&
        typeof d.nombre === 'string',
    )
  ) {
    return 'Hay días de rutina inválidos.';
  }
  if (
    !items.every(
      (i) =>
        esTexto(i?.id) &&
        esTexto(i.diaId) &&
        esTexto(i.rutinaId) &&
        esTexto(i.ejercicioId) &&
        esNumero(i.orden) &&
        Number.isInteger(i.series) &&
        i.series >= LIMITES.seriesMin &&
        i.series <= LIMITES.seriesMax &&
        esTexto(i.reps) &&
        typeof i.notas === 'string',
    )
  ) {
    return 'Hay ejercicios de rutina inválidos.';
  }
  return { ...(r as Respaldo), rutinas, dias, ejerciciosEnRutina: items };
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
  const { ejercicios, sesiones, series, rutinas = [], dias = [], ejerciciosEnRutina = [] } = respaldo;
  await repos.respaldo.importar({ ejercicios, sesiones, series, rutinas, dias, ejerciciosEnRutina });
  // Archivo viejo (sin rutinas): se arma "Rutina principal" y se le asignan las sesiones.
  // Archivo vacío: queda la rutina de ejemplo, para que la app tenga algo que mostrar.
  const gestor = new GestorRutinas(repos);
  if ((await gestor.inicializar()) === 'nueva') await gestor.usarEjemplo();
  if (esColorValido(respaldo.preferencias?.color)) repos.preferencias.guardar({ color: respaldo.preferencias.color });
}
