// Datos del teléfono en localStorage (preferencias y cronómetro): se leen de
// forma síncrona. index.html usa la misma clave de color antes de pintar.

import { EN_CERO, esEstadoValido, type EstadoCronometro } from '../dominio/cronometro';
import { COLOR_POR_DEFECTO, esColorValido } from '../temas-color';
import type { Preferencias } from './modelos';
import type { CronometroRepository, PreferenciasRepository } from './repositorios';

export const CLAVE_COLOR = 'rutina:color';
export const CLAVE_CRONOMETRO = 'rutina:cronometro';

export class PreferenciasLocalStorage implements PreferenciasRepository {
  obtener(): Preferencias {
    let color: string | null = null;
    try {
      color = localStorage.getItem(CLAVE_COLOR);
      // Un tema que ya no existe (ej. "marron") pasa al de por defecto, y queda guardado.
      if (color !== null && !esColorValido(color)) {
        color = COLOR_POR_DEFECTO;
        localStorage.setItem(CLAVE_COLOR, color);
      }
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

export class CronometroLocalStorage implements CronometroRepository {
  obtener(): EstadoCronometro {
    try {
      const datos: unknown = JSON.parse(localStorage.getItem(CLAVE_CRONOMETRO) ?? 'null');
      if (esEstadoValido(datos)) return datos;
    } catch {
      // Guardado roto o almacenamiento no disponible: arranca en cero.
    }
    return { ...EN_CERO };
  }

  guardar(estado: EstadoCronometro): void {
    try {
      localStorage.setItem(CLAVE_CRONOMETRO, JSON.stringify(estado));
    } catch {
      // Sin persistencia: sigue andando mientras la app esté abierta.
    }
  }
}

export class CronometroEnMemoria implements CronometroRepository {
  private estado: EstadoCronometro = { ...EN_CERO };

  obtener(): EstadoCronometro {
    return { ...this.estado };
  }

  guardar(estado: EstadoCronometro): void {
    this.estado = { ...estado };
  }
}
