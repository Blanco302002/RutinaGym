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
  marcarActivo(destino: Destino): void;
}

export function crearBarraNavegacion(contenedor: HTMLElement): BarraNavegacion {
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

  const seleccion = nav.querySelector<HTMLElement>('.barra-nav__seleccion')!;
  let primeraVez = true;

  return {
    marcarActivo(destino) {
      // La píldora se mueve con transform (la transición está en el CSS).
      // Al abrir la app aparece directo en su lugar, sin deslizarse.
      if (primeraVez) seleccion.style.transition = 'none';
      seleccion.style.setProperty('--nav-indice', String(indiceDe(destino)));
      if (primeraVez) {
        void seleccion.offsetWidth; // aplica la posición antes de devolver la transición
        seleccion.style.transition = '';
        primeraVez = false;
      }
      for (const enlace of nav.querySelectorAll<HTMLAnchorElement>('[data-destino]')) {
        const activo = enlace.dataset.destino === destino;
        enlace.classList.toggle('activo', activo);
        if (activo) enlace.setAttribute('aria-current', 'page');
        else enlace.removeAttribute('aria-current');
      }
    },
  };
}
