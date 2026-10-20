// Evolución de un ejercicio: frases de progreso y sesiones anteriores.

import { buscarEnRutina, diasDeEjercicio, objetivo } from '../dominio/catalogo';
import { agruparPorSesion, resumenEjercicio } from '../dominio/estadisticas';
import { frasesDeProgreso } from '../dominio/frases';
import { fechaCorta, fechaLarga } from '../util/fechas';
import { escapar, numero } from '../util/formato';
import { cabecera, insigniaTecnica, vacio } from '../ui/componentes';
import type { Pantalla } from '../ui/contexto';
import { icono } from '../ui/iconos';
import { volver, type Ruta } from '../ui/router';

export const pantallaEvolucion: Pantalla<Extract<Ruta, { pantalla: 'ejercicio' }>> = async (contenedor, ctx, ruta) => {
  const [historial, sesiones, catalogo] = await Promise.all([
    ctx.repos.series.obtenerHistorial(ruta.id),
    ctx.repos.sesiones.listar(),
    ctx.repos.ejercicios.listar(),
  ]);
  const deRutina = buscarEnRutina(ruta.id);
  const nombre = deRutina?.nombre ?? catalogo.find((e) => e.id === ruta.id)?.nombre ?? ruta.id;
  const dias = diasDeEjercicio(ruta.id);
  const subtitulo = [deRutina ? objetivo(deRutina) : '', dias.join(' · ')].filter(Boolean).map(escapar).join(' · ');

  const frases = frasesDeProgreso(historial);
  const resumen = resumenEjercicio(historial);
  const porId = new Map(sesiones.map((s) => [s.id, s]));
  const grupos = agruparPorSesion(historial).reverse();

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

  const lista = grupos
    .map((g) => {
      const sesion = porId.get(g.sesionId);
      return `
        <li class="tarjeta">
          <a class="tarjeta-titulo" href="#/sesion/${encodeURIComponent(g.sesionId)}">${fechaLarga(g.fecha)}</a>
          ${insigniaTecnica(sesion?.tecnica[ruta.id])}
          <span class="chips">${g.series
            .map((s) => `<span class="chip"><small>${s.numero}</small>${numero(s.peso)}×${s.reps}</span>`)
            .join('')}</span>
        </li>`;
    })
    .join('');

  contenedor.innerHTML = `
    ${cabecera({ titulo: nombre, volver: true, subtitulo })}
    <main class="container contenido">
      ${
        historial.length
          ? `${bloqueFrases}${datos}<h2 class="seccion-titulo">Sesiones</h2><ul class="lista">${lista}</ul>`
          : vacio('Sin registros', 'Todavía no cargaste series de este ejercicio.')
      }
    </main>`;

  contenedor.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('[data-accion="volver"]')) volver('#/historial/ejercicios');
  });
};
