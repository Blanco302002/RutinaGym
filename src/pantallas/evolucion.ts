// Evolución de un ejercicio: frases de progreso, botón Editar y sesiones
// anteriores (de todas las rutinas juntas, con filtro por rutina).

import type { Sesion } from '../datos';
import {
  agruparPorSesion,
  filtrarPorRutina,
  resumenEjercicio,
  rutinasParaFiltrar,
  type SesionDeEjercicio,
} from '../dominio/estadisticas';
import { frasesDeProgreso } from '../dominio/frases';
import { fechaCorta, fechaLarga } from '../util/fechas';
import { escapar, numero } from '../util/formato';
import { cabecera, insigniaTecnica, vacio } from '../ui/componentes';
import type { Pantalla } from '../ui/contexto';
import { icono } from '../ui/iconos';
import { hash, volver, type Ruta } from '../ui/router';

// Filtro elegido por ejercicio (se mantiene al ir y volver).
const filtroPorEjercicio = new Map<string, string | undefined>();

export const pantallaEvolucion: Pantalla<Extract<Ruta, { pantalla: 'ejercicio' }>> = async (contenedor, ctx, ruta) => {
  const [historial, sesiones, ejercicio, rutinas, dondeEsta] = await Promise.all([
    ctx.repos.series.obtenerHistorial(ruta.id),
    ctx.repos.sesiones.listar(),
    ctx.repos.ejercicios.obtener(ruta.id),
    ctx.rutinas.listar(),
    ctx.rutinas.rutinasDeEjercicio(ruta.id),
  ]);
  const nombre = ejercicio?.nombre ?? ruta.id;
  const nombreRutina = new Map(rutinas.map((r) => [r.id, r.nombre]));

  // Frases, inicial y máximo: con todo el historial, de todas las rutinas.
  const frases = frasesDeProgreso(historial);
  const resumen = resumenEjercicio(historial);
  const porId = new Map<string, Sesion>(sesiones.map((s) => [s.id, s]));
  const grupos = agruparPorSesion(historial).reverse();
  const opciones = rutinasParaFiltrar(grupos, porId, dondeEsta).filter((id) => nombreRutina.has(id));
  let filtro = filtroPorEjercicio.get(ruta.id);
  if (filtro && !opciones.includes(filtro)) filtro = undefined;

  const bloqueFrases = frases.length
    ? `<section class="frases" aria-label="Cómo venís">
         ${frases.map((f) => `<p class="frase">${icono('arrowRight')}<span>${escapar(f)}</span></p>`).join('')}
       </section>`
    : '';

  const datos = resumen.maximo
    ? `<section class="datos">
         <div class="dato"><span class="dato-etiqueta">Inicial · ${fechaCorta(resumen.inicial!.fecha)}</span>
           <span class="dato-valor">${numero(resumen.inicial!.serie.peso)} kg <small>×${resumen.inicial!.serie.reps}</small></span></div>
         <div class="dato"><span class="dato-etiqueta">Máximo · ${fechaCorta(resumen.maximo.fecha)}</span>
           <span class="dato-valor">${numero(resumen.maximo.peso)} kg <small>×${resumen.maximo.reps}</small></span></div>
       </section>`
    : '';

  function chips(): string {
    if (!opciones.length) return '';
    const chip = (id: string | undefined, texto: string) => `
      <button type="button" class="filtro ${filtro === id ? 'activo' : ''}" data-filtro="${escapar(id ?? '')}"
              aria-pressed="${filtro === id}">${escapar(texto)}</button>`;
    return `<div class="filtros" role="group" aria-label="Filtrar por rutina">
      ${chip(undefined, 'Todas')}${opciones.map((id) => chip(id, nombreRutina.get(id)!)).join('')}
    </div>`;
  }

  function lista(): string {
    const visibles: SesionDeEjercicio[] = filtrarPorRutina(grupos, porId, filtro);
    if (!visibles.length) return vacio('Sin sesiones', 'No hay sesiones de este ejercicio con esa rutina.');
    return `<ul class="lista">${visibles
      .map((g) => {
        const sesion = porId.get(g.sesionId);
        const rutina = sesion?.rutinaId ? nombreRutina.get(sesion.rutinaId) : undefined;
        return `
          <li class="tarjeta">
            <span class="tarjeta-encabezado">
              <a class="tarjeta-titulo" href="${hash('sesion', g.sesionId)}">${fechaLarga(g.fecha)}</a>
              ${rutina ? `<span class="etiqueta-rutina">${escapar(rutina)}</span>` : ''}
            </span>
            ${insigniaTecnica(sesion?.tecnica[ruta.id])}
            <span class="chips">${g.series
              .map((s) => `<span class="chip"><small>${s.numero}</small>${numero(s.peso)}×${s.reps}</span>`)
              .join('')}</span>
          </li>`;
      })
      .join('')}</ul>`;
  }

  const editar = ejercicio
    ? `<a class="btn-accion btn-accion--ancho" href="${hash('historial', 'editar', ruta.id)}">${icono('pencil')}<span>Editar</span></a>`
    : '';

  contenedor.innerHTML = `
    ${cabecera({ titulo: nombre, volver: true })}
    <main class="container contenido">
      ${historial.length ? `${bloqueFrases}${datos}` : vacio('Sin registros', 'Todavía no cargaste series de este ejercicio.')}
      ${editar}
      ${
        historial.length
          ? `<h2 class="seccion-titulo">Sesiones</h2><div data-filtros>${chips()}</div><div data-lista>${lista()}</div>`
          : ''
      }
    </main>`;

  contenedor.addEventListener('click', (e) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-accion="volver"], [data-filtro]');
    if (!el) return;
    if (el.dataset.accion === 'volver') {
      volver('#/historial/ejercicios');
    } else {
      filtro = el.dataset.filtro || undefined;
      filtroPorEjercicio.set(ruta.id, filtro);
      contenedor.querySelector('[data-filtros]')!.innerHTML = chips();
      contenedor.querySelector('[data-lista]')!.innerHTML = lista();
    }
  });
};
