// ⚠️ TEMPORAL: diagnóstico de la franja vacía de abajo en el iPhone.
// Pinta html, body, marco, carrusel y pantallas de colores fuertes y muestra
// las medidas reales. Se borra cuando esté resuelto (y su import en main.ts).

declare const __VERSION_APP__: string;

const COLORES = `
  html { background: #ff00ff !important; }            /* magenta */
  body { background: #ffd400 !important; }            /* amarillo */
  .app-marco { background: #00e5ff !important; }      /* celeste */
  .carrusel { background: #00c853 !important; }       /* verde */
  .panel { background: rgba(255, 80, 0, 0.35) !important; } /* naranja */
  #diag { position: fixed; z-index: 99999; left: 8px; right: 8px; top: calc(env(safe-area-inset-top) + 4px);
    padding: 8px 10px; border-radius: 12px; background: rgba(255,255,255,0.95); color: #000;
    font: 600 11px/1.35 ui-monospace, Menlo, monospace; box-shadow: 0 4px 16px rgba(0,0,0,.35); }
  #diag b { color: #c00; }
  #diag button { margin: 6px 6px 0 0; padding: 6px 10px; border: 1px solid #000; border-radius: 8px;
    background: #fff; color: #000; font: inherit; }
`;

function sonda(css: string): HTMLElement {
  const el = document.createElement('div');
  el.style.cssText = `position:fixed;top:0;left:0;width:1px;visibility:hidden;pointer-events:none;${css}`;
  document.body.append(el);
  return el;
}

function alto(selector: string): string {
  const el = document.querySelector(selector);
  if (!el) return '—';
  const r = el.getBoundingClientRect();
  return `${Math.round(r.top)}→${Math.round(r.bottom)} (${Math.round(r.height)})`;
}

export function iniciarDiagnostico(): void {
  const estilo = document.createElement('style');
  estilo.textContent = COLORES;
  document.head.append(estilo);

  const sondas = {
    dvh: sonda('height:100dvh'),
    svh: sonda('height:100svh'),
    lvh: sonda('height:100lvh'),
    vh: sonda('height:100vh'),
    pct: sonda('height:100%'),
    safe: sonda('padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom);height:0'),
  };

  const caja = document.createElement('div');
  caja.id = 'diag';
  document.body.append(caja);

  let abierto = true;

  function pintar(): void {
    if (!abierto) {
      caja.innerHTML = '<button data-d="abrir">diag</button>';
      return;
    }
    const s = getComputedStyle(sondas.safe);
    const nav = document.querySelector('.barra-nav')?.getBoundingClientRect();
    const meta = (n: string) => document.querySelector(`meta[name="${n}"]`)?.getAttribute('content') ?? '—';
    const standalone =
      matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
    caja.innerHTML = `
      versión: ${__VERSION_APP__}<br>
      standalone: ${standalone} · dpr: ${devicePixelRatio}<br>
      <b>innerHeight: ${innerHeight}</b> · visualViewport: ${Math.round(visualViewport?.height ?? 0)}<br>
      <b>screen.height: ${screen.height}</b> · screen.width: ${screen.width}<br>
      safe top: ${s.paddingTop} · <b>safe bottom: ${s.paddingBottom}</b><br>
      100dvh: ${sondas.dvh.offsetHeight} · 100svh: ${sondas.svh.offsetHeight} · 100lvh: ${sondas.lvh.offsetHeight}<br>
      100vh: ${sondas.vh.offsetHeight} · 100% (fixed): ${sondas.pct.offsetHeight}<br>
      html: ${alto('html')}<br>
      body: ${alto('body')}<br>
      marco: ${alto('.app-marco')}<br>
      carrusel: ${alto('.carrusel')}<br>
      panel: ${alto('.panel[data-visible="true"]')}<br>
      barra: ${nav ? `${Math.round(nav.top)}→${Math.round(nav.bottom)}` : '—'}<br>
      viewport: ${meta('viewport')}<br>
      status bar: ${meta('apple-mobile-web-app-status-bar-style')}<br>
      arreglo de prueba: ${document.documentElement.style.getPropertyValue('--alto-app') || 'no'}<br>
      <button data-d="probar">Probar arreglo</button><button data-d="cerrar">Achicar</button>`;
  }

  caja.addEventListener('click', (e) => {
    const accion = (e.target as HTMLElement).closest<HTMLElement>('[data-d]')?.dataset.d;
    if (accion === 'cerrar') abierto = false;
    if (accion === 'abrir') abierto = true;
    if (accion === 'probar') {
      // Candidato: que el marco mida el alto real de la pantalla.
      const raiz = document.documentElement.style;
      if (raiz.getPropertyValue('--alto-app')) raiz.removeProperty('--alto-app');
      else raiz.setProperty('--alto-app', `${screen.height}px`);
    }
    pintar();
  });

  window.addEventListener('resize', pintar);
  visualViewport?.addEventListener('resize', pintar);
  setInterval(pintar, 1000);
  pintar();
}
