// Campo numérico con − y + grandes. Mantener apretado acelera; tocar el
// número permite escribirlo a mano.

import { leerNumero, numero } from '../util/formato';
import { icono } from './iconos';

export interface OpcionesStepper {
  etiqueta: string;
  valor: number;
  paso: number;
  min?: number;
  max?: number;
  sufijo?: string;
  /** Teclado al escribir a mano. */
  teclado: 'decimal' | 'numeric';
}

export interface Stepper {
  elemento: HTMLElement;
  valor(): number;
}

const DEMORA_INICIAL = 400;

export function crearStepper(op: OpcionesStepper): Stepper {
  const min = op.min ?? 0;
  const max = op.max ?? 9999;
  let valor = op.valor;

  const el = document.createElement('div');
  el.className = 'stepper';
  el.innerHTML = `
    <span class="stepper-etiqueta">${op.etiqueta}</span>
    <div class="stepper-fila">
      <button type="button" class="stepper-btn" data-delta="-1" aria-label="Restar ${numero(op.paso)}">${icono('minus')}</button>
      <button type="button" class="stepper-valor" aria-label="${op.etiqueta}: tocar para escribir"></button>
      <button type="button" class="stepper-btn" data-delta="1" aria-label="Sumar ${numero(op.paso)}">${icono('plus')}</button>
    </div>`;

  const botonValor = el.querySelector<HTMLButtonElement>('.stepper-valor')!;

  function pintar(): void {
    botonValor.innerHTML = `<span class="stepper-numero">${numero(valor)}</span>${
      op.sufijo ? `<span class="stepper-sufijo">${op.sufijo}</span>` : ''
    }`;
  }

  function fijar(nuevo: number): void {
    if (!Number.isFinite(nuevo)) return;
    valor = Math.min(max, Math.max(min, Math.round(nuevo * 100) / 100));
    pintar();
  }

  // ── − / + con repetición al mantener ──
  for (const boton of el.querySelectorAll<HTMLButtonElement>('[data-delta]')) {
    const delta = Number(boton.dataset.delta) * op.paso;
    let espera: number | undefined;
    let repeticiones = 0;

    const parar = () => {
      window.clearTimeout(espera);
      espera = undefined;
      boton.classList.remove('presionado');
    };
    const repetir = () => {
      fijar(valor + delta);
      repeticiones++;
      const intervalo = repeticiones > 20 ? 40 : repeticiones > 8 ? 70 : 140;
      espera = window.setTimeout(repetir, intervalo);
    };

    boton.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      boton.setPointerCapture(e.pointerId);
      boton.classList.add('presionado');
      repeticiones = 0;
      fijar(valor + delta);
      espera = window.setTimeout(repetir, DEMORA_INICIAL);
    });
    boton.addEventListener('pointerup', parar);
    boton.addEventListener('pointercancel', parar);
    boton.addEventListener('lostpointercapture', parar);
    boton.addEventListener('contextmenu', (e) => e.preventDefault());
    // Teclado / lector de pantalla (click sin puntero).
    boton.addEventListener('click', (e) => {
      if (e.detail === 0) fijar(valor + delta);
    });
  }

  // ── Escribir a mano ──
  botonValor.addEventListener('click', () => {
    const input = document.createElement('input');
    input.className = 'stepper-input';
    input.type = 'text';
    input.inputMode = op.teclado;
    input.value = numero(valor).replace(/\./g, '');
    input.setAttribute('aria-label', op.etiqueta);
    input.setAttribute('enterkeyhint', 'done');
    botonValor.replaceWith(input);
    input.focus();
    input.select();

    let listo = false;
    const confirmar = () => {
      if (listo) return;
      listo = true;
      fijar(leerNumero(input.value));
      input.replaceWith(botonValor);
    };
    input.addEventListener('blur', confirmar);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') input.blur();
    });
  });

  pintar();
  return { elemento: el, valor: () => valor };
}
