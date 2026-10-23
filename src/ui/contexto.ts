import type { Repositorios } from '../datos';
import type { Entrenamiento } from '../dominio/entrenamiento';
import type { GestorRutinas } from '../dominio/rutinas';
import type { Ruta } from './router';

/** Lo que recibe cada pantalla. */
export interface Contexto {
  repos: Repositorios;
  entrenamiento: Entrenamiento;
  rutinas: GestorRutinas;
  /** Vuelve a dibujar la pantalla actual (manteniendo el scroll) y pone al día las demás. */
  refrescar(): void;
  /** Cambiaron datos: pone al día las otras pantallas (la actual la dibuja la navegación). */
  cambiaronDatos(): void;
  /** Lleva la pantalla actual arriba de todo. */
  arriba(): void;
}

/** Dibuja la pantalla dentro de `contenedor`. */
export type Pantalla<R extends Ruta = Ruta> = (contenedor: HTMLElement, ctx: Contexto, ruta: R) => Promise<void>;
