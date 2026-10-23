// Cronómetro analógico, como el de la app Reloj del iPhone.

import './cronometro.css';
import {
  angulos,
  empezar,
  fase,
  formatear,
  pausar,
  reiniciar,
  transcurrido,
  type EstadoCronometro,
  type Fase,
} from '../dominio/cronometro';
import { cabecera } from '../ui/componentes';
import type { Pantalla } from '../ui/contexto';
import { icono } from '../ui/iconos';

const C = 200; // centro de la esfera (viewBox 400×400)
const SUB = { x: 200, y: 122, r: 52 }; // dial chico de minutos

function punto(cx: number, cy: number, r: number, grados: number): [number, number] {
  const a = (grados * Math.PI) / 180;
  return [cx + r * Math.sin(a), cy - r * Math.cos(a)];
}

function marca(cx: number, cy: number, rExterior: number, largo: number, grados: number, clase: string): string {
  const [x1, y1] = punto(cx, cy, rExterior, grados);
  const [x2, y2] = punto(cx, cy, rExterior - largo, grados);
  return `<line class="${clase}" x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}"/>`;
}

function esfera(): string {
  // 240 marcas: una cada ¼ de segundo, más larga cada segundo y marcada cada 5.
  const marcas = Array.from({ length: 240 }, (_, i) => {
    const grados = i * 1.5;
    if (i % 20 === 0) return marca(C, C, 194, 18, grados, 'crono-marca crono-marca--cinco');
    if (i % 4 === 0) return marca(C, C, 194, 12, grados, 'crono-marca crono-marca--segundo');
    return marca(C, C, 194, 7, grados, 'crono-marca crono-marca--fina');
  }).join('');

  const numeros = Array.from({ length: 12 }, (_, i) => {
    const n = (i + 1) * 5;
    const [x, y] = punto(C, C, 154, n * 6);
    return `<text class="crono-numero" x="${x.toFixed(2)}" y="${y.toFixed(2)}">${n}</text>`;
  }).join('');

  // Dial chico: 30 minutos, marca cada medio minuto, más larga cada 5.
  const marcasSub = Array.from({ length: 60 }, (_, i) => {
    const grados = i * 6;
    if (i % 10 === 0) return marca(SUB.x, SUB.y, SUB.r, 8, grados, 'crono-marca crono-marca--segundo');
    if (i % 2 === 0) return marca(SUB.x, SUB.y, SUB.r, 5, grados, 'crono-marca crono-marca--fina');
    return marca(SUB.x, SUB.y, SUB.r, 3, grados, 'crono-marca crono-marca--fina');
  }).join('');

  const numerosSub = [5, 10, 15, 20, 25, 30]
    .map((n) => {
      const [x, y] = punto(SUB.x, SUB.y, SUB.r - 17, n * 12);
      return `<text class="crono-numero crono-numero--chico" x="${x.toFixed(2)}" y="${y.toFixed(2)}">${n}</text>`;
    })
    .join('');

  return `
    <svg class="crono-esfera" viewBox="0 0 400 400" role="img" aria-label="Cronómetro">
      ${marcas}${numeros}
      ${marcasSub}${numerosSub}
      <g class="crono-aguja" data-aguja="minutos">
        <line x1="${SUB.x}" y1="${SUB.y + 8}" x2="${SUB.x}" y2="${SUB.y - SUB.r + 6}"/>
      </g>
      <circle class="crono-eje" cx="${SUB.x}" cy="${SUB.y}" r="4.5"/>
      <text class="crono-digital" x="${C}" y="278" data-digital>00:00,00</text>
      <g class="crono-aguja" data-aguja="segundos">
        <line x1="${C}" y1="${C + 28}" x2="${C}" y2="${C - 190}"/>
      </g>
      <circle class="crono-eje" cx="${C}" cy="${C}" r="7"/>
      <circle class="crono-eje-centro" cx="${C}" cy="${C}" r="2.5"/>
    </svg>`;
}

const BOTON_PRINCIPAL: Record<Fase, { etiqueta: string; clase: string; icono: 'play' | 'pause' }> = {
  cero: { etiqueta: 'Empezar', clase: 'crono-btn--verde', icono: 'play' },
  corriendo: { etiqueta: 'Parar', clase: 'crono-btn--rojo', icono: 'pause' },
  pausado: { etiqueta: 'Reanudar', clase: 'crono-btn--verde', icono: 'play' },
};

export const pantallaCronometro: Pantalla = async (contenedor, ctx) => {
  let estado: EstadoCronometro = ctx.repos.cronometro.obtener();

  contenedor.classList.add('pantalla-crono');
  contenedor.innerHTML = `
    ${cabecera({ titulo: 'Cronómetro' })}
    <div class="crono-dial">${esfera()}</div>
    <div class="crono-zona-botones">
      <div class="crono-botones">
        <button type="button" class="crono-btn crono-btn--amarillo" data-accion="reiniciar" aria-label="Reiniciar">
          ${icono('rotateCcw')}
        </button>
        <button type="button" class="crono-btn" data-accion="principal"></button>
      </div>
    </div>`;

  const agujaSeg = contenedor.querySelector<SVGGElement>('[data-aguja="segundos"]')!;
  const agujaMin = contenedor.querySelector<SVGGElement>('[data-aguja="minutos"]')!;
  const digital = contenedor.querySelector<SVGTextElement>('[data-digital]')!;
  const botones = contenedor.querySelector<HTMLElement>('.crono-botones')!;
  const principal = contenedor.querySelector<HTMLButtonElement>('[data-accion="principal"]')!;

  function pintarTiempo(): void {
    const ms = transcurrido(estado);
    const { segundos, minutos } = angulos(ms);
    agujaSeg.setAttribute('transform', `rotate(${segundos.toFixed(3)} ${C} ${C})`);
    agujaMin.setAttribute('transform', `rotate(${minutos.toFixed(3)} ${SUB.x} ${SUB.y})`);
    digital.textContent = formatear(ms);
  }

  function pintarBotones(): void {
    const f = fase(estado);
    const datos = BOTON_PRINCIPAL[f];
    botones.dataset.fase = f;
    principal.className = `crono-btn crono-btn--principal ${datos.clase}`;
    principal.setAttribute('aria-label', datos.etiqueta);
    principal.innerHTML = icono(datos.icono, 'icono--relleno');
  }

  // Agujas fluidas mientras corre. Se corta sola cuando la pantalla deja de estar.
  let cuadro = 0;
  let esperas = 0;
  function animar(): void {
    if (!contenedor.isConnected) {
      // Recién armada (todavía fuera del documento) o ya reemplazada.
      if (++esperas > 120) return;
    } else {
      esperas = 0;
    }
    // Fuera de la vista (otro panel del carrusel) no se pinta, pero sigue el ciclo.
    if (contenedor.closest<HTMLElement>('.panel')?.dataset.visible !== 'false') pintarTiempo();
    if (estado.corriendo) cuadro = requestAnimationFrame(animar);
  }

  function cambiar(nuevo: EstadoCronometro): void {
    estado = nuevo;
    ctx.repos.cronometro.guardar(estado);
    pintarBotones();
    cancelAnimationFrame(cuadro);
    animar();
  }

  botones.addEventListener('click', (e) => {
    const accion = (e.target as HTMLElement).closest<HTMLElement>('[data-accion]')?.dataset.accion;
    if (accion === 'reiniciar') cambiar(reiniciar());
    if (accion === 'principal') cambiar(estado.corriendo ? pausar(estado) : empezar(estado));
  });

  pintarBotones();
  pintarTiempo();
  if (estado.corriendo) cuadro = requestAnimationFrame(animar);
};
