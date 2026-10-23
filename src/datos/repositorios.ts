// Contratos de acceso a datos. La app solo conoce estas interfaces.
// Hoy las implementa IndexedDB (./indexeddb); un backend futuro solo tiene
// que implementarlas de nuevo (ej. con fetch a una API) y cambiar ./index.ts.
// Todo es async a propósito: así una implementación remota encaja igual.

import type { EstadoCronometro } from '../dominio/cronometro';
import type {
  DatosGuardados,
  DiaRutina,
  Ejercicio,
  EjercicioEnRutina,
  NuevaSerie,
  Preferencias,
  ResumenSesion,
  Rutina,
  Serie,
  Sesion,
} from './modelos';

export interface EjercicioRepository {
  obtener(id: string): Promise<Ejercicio | undefined>;
  listar(): Promise<Ejercicio[]>;
  guardar(ejercicio: Ejercicio): Promise<void>;
  /** Solo para ejercicios sin historial (las reglas están en dominio/rutinas.ts). */
  eliminar(id: string): Promise<void>;
}

export interface RutinaRepository {
  obtener(id: string): Promise<Rutina | undefined>;
  /** Por fecha de creación. */
  listar(): Promise<Rutina[]>;
  guardar(rutina: Rutina): Promise<void>;
  /** Marca esta como activa y todas las demás como no activas, de una vez. */
  activar(id: string): Promise<void>;
  /** Borra la rutina con sus días y ejercicios. No toca el historial. */
  eliminar(id: string): Promise<void>;
}

export interface DiaRutinaRepository {
  obtener(id: string): Promise<DiaRutina | undefined>;
  /** Los días de una rutina, de lunes a domingo. */
  listarPorRutina(rutinaId: string): Promise<DiaRutina[]>;
  guardar(dia: DiaRutina): Promise<void>;
}

export interface EjercicioEnRutinaRepository {
  obtener(id: string): Promise<EjercicioEnRutina | undefined>;
  /** En orden. */
  listarPorDia(diaId: string): Promise<EjercicioEnRutina[]>;
  listarPorRutina(rutinaId: string): Promise<EjercicioEnRutina[]>;
  /** En qué rutinas y días aparece un ejercicio. */
  listarPorEjercicio(ejercicioId: string): Promise<EjercicioEnRutina[]>;
  /** Guarda varios de una vez (ej. al reordenar o al duplicar una rutina). */
  guardar(...items: EjercicioEnRutina[]): Promise<void>;
  eliminar(id: string): Promise<void>;
}

export interface SesionRepository {
  obtener(id: string): Promise<Sesion | undefined>;
  guardar(...sesiones: Sesion[]): Promise<void>;
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
  contar(): Promise<{ sesiones: number; series: number; rutinas: number }>;
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
  rutinas: RutinaRepository;
  dias: DiaRutinaRepository;
  ejerciciosEnRutina: EjercicioEnRutinaRepository;
  sesiones: SesionRepository;
  series: SerieRepository;
  respaldo: RespaldoRepository;
  preferencias: PreferenciasRepository;
  cronometro: CronometroRepository;
}
