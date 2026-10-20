import 'bootstrap/dist/css/bootstrap.min.css';
import './style.css';

import { crearRepositorios } from './datos';
import { catalogoDeRutina, validarRutina } from './dominio/catalogo';
import { Entrenamiento } from './dominio/entrenamiento';
import { migrarDesdeLocalStorage } from './dominio/migracion';
import { aplicarTema, seguirSistema } from './tema';
import type { Contexto } from './ui/contexto';
import { crearBarraNavegacion } from './ui/navbar';
import { alCambiarRuta, destinoDe, leerRuta, type Ruta } from './ui/router';
import { pantallaAjustes } from './pantallas/ajustes';
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
  await repos.ejercicios.sincronizar(catalogoDeRutina());
  await migrarDesdeLocalStorage(repos);
  // Pide que el sistema no borre los datos si falta espacio.
  navigator.storage?.persist?.().catch(() => undefined);

  let turno = 0;
  let claveAnterior = '';

  const ctx: Contexto = {
    repos,
    entrenamiento: new Entrenamiento(repos),
    refrescar: () => void dibujar(leerRuta()),
  };

  async function dibujar(ruta: Ruta): Promise<void> {
    const miTurno = ++turno;
    const clave = JSON.stringify(ruta);
    const esOtraPantalla = clave !== claveAnterior;
    barra.marcarActivo(destinoDe(ruta));

    // Se arma fuera de pantalla y se cambia de una vez: sin parpadeos.
    const pantalla = document.createElement('div');
    pantalla.className = esOtraPantalla ? 'pantalla pantalla--entrando' : 'pantalla';
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
      case 'ajustes':
        await pantallaAjustes(pantalla, ctx, ruta);
        break;
    }
    if (miTurno !== turno) return; // Llegó otra navegación mientras cargaba.

    vista.replaceChildren(pantalla);
    if (esOtraPantalla) window.scrollTo({ top: 0 });
    claveAnterior = clave;
  }

  alCambiarRuta((ruta) => void dibujar(ruta));

  // Al volver a la app (queda abierta en segundo plano) se redibuja:
  // así cambia de día o de semana sola.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && !document.body.classList.contains('modal-abierto')) {
      ctx.refrescar();
    }
  });

  await dibujar(leerRuta());
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
