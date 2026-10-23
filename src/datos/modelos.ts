// Entidades que se guardan. No saben nada de dónde se guardan.

export type Tecnica = 'bien' | 'dudosa' | 'mala';
export type Animo = 1 | 2 | 3 | 4 | 5;

/** Identidad de un ejercicio. El historial (series) se cuelga de este id. */
export interface Ejercicio {
  id: string;
  nombre: string;
}

export interface Rutina {
  id: string;
  nombre: string;
  /** Solo una rutina es la activa (la que se ve en la pantalla Rutina). */
  activa: boolean;
  creada: number;
}

export type TipoDia = 'entrenamiento' | 'descanso';

/** Un día de la semana dentro de una rutina. */
export interface DiaRutina {
  id: string;
  rutinaId: string;
  /** 0 = lunes … 6 = domingo. */
  dia: number;
  tipo: TipoDia;
  /** Ej. "Pecho + tríceps". */
  nombre: string;
}

/** Cómo se hace un ejercicio en un día de una rutina. */
export interface EjercicioEnRutina {
  id: string;
  diaId: string;
  /** Repetido del día, para buscar rápido por rutina. */
  rutinaId: string;
  ejercicioId: string;
  orden: number;
  /** Entero de 1 a 10. */
  series: number;
  /** Texto corto (máx. 15): "6-10", "al fallo", "las que pueda". */
  reps: string;
  /** Máx. 100 caracteres. Dependen de la rutina, por eso van acá. */
  notas: string;
}

/** Un entrenamiento: un día de la rutina hecho en una fecha. */
export interface Sesion {
  id: string;
  /** AAAA-MM-DD, hora local. */
  fecha: string;
  /** Día de la rutina que se entrenó (0 = lunes). */
  dia: number;
  /** Nombre del día al momento de entrenar (ej. "Pecho + tríceps"). */
  rutina: string;
  /** Rutina con la que se hizo (las sesiones viejas se asignan en la migración). */
  rutinaId?: string;
  animo?: Animo;
  /** Técnica por ejercicio: ejercicioId → calificación. */
  tecnica: Record<string, Tecnica>;
  /** Ejercicios terminados (tachados) en esta sesión. */
  completados: string[];
  /** Momento de creación (ms). */
  creada: number;
}

export interface Serie {
  id: string;
  sesionId: string;
  ejercicioId: string;
  /** 1, 2, 3… dentro de la sesión y el ejercicio. */
  numero: number;
  /** Kilos. 0 = peso corporal. */
  peso: number;
  reps: number;
  /** AAAA-MM-DD, hora local. */
  fecha: string;
  /** Momento en que se guardó (ms). */
  creada: number;
}

export type NuevaSerie = Omit<Serie, 'id' | 'creada'>;

export interface ResumenSesion {
  series: number;
  /** Ids de los ejercicios con series cargadas. */
  ejercicios: string[];
}

/** Preferencias del teléfono (no son datos de entrenamiento). */
export interface Preferencias {
  /** Id del tema de color (ver src/temas-color.ts). */
  color: string;
}

/** Todo lo que guarda la base. */
export interface DatosGuardados {
  ejercicios: Ejercicio[];
  sesiones: Sesion[];
  series: Serie[];
  rutinas: Rutina[];
  dias: DiaRutina[];
  ejerciciosEnRutina: EjercicioEnRutina[];
}

/**
 * Archivo de respaldo (Exportar / Importar).
 * Versión 1: sin rutinas (la rutina estaba en el código). Versión 2: con rutinas.
 */
export interface Respaldo extends DatosGuardados {
  app: 'rutina-gym';
  version: 1 | 2;
  exportado: string;
  /** Opcional: los respaldos viejos no lo tienen. */
  preferencias?: Partial<Preferencias>;
}
