// Historial: pestañas Sesiones y Ejercicios.

import type { Ejercicio, ResumenSesion, Sesion } from '../datos';
import { DIAS_DE_ENTRENAMIENTO } from '../dominio/catalogo';
import { tieneActividad } from '../dominio/entrenamiento';
import { RUTINA } from '../rutina';
import { fechaLarga, lunesDe } from '../util/fechas';
import { escapar, normalizar, plural } from '../util/formato';
import { cabecera, insigniaAnimo, vacio } from '../ui/componentes';
import type { Pantalla } from '../ui/contexto';
import { icono } from '../ui/iconos';
import { navegar, type Ruta } from '../ui/router';

type RutaHistorial = Extract<Ruta, { pantalla: 'historial' }>;

let busqueda = '';

function pestanas(activa: RutaHistorial['pestana']): string {
  const tab = (id: RutaHistorial['pestana'], texto: string) => `
    <button type="button" role="tab" class="pestana ${activa === id ? 'activa' : ''}" data-pestana="${id}"
            aria-selected="${activa === id}">${texto}</button>`;
  return `<div class="pestanas" role="tablist">${tab('sesiones', 'Sesiones')}${tab('ejercicios', 'Ejercicios')}</div>`;
}

function renderAdherencia(sesiones: Sesion[], resumen: Record<string, ResumenSesion>): string {
  const lunes = lunesDe(new Date());
  const hechos = new Set(
    sesiones
      .filter((s) => s.fecha >= lunes && !RUTINA[s.dia]?.descanso && tieneActividad(s, resumen[s.id]?.series))
      .map((s) => s.dia),
  );
  const puntos = RUTINA.map((d, i) =>
    d.descanso ? '' : `<span class="punto ${hechos.has(i) ? 'lleno' : ''}" title="${d.nombre}"></span>`,
  ).join('');
  return `
    <section class="adherencia" aria-label="Adherencia de la semana">
      <div>
        <span class="adherencia-etiqueta">Esta semana</span>
        <span class="adherencia-valor"><strong>${hechos.size}</strong> de ${DIAS_DE_ENTRENAMIENTO}</span>
      </div>
      <div class="puntos">${puntos}</div>
    </section>`;
}

function renderSesiones(sesiones: Sesion[], resumen: Record<string, ResumenSesion>): string {
  const conActividad = sesiones.filter((s) => tieneActividad(s, resumen[s.id]?.series));
  const filas = conActividad
    .map((s) => {
      const r = resumen[s.id] ?? { series: 0, ejercicios: [] };
      const cantidad = new Set([...r.ejercicios, ...s.completados]).size;
      return `
        <li>
          <a class="fila-link" href="#/sesion/${encodeURIComponent(s.id)}">
            <span class="fila-link-texto">
              <span class="fila-link-titulo">${fechaLarga(s.fecha)}</span>
              <span class="fila-link-sub">${escapar(s.rutina)}</span>
              <span class="fila-link-sub">${plural(cantidad, 'ejercicio')} · ${plural(r.series, 'serie')}</span>
            </span>
            ${insigniaAnimo(s.animo)}
          </a>
        </li>`;
    })
    .join('');

  return `
    ${renderAdherencia(sesiones, resumen)}
    ${filas ? `<ul class="lista">${filas}</ul>` : vacio('Sin entrenamientos', 'Cuando cargues series, tus sesiones aparecen acá.')}`;
}

function renderEjercicios(ejercicios: Ejercicio[]): string {
  const q = normalizar(busqueda.trim());
  const filtrados = ejercicios.filter((e) => !q || normalizar(e.nombre).includes(q));
  const filas = filtrados
    .map(
      (e) => `
        <li>
          <a class="fila-link fila-link--simple" href="#/ejercicio/${encodeURIComponent(e.id)}">
            <span class="fila-link-titulo">${escapar(e.nombre)}</span>
            ${icono('arrowRight', 'fila-link-flecha')}
          </a>
        </li>`,
    )
    .join('');
  return filas ? `<ul class="lista">${filas}</ul>` : vacio('Sin resultados', `Ningún ejercicio coincide con "${busqueda}".`);
}

export const pantallaHistorial: Pantalla<RutaHistorial> = async (contenedor, ctx, ruta) => {
  const esSesiones = ruta.pestana === 'sesiones';
  const buscador = `
    <label class="buscador">
      ${icono('search')}
      <input type="search" placeholder="Buscar ejercicio" value="${escapar(busqueda)}"
             aria-label="Buscar ejercicio" autocomplete="off" enterkeyhint="search">
    </label>`;

  let cuerpo: string;
  let ejercicios: Ejercicio[] = [];
  if (esSesiones) {
    const [sesiones, resumen] = await Promise.all([ctx.repos.sesiones.listar(), ctx.repos.series.resumenPorSesion()]);
    cuerpo = renderSesiones(sesiones, resumen);
  } else {
    // Primero en el orden de la rutina; al final, los que ya no están.
    const orden = RUTINA.flatMap((d) => d.ejercicios.map((e) => e.id));
    ejercicios = (await ctx.repos.ejercicios.listar()).sort((a, b) => {
      const ia = orden.indexOf(a.id);
      const ib = orden.indexOf(b.id);
      return (ia < 0 ? 1e9 : ia) - (ib < 0 ? 1e9 : ib) || a.nombre.localeCompare(b.nombre, 'es');
    });
    cuerpo = `${buscador}<div class="resultados">${renderEjercicios(ejercicios)}</div>`;
  }

  contenedor.innerHTML = `
    ${cabecera({ titulo: 'Historial', etiqueta: 'Tu progreso', extra: pestanas(ruta.pestana) })}
    <main class="container contenido">${cuerpo}</main>`;

  contenedor.addEventListener('click', (e) => {
    const tab = (e.target as HTMLElement).closest<HTMLElement>('[data-pestana]');
    if (tab) navegar(tab.dataset.pestana === 'ejercicios' ? '#/historial/ejercicios' : '#/historial', { reemplazar: true });
  });

  const input = contenedor.querySelector<HTMLInputElement>('.buscador input');
  input?.addEventListener('input', () => {
    busqueda = input.value;
    contenedor.querySelector('.resultados')!.innerHTML = renderEjercicios(ejercicios);
  });
};
