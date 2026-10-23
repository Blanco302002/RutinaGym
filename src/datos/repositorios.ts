// Contratos de acceso a datos. La app solo conoce estas interfaces.
// Hoy las implementa IndexedDB (./indexeddb); un backend futuro solo tiene
// que implementarlas de nuevo (ej. con fetch a una API) y cambiar ./index.ts.
// Todo es async a propósito: así una implementación remota encaja igual.

import type { EstadoCronometro } from '../dominio/cronometro';
import type { DatosGuardados, Ejercicio, NuevaSerie, Preferencias, ResumenSesion, Serie, Sesion } from './modelos';

export interface EjercicioRepository {
  /** Agrega los ejercicios nuevos y actualiza el nombre de los existentes. */
  sincronizar(ejercicios: Ejercicio[]): Promise<void>;
  listar(): Promise<Ejercicio[]>;
}

export interface SesionRepository {
  obtener(id: string): Promise<Sesion | undefined>;
  guardar(sesion: Sesion): Promise<void>;
  /** Todas, de la más reciente a la más vieja. */
  listar(): Promise<Sesion[]>;
  /** Sesiones con fecha entre `desde` y `hasta` (AAAA-MM-DD, ambos incluidos). */
  listarEntre(desde: string, hasta: string): Promise<Sesion[]>;
}

export interface SerieRepository {
  guardarSerie(serie: NuevaSerie): Promise<Serie>;
  eliminarSerie(id: string): Promise<void>;
  /** Todas las series de un ejercicio, de la más vieja a la más nueva. */
  obtenerHistorial(ejercicioId: string): Promise<Serie[]>;
  /** Series de una sesión, en el orden en que se guardaron. */
  obtenerPorSesion(sesionId: string): Promise<Serie[]>;
  /** Cantidad de series y de ejercicios distintos por sesión. */
  resumenPorSesion(): Promise<Record<string, ResumenSesion>>;
}

export interface RespaldoRepository {
  exportar(): Promise<DatosGuardados>;
  /** Reemplaza todos los datos. Si algo falla, no cambia nada. */
  importar(datos: DatosGuardados): Promise<void>;
  contar(): Promise<{ sesiones: number; series: number }>;
}

/**
 * Preferencias del teléfono. Síncrono a propósito: se leen antes de
 * dibujar la primera pantalla (para no parpadear con otro color).
 */
export interface PreferenciasRepository {
  obtener(): Preferencias;
  guardar(cambios: Partial<Preferencias>): void;
}

/** Estado del cronómetro: sobrevive a cerrar y volver a abrir la app. */
export interface CronometroRepository {
  obtener(): EstadoCronometro;
  guardar(estado: EstadoCronometro): void;
}

export interface Repositorios {
  ejercicios: EjercicioRepository;
  sesiones: SesionRepository;
  series: SerieRepository;
  respaldo: RespaldoRepository;
  preferencias: PreferenciasRepository;
  cronometro: CronometroRepository;
}
