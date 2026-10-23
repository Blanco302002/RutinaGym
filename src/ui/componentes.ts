// Piezas de HTML que se repiten entre pantallas.

import type { Animo, Tecnica } from '../datos';
import { escapar } from '../util/formato';
import { carita, icono } from './iconos';

export const NOMBRE_ANIMO: Record<Animo, string> = {
  1: 'Muy mal',
  2: 'Mal',
  3: 'Normal',
  4: 'Bien',
  5: 'Excelente',
};

export const NOMBRE_TECNICA: Record<Tecnica, string> = { bien: 'Bien', dudosa: 'Dudosa', mala: 'Mala' };

/** Cabecera negra de las pantallas secundarias. */
export function cabecera(opciones: {
  titulo: string;
  subtitulo?: string;
  volver?: boolean;
  /** "Atrás" con flecha (editores) en vez de "Volver" con chevron. */
  atras?: boolean;
  extra?: string;
}): string {
  const { titulo, subtitulo, atras, extra = '' } = opciones;
  const volver = opciones.volver || atras;
  return `
    <header class="cabecera ${volver ? '' : 'cabecera--simple'}">
      <div class="container">
        ${
          volver
            ? `<div class="cabecera-fila">
                 <button type="button" class="btn btn-cabecera btn-volver" data-accion="volver"
                         aria-label="${atras ? 'Atrás' : 'Volver'}">
                   ${icono(atras ? 'arrowLeft' : 'chevronLeft')}<span>${atras ? 'Atrás' : 'Volver'}</span></button>
               </div>`
            : ''
        }
        <h1 class="titulo-pantalla">${escapar(titulo)}</h1>
        ${subtitulo ? `<p class="dia-grupo">${subtitulo}</p>` : ''}
        ${extra}
      </div>
    </header>`;
}

export function insigniaTecnica(tecnica?: Tecnica): string {
  if (!tecnica) return '';
  return `<span class="tecnica tecnica--${tecnica}">Técnica: ${NOMBRE_TECNICA[tecnica].toLowerCase()}</span>`;
}

export function insigniaAnimo(animo?: Animo): string {
  if (!animo) return '';
  return `<span class="animo-chico" title="Ánimo: ${NOMBRE_ANIMO[animo]}" aria-label="Ánimo: ${NOMBRE_ANIMO[animo]}">
    ${carita(animo)}<span>${animo}</span></span>`;
}

export function vacio(titulo: string, texto: string): string {
  return `<div class="vacio"><h2>${escapar(titulo)}</h2><p>${escapar(texto)}</p></div>`;
}
