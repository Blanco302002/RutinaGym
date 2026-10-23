// Bienvenida: solo la primera vez, en un teléfono sin ningún dato.

import { icono } from './iconos';

export type EleccionInicial = 'ejemplo' | 'cero';

export function mostrarBienvenida(contenedor: HTMLElement): Promise<EleccionInicial> {
  return new Promise((resolve) => {
    const pantalla = document.createElement('div');
    pantalla.className = 'bienvenida';
    pantalla.innerHTML = `
      <div class="container bienvenida-contenido">
        <div class="bienvenida-logo" aria-hidden="true">${icono('dumbbell')}</div>
        <h1>Tu rutina de gimnasio</h1>
        <p>Cargá tus series, seguí tu progreso y todo queda guardado en este teléfono. ¿Cómo querés empezar?</p>
        <div class="bienvenida-opciones">
          <button type="button" class="btn-principal" data-eleccion="ejemplo">
            ${icono('check')}<span>Usar rutina de ejemplo</span>
          </button>
          <button type="button" class="btn-secundario btn-secundario--grande" data-eleccion="cero">
            ${icono('plus')}<span>Crear mi rutina desde cero</span>
          </button>
        </div>
        <p class="bienvenida-nota">Después podés editar todo desde Ajustes → Rutinas.</p>
      </div>`;
    contenedor.append(pantalla);

    pantalla.addEventListener('click', (e) => {
      const boton = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-eleccion]');
      if (!boton) return;
      for (const b of pantalla.querySelectorAll('button')) b.disabled = true;
      pantalla.classList.add('bienvenida--saliendo');
      window.setTimeout(() => pantalla.remove(), 200);
      resolve(boton.dataset.eleccion as EleccionInicial);
    });
  });
}
