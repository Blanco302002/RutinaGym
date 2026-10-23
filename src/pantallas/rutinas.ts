// Gestión de rutinas (desde Ajustes → Rutinas): lista, editor de rutina,
// editor de día, agregar ejercicio y formulario de ejercicio.
// En estas pantallas no se desliza entre pantallas principales (ver main.ts).

import type { Ejercicio, EjercicioEnRutina, TipoDia } from '../datos';
import {
  LIMITES,
  NOMBRES_DIAS,
  objetivo,
  type DatosEjercicio,
  type ErroresEjercicio,
} from '../dominio/rutinas';
import { escapar, normalizar, plural } from '../util/formato';
import { cabecera, vacio } from '../ui/componentes';
import type { Contexto, Pantalla } from '../ui/contexto';
import { confirmar } from '../ui/dialogo';
import { icono } from '../ui/iconos';
import { hash, navegar, volver, volverA, type Ruta } from '../ui/router';
import { crearStepper } from '../ui/stepper';

type RutaDe<P extends Ruta['pantalla']> = Extract<Ruta, { pantalla: P }>;

/** Conecta el botón "← Atrás" de la cabecera. */
function alVolver(contenedor: HTMLElement, alternativa: string): void {
  contenedor.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('[data-accion="volver"]')) volver(alternativa);
  });
}

function noEncontrado(contenedor: HTMLElement, titulo: string, alternativa: string): void {
  contenedor.innerHTML = `${cabecera({ titulo, atras: true })}
    <main class="container contenido">${vacio('No encontrado', 'Puede que se haya eliminado.')}</main>`;
  alVolver(contenedor, alternativa);
}

function error(texto?: string): string {
  return texto ? `<p class="campo-error" role="alert">${escapar(texto)}</p>` : '';
}

// ── Lista de rutinas ─────────────────────────────────────────

export const pantallaRutinas: Pantalla<RutaDe<'rutinas'>> = async (contenedor, ctx) => {
  const rutinas = await ctx.rutinas.listar();
  const completas = await Promise.all(rutinas.map((r) => ctx.rutinas.completa(r.id)));

  const filas = completas
    .map((c) => {
      if (!c) return '';
      const entrenamientos = c.dias.filter((d) => d.dia.tipo === 'entrenamiento').length;
      return `
        <li>
          <a class="fila-link" href="${hash('rutina', c.rutina.id)}">
            <span class="fila-link-texto">
              <span class="fila-link-titulo">${escapar(c.rutina.nombre)}</span>
              <span class="fila-link-sub">${plural(entrenamientos, 'día', 'días')} de entrenamiento</span>
            </span>
            ${c.rutina.activa ? '<span class="insignia-activa">Activa</span>' : ''}
            ${icono('chevronRight', 'fila-link-flecha')}
          </a>
        </li>`;
    })
    .join('');

  contenedor.innerHTML = `
    ${cabecera({ titulo: 'Rutinas', atras: true })}
    <main class="container contenido">
      <ul class="lista">${filas}</ul>
      <div class="nueva-rutina">
        <button type="button" class="btn-accion btn-accion--ancho" data-accion="nueva" aria-expanded="false">
          ${icono('plus')}<span>Nueva rutina</span>
        </button>
        <div class="nueva-opciones" hidden>
          <button type="button" class="btn-opcion" data-accion="cero">
            ${icono('plus')}<span><strong>Empezar de cero</strong><small>Los 7 días en descanso, para armarla a tu gusto.</small></span>
          </button>
          <button type="button" class="btn-opcion" data-accion="duplicar">
            ${icono('history')}<span><strong>Duplicar una existente</strong><small>Copia días y ejercicios.</small></span>
          </button>
          <div class="duplicar-lista" hidden>
            <p class="seccion-titulo">¿Cuál querés duplicar?</p>
            ${rutinas
              .map(
                (r) =>
                  `<button type="button" class="btn-opcion btn-opcion--simple" data-duplicar="${escapar(r.id)}">${escapar(r.nombre)}</button>`,
              )
              .join('')}
          </div>
        </div>
      </div>
    </main>`;

  alVolver(contenedor, '#/ajustes');
  contenedor.addEventListener('click', async (e) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-accion], [data-duplicar]');
    if (!el) return;
    if (el.dataset.accion === 'nueva') {
      const opciones = contenedor.querySelector<HTMLElement>('.nueva-opciones')!;
      opciones.hidden = !opciones.hidden;
      el.setAttribute('aria-expanded', String(!opciones.hidden));
    } else if (el.dataset.accion === 'cero') {
      const nueva = await ctx.rutinas.crearDesdeCero('Nueva rutina');
      ctx.cambiaronDatos();
      navegar(hash('rutina', nueva.id));
    } else if (el.dataset.accion === 'duplicar') {
      if (rutinas.length === 1) {
        const copia = await ctx.rutinas.duplicar(rutinas[0].id);
        ctx.cambiaronDatos();
        navegar(hash('rutina', copia.id));
      } else {
        contenedor.querySelector<HTMLElement>('.duplicar-lista')!.hidden = false;
      }
    } else if (el.dataset.duplicar) {
      const copia = await ctx.rutinas.duplicar(el.dataset.duplicar);
      ctx.cambiaronDatos();
      navegar(hash('rutina', copia.id));
    }
  });
};

// ── Editor de rutina ─────────────────────────────────────────

let mensajeRutina: string | undefined;

export const pantallaEditorRutina: Pantalla<RutaDe<'rutina'>> = async (contenedor, ctx, ruta) => {
  const [completa, todas] = await Promise.all([ctx.rutinas.completa(ruta.id), ctx.rutinas.listar()]);
  if (!completa) return noEncontrado(contenedor, 'Rutina', '#/rutinas');
  const { rutina, dias } = completa;
  const motivoNoBorrar =
    todas.length === 1
      ? 'Es la única rutina: no se puede eliminar.'
      : rutina.activa
        ? 'Es la rutina activa: activá otra para poder eliminarla.'
        : '';

  const filasDias = dias
    .map(({ dia, ejercicios }) => {
      const detalle =
        dia.tipo === 'descanso'
          ? 'Descanso'
          : `${escapar(dia.nombre)} · ${plural(ejercicios.length, 'ejercicio')}`;
      return `
        <li>
          <a class="fila-link" href="${hash('dia', dia.id)}">
            <span class="fila-link-letra" aria-hidden="true">${NOMBRES_DIAS[dia.dia][0]}</span>
            <span class="fila-link-texto">
              <span class="fila-link-titulo">${NOMBRES_DIAS[dia.dia]}</span>
              <span class="fila-link-sub ${dia.tipo === 'descanso' ? 'fila-link-sub--descanso' : ''}">${detalle}</span>
            </span>
            ${icono('chevronRight', 'fila-link-flecha')}
          </a>
        </li>`;
    })
    .join('');

  contenedor.innerHTML = `
    ${cabecera({ titulo: rutina.nombre, atras: true, subtitulo: rutina.activa ? 'Rutina activa' : 'Rutina' })}
    <main class="container contenido">
      <label class="campo">
        <span class="campo-etiqueta">Nombre</span>
        <input class="campo-input" type="text" data-campo="nombre" maxlength="${LIMITES.nombre}"
               value="${escapar(rutina.nombre)}" autocomplete="off" enterkeyhint="done">
        ${error(mensajeRutina)}
      </label>

      <h2 class="seccion-titulo">Días</h2>
      <ul class="lista">${filasDias}</ul>

      <div class="acciones-pie">
        ${
          rutina.activa
            ? `<p class="aviso-ok">${icono('check')}<span>Esta es la rutina que ves en la pantalla Rutina.</span></p>`
            : `<button type="button" class="btn-principal" data-accion="usar">${icono('check')}<span>Usar esta rutina</span></button>`
        }
        <button type="button" class="btn-peligro" data-accion="eliminar" ${motivoNoBorrar ? 'disabled' : ''}>
          ${icono('trash')}<span>Eliminar rutina</span>
        </button>
        ${motivoNoBorrar ? `<p class="campo-ayuda">${motivoNoBorrar}</p>` : ''}
      </div>
    </main>`;
  mensajeRutina = undefined;

  alVolver(contenedor, '#/rutinas');

  const nombre = contenedor.querySelector<HTMLInputElement>('[data-campo="nombre"]')!;
  nombre.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') nombre.blur();
  });
  nombre.addEventListener('change', async () => {
    mensajeRutina = await ctx.rutinas.renombrar(rutina.id, nombre.value);
    ctx.refrescar();
  });

  contenedor.addEventListener('click', async (e) => {
    const accion = (e.target as HTMLElement).closest<HTMLElement>('[data-accion]')?.dataset.accion;
    if (accion === 'usar') {
      await ctx.rutinas.activar(rutina.id);
      ctx.refrescar();
    } else if (accion === 'eliminar') {
      const ok = await confirmar({
        titulo: `¿Eliminar "${rutina.nombre}"?`,
        mensaje: 'Se borran sus días y ejercicios. Tu historial de entrenamientos no se toca.',
        confirmar: 'Eliminar',
        peligro: true,
      });
      if (!ok) return;
      const problema = await ctx.rutinas.eliminar(rutina.id);
      if (problema) {
        mensajeRutina = problema;
        ctx.refrescar();
        return;
      }
      ctx.cambiaronDatos();
      volverA('#/rutinas');
    }
  });
};

// ── Editor de día ────────────────────────────────────────────

let mensajeDia: string | undefined;

function filaItem(item: EjercicioEnRutina, ejercicio: Ejercicio, i: number, total: number): string {
  return `
    <li class="item-editable" data-item="${escapar(item.id)}">
      <a class="item-abrir" href="${hash('item', item.id)}">
        <span class="fila-link-titulo">${escapar(ejercicio.nombre)}</span>
        <span class="fila-link-sub">${escapar(objetivo(item))}</span>
      </a>
      <div class="item-flechas">
        <button type="button" class="btn-flecha" data-mover="-1" aria-label="Subir ${escapar(ejercicio.nombre)}"
                ${i === 0 ? 'hidden' : ''}>${icono('arrowUp')}</button>
        <button type="button" class="btn-flecha" data-mover="1" aria-label="Bajar ${escapar(ejercicio.nombre)}"
                ${i === total - 1 ? 'hidden' : ''}>${icono('arrowDown')}</button>
      </div>
    </li>`;
}

/** Muestra u oculta las flechas según la posición (sin ↑ en el primero ni ↓ en el último). */
function actualizarFlechas(lista: HTMLElement): void {
  const filas = [...lista.querySelectorAll<HTMLElement>('[data-item]')];
  filas.forEach((fila, i) => {
    fila.querySelector<HTMLButtonElement>('[data-mover="-1"]')!.hidden = i === 0;
    fila.querySelector<HTMLButtonElement>('[data-mover="1"]')!.hidden = i === filas.length - 1;
  });
}

/** Intercambia dos filas con una animación simple (FLIP: se mueven desde donde estaban). */
function intercambiar(lista: HTMLElement, fila: HTMLElement, delta: number): void {
  const otra = (delta < 0 ? fila.previousElementSibling : fila.nextElementSibling) as HTMLElement | null;
  if (!otra) return;
  const antes = new Map([fila, otra].map((el) => [el, el.getBoundingClientRect().top]));
  if (delta < 0) lista.insertBefore(fila, otra);
  else lista.insertBefore(otra, fila);
  for (const [el, top] of antes) {
    const dy = top - el.getBoundingClientRect().top;
    el.animate([{ transform: `translateY(${dy}px)` }, { transform: 'translateY(0)' }], {
      duration: 200,
      easing: 'ease-out',
    });
  }
  actualizarFlechas(lista);
}

export const pantallaEditorDia: Pantalla<RutaDe<'dia'>> = async (contenedor, ctx, ruta) => {
  const dia = await ctx.repos.dias.obtener(ruta.id);
  const completa = dia && (await ctx.rutinas.completa(dia.rutinaId));
  const delDia = completa?.dias.find((d) => d.dia.id === ruta.id);
  if (!dia || !completa || !delDia) return noEncontrado(contenedor, 'Día', '#/rutinas');
  const entrenamiento = dia.tipo === 'entrenamiento';
  const { ejercicios } = delDia;

  const tipos: [TipoDia, string][] = [
    ['entrenamiento', 'Entrenamiento'],
    ['descanso', 'Descanso'],
  ];

  contenedor.innerHTML = `
    ${cabecera({ titulo: NOMBRES_DIAS[dia.dia], atras: true, subtitulo: escapar(completa.rutina.nombre) })}
    <main class="container contenido">
      <div class="segmentado segmentado--dos" role="radiogroup" aria-label="Tipo de día">
        ${tipos
          .map(
            ([valor, texto]) => `
          <button type="button" role="radio" class="segmento ${dia.tipo === valor ? 'activo' : ''}"
                  aria-checked="${dia.tipo === valor}" data-tipo="${valor}">
            ${icono(valor === 'entrenamiento' ? 'dumbbell' : 'bed')}<span>${texto}</span></button>`,
          )
          .join('')}
      </div>

      ${
        entrenamiento
          ? `
        <label class="campo">
          <span class="campo-etiqueta">Nombre del día</span>
          <input class="campo-input" type="text" data-campo="nombre" maxlength="${LIMITES.nombre}"
                 value="${escapar(dia.nombre)}" placeholder="Ej. Pecho + tríceps" autocomplete="off" enterkeyhint="done">
          ${error(mensajeDia)}
        </label>

        <h2 class="seccion-titulo">Ejercicios</h2>
        ${
          ejercicios.length
            ? `<ul class="lista lista-editable">${ejercicios
                .map(({ item, ejercicio }, i) => filaItem(item, ejercicio, i, ejercicios.length))
                .join('')}</ul>`
            : vacio('Sin ejercicios', 'Agregá el primero.')
        }
        <a class="btn-accion btn-accion--ancho" href="${hash('agregar', dia.id)}">${icono('plus')}<span>Agregar ejercicio</span></a>`
          : `<div class="descanso descanso--chico">${icono('bed')}<p>Este día es de descanso.${
              ejercicios.length
                ? ` Sus ${plural(ejercicios.length, 'ejercicio')} quedan guardados por si lo volvés a entrenamiento.`
                : ''
            }</p></div>`
      }
    </main>`;
  mensajeDia = undefined;

  alVolver(contenedor, hash('rutina', dia.rutinaId));

  const nombre = contenedor.querySelector<HTMLInputElement>('[data-campo="nombre"]');
  nombre?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') nombre.blur();
  });
  nombre?.addEventListener('change', async () => {
    mensajeDia = await ctx.rutinas.guardarDia(dia.id, { tipo: dia.tipo, nombre: nombre.value });
    ctx.refrescar();
  });

  contenedor.addEventListener('click', async (e) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-tipo], [data-mover]');
    if (!el) return;
    if (el.dataset.tipo && el.dataset.tipo !== dia.tipo) {
      const tipo = el.dataset.tipo as TipoDia;
      // De descanso a entrenamiento hace falta un nombre: se arranca con uno genérico.
      const nombreDia = tipo === 'entrenamiento' && dia.tipo === 'descanso' ? 'Entrenamiento' : dia.nombre;
      mensajeDia = await ctx.rutinas.guardarDia(dia.id, { tipo, nombre: nombreDia });
      ctx.refrescar();
    } else if (el.dataset.mover) {
      const fila = el.closest<HTMLElement>('[data-item]')!;
      const delta = Number(el.dataset.mover) as -1 | 1;
      if (await ctx.rutinas.mover(fila.dataset.item!, delta)) {
        intercambiar(fila.parentElement!, fila, delta);
        ctx.cambiaronDatos(); // la pantalla Rutina, en segundo plano
      }
    }
  });
};

// ── Agregar ejercicio ────────────────────────────────────────

let busquedaAgregar = '';

export const pantallaAgregarEjercicio: Pantalla<RutaDe<'agregar'>> = async (contenedor, ctx, ruta) => {
  const dia = await ctx.repos.dias.obtener(ruta.diaId);
  if (!dia) return noEncontrado(contenedor, 'Agregar ejercicio', '#/rutinas');
  const [ejercicios, delDia] = await Promise.all([
    ctx.repos.ejercicios.listar(),
    ctx.repos.ejerciciosEnRutina.listarPorDia(dia.id),
  ]);
  const yaEstan = new Set(delDia.map((i) => i.ejercicioId));
  ejercicios.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

  function resultados(): string {
    const q = busquedaAgregar.trim();
    const nq = normalizar(q);
    const filtrados = ejercicios.filter((e) => !nq || normalizar(e.nombre).includes(nq));
    const exacto = ejercicios.some((e) => normalizar(e.nombre) === nq);
    const crear =
      q && !exacto
        ? `<button type="button" class="btn-opcion btn-opcion--crear" data-crear>
             ${icono('plus')}<span><strong>Crear ejercicio nuevo</strong><small>"${escapar(q)}"</small></span>
           </button>`
        : '';
    const filas = filtrados
      .map(
        (e) => `
        <li>
          <button type="button" class="fila-link fila-link--boton" data-elegir="${escapar(e.id)}">
            <span class="fila-link-texto">
              <span class="fila-link-titulo">${escapar(e.nombre)}</span>
              ${yaEstan.has(e.id) ? '<span class="fila-link-sub">Ya está en este día</span>' : ''}
            </span>
            ${icono('plus', 'fila-link-flecha')}
          </button>
        </li>`,
      )
      .join('');
    return `${crear}${
      filas
        ? `<ul class="lista">${filas}</ul>`
        : q
          ? ''
          : vacio('Todavía no hay ejercicios', 'Escribí el nombre para crear el primero.')
    }`;
  }

  contenedor.innerHTML = `
    ${cabecera({ titulo: 'Agregar ejercicio', atras: true, subtitulo: `${NOMBRES_DIAS[dia.dia]} · ${escapar(dia.nombre)}` })}
    <main class="container contenido">
      <p class="campo-ayuda">Elegí uno que ya existe para que su historial se conecte solo, o creá uno nuevo.</p>
      <label class="buscador">
        ${icono('search')}
        <input type="search" placeholder="Buscar o escribir un nombre" value="${escapar(busquedaAgregar)}"
               aria-label="Buscar ejercicio" autocomplete="off" enterkeyhint="search" maxlength="${LIMITES.nombre}">
      </label>
      <div class="resultados">${resultados()}</div>
    </main>`;

  alVolver(contenedor, hash('dia', dia.id));
  const input = contenedor.querySelector<HTMLInputElement>('.buscador input')!;
  input.addEventListener('input', () => {
    busquedaAgregar = input.value;
    contenedor.querySelector('.resultados')!.innerHTML = resultados();
  });
  contenedor.addEventListener('click', (e) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-elegir], [data-crear]');
    if (!el) return;
    const destino = el.dataset.elegir
      ? hash('nuevo', dia.id, 'e', el.dataset.elegir)
      : hash('nuevo', dia.id, 'n', busquedaAgregar.trim());
    busquedaAgregar = '';
    navegar(destino);
  });
};

// ── Formulario de ejercicio ──────────────────────────────────

type ModoFormulario =
  | { modo: 'editar'; item: EjercicioEnRutina; ejercicio: Ejercicio; volverA: string }
  | { modo: 'nuevo'; diaId: string; ejercicio?: Ejercicio; nombre: string; base?: EjercicioEnRutina }
  | { modo: 'soloNombre'; ejercicio: Ejercicio };

async function resolverModo(ctx: Contexto, ruta: Ruta): Promise<ModoFormulario | undefined> {
  if (ruta.pantalla === 'item') {
    const item = await ctx.repos.ejerciciosEnRutina.obtener(ruta.id);
    const ejercicio = item && (await ctx.repos.ejercicios.obtener(item.ejercicioId));
    return item && ejercicio ? { modo: 'editar', item, ejercicio, volverA: hash('dia', item.diaId) } : undefined;
  }
  if (ruta.pantalla === 'nuevo') {
    const ejercicio = ruta.ejercicioId ? await ctx.repos.ejercicios.obtener(ruta.ejercicioId) : undefined;
    // Si ya está en alguna rutina, se proponen las mismas series, reps y notas.
    const usos = ejercicio ? await ctx.repos.ejerciciosEnRutina.listarPorEjercicio(ejercicio.id) : [];
    return { modo: 'nuevo', diaId: ruta.diaId, ejercicio, nombre: ejercicio?.nombre ?? ruta.nombre ?? '', base: usos[0] };
  }
  if (ruta.pantalla === 'editarEjercicio') {
    const ejercicio = await ctx.repos.ejercicios.obtener(ruta.id);
    if (!ejercicio) return undefined;
    const activa = await ctx.rutinas.activa();
    const usos = (await ctx.repos.ejerciciosEnRutina.listarPorEjercicio(ejercicio.id)).filter(
      (i) => i.rutinaId === activa?.id,
    );
    const item = usos.sort((a, b) => a.diaId.localeCompare(b.diaId) || a.orden - b.orden)[0];
    return item
      ? { modo: 'editar', item, ejercicio, volverA: hash('ejercicio', ejercicio.id) }
      : { modo: 'soloNombre', ejercicio };
  }
  return undefined;
}

export const pantallaFormEjercicio: Pantalla = async (contenedor, ctx, ruta) => {
  const m = await resolverModo(ctx, ruta);
  const atrasPorDefecto = ruta.pantalla === 'editarEjercicio' ? hash('ejercicio', ruta.id) : '#/rutinas';
  if (!m) return noEncontrado(contenedor, 'Ejercicio', atrasPorDefecto);

  const atras =
    m.modo === 'editar' ? m.volverA : m.modo === 'nuevo' ? hash('agregar', m.diaId) : hash('ejercicio', m.ejercicio.id);
  const nombreOriginal = m.modo === 'nuevo' ? (m.ejercicio?.nombre ?? '') : m.ejercicio.nombre;
  const base = m.modo === 'editar' ? m.item : m.modo === 'nuevo' ? m.base : undefined;
  const nombreInicial = m.modo === 'nuevo' ? m.nombre : m.ejercicio.nombre;
  const titulo = m.modo === 'nuevo' ? 'Nuevo ejercicio' : 'Editar ejercicio';
  const existe = m.modo !== 'nuevo' || !!m.ejercicio;

  contenedor.innerHTML = `
    ${cabecera({ titulo, atras: true })}
    <main class="container contenido formulario">
      ${
        m.modo === 'soloNombre'
          ? `<p class="aviso">${icono('pencil')}<span>Este ejercicio no está en la rutina activa: solo podés cambiarle el nombre.</span></p>`
          : ''
      }
      <label class="campo">
        <span class="campo-etiqueta">Nombre</span>
        <input class="campo-input" type="text" data-campo="nombre" maxlength="${LIMITES.nombre}"
               value="${escapar(nombreInicial)}" autocomplete="off" enterkeyhint="next">
        <p class="campo-ayuda campo-ayuda--aviso" data-aviso-nombre hidden>
          El nombre cambia en todas las rutinas y en el historial.</p>
        <span data-error="nombre"></span>
      </label>

      ${
        m.modo === 'soloNombre'
          ? ''
          : `
        <div class="campo" data-campo-series>
          <span data-error="series"></span>
        </div>
        <label class="campo">
          <span class="campo-etiqueta">Repeticiones</span>
          <input class="campo-input" type="text" data-campo="reps" maxlength="${LIMITES.reps}"
                 value="${escapar(base?.reps ?? '8-12')}" placeholder="Ej. 6-10, al fallo" autocomplete="off" enterkeyhint="next">
          <span data-error="reps"></span>
        </label>
        <label class="campo">
          <span class="campo-etiqueta campo-etiqueta--con-contador">Notas
            <span class="contador" data-contador>0/${LIMITES.notas}</span></span>
          <textarea class="campo-input campo-textarea" data-campo="notas" maxlength="${LIMITES.notas}" rows="3"
                    placeholder="Opcional. Ej. Subí la pelvis al final.">${escapar(base?.notas ?? '')}</textarea>
          <span data-error="notas"></span>
        </label>`
      }

      <div class="acciones-pie">
        <button type="button" class="btn-principal" data-accion="guardar">${icono('check')}<span>Guardar</span></button>
        ${
          m.modo === 'editar'
            ? `<button type="button" class="btn-peligro" data-accion="eliminar">${icono('trash')}<span>Eliminar</span></button>
               <p class="campo-ayuda">Eliminar lo saca de este día de la rutina. Si tiene series registradas, su historial se conserva.</p>`
            : ''
        }
      </div>
    </main>`;

  alVolver(contenedor, atras);

  const campo = <T extends HTMLElement>(nombre: string) => contenedor.querySelector<T>(`[data-campo="${nombre}"]`);
  const inputNombre = campo<HTMLInputElement>('nombre')!;
  const inputReps = campo<HTMLInputElement>('reps');
  const inputNotas = campo<HTMLTextAreaElement>('notas');
  const stepperSeries =
    m.modo === 'soloNombre'
      ? undefined
      : crearStepper({
          etiqueta: 'Series',
          valor: base?.series ?? 3,
          paso: 1,
          min: LIMITES.seriesMin,
          max: LIMITES.seriesMax,
          teclado: 'numeric',
        });
  if (stepperSeries) contenedor.querySelector('[data-campo-series]')!.prepend(stepperSeries.elemento);

  // Aviso al cambiar el nombre de un ejercicio que ya existe.
  const aviso = contenedor.querySelector<HTMLElement>('[data-aviso-nombre]')!;
  inputNombre.addEventListener('input', () => {
    aviso.hidden = !existe || inputNombre.value.trim() === nombreOriginal;
  });

  const contador = contenedor.querySelector<HTMLElement>('[data-contador]');
  const contar = () => {
    if (contador && inputNotas) contador.textContent = `${inputNotas.value.length}/${LIMITES.notas}`;
  };
  inputNotas?.addEventListener('input', contar);
  contar();

  function mostrarErrores(errores: ErroresEjercicio): void {
    for (const el of contenedor.querySelectorAll<HTMLElement>('[data-error]')) {
      el.innerHTML = error(errores[el.dataset.error as keyof ErroresEjercicio]);
    }
    contenedor.querySelector('.campo-error')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  contenedor.addEventListener('click', async (e) => {
    const accion = (e.target as HTMLElement).closest<HTMLElement>('[data-accion]')?.dataset.accion;
    if (accion === 'guardar') {
      const datos: DatosEjercicio = {
        nombre: inputNombre.value,
        series: stepperSeries?.valor() ?? 1,
        reps: inputReps?.value ?? '',
        notas: inputNotas?.value ?? '',
      };
      if (m.modo === 'soloNombre') {
        const problema = await ctx.rutinas.renombrarEjercicio(m.ejercicio.id, datos.nombre);
        if (problema) return mostrarErrores({ nombre: problema });
        ctx.cambiaronDatos();
        volver(atras);
      } else if (m.modo === 'editar') {
        const errores = await ctx.rutinas.actualizarEjercicio(m.item.id, datos);
        if (Object.keys(errores).length) return mostrarErrores(errores);
        ctx.cambiaronDatos();
        volver(atras);
      } else {
        const { errores } = await ctx.rutinas.agregarEjercicio(m.diaId, { ...datos, ejercicioId: m.ejercicio?.id });
        if (Object.keys(errores).length) return mostrarErrores(errores);
        ctx.cambiaronDatos();
        volverA(hash('dia', m.diaId)); // saltea el buscador
      }
    } else if (accion === 'eliminar' && m.modo === 'editar') {
      const ok = await confirmar({
        titulo: `¿Sacar "${m.ejercicio.nombre}" de la rutina?`,
        mensaje: 'Se saca de este día. Si tiene series registradas, se conserva con todo su historial.',
        confirmar: 'Eliminar',
        peligro: true,
      });
      if (!ok) return;
      await ctx.rutinas.quitarEjercicio(m.item.id);
      ctx.cambiaronDatos();
      // Desde el editor del día vuelve al día; desde Historial, a la evolución.
      if (m.volverA.startsWith('#/dia')) volverA(m.volverA);
      else volver(atras);
    }
  });
};
