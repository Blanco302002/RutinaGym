// Modal a pantalla completa para cargar una serie de un ejercicio.

import type { Serie, Tecnica } from '../datos';
import type { EstadoDeCarga } from '../dominio/entrenamiento';
import { precarga, resumenEjercicio } from '../dominio/estadisticas';
import { objetivo, repsMinimas } from '../dominio/rutinas';
import { fechaCorta } from '../util/fechas';
import { escapar, numero } from '../util/formato';
import { NOMBRE_TECNICA } from './componentes';
import type { Contexto } from './contexto';
import { confirmar } from './dialogo';
import { icono } from './iconos';
import { crearStepper, type Stepper } from './stepper';

/** El ejercicio tal como está en la rutina activa. */
export interface EjercicioParaCargar {
  id: string;
  nombre: string;
  series: number;
  reps: string;
  notas: string;
}

export interface OpcionesModal {
  ctx: Contexto;
  dia: number;
  ejercicio: EjercicioParaCargar;
  /** Se llama al cerrar. `cambios`: si se guardó algo. */
  alCerrar(cambios: boolean): void;
  /** Tocar el nombre: ir a la evolución del ejercicio. */
  alVerEvolucion(ejercicioId: string): void;
}

const PASO_PESO = 2.5;

function serieCorta(s: Pick<Serie, 'peso' | 'reps'>): string {
  return `${numero(s.peso)}×${s.reps}`;
}

export function abrirModalSerie(op: OpcionesModal): void {
  const { ctx, dia, ejercicio } = op;
  const total = ejercicio.series;

  const modal = document.createElement('div');
  modal.className = 'modal-serie';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-label', `Cargar serie: ${ejercicio.nombre}`);
  document.body.append(modal);
  document.body.classList.add('modal-abierto');

  let cambios = false;
  let stepperPeso: Stepper | undefined;
  let stepperReps: Stepper | undefined;
  let sesionId: string | undefined;

  function cerrar(): void {
    modal.classList.add('modal-serie--saliendo');
    document.body.classList.remove('modal-abierto');
    window.setTimeout(() => modal.remove(), 180);
    op.alCerrar(cambios);
  }

  async function cargar(): Promise<void> {
    const estado = await ctx.entrenamiento.estadoDeCarga(dia, ejercicio.id);
    sesionId = estado.sesionId;
    // Ya cargó todas las series pero no calificó: directo a la técnica.
    if (!estado.completado && estado.deHoy.length >= total) {
      dibujarTecnica();
      return;
    }
    dibujarCarga(estado);
  }

  function encabezado(): string {
    return `
      <div class="modal-barra">
        <button type="button" class="btn-redondo" data-accion="cerrar" aria-label="Cerrar">${icono('x')}</button>
      </div>
      <button type="button" class="modal-titulo" data-accion="evolucion">
        <span>${escapar(ejercicio.nombre)}</span>
        <span class="modal-titulo-link">Ver evolución ${icono('arrowRight')}</span>
      </button>
      <p class="modal-objetivo"><span class="series">${escapar(objetivo(ejercicio))}</span>
        ${ejercicio.notas ? `<span class="nota">${escapar(ejercicio.notas)}</span>` : ''}</p>`;
  }

  function dibujarCarga({ historial, deHoy, completado, numero: numeroSerie }: EstadoDeCarga): void {
    const resumen = resumenEjercicio(historial, sesionId);
    const valores = precarga(historial, sesionId, numeroSerie, repsMinimas(ejercicio.reps) ?? 10);
    const extra = numeroSerie > total;

    const ultimaVez = resumen.ultimaVez
      ? `<div class="dato dato--ancho">
           <span class="dato-etiqueta">Última vez · ${fechaCorta(resumen.ultimaVez.fecha)}</span>
           <span class="chips">${resumen.ultimaVez.series
             .map((s) => `<span class="chip"><small>${s.numero}</small>${serieCorta(s)}</span>`)
             .join('')}</span>
         </div>`
      : `<div class="dato dato--ancho"><span class="dato-etiqueta">Última vez</span>
           <span class="dato-valor dato-valor--tenue">Primera vez que lo cargás</span></div>`;

    modal.innerHTML = `
      <div class="modal-contenido container">
        ${encabezado()}
        <section class="datos" aria-label="Referencias">
          <div class="dato">
            <span class="dato-etiqueta">Inicial</span>
            <span class="dato-valor">${resumen.inicial ? `${numero(resumen.inicial.serie.peso)} kg` : '—'}</span>
          </div>
          <div class="dato">
            <span class="dato-etiqueta">Máximo</span>
            <span class="dato-valor">${
              resumen.maximo ? `${numero(resumen.maximo.peso)} kg <small>×${resumen.maximo.reps}</small>` : '—'
            }</span>
          </div>
          ${ultimaVez}
        </section>

        <div class="serie-actual">
          <span class="serie-actual-numero">${extra ? `Serie extra ${numeroSerie}` : `Serie ${numeroSerie} <small>de ${total}</small>`}</span>
          ${
            deHoy.length
              ? `<span class="serie-actual-hoy">Hoy: ${deHoy.map(serieCorta).join(' · ')}
                   <button type="button" class="btn-texto" data-accion="borrar">${icono('trash')} Borrar última</button></span>`
              : ''
          }
        </div>

        <div class="steppers"></div>
      </div>
      <div class="modal-pie container">
        <button type="button" class="btn-principal" data-accion="guardar">${icono('check')} Guardar serie ${numeroSerie}</button>
        ${
          deHoy.length && !completado
            ? '<button type="button" class="btn-secundario" data-accion="terminar">Terminar ejercicio</button>'
            : ''
        }
      </div>`;

    stepperPeso = crearStepper({
      etiqueta: 'Peso',
      valor: valores.peso,
      paso: PASO_PESO,
      sufijo: 'kg',
      max: 999,
      teclado: 'decimal',
    });
    stepperReps = crearStepper({ etiqueta: 'Repeticiones', valor: valores.reps, paso: 1, min: 1, max: 999, teclado: 'numeric' });
    modal.querySelector('.steppers')!.append(stepperPeso.elemento, stepperReps.elemento);
  }

  function dibujarTecnica(): void {
    const opciones: [Tecnica, string][] = [
      ['bien', 'check'],
      ['dudosa', 'minus'],
      ['mala', 'x'],
    ];
    modal.innerHTML = `
      <div class="modal-contenido container">
        ${encabezado()}
        <div class="tecnica-pregunta">
          <h2>¿Cómo estuvo la técnica?</h2>
          <div class="tecnica-opciones">
            ${opciones
              .map(
                ([valor, ic]) => `
              <button type="button" class="btn-tecnica btn-tecnica--${valor}" data-tecnica="${valor}">
                ${icono(ic as 'check' | 'minus' | 'x')}<span>${NOMBRE_TECNICA[valor]}</span>
              </button>`,
              )
              .join('')}
          </div>
        </div>
      </div>`;
  }

  modal.addEventListener('click', async (e) => {
    const objetivoClick = (e.target as HTMLElement).closest<HTMLElement>('[data-accion], [data-tecnica]');
    if (!objetivoClick) return;
    const accion = objetivoClick.dataset.accion;

    if (accion === 'cerrar') {
      cerrar();
    } else if (accion === 'evolucion') {
      cerrar();
      op.alVerEvolucion(ejercicio.id);
    } else if (accion === 'guardar' && stepperPeso && stepperReps) {
      (objetivoClick as HTMLButtonElement).disabled = true;
      const { sesion, cantidad } = await ctx.entrenamiento.guardarSerie(
        dia,
        ejercicio.id,
        stepperPeso.valor(),
        stepperReps.valor(),
      );
      cambios = true;
      sesionId = sesion.id;
      // Última serie: calificar técnica antes de cerrar.
      if (cantidad === total && !sesion.completados.includes(ejercicio.id)) dibujarTecnica();
      else cerrar();
    } else if (accion === 'terminar') {
      dibujarTecnica();
    } else if (accion === 'borrar' && sesionId) {
      const ok = await confirmar({
        titulo: '¿Borrar la última serie?',
        mensaje: 'Se borra la última serie que cargaste hoy en este ejercicio.',
        confirmar: 'Borrar',
        peligro: true,
      });
      if (!ok) return;
      await ctx.entrenamiento.borrarUltimaSerie(sesionId, ejercicio.id);
      cambios = true;
      await cargar();
    } else if (objetivoClick.dataset.tecnica) {
      const sesion = sesionId ?? (await ctx.entrenamiento.asegurarSesion(dia)).id;
      await ctx.entrenamiento.calificar(sesion, ejercicio.id, objetivoClick.dataset.tecnica as Tecnica);
      cambios = true;
      cerrar();
    }
  });

  void cargar();
}
