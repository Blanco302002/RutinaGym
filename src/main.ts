import 'bootstrap/dist/css/bootstrap.min.css';
import 'virtual:temas-color.css';
import './style.css';

import { crearRepositorios } from './datos';
import { catalogoDeRutina, validarRutina } from './dominio/catalogo';
import { Entrenamiento } from './dominio/entrenamiento';
import { migrarDesdeLocalStorage } from './dominio/migracion';
import { aplicarTema, seguirSistema } from './tema';
import { aplicarColor } from './ui/colorApp';
import type { Contexto } from './ui/contexto';
import { alDeslizar } from './ui/deslizar';
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
const vista = document.createElement('div');
vista.className = 'vista';
app.append(vista);
const barra = crearBarraNavegacion(app);

async function iniciar(): Promise<void> {
  const repos = await crearRepositorios();
  aplicarColor(repos.preferencias.obtener().color);
  await repos.ejercicios.sincronizar(catalogoDeRutina());
  await migrarDesdeLocalStorage(repos);
  // Pide que el sistema no borre los datos si falta espacio.
  navigator.storage?.persist?.().catch(() => undefined);

  let turno = 0;
  let claveAnterior = '';
  let indiceAnterior = -1;

  const ctx: Contexto = {
    repos,
    entrenamiento: new Entrenamiento(repos),
    refrescar: () => void dibujar(leerRuta()),
  };

  async function dibujar(ruta: Ruta): Promise<void> {
    const miTurno = ++turno;
    const clave = JSON.stringify(ruta);
    const esOtraPantalla = clave !== claveAnterior;
    const indice = indiceDe(destinoDe(ruta));
    // Entre destinos de la barra, la pantalla se desliza hacia el lado que corresponde.
    const direccion = indiceAnterior >= 0 && indice !== indiceAnterior ? Math.sign(indice - indiceAnterior) : 0;
    barra.marcarActivo(destinoDe(ruta));

    // Se arma fuera de pantalla y se cambia de una vez: sin parpadeos.
    const pantalla = document.createElement('div');
    pantalla.className = esOtraPantalla && !direccion ? 'pantalla pantalla--entrando' : 'pantalla';
    switch (ruta.pantalla) {
      case 'hoy':
        await pantallaHoy(pantalla, ctx, ruta);
        break;
      case 'historial':
        await pantallaHistorial(pantalla, ctx, ruta);
        break;
      case 'sesion':
        await pantallaSesion(pantalla, ctx, ruta);
        break;
      case 'ejercicio':
        await pantallaEvolucion(pantalla, ctx, ruta);
        break;
      case 'cronometro':
        await pantallaCronometro(pantalla, ctx, ruta);
        break;
      case 'ajustes':
        await pantallaAjustes(pantalla, ctx, ruta);
        break;
    }
    if (miTurno !== turno) return; // Llegó otra navegación mientras cargaba.

    if (direccion) deslizarHacia(pantalla, direccion);
    else vista.replaceChildren(pantalla);
    if (esOtraPantalla) window.scrollTo({ top: 0 });
    claveAnterior = clave;
    indiceAnterior = indice;
  }

  alCambiarRuta((ruta) => void dibujar(ruta));

  // Deslizar a los costados: pantalla vecina de la barra. En Rutina, deslizar a
  // la derecha sobre un ejercicio abre la carga de series (lo maneja hoy.ts).
  alDeslizar(vista, (direccion, origen) => {
    const ruta = leerRuta();
    if (ruta.pantalla === 'hoy' && direccion === 'derecha' && origen.closest('.ejercicio')) return;
    const destino = ITEMS[indiceDe(destinoDe(ruta)) + (direccion === 'izquierda' ? 1 : -1)];
    if (destino) navegar(destino.href);
  });

  // Al volver a la app (queda abierta en segundo plano) se redibuja:
  // así cambia de día o de semana sola.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && !document.body.classList.contains('modal-abierto')) {
      ctx.refrescar();
    }
  });

  await dibujar(leerRuta());
}

const SIN_ANIMACIONES = window.matchMedia('(prefers-reduced-motion: reduce)');

/** Cambia de pantalla con un desplazamiento horizontal (250ms). */
function deslizarHacia(nueva: HTMLElement, direccion: number): void {
  const anteriores = [...vista.children] as HTMLElement[];
  const actual = anteriores.pop();
  for (const vieja of anteriores) vieja.remove(); // restos de una animación cortada
  if (!actual || SIN_ANIMACIONES.matches) {
    vista.replaceChildren(nueva);
    return;
  }
  // La pantalla que se va queda fija donde estaba scrolleada mientras sale.
  actual.style.position = 'absolute';
  actual.style.inset = `${-window.scrollY}px 0 auto 0`;
  vista.append(nueva);
  const opciones: KeyframeAnimationOptions = { duration: 250, easing: 'ease-out' };
  actual.animate([{ transform: 'translateX(0)' }, { transform: `translateX(${-direccion * 100}%)` }], opciones);
  // Se saca al terminar (con setTimeout y no con .finished: si la app pasa a
  // segundo plano a mitad de la animación, igual se va).
  window.setTimeout(() => actual.remove(), 300);
  nueva.animate([{ transform: `translateX(${direccion * 100}%)` }, { transform: 'translateX(0)' }], opciones);
}

iniciar().catch((error: unknown) => {
  console.error(error);
  vista.innerHTML = `
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
