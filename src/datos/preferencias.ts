// Preferencias en localStorage: se leen de forma síncrona antes de dibujar.
// index.html usa la misma clave para aplicar el color antes de pintar.

import { COLOR_POR_DEFECTO, esColorValido } from '../temas-color';
import type { Preferencias } from './modelos';
import type { PreferenciasRepository } from './repositorios';

export const CLAVE_COLOR = 'rutina:color';

export class PreferenciasLocalStorage implements PreferenciasRepository {
  obtener(): Preferencias {
    let color: string | null = null;
    try {
      color = localStorage.getItem(CLAVE_COLOR);
    } catch {
      // Almacenamiento no disponible: valores por defecto.
    }
    return { color: esColorValido(color) ? color : COLOR_POR_DEFECTO };
  }

  guardar(cambios: Partial<Preferencias>): void {
    try {
      if (esColorValido(cambios.color)) localStorage.setItem(CLAVE_COLOR, cambios.color);
    } catch {
      // Sin persistencia: el cambio vale hasta cerrar la app.
    }
  }
}

/** Para tests (o si no hay almacenamiento): vive solo en memoria. */
export class PreferenciasEnMemoria implements PreferenciasRepository {
  private actual: Preferencias = { color: COLOR_POR_DEFECTO };

  obtener(): Preferencias {
    return { ...this.actual };
  }

  guardar(cambios: Partial<Preferencias>): void {
    if (esColorValido(cambios.color)) this.actual.color = cambios.color;
  }
}
