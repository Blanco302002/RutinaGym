// Frases de progreso de un ejercicio, con reglas simples.
// Compara la última sesión contra la de hace ~4 semanas (o la primera, si
// todavía no hay tanta historia).

import type { Serie } from '../datos/modelos';
import { diasEntre, fechaCorta, fechaTexto, sumarDias } from '../util/fechas';
import { numero, plural } from '../util/formato';
import { agruparPorSesion, esMejor, mejorSerie, volumen } from './estadisticas';

const VENTANA_DIAS = 28;

function semanas(dias: number): number {
  return Math.max(1, Math.round(dias / 7));
}

/** "hace un mes" / "hace 2 semanas" */
function hace(dias: number): string {
  const n = semanas(dias);
  return n === 4 || n === 5 ? 'hace un mes' : `hace ${plural(n, 'semana')}`;
}

function porcentaje(desde: number, hasta: number): number {
  return Math.round(((hasta - desde) / desde) * 100);
}

function serieTexto(s: Pick<Serie, 'peso' | 'reps'>): string {
  return s.peso > 0 ? `${numero(s.peso)} kg × ${s.reps}` : `${s.reps} repeticiones`;
}

export function frasesDeProgreso(historial: Serie[], hoy = new Date()): string[] {
  const grupos = agruparPorSesion(historial);
  if (grupos.length === 0) return [];

  const hoyTexto = fechaTexto(hoy);
  const actual = grupos.at(-1)!;
  const mejorActual = mejorSerie(actual.series)!;
  const frases: string[] = [];

  const sinHacer = diasEntre(actual.fecha, hoyTexto);
  if (sinHacer > 10) frases.push(`Hace ${sinHacer} días que no lo hacés.`);

  if (grupos.length === 1) {
    frases.push(
      `Primera vez registrada el ${fechaCorta(actual.fecha)}: ${serieTexto(mejorActual)}. La próxima ya podés comparar.`,
    );
    return frases;
  }

  // Referencia: la última sesión de hace 4 semanas o más; si no hay, la primera.
  const limite = sumarDias(actual.fecha, -VENTANA_DIAS);
  const referencia = [...grupos].reverse().find((g) => g.fecha <= limite) ?? grupos[0];
  const mejorRef = mejorSerie(referencia.series)!;
  const dias = diasEntre(referencia.fecha, actual.fecha);
  const periodo = `En ${plural(semanas(dias), 'semana')}`;

  // 1. Serie más pesada contra la referencia.
  if (mejorActual.peso > 0 || mejorRef.peso > 0) {
    if (mejorActual.peso > mejorRef.peso) {
      const p = mejorRef.peso > 0 ? `, un ${porcentaje(mejorRef.peso, mejorActual.peso)}%` : '';
      frases.push(
        `${periodo} subiste de ${numero(mejorRef.peso)} a ${numero(mejorActual.peso)} kg en tu serie más pesada${p}.`,
      );
    } else if (mejorActual.peso < mejorRef.peso) {
      frases.push(
        `Tu serie más pesada bajó de ${numero(mejorRef.peso)} a ${numero(mejorActual.peso)} kg respecto de ${hace(dias)}.`,
      );
    } else if (mejorActual.reps !== mejorRef.reps) {
      const d = mejorActual.reps - mejorRef.reps;
      frases.push(
        d > 0
          ? `Mismo peso que ${hace(dias)} (${numero(mejorActual.peso)} kg), pero ${plural(d, 'repetición', 'repeticiones')} más.`
          : `Mismo peso que ${hace(dias)} (${numero(mejorActual.peso)} kg), con ${plural(-d, 'repetición', 'repeticiones')} menos.`,
      );
    }
  } else if (mejorActual.reps !== mejorRef.reps) {
    // Peso corporal: comparamos repeticiones.
    frases.push(`${periodo} pasaste de ${mejorRef.reps} a ${mejorActual.reps} repeticiones en tu mejor serie.`);
  }

  // 2. Récord personal en la última sesión.
  const mejorPrevia = mejorSerie(grupos.slice(0, -1).flatMap((g) => g.series))!;
  if (esMejor(mejorActual, mejorPrevia)) {
    frases.push(`Récord personal en la última sesión: ${serieTexto(mejorActual)}.`);
  }

  // 3. Estancamiento: semanas desde la última vez que mejoraste tu mejor serie.
  let mejorHastaAhora = mejorSerie(grupos[0].series)!;
  let fechaUltimaMejora = grupos[0].fecha;
  for (const g of grupos.slice(1)) {
    const m = mejorSerie(g.series)!;
    if (esMejor(m, mejorHastaAhora)) {
      mejorHastaAhora = m;
      fechaUltimaMejora = g.fecha;
    }
  }
  const sesionesSinMejora = grupos.filter((g) => g.fecha > fechaUltimaMejora).length;
  const semanasIgual = Math.floor(diasEntre(fechaUltimaMejora, actual.fecha) / 7);
  if (semanasIgual >= 3 && sesionesSinMejora >= 2) {
    frases.push(`Hace ${semanasIgual} semanas que estás igual en este ejercicio (mejor: ${serieTexto(mejorHastaAhora)}).`);
  }

  // 4. Volumen total (peso × reps) de la sesión.
  const volActual = volumen(actual.series);
  const volRef = volumen(referencia.series);
  if (volActual > 0 && volRef > 0) {
    const p = porcentaje(volRef, volActual);
    if (Math.abs(p) >= 10) {
      frases.push(
        `El volumen de la sesión ${p > 0 ? 'subió' : 'bajó'} un ${Math.abs(p)}% (${numero(volRef)} → ${numero(volActual)} kg en total).`,
      );
    }
  }

  // 5. Frecuencia reciente.
  const desde = sumarDias(hoyTexto, -VENTANA_DIAS);
  const recientes = grupos.filter((g) => g.fecha > desde).length;
  if (recientes > 0) frases.push(`Lo hiciste ${plural(recientes, 'vez', 'veces')} en las últimas 4 semanas.`);

  return frases;
}
