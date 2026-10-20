// Migración única desde la versión anterior, que guardaba los tachados de la
// semana en localStorage con el nombre del ejercicio como clave.

import type { Repositorios, Sesion } from '../datos';
import { RUTINA } from '../rutina';
import { fechaTexto, lunesDe, sumarDias } from '../util/fechas';

const CLAVE_VIEJA = 'rutina:estado:v1';

interface EstadoViejo {
  semana: string;
  hechos: Record<string, string[]>;
}

export async function migrarDesdeLocalStorage(repos: Repositorios, hoy = new Date()): Promise<void> {
  let viejo: EstadoViejo | null = null;
  try {
    const crudo = localStorage.getItem(CLAVE_VIEJA);
    if (!crudo) return;
    viejo = JSON.parse(crudo) as EstadoViejo;
  } catch {
    return;
  }

  // Solo sirve si es de esta semana; si no, ya se habría reiniciado igual.
  if (viejo?.semana === lunesDe(hoy) && viejo.hechos) {
    const hoyTexto = fechaTexto(hoy);
    for (const [diaTexto, nombres] of Object.entries(viejo.hechos)) {
      const dia = Number(diaTexto);
      const rutina = RUTINA[dia];
      if (!rutina || !nombres?.length) continue;
      // La versión anterior usaba el nombre (con "#2" si se repetía en el día).
      const completados = rutina.ejercicios
        .filter((e) => nombres.some((n) => n.split('#')[0] === e.nombre))
        .map((e) => e.id);
      if (!completados.length) continue;
      const fechaDia = sumarDias(viejo.semana, dia);
      const fecha = fechaDia < hoyTexto ? fechaDia : hoyTexto;
      const sesion: Sesion = {
        id: `${fecha}_${dia}`,
        fecha,
        dia,
        rutina: rutina.grupo,
        tecnica: {},
        completados: [...new Set(completados)],
        creada: Date.now(),
      };
      await repos.sesiones.guardar(sesion);
    }
  }

  try {
    localStorage.removeItem(CLAVE_VIEJA);
  } catch {
    // No importa: si no se pudo borrar, la próxima vez se intenta de nuevo.
  }
}
