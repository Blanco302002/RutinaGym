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

/**
 * Desplazamiento respecto de la pantalla `actual`, a partir de la posición
 * real del carril (para agarrarlo a mitad de una animación).
 */
export function desplazamientoActual(posicionCarril: number, actual: number, ancho: number): number {
  return posicionCarril + actual * ancho;
}

/** La pantalla que más se ve con el carril en esa posición. */
export function pantallaMasCercana(posicionCarril: number, ancho: number, cantidad: number): number {
  return Math.min(cantidad - 1, Math.max(0, Math.round(-posicionCarril / ancho)));
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
  /** La pantalla que la app ya conoce (para avisarle solo cuando cambia). */
  let informado = op.inicial;
  let animando = false;
  let fin: number | undefined;
  let alLlegar: (() => void) | undefined;
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

  /** Corta la espera de una animación en curso (la promesa igual se cumple). */
  function cortarAnimacion(): void {
    window.clearTimeout(fin);
    const pendiente = alLlegar;
    alLlegar = undefined;
    pendiente?.();
  }

  function terminar(): void {
    animando = false;
    marcarPaneles();
    // Se avisa la pantalla final una sola vez, cuando el carrusel quedó quieto.
    if (actual !== informado) {
      informado = actual;
      op.alCambiar(actual);
    }
    for (const cb of quietos) cb();
  }

  function animarA(indice: number): Promise<void> {
    cortarAnimacion();
    const desde = actual;
    actual = indice;
    // Mientras se mueve, se ven las dos pantallas (para el cronómetro, que se pinta solo si está visible).
    paneles[desde].dataset.visible = 'true';
    paneles[indice].dataset.visible = 'true';
    // La de destino ya recibe toques mientras llega (antes había que esperar la animación).
    paneles[indice].inert = false;
    animando = true;
    pintar(0, true);
    return new Promise((resolve) => {
      alLlegar = resolve;
      // setTimeout y no transitionend: si no hubo movimiento, transitionend no llega.
      fin = window.setTimeout(() => {
        alLlegar = undefined;
        terminar();
        resolve();
      }, DURACION + 30);
    });
  }

  // ── Gesto ────────────────────────────────────────────────

  // El gesto se arma con touch events en el teléfono (con preventDefault en
  // cuanto se sabe que es horizontal: Safari no puede cancelarlo a mitad de
  // camino) y con pointer events solo para el mouse, en la compu.

  interface Gesto {
    x0: number;
    y0: number;
    origen: Element;
    eje: 'pendiente' | 'horizontal' | 'ignorar';
    base: number; // clientX desde donde se mide (el punto donde se decidió el eje)
    /** Dónde estaba el carril al tocar (si se agarró a mitad de una animación). */
    inicial: number;
    desplazamiento: number;
    muestras: { x: number; t: number }[];
    /** Se cortó una animación al tocar: si el gesto no sigue, hay que terminarla. */
    interrumpido: boolean;
  }

  let gesto: Gesto | null = null;
  let cuadro = 0;
  let ignorarClick = false;

  function bloqueado(): boolean {
    return document.body.classList.contains('modal-abierto') || document.body.classList.contains('dialogo-abierto');
  }

  function empezar(x: number, y: number, origen: Element, t: number): void {
    if (bloqueado()) return;
    let inicial = 0;
    let interrumpido = false;
    if (animando) {
      // Agarrarlo en movimiento: se frena donde está y el dedo sigue desde ahí,
      // midiendo desde la pantalla que más se ve en ese momento.
      cortarAnimacion();
      const posicion = new DOMMatrix(getComputedStyle(carril).transform).m41;
      actual = pantallaMasCercana(posicion, ancho(), op.cantidad);
      inicial = desplazamientoActual(posicion, actual, ancho());
      pintar(inicial, false);
      interrumpido = true;
    }
    gesto = { x0: x, y0: y, origen, eje: 'pendiente', base: x, inicial, desplazamiento: inicial, muestras: [{ x, t }], interrumpido };
  }

  /** Devuelve true si el gesto es horizontal (el que llama evita el scroll). */
  function mover(x: number, y: number, t: number): boolean {
    if (!gesto || gesto.eje === 'ignorar') return false;
    const dx = x - gesto.x0;
    const dy = y - gesto.y0;

    if (gesto.eje === 'pendiente') {
      if (Math.max(Math.abs(dx), Math.abs(dy)) < UMBRAL_EJE) return false;
      const horizontal = Math.abs(dx) > Math.abs(dy);
      const direccion: Direccion = dx < 0 ? 'izquierda' : 'derecha';
      if (!horizontal || !op.permitir(direccion, gesto.origen, actual)) {
        gesto.eje = 'ignorar'; // vertical: que scrollee normal
        if (gesto.interrumpido) void animarA(actual);
        return false;
      }
      gesto.eje = 'horizontal';
      gesto.base = x; // arranca a seguir desde acá: sin salto
      animando = false;
      raiz.classList.add('carrusel--arrastrando');
      paneles.forEach((p) => (p.dataset.visible = 'true'));
    }

    gesto.desplazamiento = elastico(gesto.inicial + x - gesto.base, actual, op.cantidad);
    gesto.muestras.push({ x, t });
    while (gesto.muestras.length > 2 && t - gesto.muestras[0].t > 100) gesto.muestras.shift();

    if (!cuadro) {
      cuadro = requestAnimationFrame(() => {
        cuadro = 0;
        if (gesto?.eje === 'horizontal') pintar(gesto.desplazamiento, false);
      });
    }
    return true;
  }

  function soltar(cancelado: boolean): void {
    if (!gesto) return;
    const g = gesto;
    gesto = null;
    if (g.eje !== 'horizontal') {
      // Un toque que frenó una animación: se termina de llegar a la pantalla.
      if (g.interrumpido && g.eje === 'pendiente') void animarA(actual);
      return;
    }

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
    // Al terminar, terminar() avisa la pantalla nueva (si cambió).
    void animarA(destino);
  }

  // Teléfono: touch events.
  raiz.addEventListener(
    'touchstart',
    (e) => {
      if (e.touches.length !== 1) {
        if (gesto) soltar(true);
        return;
      }
      const t = e.touches[0];
      empezar(t.clientX, t.clientY, e.target as Element, e.timeStamp);
    },
    { passive: true },
  );
  raiz.addEventListener(
    'touchmove',
    (e) => {
      const t = e.touches[0];
      if (t && mover(t.clientX, t.clientY, e.timeStamp) && e.cancelable) e.preventDefault();
    },
    { passive: false },
  );
  raiz.addEventListener('touchend', () => soltar(false));
  raiz.addEventListener('touchcancel', () => soltar(true));

  // Compu: el mouse, con pointer events.
  let punteroMouse: number | undefined;
  raiz.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    punteroMouse = e.pointerId;
    empezar(e.clientX, e.clientY, e.target as Element, e.timeStamp);
  });
  raiz.addEventListener('pointermove', (e) => {
    if (e.pointerId !== punteroMouse) return;
    if (mover(e.clientX, e.clientY, e.timeStamp) && !raiz.hasPointerCapture(e.pointerId)) {
      try {
        raiz.setPointerCapture(e.pointerId);
      } catch {
        // Puntero ya liberado: se sigue igual.
      }
    }
  });
  const soltarMouse = (e: PointerEvent, cancelado: boolean) => {
    if (e.pointerId !== punteroMouse) return;
    punteroMouse = undefined;
    soltar(cancelado);
  };
  raiz.addEventListener('pointerup', (e) => soltarMouse(e, false));
  raiz.addEventListener('pointercancel', (e) => soltarMouse(e, true));

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
      informado = indice; // lo pide la app: ya lo sabe, no hace falta avisarle
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
