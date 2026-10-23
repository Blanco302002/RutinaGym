# Rutina

PWA de rutina de gimnasio: TypeScript + Vite + Bootstrap, sin backend. Registra peso y repeticiones de cada serie en IndexedDB y muestra la evolución de cada ejercicio. Los tachados son de la semana actual: cada lunes la rutina arranca destildada y el historial queda.

## Comandos

```bash
npm install        # una vez
npm run dev        # desarrollo en http://localhost:5173 (sin service worker)
npm test           # tests de lógica (Vitest, corren en Node)
npm run build      # tipos + tests + genera dist/ (la app lista para instalar)
npm run preview    # sirve dist/ en http://localhost:4173
npm run icons      # regenera los íconos de public/icons
```

## Rutinas

Las rutinas se crean, editan y eliminan desde la app: **Ajustes → Rutinas**. Se guardan en IndexedDB (rutina → días → ejercicios en rutina), separadas de la identidad de cada ejercicio, que es la que guarda el historial. Puede haber varias rutinas; una sola está activa.

[`src/rutina.ts`](src/rutina.ts) ya no es la rutina que se usa: es la **semilla**. Se usa la primera vez que se abre esta versión con datos de antes (se arma "Rutina principal" con los mismos ids, así el historial queda conectado), como "Rutina de ejemplo" en un teléfono nuevo, y al importar un respaldo viejo sin rutinas.

Para publicar cambios de código: commit y push a `main`; el workflow de GitHub Actions compila, corre los tests y publica. El teléfono toma la versión nueva la próxima vez que abras la app con conexión.

## Colores de la app

Los temas (Azul marino y Rojo) están en [`src/temas-color.ts`](src/temas-color.ts). Para agregar o ajustar uno, editá esa lista: al compilar se convierte en CSS y aparece solo en Ajustes. Hay un test que verifica que cada color tenga buen contraste en modo claro y oscuro.

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
| `src/rutina.ts` | Rutina semilla (ver arriba) |
| `src/datos/` | Modelos (`Ejercicio`, `Rutina`, `DiaRutina`, `EjercicioEnRutina`, `Sesion`, `Serie`) e interfaces de repositorios |
| `src/datos/indexeddb/` | Implementación de los repositorios con IndexedDB (base v2) |
| `src/datos/index.ts` | Elige la implementación (para un backend, cambiar solo acá) |
| `src/dominio/` | Reglas: rutinas (crear, duplicar, eliminar, migración), sesión de la semana, estadísticas, frases, respaldo, cronómetro |
| `src/pantallas/` | Rutina (hoy), Historial, Sesión, Evolución, Cronómetro, Ajustes y los editores de rutinas |
| `src/ui/` | Barra de navegación, carrusel de pantallas, router, modal de series, diálogo, bienvenida, stepper, íconos |
| `src/sw.template.js` | Service worker (el build lo completa con la lista de archivos) |
| `src/temas-color.ts` | Temas de color (único lugar donde se definen) |
| `tests/` | Tests con Vitest + fake-indexeddb: reinicio semanal, respaldo, frases, repositorios, rutinas y migración, colores, cronómetro, gesto del carrusel |

El resto de la app solo usa las interfaces de `src/datos/repositorios.ts`. Un backend futuro implementa esas mismas interfaces (por ejemplo con `fetch`) y se cambia `crearRepositorios()` en `src/datos/index.ts`.
