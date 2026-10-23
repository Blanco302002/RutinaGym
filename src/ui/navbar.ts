// Barra de navegación inferior: Historial · Rutina · Cronómetro · Ajustes.
// Estilo de la app Reloj del iPhone: píldora flotante con una píldora más
// clara detrás del ícono activo, que se desliza al cambiar de pantalla.
// Estilos en navbar.css (variables arriba de todo para ajustarla fácil).

import './navbar.css';
import { icono, type NombreIcono } from './iconos';

export type Destino = 'historial' | 'hoy' | 'cronometro' | 'ajustes';

interface Item {
  destino: Destino;
  etiqueta: string;
  icono: NombreIcono;
  href: string;
}

/** En este orden aparecen en la barra y se recorren al deslizar. */
export const ITEMS: readonly Item[] = [
  { destino: 'historial', etiqueta: 'Historial', icono: 'history', href: '#/historial' },
  { destino: 'hoy', etiqueta: 'Rutina', icono: 'dumbbell', href: '#/hoy' },
  { destino: 'cronometro', etiqueta: 'Cronómetro', icono: 'timer', href: '#/cronometro' },
  { destino: 'ajustes', etiqueta: 'Ajustes', icono: 'settings', href: '#/ajustes' },
];

export function indiceDe(destino: Destino): number {
  return ITEMS.findIndex((i) => i.destino === destino);
}

export interface BarraNavegacion {
  /** Ícono activo (color y aria-current). */
  marcarActivo(destino: Destino): void;
  /** Píldora de selección: posición fraccionaria (1.5 = mitad entre el 2.º y el 3.º ícono). */
  posicionar(posicion: number, animado: boolean): void;
}

export function crearBarraNavegacion(
  contenedor: HTMLElement,
  alElegir: (destino: Destino) => void,
): BarraNavegacion {
  const nav = document.createElement('nav');
  nav.className = 'barra-nav';
  nav.setAttribute('aria-label', 'Navegación principal');
  nav.style.setProperty('--nav-cantidad', String(ITEMS.length));
  nav.innerHTML = `
    <span class="barra-nav__seleccion" aria-hidden="true"></span>
    ${ITEMS.map(
      (item) => `
      <a href="${item.href}" class="barra-nav__item" data-destino="${item.destino}" aria-label="${item.etiqueta}">
        ${icono(item.icono)}
      </a>`,
    ).join('')}`;
  contenedor.append(nav);

  nav.addEventListener('click', (e) => {
    const enlace = (e.target as HTMLElement).closest<HTMLElement>('[data-destino]');
    if (!enlace) return;
    e.preventDefault();
    alElegir(enlace.dataset.destino as Destino);
  });

  const seleccion = nav.querySelector<HTMLElement>('.barra-nav__seleccion')!;

  return {
    marcarActivo(destino) {
      for (const enlace of nav.querySelectorAll<HTMLAnchorElement>('[data-destino]')) {
        const activo = enlace.dataset.destino === destino;
        enlace.classList.toggle('activo', activo);
        if (activo) enlace.setAttribute('aria-current', 'page');
        else enlace.removeAttribute('aria-current');
      }
    },
    posicionar(posicion, animado) {
      // Mismo tiempo y curva que el carrusel: se mueven juntos.
      seleccion.style.transition = animado ? '' : 'none';
      // En el efecto elástico de los extremos, la píldora no sale de la barra.
      const limitada = Math.min(ITEMS.length - 1, Math.max(0, posicion));
      seleccion.style.setProperty('--nav-indice', String(limitada));
    },
  };
}
