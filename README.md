# Rutina

PWA de rutina de gimnasio: TypeScript + Vite + Bootstrap, sin backend. Los tachados se guardan en `localStorage` y se borran solos cuando arranca una semana nueva (la semana empieza el lunes).

## Comandos

```bash
npm install        # una vez
npm run dev        # desarrollo en http://localhost:5173 (sin service worker)
npm run build      # genera dist/ (la app lista para instalar)
npm run preview    # sirve dist/ en http://localhost:4173
npm run icons      # regenera los íconos de public/icons
```

## Editar la rutina

Todo está en [`src/rutina.ts`](src/rutina.ts). Cambiá nombres, series o notas, corré `npm run build` y volvé a subir `dist/`. El teléfono toma la versión nueva la próxima vez que abras la app con conexión.

## Pasarla al iPhone

iOS solo activa el service worker (modo offline) si la página viene por **HTTPS**, así que hay que subir `dist/` una vez a algún hosting estático gratuito. Después de instalarla funciona sin internet.

1. Subí la carpeta `dist/` a GitHub Pages, Netlify o Cloudflare Pages.
2. Abrí la URL en el iPhone, con Safari o Chrome.
3. **Safari:** botón Compartir → *Agregar a pantalla de inicio*.
   **Chrome:** botón Compartir (arriba a la derecha) → *Agregar a pantalla de inicio*.
4. Abrí la app desde el ícono: va en pantalla completa, sin barra del navegador.

> Los datos de la app instalada son independientes de los del navegador. Si la borrás de la pantalla de inicio, se borran los tachados.

## Archivos

| Archivo | Qué hace |
| --- | --- |
| `src/rutina.ts` | La rutina (lo único que tenés que tocar) |
| `src/estado.ts` | Tachados en localStorage + reinicio semanal |
| `src/tema.ts` | Modo claro / oscuro / automático |
| `src/main.ts` | Pantalla e interacción |
| `src/sw.template.js` | Service worker (el build lo completa con la lista de archivos) |
| `public/manifest.json` | Manifest de la PWA |
