// Pantalla principal: la rutina del día, el ánimo y la carga de series.

import type { Animo, Serie, Sesion } from '../datos';
import { llevaSeries, objetivo } from '../dominio/catalogo';
import type { Semana } from '../dominio/entrenamiento';
import { RUTINA, type DiaDeRutina } from '../rutina';
import { fechaCorta, fechaTexto, indiceDia, sumarDias } from '../util/fechas';
import { escapar } from '../util/formato';
import { NOMBRE_ANIMO, insigniaTecnica } from '../ui/componentes';
import type { Contexto, Pantalla } from '../ui/contexto';
import { carita, icono } from '../ui/iconos';
import { abrirModalSerie } from '../ui/modalSerie';
import { navegar } from '../ui/router';

const INICIALES = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const UMBRAL_DESLIZAR = 80;

// Día elegido. Se mantiene al ir a otra pantalla y volver; si cambia la
// fecha (la app quedó abierta de un día para otro) vuelve a hoy.
let seleccionado = indiceDia(new Date());
let fechaDeSeleccion = fechaTexto(new Date());
// Ejercicio recién guardado, para resaltarlo al volver a la lista.
let resaltado: string | undefined;

function completo(dia: DiaDeRutina, sesion?: Sesion): boolean {
  return dia.ejercicios.length > 0 && dia.ejercicios.every((e) => sesion?.completados.includes(e.id));
}

function renderCabecera(semana: Semana, sesion: Sesion | undefined, hoy: Date): string {
  const dia = RUTINA[seleccionado];
  const esHoy = seleccionado === indiceDia(hoy);
  const etiquetaFecha = fechaCorta(sumarDias(semana.lunes, seleccionado));
  const total = dia.ejercicios.length;
  const hechos = dia.ejercicios.filter((e) => sesion?.completados.includes(e.id)).length;
  const lleno = total > 0 && hechos === total;
  const porcentaje = total ? Math.round((hechos / total) * 100) : 0;

  // En descanso no hay progreso, pero se reserva el lugar para que la
  // cabecera mida siempre lo mismo.
  const progreso = `
    <div class="progreso ${dia.descanso ? 'invisible' : ''}" ${dia.descanso ? 'aria-hidden="true"' : ''}>
      <div class="progreso-texto">
        <span><strong>${hechos}</strong> / ${total} completados</span>
        ${lleno ? '<span class="completo">Día completo</span>' : `<span class="porcentaje">${porcentaje}%</span>`}
      </div>
      <div class="progress" role="progressbar" aria-label="Progreso del día"
           aria-valuenow="${hechos}" aria-valuemin="0" aria-valuemax="${total}">
        <div class="progress-bar ${lleno ? 'lleno' : ''}" style="width: ${porcentaje}%"></div>
      </div>
    </div>`;

  return `
    <header class="cabecera cabecera--hoy" data-zona="dias">
      <div class="container cabecera-info">
        <div class="cabecera-fila">
          <span class="etiqueta">${esHoy ? `Hoy · ${etiquetaFecha}` : etiquetaFecha}</span>
          ${esHoy ? '' : '<button type="button" class="btn btn-cabecera" data-accion="hoy">Volver a hoy</button>'}
        </div>
        <h1 class="dia-nombre">${escapar(dia.nombre)}</h1>
        <p class="dia-grupo dia-grupo--una-linea" title="${escapar(dia.nota ? `${dia.grupo} · ${dia.nota}` : dia.grupo)}">${escapar(dia.grupo)}${
          dia.nota ? `<span class="dia-nota"> · ${escapar(dia.nota)}</span>` : ''
        }</p>
        ${progreso}
      </div>
      <nav class="container dias" aria-label="Días de la semana">
        ${RUTINA.map((d, i) => {
          const clases = [
            'dia-btn',
            i === seleccionado ? 'activo' : '',
            i === indiceDia(hoy) ? 'es-hoy' : '',
            completo(d, semana.sesiones.find((s) => s.dia === i)) ? 'hecho' : '',
          ].join(' ');
          return `<button type="button" class="${clases}" data-dia="${i}" aria-label="${d.nombre}"
                    ${i === seleccionado ? 'aria-current="true"' : ''}>${INICIALES[i]}</button>`;
        }).join('')}
      </nav>
    </header>`;
}

function renderAnimo(): string {
  const opciones = ([1, 2, 3, 4, 5] as Animo[])
    .map(
      (v) => `
      <button type="button" class="animo-btn" data-animo="${v}" aria-label="${NOMBRE_ANIMO[v]}">
        ${carita(v)}<span>${v}</span>
      </button>`,
    )
    .join('');
  return `
    <section class="animo" aria-label="Ánimo del día">
      <h2>¿Cómo venís hoy?</h2>
      <div class="animo-opciones">${opciones}</div>
    </section>`;
}

function renderLista(dia: DiaDeRutina, sesion: Sesion | undefined, series: Serie[]): string {
  if (dia.descanso) {
    return `
      <div class="descanso">
        ${icono('bed')}
        <h2>Descanso activo</h2>
        <p>${escapar(dia.descanso)}</p>
      </div>`;
  }

  const filas = dia.ejercicios
    .map((ej) => {
      const hecho = sesion?.completados.includes(ej.id) ?? false;
      const cargadas = series.filter((s) => s.ejercicioId === ej.id).length;
      const conSeries = llevaSeries(ej);
      const progreso =
        conSeries && cargadas > 0 && !hecho
          ? `<span class="progreso-series">${cargadas}/${ej.series} series</span>`
          : '';
      const tecnica = hecho ? insigniaTecnica(sesion?.tecnica[ej.id]) : '';
      return `
        <li class="fila ${conSeries ? 'fila--deslizable' : ''} ${resaltado === ej.id ? 'fila--resaltada' : ''}">
          ${conSeries ? `<div class="fila-fondo" aria-hidden="true">${icono('dumbbell')} Cargar serie</div>` : ''}
          <div class="ejercicio ${hecho ? 'hecho' : ''}" data-id="${escapar(ej.id)}">
            <button type="button" class="ejercicio-principal" data-accion="abrir"
                    aria-label="${escapar(ej.nombre)}${conSeries ? ': cargar serie' : hecho ? ': desmarcar' : ': marcar como hecho'}">
              <span class="ejercicio-nombre">${escapar(ej.nombre)}</span>
              <span class="ejercicio-detalle">
                <span class="series">${escapar(objetivo(ej))}</span>
                ${progreso}${tecnica}
                ${ej.nota ? `<span class="nota">${escapar(ej.nota)}</span>` : ''}
              </span>
            </button>
            <button type="button" class="check" data-accion="check" aria-pressed="${hecho}"
                    aria-label="${hecho ? 'Desmarcar' : 'Marcar como hecho'}">${icono('check')}</button>
          </div>
        </li>`;
    })
    .join('');

  return `
    <ul class="lista">${filas}</ul>
    <p class="ayuda">Deslizá un ejercicio hacia la derecha (o tocalo) para cargar una serie.</p>`;
}

export const pantallaHoy: Pantalla = async (contenedor, ctx) => {
  const hoy = new Date();
  if (fechaTexto(hoy) !== fechaDeSeleccion) {
    seleccionado = indiceDia(hoy);
    fechaDeSeleccion = fechaTexto(hoy);
  }

  const semana = await ctx.entrenamiento.semana(hoy);
  const sesion = ctx.entrenamiento.sesionDelDia(semana, seleccionado);
  const series = sesion ? await ctx.repos.series.obtenerPorSesion(sesion.id) : [];
  const dia = RUTINA[seleccionado];
  const preguntarAnimo =
    !dia.descanso && !RUTINA[indiceDia(hoy)].descanso && !ctx.entrenamiento.animoDeHoy(semana, hoy);

  contenedor.innerHTML = `
    ${renderCabecera(semana, sesion, hoy)}
    <main class="container contenido">
      ${preguntarAnimo ? renderAnimo() : ''}
      ${renderLista(dia, sesion, series)}
    </main>`;
  resaltado = undefined;

  conectar(contenedor, ctx);
};

function irADia(ctx: Contexto, indice: number): void {
  const nuevo = (indice + 7) % 7;
  if (nuevo === seleccionado) return;
  seleccionado = nuevo;
  ctx.refrescar();
  ctx.arriba();
}

function abrir(ctx: Contexto, ejercicioId: string): void {
  const ej = RUTINA[seleccionado].ejercicios.find((e) => e.id === ejercicioId);
  if (!ej) return;
  if (!llevaSeries(ej)) {
    // Sin series (ej. cinta): tocar alterna el tachado.
    void ctx.entrenamiento.alternarCompletado(seleccionado, ej.id).then(ctx.refrescar);
    return;
  }
  abrirModalSerie({
    ctx,
    dia: seleccionado,
    ejercicio: ej,
    alCerrar: (cambios) => {
      if (cambios) {
        resaltado = ej.id;
        ctx.refrescar();
      }
    },
    alVerEvolucion: (id) => navegar(`#/ejercicio/${encodeURIComponent(id)}`),
  });
}

function conectar(contenedor: HTMLElement, ctx: Contexto): void {
  let ignorarClick = false;

  contenedor.addEventListener('click', (e) => {
    if (ignorarClick) return;
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-accion], [data-dia], [data-animo]');
    if (!el) return;

    if (el.dataset.dia !== undefined) {
      irADia(ctx, Number(el.dataset.dia));
    } else if (el.dataset.animo) {
      el.closest('.animo')?.classList.add('animo--respondido');
      void ctx.entrenamiento
        .registrarAnimo(seleccionado, Number(el.dataset.animo) as Animo)
        .then(() => window.setTimeout(ctx.refrescar, 220));
    } else if (el.dataset.accion === 'hoy') {
      irADia(ctx, indiceDia(new Date()));
    } else {
      const id = el.closest<HTMLElement>('[data-id]')?.dataset.id;
      if (!id) return;
      if (el.dataset.accion === 'abrir') abrir(ctx, id);
      if (el.dataset.accion === 'check') {
        void ctx.entrenamiento.alternarCompletado(seleccionado, id).then(ctx.refrescar);
      }
    }
  });

  // Deslizar un ejercicio hacia la derecha: abrir la carga de series.
  // (Cualquier otro deslizamiento lo maneja main.ts: cambia de pantalla.)
  for (const fila of contenedor.querySelectorAll<HTMLElement>('.fila--deslizable')) {
    const tarjeta = fila.querySelector<HTMLElement>('.ejercicio')!;
    let inicioX = 0;
    let inicioY = 0;
    let dx = 0;
    let modo: 'nada' | 'horizontal' | 'vertical' = 'nada';

    tarjeta.addEventListener(
      'touchstart',
      (e) => {
        inicioX = e.touches[0].clientX;
        inicioY = e.touches[0].clientY;
        dx = 0;
        modo = 'nada';
        tarjeta.style.transition = 'none';
      },
      { passive: true },
    );
    tarjeta.addEventListener(
      'touchmove',
      (e) => {
        const mx = e.touches[0].clientX - inicioX;
        const my = e.touches[0].clientY - inicioY;
        if (modo === 'nada' && Math.hypot(mx, my) > 10) modo = mx > 0 && Math.abs(mx) > Math.abs(my) ? 'horizontal' : 'vertical';
        if (modo !== 'horizontal') return;
        e.preventDefault(); // que no scrollee mientras desliza
        dx = Math.max(0, mx);
        tarjeta.style.transform = `translateX(${Math.min(dx, 140)}px)`;
        fila.classList.toggle('fila--lista', dx > UMBRAL_DESLIZAR);
      },
      { passive: false },
    );
    const soltar = () => {
      tarjeta.style.transition = '';
      tarjeta.style.transform = '';
      fila.classList.remove('fila--lista');
      if (modo === 'horizontal') {
        ignorarClick = true;
        window.setTimeout(() => (ignorarClick = false), 350);
        if (dx > UMBRAL_DESLIZAR) abrir(ctx, tarjeta.dataset.id!);
      }
      modo = 'nada';
    };
    tarjeta.addEventListener('touchend', soltar);
    tarjeta.addEventListener('touchcancel', soltar);
  }
}
