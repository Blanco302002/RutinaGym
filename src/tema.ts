// Modo claro / oscuro. "auto" sigue la configuración del iPhone.
// index.html aplica el tema guardado antes de pintar, para que no parpadee.

export type Tema = 'auto' | 'claro' | 'oscuro';

const CLAVE = 'rutina:tema';
const sistemaOscuro = window.matchMedia('(prefers-color-scheme: dark)');

function leerTema(): Tema {
  try {
    const t = localStorage.getItem(CLAVE);
    if (t === 'claro' || t === 'oscuro') return t;
  } catch {
    // Almacenamiento no disponible: usamos auto.
  }
  return 'auto';
}

let actual: Tema = leerTema();

export function temaActual(): Tema {
  return actual;
}

export function aplicarTema(): void {
  const oscuro = actual === 'oscuro' || (actual === 'auto' && sistemaOscuro.matches);
  document.documentElement.setAttribute('data-bs-theme', oscuro ? 'dark' : 'light');
}

export function elegirTema(tema: Tema): void {
  actual = tema;
  try {
    localStorage.setItem(CLAVE, actual);
  } catch {
    // Sin persistencia: el cambio vale hasta cerrar la app.
  }
  aplicarTema();
}

/** En modo auto, acompaña los cambios de claro/oscuro del sistema. */
export function seguirSistema(): void {
  sistemaOscuro.addEventListener('change', () => {
    if (actual === 'auto') aplicarTema();
  });
}
