// Navegación por hash (#/hoy, #/historial, #/ejercicio/press_plano…).
// Funciona offline: siempre es el mismo index.html.

import type { Destino } from './navbar';

export type Ruta =
  | { pantalla: 'hoy' }
  | { pantalla: 'historial'; pestana: 'sesiones' | 'ejercicios' }
  | { pantalla: 'sesion'; id: string }
  | { pantalla: 'ejercicio'; id: string }
  | { pantalla: 'editarEjercicio'; id: string }
  | { pantalla: 'cronometro' }
  | { pantalla: 'ajustes' }
  // Gestión de rutinas (dentro de Ajustes)
  | { pantalla: 'rutinas' }
  | { pantalla: 'rutina'; id: string }
  | { pantalla: 'dia'; id: string }
  | { pantalla: 'agregar'; diaId: string }
  | { pantalla: 'item'; id: string }
  | { pantalla: 'nuevo'; diaId: string; ejercicioId?: string; nombre?: string };

export function leerRuta(hash = location.hash): Ruta {
  const partes = hash
    .replace(/^#\/?/, '')
    .split('/')
    .map((p) => {
      try {
        return decodeURIComponent(p);
      } catch {
        return p;
      }
    });
  const [seccion = '', a = '', b = '', c = ''] = partes;
  switch (seccion) {
    case 'historial':
      if (a === 'editar' && b) return { pantalla: 'editarEjercicio', id: b };
      return { pantalla: 'historial', pestana: a === 'ejercicios' ? 'ejercicios' : 'sesiones' };
    case 'sesion':
      return a ? { pantalla: 'sesion', id: a } : { pantalla: 'historial', pestana: 'sesiones' };
    case 'ejercicio':
      return a ? { pantalla: 'ejercicio', id: a } : { pantalla: 'historial', pestana: 'ejercicios' };
    case 'cronometro':
      return { pantalla: 'cronometro' };
    case 'ajustes':
      return { pantalla: 'ajustes' };
    case 'rutinas':
      return { pantalla: 'rutinas' };
    case 'rutina':
      return a ? { pantalla: 'rutina', id: a } : { pantalla: 'rutinas' };
    case 'dia':
      return a ? { pantalla: 'dia', id: a } : { pantalla: 'rutinas' };
    case 'agregar':
      return a ? { pantalla: 'agregar', diaId: a } : { pantalla: 'rutinas' };
    case 'item':
      return a ? { pantalla: 'item', id: a } : { pantalla: 'rutinas' };
    case 'nuevo':
      if (!a) return { pantalla: 'rutinas' };
      return b === 'e' ? { pantalla: 'nuevo', diaId: a, ejercicioId: c } : { pantalla: 'nuevo', diaId: a, nombre: c };
    default:
      return { pantalla: 'hoy' };
  }
}

/** Arma un hash con partes codificadas: hash('dia', id) → "#/dia/…". */
export function hash(...partes: string[]): string {
  return `#/${partes.map(encodeURIComponent).join('/')}`;
}

/** Qué ícono de la barra (y qué panel del carrusel) le corresponde a cada pantalla. */
export function destinoDe(ruta: Ruta): Destino {
  switch (ruta.pantalla) {
    case 'hoy':
    case 'cronometro':
    case 'ajustes':
      return ruta.pantalla;
    case 'rutinas':
    case 'rutina':
    case 'dia':
    case 'agregar':
    case 'item':
    case 'nuevo':
      return 'ajustes';
    default:
      return 'historial'; // historial, detalle de sesión, evolución y su edición
  }
}

/** Pantallas de edición: ahí no se cambia de pantalla deslizando. */
export function esEditor(ruta: Ruta): boolean {
  return ['rutinas', 'rutina', 'dia', 'agregar', 'item', 'nuevo', 'editarEjercicio'].includes(ruta.pantalla);
}

// Pila propia para saber si "volver" tiene adónde ir (en la app instalada no
// hay botón atrás del navegador; en Android sí, y también pasa por acá).
const pila: string[] = [location.hash || '#/hoy'];
const oyentes: ((ruta: Ruta) => void)[] = [];
let pasosAtras = 0;

export function alCambiarRuta(oyente: (ruta: Ruta) => void): void {
  oyentes.push(oyente);
}

function avisar(): void {
  const ruta = leerRuta();
  for (const oyente of oyentes) oyente(ruta);
}

window.addEventListener('hashchange', () => {
  const actual = location.hash || '#/hoy';
  if (pasosAtras > 0) {
    // Lo pidió volverA(): se sacan esos pasos de la pila.
    pila.splice(Math.max(1, pila.length - pasosAtras));
    pasosAtras = 0;
  } else {
    // Atrás del sistema (Android) o adelante: si la ruta ya estaba, se vuelve hasta ella.
    const anterior = pila.lastIndexOf(actual, pila.length - 2);
    if (anterior >= 0) pila.splice(anterior + 1);
    else pila.push(actual);
  }
  pila[pila.length - 1] = actual;
  avisar();
});

/** `reemplazar`: cambia de pantalla sin sumar un paso para "volver" (ej. pestañas). */
export function navegar(destino: string, { reemplazar = false } = {}): void {
  if (reemplazar) {
    pila[pila.length - 1] = destino;
    history.replaceState(null, '', destino);
    avisar();
  } else {
    location.hash = destino;
  }
}

/** Vuelve a la pantalla anterior, o a `alternativa` si se entró directo. */
export function volver(alternativa: string): void {
  if (pila.length > 1) history.back();
  else navegar(alternativa, { reemplazar: true });
}

/**
 * Vuelve hasta `destino` si está más atrás en la pila (ej. del formulario
 * de un ejercicio nuevo, salteando el buscador, al editor del día). Si no
 * está, va directo reemplazando la pantalla actual.
 */
export function volverA(destino: string): void {
  const i = pila.lastIndexOf(destino, pila.length - 2);
  if (i >= 0) {
    pasosAtras = pila.length - 1 - i;
    history.go(-pasosAtras);
  } else {
    navegar(destino, { reemplazar: true });
  }
}
