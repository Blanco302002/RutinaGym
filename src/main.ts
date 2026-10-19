import 'bootstrap/dist/css/bootstrap.min.css';
import './style.css';

import { RUTINA, type Dia } from './rutina';
import { alternar, estaHecho, fechaTexto, indiceDia, limpiarDia, lunesDe, sincronizarSemana } from './estado';
import { aplicarTema, seguirSistema, siguienteTema, temaActual, type Tema } from './tema';

const INICIALES = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const ICONOS = {
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>',
  auto: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" /><path d="M12 4a8 8 0 0 1 0 16z" class="relleno" /></svg>',
  oscuro: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" /></svg>',
  claro:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8" /></svg>',
  descanso:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 18V7M3 14h18v4M21 14v-1.5A2.5 2.5 0 0 0 18.5 10H11v4" /><circle cx="7" cy="11.5" r="1.8" /></svg>',
};
const NOMBRE_TEMA: Record<Tema, string> = { auto: 'Auto', claro: 'Claro', oscuro: 'Oscuro' };

const app = document.getElementById('app')!;

let hoy = new Date();
let seleccionado = indiceDia(hoy);

// ── Helpers ──────────────────────────────────────────────────

function escapar(texto: string): string {
  return texto.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** Id estable de cada ejercicio dentro de su día (nombre + repetición si hay dos iguales). */
function idsDe(dia: Dia): string[] {
  const vistos = new Map<string, number>();
  return dia.ejercicios.map(({ nombre }) => {
    const n = (vistos.get(nombre) ?? 0) + 1;
    vistos.set(nombre, n);
    return n === 1 ? nombre : `${nombre}#${n}`;
  });
}

function fechaDelDia(indice: number): Date {
  const [a, m, d] = lunesDe(hoy).split('-').map(Number);
  return new Date(a, m - 1, d + indice);
}

function progreso(indice: number): { hechos: number; total: number } {
  const ids = idsDe(RUTINA[indice]);
  return { hechos: ids.filter((id) => estaHecho(indice, id)).length, total: ids.length };
}

// ── Render ───────────────────────────────────────────────────

function renderCabecera(dia: Dia, esHoy: boolean): string {
  const fecha = fechaDelDia(seleccionado);
  const etiquetaFecha = `${fecha.getDate()} ${MESES[fecha.getMonth()]}`;
  const { hechos, total } = progreso(seleccionado);
  const completo = total > 0 && hechos === total;
  const porcentaje = total ? Math.round((hechos / total) * 100) : 0;
  const tema = temaActual();

  const progresoHtml = dia.descanso
    ? ''
    : `
      <div class="progreso-texto">
        <span><strong>${hechos}</strong> / ${total} completados</span>
        ${completo ? '<span class="completo">Día completo</span>' : `<span class="porcentaje">${porcentaje}%</span>`}
      </div>
      <div class="progress" role="progressbar" aria-label="Progreso del día"
           aria-valuenow="${hechos}" aria-valuemin="0" aria-valuemax="${total}">
        <div class="progress-bar ${completo ? 'lleno' : ''}" style="width: ${porcentaje}%"></div>
      </div>`;

  return `
    <header class="cabecera">
      <div class="container">
        <div class="cabecera-fila">
          <span class="etiqueta">${esHoy ? `Hoy · ${etiquetaFecha}` : etiquetaFecha}</span>
          <div class="d-flex gap-2">
            ${esHoy ? '' : '<button type="button" class="btn btn-cabecera" data-accion="hoy">Volver a hoy</button>'}
            <button type="button" class="btn btn-cabecera btn-tema" data-accion="tema"
                    aria-label="Tema: ${NOMBRE_TEMA[tema]}">${ICONOS[tema]}<span>${NOMBRE_TEMA[tema]}</span></button>
          </div>
        </div>
        <h1 class="dia-nombre">${escapar(dia.nombre)}</h1>
        <p class="dia-grupo">${escapar(dia.grupo)}${dia.nota ? `<span class="dia-nota"> · ${escapar(dia.nota)}</span>` : ''}</p>
        ${progresoHtml}
      </div>
      <nav class="container dias" aria-label="Días de la semana">
        ${RUTINA.map((d, i) => {
          const p = progreso(i);
          const clases = [
            'dia-btn',
            i === seleccionado ? 'activo' : '',
            i === indiceDia(hoy) ? 'es-hoy' : '',
            p.total > 0 && p.hechos === p.total ? 'hecho' : '',
          ].join(' ');
          return `<button type="button" class="${clases}" data-dia="${i}" aria-label="${d.nombre}"
                    ${i === seleccionado ? 'aria-current="true"' : ''}>${INICIALES[i]}</button>`;
        }).join('')}
      </nav>
    </header>`;
}

function renderEjercicios(dia: Dia): string {
  if (dia.descanso) {
    return `
      <div class="descanso">
        ${ICONOS.descanso}
        <h2>Descanso activo</h2>
        <p>${escapar(dia.descanso)}</p>
      </div>`;
  }

  const ids = idsDe(dia);
  const filas = dia.ejercicios
    .map((ej, i) => {
      const hecho = estaHecho(seleccionado, ids[i]);
      return `
        <li>
          <button type="button" class="ejercicio ${hecho ? 'hecho' : ''}" data-id="${escapar(ids[i])}"
                  aria-pressed="${hecho}">
            <span class="ejercicio-texto">
              <span class="ejercicio-nombre">${escapar(ej.nombre)}</span>
              <span class="ejercicio-detalle">
                <span class="series">${escapar(ej.series)}</span>
                ${ej.nota ? `<span class="nota">${escapar(ej.nota)}</span>` : ''}
              </span>
            </span>
            <span class="check">${ICONOS.check}</span>
          </button>
        </li>`;
    })
    .join('');

  const { hechos } = progreso(seleccionado);
  return `
    <ul class="lista">${filas}</ul>
    ${hechos > 0 ? '<div class="text-center"><button type="button" class="btn btn-limpiar" data-accion="limpiar">Destildar este día</button></div>' : ''}`;
}

function render(): void {
  const dia = RUTINA[seleccionado];
  const esHoy = seleccionado === indiceDia(hoy);
  app.innerHTML = `${renderCabecera(dia, esHoy)}<main class="container contenido">${renderEjercicios(dia)}</main>`;
}

// ── Interacción ──────────────────────────────────────────────

function irADia(indice: number): void {
  const nuevo = (indice + 7) % 7;
  if (nuevo === seleccionado) return;
  seleccionado = nuevo;
  render();
  window.scrollTo({ top: 0 });
}

app.addEventListener('click', (e) => {
  const objetivo = (e.target as HTMLElement).closest<HTMLElement>('[data-id], [data-dia], [data-accion]');
  if (!objetivo) return;

  if (objetivo.dataset.id !== undefined) {
    alternar(seleccionado, objetivo.dataset.id);
    render();
  } else if (objetivo.dataset.dia !== undefined) {
    irADia(Number(objetivo.dataset.dia));
  } else if (objetivo.dataset.accion === 'hoy') {
    irADia(indiceDia(hoy));
  } else if (objetivo.dataset.accion === 'tema') {
    siguienteTema();
    render();
  } else if (objetivo.dataset.accion === 'limpiar') {
    if (confirm(`¿Destildar todos los ejercicios del ${RUTINA[seleccionado].nombre.toLowerCase()}?`)) {
      limpiarDia(seleccionado);
      render();
    }
  }
});

// Deslizar a los costados para cambiar de día.
let toqueX = 0;
let toqueY = 0;
app.addEventListener(
  'touchstart',
  (e) => {
    toqueX = e.touches[0].clientX;
    toqueY = e.touches[0].clientY;
  },
  { passive: true },
);
app.addEventListener(
  'touchend',
  (e) => {
    const dx = e.changedTouches[0].clientX - toqueX;
    const dy = e.changedTouches[0].clientY - toqueY;
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5) irADia(seleccionado + (dx < 0 ? 1 : -1));
  },
  { passive: true },
);

// Al volver a la app (queda abierta en segundo plano): si cambió la semana
// se destilda todo, y si cambió el día se muestra la rutina de hoy.
function alVolver(): void {
  const ahora = new Date();
  if (fechaTexto(ahora) !== fechaTexto(hoy)) seleccionado = indiceDia(ahora);
  hoy = ahora;
  sincronizarSemana(ahora);
  render();
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') alVolver();
});
window.addEventListener('focus', alVolver);

// ── Arranque ─────────────────────────────────────────────────

aplicarTema();
seguirSistema();
sincronizarSemana(hoy);
render();

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  const habiaVersion = Boolean(navigator.serviceWorker.controller);
  // Cuando se instala una versión nueva, recargamos una vez para usarla.
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (habiaVersion) window.location.reload();
  });
  navigator.serviceWorker.register('./sw.js');
}
