// Navegación por hash (#/hoy, #/historial, #/ejercicio/press_plano…).
// Funciona offline: siempre es el mismo index.html.

import type { Destino } from './navbar';

export type Ruta =
  | { pantalla: 'hoy' }
  | { pantalla: 'historial'; pestana: 'sesiones' | 'ejercicios' }
  | { pantalla: 'sesion'; id: string }
  | { pantalla: 'ejercicio'; id: string }
  | { pantalla: 'cronometro' }
  | { pantalla: 'ajustes' };

export function leerRuta(hash = location.hash): Ruta {
  const [, seccion = '', param = ''] = hash.replace(/^#/, '').split('/');
  const id = decodeURIComponent(param);
  switch (seccion) {
    case 'historial':
      return { pantalla: 'historial', pestana: param === 'ejercicios' ? 'ejercicios' : 'sesiones' };
    case 'sesion':
      return id ? { pantalla: 'sesion', id } : { pantalla: 'historial', pestana: 'sesiones' };
    case 'ejercicio':
      return id ? { pantalla: 'ejercicio', id } : { pantalla: 'historial', pestana: 'ejercicios' };
    case 'cronometro':
      return { pantalla: 'cronometro' };
    case 'ajustes':
      return { pantalla: 'ajustes' };
    default:
      return { pantalla: 'hoy' };
  }
}

/** Qué ícono de la barra se ilumina en cada pantalla. */
export function destinoDe(ruta: Ruta): Destino {
  if (ruta.pantalla === 'hoy' || ruta.pantalla === 'cronometro' || ruta.pantalla === 'ajustes') return ruta.pantalla;
  return 'historial'; // también el detalle de sesión y la evolución
}

// Pila propia para saber si "volver" tiene adónde ir (en la app instalada no
// hay botón atrás del navegador).
const pila: string[] = [location.hash || '#/hoy'];
const oyentes: ((ruta: Ruta) => void)[] = [];

export function alCambiarRuta(oyente: (ruta: Ruta) => void): void {
  oyentes.push(oyente);
}

function avisar(): void {
  const ruta = leerRuta();
  for (const oyente of oyentes) oyente(ruta);
}

window.addEventListener('hashchange', () => {
  const actual = location.hash || '#/hoy';
  if (pila.length > 1 && pila[pila.length - 2] === actual) pila.pop();
  else pila.push(actual);
  avisar();
});

/** `reemplazar`: cambia de pantalla sin sumar un paso para "volver" (ej. pestañas). */
export function navegar(hash: string, { reemplazar = false } = {}): void {
  if (reemplazar) {
    pila[pila.length - 1] = hash;
    history.replaceState(null, '', hash);
    avisar();
  } else {
    location.hash = hash;
  }
}

/** Vuelve a la pantalla anterior, o a `alternativa` si se entró directo. */
export function volver(alternativa: string): void {
  if (pila.length > 1) history.back();
  else navegar(alternativa, { reemplazar: true });
}
