import 'bootstrap/dist/css/bootstrap.min.css';
import 'virtual:temas-color.css';
import './style.css';

import { crearRepositorios } from './datos';
import { catalogoDeRutina, validarRutina } from './dominio/catalogo';
import { Entrenamiento } from './dominio/entrenamiento';
import { migrarDesdeLocalStorage } from './dominio/migracion';
import { aplicarTema, seguirSistema } from './tema';
import { crearCarrusel } from './ui/carrusel';
import { aplicarColor } from './ui/colorApp';
import type { Contexto } from './ui/contexto';
import { ITEMS, crearBarraNavegacion, indiceDe } from './ui/navbar';
import { alCambiarRuta, destinoDe, leerRuta, navegar, type Ruta } from './ui/router';
import { pantallaAjustes } from './pantallas/ajustes';
import { pantallaCronometro } from './pantallas/cronometro';
import { pantallaEvolucion } from './pantallas/evolucion';
import { pantallaHistorial } from './pantallas/historial';
import { pantallaHoy } from './pantallas/hoy';
import { pantallaSesion } from './pantallas/sesion';

aplicarTema();
seguirSistema();
if (import.meta.env.DEV) validarRutina();

const app = document.getElementById('app')!;

/** Hash actual normalizado ("" y "#/" son la Rutina). */
function hashActual(): string {
  const h = location.hash;
  return !h || h === '#' || h === '#/' ? '#/hoy' : h;
}

function dibujarPantalla(contenedor: HTMLElement, ctx: Contexto, ruta: Ruta): Promise<void> {
  switch (ruta.pantalla) {
    case 'hoy':
      return pantallaHoy(contenedor, ctx, ruta);
    case 'historial':
      return pantallaHistorial(contenedor, ctx, ruta);
    case 'sesion':
      return pantallaSesion(contenedor, ctx, ruta);
    case 'ejercicio':
      return pantallaEvolucion(contenedor, ctx, ruta);
    case 'cronometro':
      return pantallaCronometro(contenedor, ctx, ruta);
    case 'ajustes':
      return pantallaAjustes(contenedor, ctx, ruta);
  }
}

async function iniciar(): Promise<void> {
  const repos = await crearRepositorios();
  aplicarColor(repos.preferencias.obtener().color);
  await repos.ejercicios.sincronizar(catalogoDeRutina());
  await migrarDesdeLocalStorage(repos);
  // Pide que el sistema no borre los datos si falta espacio.
  navigator.storage?.persist?.().catch(() => undefined);

  // Las 4 pantallas de la barra están siempre montadas en el carrusel. Cada
  // una recuerda su ruta (ej. Historial puede estar en el detalle de una sesión).
  const hashInicial = hashActual();
  const indiceInicial = indiceDe(destinoDe(leerRuta(hashInicial)));
  const rutaDePanel = ITEMS.map((item) => item.href);
  const turnos = ITEMS.map(() => 0);

  // Marco de 100dvh con el carrusel y la barra adentro: llegan hasta el borde inferior.
  const marco = document.createElement('div');
  marco.className = 'app-marco';
  app.append(marco);

  const barra = crearBarraNavegacion(marco, (destino) => {
    const i = indiceDe(destino);
    // Tocar el ícono de la pantalla actual vuelve a su inicio (ej. del detalle a la lista).
    if (i === carrusel.indice()) navegar(ITEMS[i].href, { reemplazar: true });
    else navegar(rutaDePanel[i], { reemplazar: true });
  });

  const carrusel = crearCarrusel(marco, {
    cantidad: ITEMS.length,
    inicial: indiceInicial,
    alMover: (posicion, animado) => barra.posicionar(posicion, animado),
    alCambiar: (i) => {
      barra.marcarActivo(ITEMS[i].destino);
      navegar(rutaDePanel[i], { reemplazar: true });
    },
    // En Rutina, deslizar a la derecha sobre un ejercicio abre la carga de series (hoy.ts).
    permitir: (direccion, origen, i) =>
      !(ITEMS[i].destino === 'hoy' && direccion === 'derecha' && origen.closest('.ejercicio')),
  });

  // Ninguna pantalla se reemplaza mientras el carrusel se mueve: espera a que quede quieto.
  let esperando: (() => void)[] = [];
  carrusel.alQuedarQuieto(() => {
    const listos = esperando;
    esperando = [];
    for (const r of listos) r();
  });
  const quieto = () =>
    carrusel.ocupado() ? new Promise<void>((resolve) => esperando.push(resolve)) : Promise.resolve();

  const ctx: Contexto = {
    repos,
    entrenamiento: new Entrenamiento(repos),
    // La pantalla visible se redibuja ya; las otras, fuera de la vista, para que
    // al deslizar hacia ellas ya estén al día.
    refrescar: () => ITEMS.forEach((_, i) => void renderizar(i, rutaDePanel[i])),
    arriba: () => carrusel.paneles[carrusel.indice()].scrollTo({ top: 0 }),
  };

  /** Dibuja una ruta en su panel. Se arma fuera del documento y se cambia de una vez. */
  async function renderizar(i: number, hash: string, entrando = false): Promise<void> {
    const turno = ++turnos[i];
    const pantalla = document.createElement('div');
    pantalla.className = entrando ? 'pantalla pantalla--entrando' : 'pantalla';
    await dibujarPantalla(pantalla, ctx, leerRuta(hash));
    await quieto();
    if (turno !== turnos[i]) return; // llegó otra versión mientras tanto
    const panel = carrusel.paneles[i];
    panel.replaceChildren(pantalla);
    if (entrando) panel.scrollTo({ top: 0 });
    rutaDePanel[i] = hash;
  }

  /** Muestra la ruta del hash: dentro del mismo panel, o deslizando hasta el suyo. */
  async function mostrar(hash: string): Promise<void> {
    const i = indiceDe(destinoDe(leerRuta(hash)));
    barra.marcarActivo(ITEMS[i].destino);
    if (i === carrusel.indice()) {
      if (rutaDePanel[i] !== hash) await renderizar(i, hash, true);
      return;
    }
    // El panel de destino se prepara antes de moverse (todavía no se ve).
    if (rutaDePanel[i] !== hash) await renderizar(i, hash);
    await carrusel.irA(i);
  }

  alCambiarRuta(() => void mostrar(hashActual()));

  // Al volver a la app (queda abierta en segundo plano) se redibuja:
  // así cambia de día o de semana sola.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && !document.body.classList.contains('modal-abierto')) {
      ctx.refrescar();
    }
  });

  barra.marcarActivo(ITEMS[indiceInicial].destino);
  await renderizar(indiceInicial, hashInicial);
  ITEMS.forEach((item, i) => {
    if (i !== indiceInicial) void renderizar(i, item.href);
  });
}

iniciar().catch((error: unknown) => {
  console.error(error);
  app.innerHTML = `
    <div class="container contenido">
      <div class="aviso-error">
        <h2>No se pudieron abrir los datos</h2>
        <p>Cerrá la app y volvé a abrirla. Si sigue pasando, revisá que el iPhone tenga espacio libre.</p>
      </div>
    </div>`;
});

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  const habiaVersion = Boolean(navigator.serviceWorker.controller);
  // Cuando se instala una versión nueva, recargamos una vez para usarla.
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (habiaVersion && !document.body.classList.contains('modal-abierto')) window.location.reload();
  });
  navigator.serviceWorker.register('./sw.js');
}
