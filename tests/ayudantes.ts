// Ayudantes compartidos por los tests: base IndexedDB falsa en memoria
// (fake-indexeddb) y preferencias en memoria. Corren en Node, sin navegador.
import 'fake-indexeddb/auto';
import type { Serie } from '../src/datos/modelos';
import { crearRepositoriosIDB } from '../src/datos/indexeddb/repositorios';
import { CronometroEnMemoria, PreferenciasEnMemoria } from '../src/datos/preferencias';
import { Entrenamiento } from '../src/dominio/entrenamiento';
import { GestorRutinas } from '../src/dominio/rutinas';

let contadorDB = 0;

/** Un teléfono recién instalado: la base existe pero no tiene nada. */
export async function telefonoNuevo() {
  const repos = await crearRepositoriosIDB(
    { preferencias: new PreferenciasEnMemoria(), cronometro: new CronometroEnMemoria() },
    `test-${contadorDB++}`,
  );
  const rutinas = new GestorRutinas(repos);
  return { repos, rutinas, entrenamiento: new Entrenamiento(repos, rutinas) };
}

/** Base sin entrenamientos pero con la rutina de ejemplo activa (lo más común en los tests). */
export async function baseVacia() {
  const base = await telefonoNuevo();
  const rutina = await base.rutinas.crearDesdeSemilla('Rutina principal', true);
  return { ...base, rutina };
}

/** Fecha local: dia(2026, 10, 19) es el 19 de octubre de 2026 (mes 1-12). */
export function dia(anio: number, mes: number, d: number, hora = 18, minuto = 0, segundo = 0): Date {
  return new Date(anio, mes - 1, d, hora, minuto, segundo);
}

let contadorSerie = 0;

/** Serie armada a mano para tests de cálculo (sin base). */
export function serie(sesionId: string, fecha: string, numero: number, peso: number, reps: number): Serie {
  contadorSerie++;
  return { id: `s${contadorSerie}`, sesionId, ejercicioId: 'press_plano', numero, peso, reps, fecha, creada: contadorSerie };
}

/** localStorage falso (en Node no hay): un Map con la misma interfaz. */
export function localStorageFalso(inicial: Record<string, string> = {}): Storage {
  const datos = new Map(Object.entries(inicial));
  return {
    get length() {
      return datos.size;
    },
    clear: () => datos.clear(),
    getItem: (k) => datos.get(k) ?? null,
    key: (i) => [...datos.keys()][i] ?? null,
    removeItem: (k) => void datos.delete(k),
    setItem: (k, v) => void datos.set(k, String(v)),
  };
}
