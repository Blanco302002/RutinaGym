import type { Repositorios } from '../datos';
import type { Entrenamiento } from '../dominio/entrenamiento';
import type { Ruta } from './router';

/** Lo que recibe cada pantalla. */
export interface Contexto {
  repos: Repositorios;
  entrenamiento: Entrenamiento;
  /** Vuelve a dibujar la pantalla actual (manteniendo el scroll) y pone al día las demás. */
  refrescar(): void;
  /** Lleva la pantalla actual arriba de todo. */
  arriba(): void;
}

/** Dibuja la pantalla dentro de `contenedor`. */
export type Pantalla<R extends Ruta = Ruta> = (contenedor: HTMLElement, ctx: Contexto, ruta: R) => Promise<void>;
