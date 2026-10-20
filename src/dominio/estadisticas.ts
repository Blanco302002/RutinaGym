// Cálculos sobre el historial de series de un ejercicio. Funciones puras.

import type { Serie } from '../datos/modelos';

export interface SesionDeEjercicio {
  sesionId: string;
  fecha: string;
  series: Serie[];
}

/** Agrupa por sesión, de la más vieja a la más nueva. Series ordenadas por número. */
export function agruparPorSesion(historial: Serie[]): SesionDeEjercicio[] {
  const grupos = new Map<string, SesionDeEjercicio>();
  for (const s of historial) {
    const g = grupos.get(s.sesionId) ?? { sesionId: s.sesionId, fecha: s.fecha, series: [] };
    g.series.push(s);
    grupos.set(s.sesionId, g);
  }
  return [...grupos.values()]
    .map((g) => ({ ...g, series: [...g.series].sort((a, b) => a.numero - b.numero) }))
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.series[0].creada - b.series[0].creada);
}

/** a es mejor que b: más peso, o mismo peso con más repeticiones. */
export function esMejor(a: Pick<Serie, 'peso' | 'reps'>, b: Pick<Serie, 'peso' | 'reps'>): boolean {
  return a.peso > b.peso || (a.peso === b.peso && a.reps > b.reps);
}

/** La serie más pesada (con más reps si empatan). */
export function mejorSerie(series: Serie[]): Serie | undefined {
  return series.reduce<Serie | undefined>((mejor, s) => (!mejor || esMejor(s, mejor) ? s : mejor), undefined);
}

/** Número de la próxima serie: una más que la última cargada en la sesión. */
export function siguienteNumero(seriesDeLaSesion: Pick<Serie, 'numero'>[]): number {
  return seriesDeLaSesion.reduce((max, s) => Math.max(max, s.numero), 0) + 1;
}

export function volumen(series: Serie[]): number {
  return series.reduce((total, s) => total + s.peso * s.reps, 0);
}

export interface ResumenEjercicio {
  /** Serie más pesada de la primera sesión registrada. */
  inicial?: { serie: Serie; fecha: string };
  /** Mejor serie de toda la historia. */
  maximo?: Serie;
  /** La sesión anterior a la actual. */
  ultimaVez?: SesionDeEjercicio;
}

export function resumenEjercicio(historial: Serie[], sesionActualId?: string): ResumenEjercicio {
  const grupos = agruparPorSesion(historial);
  const anteriores = grupos.filter((g) => g.sesionId !== sesionActualId);
  const primera = grupos[0];
  const mejorInicial = primera && mejorSerie(primera.series);
  return {
    inicial: mejorInicial && { serie: mejorInicial, fecha: primera.fecha },
    maximo: mejorSerie(historial),
    ultimaVez: anteriores.at(-1),
  };
}

/**
 * Valores para precargar el formulario: lo que hice en esa misma serie la vez
 * anterior. Si esa vez hice menos series, la última serie de hoy o la última
 * de esa vez. Sin historial, peso 0 y las reps mínimas del objetivo.
 */
export function precarga(
  historial: Serie[],
  sesionActualId: string | undefined,
  numero: number,
  repsPorDefecto = 10,
): { peso: number; reps: number } {
  const anterior = agruparPorSesion(historial.filter((s) => s.sesionId !== sesionActualId)).at(-1);
  const deHoy = historial.filter((s) => s.sesionId === sesionActualId).sort((a, b) => a.numero - b.numero);
  const fuente =
    anterior?.series.find((s) => s.numero === numero) ?? deHoy.at(-1) ?? anterior?.series.at(-1);
  return fuente ? { peso: fuente.peso, reps: fuente.reps } : { peso: 0, reps: repsPorDefecto };
}
