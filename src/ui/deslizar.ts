// Detecta deslizamientos horizontales claros (para cambiar de pantalla).
// No interfiere con el scroll: tiene que ser de más de 50px y más
// horizontal que vertical. Con el modal de carga abierto no hace nada.

export type Direccion = 'izquierda' | 'derecha';

const MINIMO = 50;

export function alDeslizar(elemento: HTMLElement, callback: (direccion: Direccion, origen: Element) => void): void {
  let x0 = 0;
  let y0 = 0;
  let origen: Element | null = null;

  elemento.addEventListener(
    'touchstart',
    (e) => {
      if (e.touches.length !== 1 || document.body.classList.contains('modal-abierto')) {
        origen = null;
        return;
      }
      x0 = e.touches[0].clientX;
      y0 = e.touches[0].clientY;
      origen = e.target as Element;
    },
    { passive: true },
  );

  elemento.addEventListener(
    'touchend',
    (e) => {
      if (!origen || document.body.classList.contains('modal-abierto')) return;
      const dx = e.changedTouches[0].clientX - x0;
      const dy = e.changedTouches[0].clientY - y0;
      const inicio = origen;
      origen = null;
      if (Math.abs(dx) > MINIMO && Math.abs(dx) > Math.abs(dy)) callback(dx < 0 ? 'izquierda' : 'derecha', inicio);
    },
    { passive: true },
  );
}
