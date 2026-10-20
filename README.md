# Rutina

PWA de rutina de gimnasio: TypeScript + Vite + Bootstrap, sin backend. Registra peso y repeticiones de cada serie en IndexedDB y muestra la evolución de cada ejercicio. Los tachados son de la semana actual: cada lunes la rutina arranca destildada y el historial queda.

## Comandos

```bash
npm install        # una vez
npm run dev        # desarrollo en http://localhost:5173 (sin service worker)
npm test           # tests de dominio y repositorios
npm run build      # tipos + tests + genera dist/ (la app lista para instalar)
npm run preview    # sirve dist/ en http://localhost:4173
npm run icons      # regenera los íconos de public/icons
```

## Editar la rutina

Todo está en [`src/rutina.ts`](src/rutina.ts). Cambiá nombres, series o notas (no cambies el `id` de un ejercicio si querés conservar su historial), hacé commit y push a `main`: el workflow de GitHub Actions compila y publica solo. El teléfono toma la versión nueva la próxima vez que abras la app con conexión.

## Pasarla al iPhone

iOS solo activa el service worker (modo offline) si la página viene por **HTTPS**; por eso se publica en GitHub Pages. Después de instalarla funciona sin internet.

1. En el repo de GitHub: *Settings → Pages → Source: GitHub Actions*.
2. Push a `main` y abrí en el iPhone la URL de Pages (`https://<usuario>.github.io/<repo>/`), con Safari o Chrome.
3. **Safari:** botón Compartir → *Agregar a pantalla de inicio*.
   **Chrome:** botón Compartir (arriba a la derecha) → *Agregar a pantalla de inicio*.
4. Abrí la app desde el ícono: va en pantalla completa, sin barra del navegador.

> Los datos de la app instalada son independientes de los del navegador. Si la borrás de la pantalla de inicio, se borra todo: exportá un respaldo desde Ajustes antes.

## Estructura

| Carpeta / archivo | Qué hace |
| --- | --- |
| `src/rutina.ts` | La rutina (lo único que tenés que tocar) |
| `src/datos/` | Modelos (`Ejercicio`, `Sesion`, `Serie`) e interfaces de repositorios |
| `src/datos/indexeddb/` | Implementación de los repositorios con IndexedDB |
| `src/datos/index.ts` | Elige la implementación (para un backend, cambiar solo acá) |
| `src/dominio/` | Reglas: sesión de la semana, estadísticas, frases de progreso, respaldo |
| `src/pantallas/` | Hoy, Historial, Sesión, Evolución, Ajustes |
| `src/ui/` | Barra de navegación, router, modal de series, stepper, íconos |
| `src/sw.template.js` | Service worker (el build lo completa con la lista de archivos) |
| `tests/` | Tests con Vitest (+ fake-indexeddb) |

El resto de la app solo usa las interfaces de `src/datos/repositorios.ts`. Un backend futuro implementa esas mismas interfaces (por ejemplo con `fetch`) y se cambia `crearRepositorios()` en `src/datos/index.ts`.
