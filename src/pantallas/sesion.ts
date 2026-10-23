// Detalle de una sesión: cada ejercicio con sus series y la técnica.

import type { Serie } from '../datos';
import { fechaLarga } from '../util/fechas';
import { escapar, numero } from '../util/formato';
import { NOMBRE_ANIMO, cabecera, insigniaTecnica, vacio } from '../ui/componentes';
import type { Pantalla } from '../ui/contexto';
import { carita } from '../ui/iconos';
import { volver, type Ruta } from '../ui/router';

export const pantallaSesion: Pantalla<Extract<Ruta, { pantalla: 'sesion' }>> = async (contenedor, ctx, ruta) => {
  const [sesion, series, catalogo] = await Promise.all([
    ctx.repos.sesiones.obtener(ruta.id),
    ctx.repos.series.obtenerPorSesion(ruta.id),
    ctx.repos.ejercicios.listar(),
  ]);

  if (!sesion) {
    contenedor.innerHTML = `${cabecera({ titulo: 'Sesión', volver: true })}
      <main class="container contenido">${vacio('No encontrada', 'Esta sesión ya no existe.')}</main>`;
  } else {
    const nombres = new Map(catalogo.map((e) => [e.id, e.nombre]));
    const porEjercicio = new Map<string, Serie[]>();
    for (const s of series) porEjercicio.set(s.ejercicioId, [...(porEjercicio.get(s.ejercicioId) ?? []), s]);

    // Orden: el de la rutina con la que se hizo (ese día); después, cualquier otro.
    const rutina = sesion.rutinaId ? await ctx.rutinas.completa(sesion.rutinaId) : undefined;
    const orden = rutina?.dias[sesion.dia]?.ejercicios.map((e) => e.ejercicio.id) ?? [];
    const ids = [...new Set([...orden, ...porEjercicio.keys(), ...sesion.completados])].filter(
      (id) => porEjercicio.has(id) || sesion.completados.includes(id),
    );

    const bloques = ids
      .map((id) => {
        const lista = (porEjercicio.get(id) ?? []).sort((a, b) => a.numero - b.numero);
        const filas = lista.length
          ? `<ol class="series-lista">${lista
              .map(
                (s) => `<li><span class="series-num">${s.numero}</span>
                  <span class="series-valor">${numero(s.peso)} kg × ${s.reps}</span></li>`,
              )
              .join('')}</ol>`
          : '<p class="nota">Hecho</p>';
        return `
          <li class="tarjeta">
            <a class="tarjeta-titulo" href="#/ejercicio/${encodeURIComponent(id)}">${escapar(nombres.get(id) ?? id)}</a>
            ${insigniaTecnica(sesion.tecnica[id])}
            ${filas}
          </li>`;
      })
      .join('');

    const animo = sesion.animo
      ? `<span class="dia-nota"> · Ánimo ${carita(sesion.animo, 'icono-linea')} ${NOMBRE_ANIMO[sesion.animo].toLowerCase()}</span>`
      : '';

    contenedor.innerHTML = `
      ${cabecera({ titulo: fechaLarga(sesion.fecha), volver: true, subtitulo: `${escapar(sesion.rutina)}${animo}` })}
      <main class="container contenido">
        ${bloques ? `<ul class="lista">${bloques}</ul>` : vacio('Sesión vacía', 'No hay series cargadas.')}
      </main>`;
  }

  contenedor.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('[data-accion="volver"]')) volver('#/historial');
  });
};
