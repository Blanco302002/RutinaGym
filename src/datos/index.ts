// Único lugar que decide qué implementación de repositorios usa la app.
// Para un backend: crear otra implementación de `Repositorios` y devolverla acá.

import type { Repositorios } from './repositorios';
import { crearRepositoriosIDB } from './indexeddb/repositorios';
import { PreferenciasLocalStorage } from './preferencias';

export type { Repositorios } from './repositorios';
export * from './modelos';

export function crearRepositorios(): Promise<Repositorios> {
  return crearRepositoriosIDB(new PreferenciasLocalStorage());
}
