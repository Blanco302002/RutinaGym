// Barra de navegación inferior: Historial · Hoy · Ajustes.
// Estilos en navbar.css (variables arriba de todo para ajustarla fácil).

import './navbar.css';
import { icono, type NombreIcono } from './iconos';

export type Destino = 'historial' | 'hoy' | 'ajustes';

interface Item {
  destino: Destino;
  etiqueta: string;
  icono: NombreIcono;
  href: string;
}

const ITEMS: Item[] = [
  { destino: 'historial', etiqueta: 'Historial', icono: 'history', href: '#/historial' },
  { destino: 'hoy', etiqueta: 'Hoy', icono: 'dumbbell', href: '#/hoy' },
  { destino: 'ajustes', etiqueta: 'Ajustes', icono: 'settings', href: '#/ajustes' },
];

export interface BarraNavegacion {
  marcarActivo(destino: Destino | null): void;
}

export function crearBarraNavegacion(contenedor: HTMLElement): BarraNavegacion {
  const nav = document.createElement('nav');
  nav.className = 'barra-nav';
  nav.setAttribute('aria-label', 'Navegación principal');
  nav.innerHTML = ITEMS.map(
    (item) => `
      <a href="${item.href}" class="barra-nav__item ${item.destino === 'hoy' ? 'barra-nav__item--central' : ''}"
         data-destino="${item.destino}" aria-label="${item.etiqueta}">
        <span class="barra-nav__icono">${icono(item.icono)}</span>
      </a>`,
  ).join('');
  contenedor.append(nav);

  return {
    marcarActivo(destino) {
      for (const enlace of nav.querySelectorAll<HTMLAnchorElement>('[data-destino]')) {
        const activo = enlace.dataset.destino === destino;
        enlace.classList.toggle('activo', activo);
        if (activo) enlace.setAttribute('aria-current', 'page');
        else enlace.removeAttribute('aria-current');
      }
    },
  };
}
