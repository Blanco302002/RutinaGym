// Diálogo de confirmación propio de la app (en lugar de window.confirm, que
// en la app instalada se ve fuera de estilo y en Android muestra la URL).

import { escapar } from '../util/formato';

export interface OpcionesConfirmar {
  titulo: string;
  mensaje?: string;
  /** Texto del botón que confirma. */
  confirmar: string;
  cancelar?: string;
  /** Botón rojo (para eliminar). */
  peligro?: boolean;
}

/** Abre el diálogo y resuelve true si se confirma, false si se cancela. */
export function confirmar(op: OpcionesConfirmar): Promise<boolean> {
  return new Promise((resolve) => {
    const anterior = document.activeElement as HTMLElement | null;
    const fondo = document.createElement('div');
    fondo.className = 'dialogo-fondo';
    fondo.innerHTML = `
      <div class="dialogo" role="alertdialog" aria-modal="true" aria-labelledby="dialogo-titulo"
           ${op.mensaje ? 'aria-describedby="dialogo-mensaje"' : ''}>
        <h2 id="dialogo-titulo">${escapar(op.titulo)}</h2>
        ${op.mensaje ? `<p id="dialogo-mensaje">${escapar(op.mensaje)}</p>` : ''}
        <div class="dialogo-botones">
          <button type="button" class="btn-secundario" data-respuesta="no">${escapar(op.cancelar ?? 'Cancelar')}</button>
          <button type="button" class="${op.peligro ? 'btn-peligro' : 'btn-principal'}" data-respuesta="si">
            ${escapar(op.confirmar)}</button>
        </div>
      </div>`;
    document.body.append(fondo);
    document.body.classList.add('dialogo-abierto');

    const cerrar = (respuesta: boolean) => {
      fondo.classList.add('dialogo-fondo--saliendo');
      document.body.classList.remove('dialogo-abierto');
      document.removeEventListener('keydown', teclado);
      window.setTimeout(() => fondo.remove(), 160);
      anterior?.focus?.();
      resolve(respuesta);
    };
    const teclado = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cerrar(false);
    };

    fondo.addEventListener('click', (e) => {
      const boton = (e.target as HTMLElement).closest<HTMLElement>('[data-respuesta]');
      if (boton) cerrar(boton.dataset.respuesta === 'si');
      else if (e.target === fondo) cerrar(false); // tocar afuera = cancelar
    });
    document.addEventListener('keydown', teclado);
    // El foco arranca en Cancelar: un toque de más no borra nada.
    fondo.querySelector<HTMLElement>('[data-respuesta="no"]')?.focus();
  });
}
