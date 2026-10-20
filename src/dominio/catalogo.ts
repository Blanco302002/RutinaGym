// Lo que se deriva de rutina.ts: catálogo de ejercicios, en qué días aparece cada uno, etc.

import type { Ejercicio } from '../datos/modelos';
import { RUTINA, type EjercicioDeRutina } from '../rutina';

export function catalogoDeRutina(): Ejercicio[] {
  const vistos = new Map<string, Ejercicio>();
  for (const dia of RUTINA) {
    for (const e of dia.ejercicios) if (!vistos.has(e.id)) vistos.set(e.id, { id: e.id, nombre: e.nombre });
  }
  return [...vistos.values()];
}

export function buscarEnRutina(id: string): EjercicioDeRutina | undefined {
  for (const dia of RUTINA) {
    const e = dia.ejercicios.find((x) => x.id === id);
    if (e) return e;
  }
  return undefined;
}

/** Nombres de los días en que aparece un ejercicio. */
export function diasDeEjercicio(id: string): string[] {
  return RUTINA.filter((d) => d.ejercicios.some((e) => e.id === id)).map((d) => d.nombre);
}

/** Se cargan series (y no solo se tacha). */
export function llevaSeries(e: EjercicioDeRutina): e is EjercicioDeRutina & { series: number } {
  return typeof e.series === 'number' && e.series > 0;
}

/** "4×6-10", o el texto propio del ejercicio. */
export function objetivo(e: EjercicioDeRutina): string {
  if (e.texto) return e.texto;
  if (llevaSeries(e)) return e.reps ? `${e.series}×${e.reps}` : `${e.series} series`;
  return '';
}

/** Primer número de las reps objetivo ("8-12" → 8). */
export function repsMinimas(reps?: string): number | undefined {
  const n = Number.parseInt(reps ?? '', 10);
  return Number.isFinite(n) ? n : undefined;
}

export const DIAS_DE_ENTRENAMIENTO = RUTINA.filter((d) => !d.descanso).length;

/** Avisa en desarrollo si un día repite un id (se pisarían los datos). */
export function validarRutina(): void {
  for (const dia of RUTINA) {
    const ids = dia.ejercicios.map((e) => e.id);
    const repetidos = ids.filter((id, i) => ids.indexOf(id) !== i);
    if (repetidos.length) console.warn(`rutina.ts: ${dia.nombre} repite ids: ${repetidos.join(', ')}`);
  }
}
