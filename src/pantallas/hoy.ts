// Pantalla principal: la rutina del día, el ánimo y la carga de series.
// La rutina sale de la base (la rutina activa), no del código.

import type { Animo, Serie, Sesion } from '../datos';
import type { Semana } from '../dominio/entrenamiento';
import { NOMBRES_DIAS, objetivo, type DiaCompleto, type RutinaCompleta } from '../dominio/rutinas';
import { fechaCorta, fechaTexto, indiceDia, sumarDias } from '../util/fechas';
import { escapar } from '../util/formato';
import { NOMBRE_ANIMO, insigniaTecnica, vacio } from '../ui/componentes';
import type { Contexto, Pantalla } from '../ui/contexto';
import { carita, icono } from '../ui/iconos';
import { abrirModalSerie } from '../ui/modalSerie';
import { navegar } from '../ui/router';

const INICIALES = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const UMBRAL_DESLIZAR = 80;
const TEXTO_DESCANSO = 'Hoy no se entrena. Caminá, estirá, movete suave y recuperate para el próximo entrenamiento.';

// Día elegido. Se mantiene al ir a otra pantalla y volver; si cambia la
// fecha (la app quedó abierta de un día para otro) vuelve a hoy.
let seleccionado = indiceDia(new Date());
let fechaDeSeleccion = fechaTexto(new Date());
// Ejercicio recién guardado, para resaltarlo al volver a la lista.
let resaltado: string | undefined;
// La rutina de la última vez que se dibujó (para abrir el modal sin volver a leerla).
let rutinaActual: RutinaCompleta | undefined;

function esDescanso(dia?: DiaCompleto): boolean {
  return !dia || dia.dia.tipo === 'descanso';
}

function completo(dia: DiaCompleto | undefined, sesion?: Sesion): boolean {
  if (!dia || esDescanso(dia) || !dia.ejercicios.length) return false;
  return dia.ejercicios.every(({ ejercicio }) => sesion?.completados.includes(ejercicio.id));
}

function renderCabecera(rutina: RutinaCompleta | undefined, semana: Semana, sesion: Sesion | undefined, hoy: Date): string {
  const dia = rutina?.dias[seleccionado];
  const descanso = esDescanso(dia);
  const esHoy = seleccionado === indiceDia(hoy);
  const etiquetaFecha = fechaCorta(sumarDias(semana.lunes, seleccionado));
  const ejercicios = dia?.ejercicios ?? [];
  const total = ejercicios.length;
  const hechos = ejercicios.filter(({ ejercicio }) => sesion?.completados.includes(ejercicio.id)).length;
  const lleno = total > 0 && hechos === total;
  const porcentaje = total ? Math.round((hechos / total) * 100) : 0;
  const subtitulo = dia ? dia.dia.nombre : 'Sin rutina activa';

  // En descanso no hay progreso, pero se reserva el lugar para que la
  // cabecera mida siempre lo mismo.
  const progreso = `
    <div class="progreso ${descanso ? 'invisible' : ''}" ${descanso ? 'aria-hidden="true"' : ''}>
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
        <h1 class="dia-nombre">${NOMBRES_DIAS[seleccionado]}</h1>
        <p class="dia-grupo dia-grupo--una-linea" title="${escapar(subtitulo)}">${escapar(subtitulo)}</p>
        ${progreso}
      </div>
      <nav class="container dias" aria-label="Días de la semana">
        ${NOMBRES_DIAS.map((nombre, i) => {
          const sesionDia = semana.sesiones.find((s) => s.dia === i && s.rutinaId === semana.rutinaId);
          const clases = [
            'dia-btn',
            i === seleccionado ? 'activo' : '',
            i === indiceDia(hoy) ? 'es-hoy' : '',
            completo(rutina?.dias[i], sesionDia) ? 'hecho' : '',
          ].join(' ');
          return `<button type="button" class="${clases}" data-dia="${i}" aria-label="${nombre}"
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

function renderLista(dia: DiaCompleto | undefined, sesion: Sesion | undefined, series: Serie[]): string {
  if (!dia) {
    return `${vacio('No hay rutina activa', 'Elegí o creá una rutina en Ajustes → Rutinas.')}
      <div class="centrado"><a class="btn-accion" href="#/rutinas">${icono('settings')}<span>Ir a Rutinas</span></a></div>`;
  }
  if (esDescanso(dia)) {
    return `
      <div class="descanso">
        ${icono('bed')}
        <h2>Descanso activo</h2>
        <p>${TEXTO_DESCANSO}</p>
      </div>`;
  }
  if (!dia.ejercicios.length) {
    return `${vacio('Este día no tiene ejercicios', 'Agregalos desde el editor del día.')}
      <div class="centrado"><a class="btn-accion" href="#/dia/${encodeURIComponent(dia.dia.id)}">${icono('plus')}<span>Agregar ejercicios</span></a></div>`;
  }

  const filas = dia.ejercicios
    .map(({ item, ejercicio }) => {
      const hecho = sesion?.completados.includes(ejercicio.id) ?? false;
      const cargadas = series.filter((s) => s.ejercicioId === ejercicio.id).length;
      const progreso =
        cargadas > 0 && !hecho ? `<span class="progreso-series">${cargadas}/${item.series} series</span>` : '';
      const tecnica = hecho ? insigniaTecnica(sesion?.tecnica[ejercicio.id]) : '';
      return `
        <li class="fila fila--deslizable ${resaltado === ejercicio.id ? 'fila--resaltada' : ''}">
          <div class="fila-fondo" aria-hidden="true">${icono('dumbbell')} Cargar serie</div>
          <div class="ejercicio ${hecho ? 'hecho' : ''}" data-id="${escapar(ejercicio.id)}">
            <button type="button" class="ejercicio-principal" data-accion="abrir"
                    aria-label="${escapar(ejercicio.nombre)}: cargar serie">
              <span class="ejercicio-nombre">${escapar(ejercicio.nombre)}</span>
              <span class="ejercicio-detalle">
                <span class="series">${escapar(objetivo(item))}</span>
                ${progreso}${tecnica}
              </span>
              ${item.notas ? `<span class="nota nota--tarjeta" lang="es">${escapar(item.notas)}</span>` : ''}
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

  const [rutina, semana] = await Promise.all([ctx.rutinas.activaCompleta(), ctx.entrenamiento.semana(hoy)]);
  rutinaActual = rutina;
  const sesion = ctx.entrenamiento.sesionDelDia(semana, seleccionado);
  const series = sesion ? await ctx.repos.series.obtenerPorSesion(sesion.id) : [];
  const dia = rutina?.dias[seleccionado];
  const preguntarAnimo =
    !esDescanso(dia) &&
    !!dia?.ejercicios.length &&
    !esDescanso(rutina?.dias[indiceDia(hoy)]) &&
    !ctx.entrenamiento.animoDeHoy(semana, hoy);

  contenedor.innerHTML = `
    ${renderCabecera(rutina, semana, sesion, hoy)}
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
  const encontrado = rutinaActual?.dias[seleccionado]?.ejercicios.find((e) => e.ejercicio.id === ejercicioId);
  if (!encontrado) return;
  const { item, ejercicio } = encontrado;
  abrirModalSerie({
    ctx,
    dia: seleccionado,
    ejercicio: { id: ejercicio.id, nombre: ejercicio.nombre, series: item.series, reps: item.reps, notas: item.notas },
    alCerrar: (cambios) => {
      if (cambios) {
        resaltado = ejercicio.id;
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
