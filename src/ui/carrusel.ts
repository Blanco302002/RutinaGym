// Carrusel de pantallas: las 4 pantallas de la barra, montadas una al lado
// de la otra. Se pasa de una a otra deslizando el dedo (sigue al dedo en
// tiempo real, como el carrete de fotos) o con irA() al tocar la barra.
//
// Solo se mueve el carril con transform: las pantallas nunca se vuelven a
// crear durante un cambio, así que no hay parpadeos.

export type Direccion = 'izquierda' | 'derecha';

export interface OpcionesCarrusel {
  cantidad: number;
  inicial: number;
  /** Posición "fraccionaria" (ej. 1.5 = mitad entre la 2.ª y la 3.ª), para la barra. */
  alMover(posicion: number, animado: boolean): void;
  /** El usuario terminó de deslizar hasta otra pantalla. */
  alCambiar(indice: number): void;
  /** Si este gesto puede mover el carrusel (ej. no sobre una tarjeta de ejercicio). */
  permitir(direccion: Direccion, origen: Element, indice: number): boolean;
}

export interface Carrusel {
  paneles: HTMLElement[];
  indice(): number;
  /** Va a la pantalla `indice` con la animación de desplazamiento (o directo). */
  irA(indice: number, animar?: boolean): Promise<void>;
  /** Hay un gesto o una animación en curso. */
  ocupado(): boolean;
  /** Se llama cada vez que el carrusel queda quieto. */
  alQuedarQuieto(callback: () => void): void;
}

const DURACION = 250;
const CURVA = 'cubic-bezier(0.25, 0.8, 0.35, 1)'; // ease-out suave
const UMBRAL_EJE = 10; // px para decidir si el gesto es horizontal o vertical
const VELOCIDAD_RAPIDA = 0.45; // px/ms: un "flick" corto también cambia de pantalla
const TOPE_ELASTICO = 90; // px máximos de resistencia en los extremos

/** En los extremos el carril se resiste: un tercio del recorrido del dedo, con tope. */
export function elastico(dx: number, actual: number, cantidad: number): number {
  const enExtremo = (actual === 0 && dx > 0) || (actual === cantidad - 1 && dx < 0);
  return enExtremo ? Math.sign(dx) * Math.min(Math.abs(dx) / 3, TOPE_ELASTICO) : dx;
}

/**
 * A qué pantalla ir al soltar. Se completa el cambio si se desplazó más de un
 * tercio del ancho o si fue un gesto rápido en esa dirección; si no, vuelve.
 * `velocidad` en px/ms (positiva = hacia la derecha).
 */
export function destinoAlSoltar(
  desplazamiento: number,
  velocidad: number,
  ancho: number,
  actual: number,
  cantidad: number,
): number {
  const vecino = actual - Math.sign(desplazamiento);
  if (desplazamiento === 0 || vecino < 0 || vecino >= cantidad) return actual;
  const lejos = Math.abs(desplazamiento) > ancho / 3;
  const rapido = Math.abs(velocidad) > VELOCIDAD_RAPIDA && Math.sign(velocidad) === Math.sign(desplazamiento);
  return lejos || rapido ? vecino : actual;
}

export function crearCarrusel(contenedor: HTMLElement, op: OpcionesCarrusel): Carrusel {
  const raiz = document.createElement('div');
  raiz.className = 'carrusel';
  const carril = document.createElement('div');
  carril.className = 'carril';
  const paneles = Array.from({ length: op.cantidad }, () => {
    const panel = document.createElement('div');
    panel.className = 'panel';
    carril.append(panel);
    return panel;
  });
  raiz.append(carril);
  contenedor.append(raiz);

  let actual = op.inicial;
  let animando = false;
  let fin: number | undefined;
  const quietos: (() => void)[] = [];

  const ancho = () => raiz.clientWidth || window.innerWidth;

  function pintar(desplazamiento: number, animado: boolean): void {
    carril.style.transition = animado ? `transform ${DURACION}ms ${CURVA}` : 'none';
    carril.style.transform = `translate3d(${-actual * ancho() + desplazamiento}px, 0, 0)`;
    op.alMover(actual - desplazamiento / ancho(), animado);
  }

  /** Solo la pantalla actual recibe foco y toques; las demás quedan inertes. */
  function marcarPaneles(): void {
    paneles.forEach((p, i) => {
      p.inert = i !== actual;
      p.dataset.visible = String(i === actual);
    });
  }

  function terminar(): void {
    animando = false;
    marcarPaneles();
    for (const cb of quietos) cb();
  }

  function animarA(indice: number): Promise<void> {
    window.clearTimeout(fin);
    const desde = actual;
    actual = indice;
    // Mientras se mueve, se ven las dos pantallas (para el cronómetro, que se pinta solo si está visible).
    paneles[desde].dataset.visible = 'true';
    paneles[indice].dataset.visible = 'true';
    animando = true;
    pintar(0, true);
    return new Promise((resolve) => {
      // setTimeout y no transitionend: si no hubo movimiento, transitionend no llega.
      fin = window.setTimeout(() => {
        terminar();
        resolve();
      }, DURACION + 30);
    });
  }

  // ── Gesto ────────────────────────────────────────────────

  interface Gesto {
    id: number;
    x0: number;
    y0: number;
    origen: Element;
    eje: 'pendiente' | 'horizontal' | 'ignorar';
    base: number; // clientX desde donde se mide (el punto donde se decidió el eje)
    desplazamiento: number;
    muestras: { x: number; t: number }[];
  }

  let gesto: Gesto | null = null;
  let cuadro = 0;
  let ignorarClick = false;

  raiz.addEventListener('pointerdown', (e) => {
    const bloqueado = document.body.classList.contains('modal-abierto') || document.body.classList.contains('dialogo-abierto');
    if (!e.isPrimary || animando || bloqueado) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    gesto = {
      id: e.pointerId,
      x0: e.clientX,
      y0: e.clientY,
      origen: e.target as Element,
      eje: 'pendiente',
      base: e.clientX,
      desplazamiento: 0,
      muestras: [{ x: e.clientX, t: e.timeStamp }],
    };
  });

  raiz.addEventListener('pointermove', (e) => {
    if (!gesto || e.pointerId !== gesto.id || gesto.eje === 'ignorar') return;
    const dx = e.clientX - gesto.x0;
    const dy = e.clientY - gesto.y0;

    if (gesto.eje === 'pendiente') {
      if (Math.max(Math.abs(dx), Math.abs(dy)) < UMBRAL_EJE) return;
      const horizontal = Math.abs(dx) > Math.abs(dy);
      const direccion: Direccion = dx < 0 ? 'izquierda' : 'derecha';
      if (!horizontal || !op.permitir(direccion, gesto.origen, actual)) {
        gesto.eje = 'ignorar'; // vertical: que scrollee normal
        return;
      }
      gesto.eje = 'horizontal';
      gesto.base = e.clientX; // arranca a seguir desde acá: sin salto
      try {
        raiz.setPointerCapture(e.pointerId); // seguir recibiendo el gesto aunque el dedo salga
      } catch {
        // Puntero ya liberado: no pasa nada, se sigue igual.
      }
      raiz.classList.add('carrusel--arrastrando');
      paneles.forEach((p) => (p.dataset.visible = 'true'));
    }

    gesto.desplazamiento = elastico(e.clientX - gesto.base, actual, op.cantidad);
    gesto.muestras.push({ x: e.clientX, t: e.timeStamp });
    while (gesto.muestras.length > 2 && e.timeStamp - gesto.muestras[0].t > 100) gesto.muestras.shift();

    if (!cuadro) {
      cuadro = requestAnimationFrame(() => {
        cuadro = 0;
        if (gesto?.eje === 'horizontal') pintar(gesto.desplazamiento, false);
      });
    }
  });

  function soltar(e: PointerEvent, cancelado: boolean): void {
    if (!gesto || e.pointerId !== gesto.id) return;
    const g = gesto;
    gesto = null;
    if (g.eje !== 'horizontal') return;

    cancelAnimationFrame(cuadro);
    cuadro = 0;
    raiz.classList.remove('carrusel--arrastrando');
    ignorarClick = true;
    window.setTimeout(() => (ignorarClick = false), 350);

    const primera = g.muestras[0];
    const ultima = g.muestras[g.muestras.length - 1];
    const velocidad = (ultima.x - primera.x) / Math.max(1, ultima.t - primera.t);
    const destino = cancelado
      ? actual
      : destinoAlSoltar(g.desplazamiento, velocidad, ancho(), actual, op.cantidad);

    // La animación final sale desde donde quedó el dedo: el carril ya está ahí.
    if (destino !== actual) void animarA(destino).then(() => op.alCambiar(destino));
    else void animarA(actual);
  }

  raiz.addEventListener('pointerup', (e) => soltar(e, false));
  raiz.addEventListener('pointercancel', (e) => soltar(e, true));

  // Que soltar después de arrastrar no "toque" el botón que quedó abajo.
  raiz.addEventListener(
    'click',
    (e) => {
      if (ignorarClick) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    true,
  );

  window.addEventListener('resize', () => pintar(0, false));

  pintar(0, false);
  marcarPaneles();

  return {
    paneles,
    indice: () => actual,
    irA: (indice, animar = true) => {
      if (indice === actual && !animando) return Promise.resolve();
      if (!animar) {
        actual = indice;
        pintar(0, false);
        terminar();
        return Promise.resolve();
      }
      return animarA(indice);
    },
    ocupado: () => animando || gesto?.eje === 'horizontal',
    alQuedarQuieto: (cb) => quietos.push(cb),
  };
}
