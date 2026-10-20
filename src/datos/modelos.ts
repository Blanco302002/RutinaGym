// Entidades que se guardan. No saben nada de dónde se guardan.

export type Tecnica = 'bien' | 'dudosa' | 'mala';
export type Animo = 1 | 2 | 3 | 4 | 5;

/** Catálogo de ejercicios: el id es fijo, el nombre es el último conocido. */
export interface Ejercicio {
  id: string;
  nombre: string;
}

/** Un entrenamiento: un día de la rutina hecho en una fecha. */
export interface Sesion {
  id: string;
  /** AAAA-MM-DD, hora local. */
  fecha: string;
  /** Día de la rutina que se entrenó (0 = lunes). */
  dia: number;
  /** Nombre del grupo de ese día al momento de entrenar (ej. "Pecho + tríceps"). */
  rutina: string;
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

/** Archivo de respaldo (Exportar / Importar). */
export interface Respaldo {
  app: 'rutina-gym';
  version: 1;
  exportado: string;
  ejercicios: Ejercicio[];
  sesiones: Sesion[];
  series: Serie[];
}
