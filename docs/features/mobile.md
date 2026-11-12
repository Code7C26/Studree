# Feature: Celular, PWA y lectura sin señal

> **Estado:** ✅ Implementado (2026-11-10, Fase 16)
> **ADRs:** ADR-025 (celular primero, foto a hoja y PWA sin dependencias), ADR-007 (cache optimista)
> **Spec:** `docs/superpowers/specs/2026-11-10-fase-16-celular-camara-design.md` ·
> plan: `docs/superpowers/plans/2026-11-10-fase-16.md`
> **Archivos clave:** `src/hooks/useIsMobile.js`, `src/hooks/useFolder.js`,
> `src/pages/SubjectFolderPage.jsx`, `src/components/ui/Modal.jsx`,
> `src/components/features/folder/FolderSheet.jsx`, `public/manifest.webmanifest`,
> `public/sw.js`, `public/icons/*`, `src/main.jsx`, `index.html`

---

## Qué hace

- **Punto de corte único `md` (768 px):** por debajo, la app es celular. Lo detecta
  `useIsMobile` (`matchMedia('(max-width: 767px)')`, con listener para rotación) y comparte
  breakpoint con el explorador.
- **La Carpeta en celular:** la barra de vidrio se desliza en horizontal (no se corta ni se
  apila en tres filas), las hojas usan menos margen lateral, "Nueva hoja" queda al final a
  un gesto, y todo respeta los `safe-area-inset-*` del teléfono.
- **Botones táctiles de 44 px** en la barra de la Carpeta, la barra del editor y las pestañas.
- **Diálogos como hojas inferiores:** `Modal` se apoya abajo con `max-h: 90dvh` y scroll
  interno (escritorio igual que antes, centrado).
- **PWA instalable:** `manifest.webmanifest` (nombre, colores `#0d1117`, `standalone`, íconos
  192/512 generados desde el logo) y `sw.js` propio, registrado **solo en producción**.
- **Lectura sin señal:** la Carpeta pinta primero la cache (`localStorage`, ADR-007) de hojas
  y de la materia, y recién después consulta a Supabase. Si la red falla, lo que se ve no se
  borra: queda el aviso con "Reintentar" y las hojas guardadas. Escribir sin señal funciona
  como siempre (autosave reintenta; la hoja nueva queda como borrador local, ver
  `features/folder.md` y `features/sheet-editor.md`).

- **El Brote en el celular (2026-11-11):** el panel es una hoja inferior del 65 % del alto (no
  tapa todo) y la barra de atajos sobre el texto seleccionado va debajo de la selección, con
  botones táctiles (ver `features/assistant.md`).
- **Instalar desde la landing (2026-11-11):** la sección "Usalo donde estudies" tiene el botón
  de instalar (compu y Android, sin tiendas) y los pasos para iPhone (ver `features/landing.md`).
- **Foto a hoja** puede guardarse en una hoja nueva o al final de una hoja que ya existe (ver
  `features/photo-notes.md`).
- **Textos de cámara y celular** (`lib/i18n/{es,en}/{camera,mobile}.js`) estaban guardados en
  Latin-1 y en la web se veían con "�"; se pasaron a UTF-8 (2026-11-11).

## Cómo funciona por dentro

- `useFolder` pasa `onCached` a `sheetsService.list` y cachea la materia en
  `cacheKey('subject', <id>)`: ante fallo de red muestra lo guardado (`nextFolderSheets`
  conserva lo de pantalla ante error; probado en `lib/editor/folderSheets.test.js`).
- `sw.js` (sin dependencias):
  - **cache-first** para el shell: `/assets/` (build de Vite con hash), `/icons/`, `/logo.jpg`,
    `/manifest.webmanifest` y las fuentes de Google;
  - **network-first** para navegaciones: sin red muestra el shell guardado;
  - **nunca cachea** base, Storage, auth ni `functions/v1`: los datos del usuario no viven en
    un cache compartido (ver `docs/03-security.md`);
  - cache por versión (`studree-shell-v1`): una build nueva borra la vieja en `activate`.
- El registro del SW vive en `main.jsx` detrás de `import.meta.env.PROD`.

## Verificación `[ESTUDIANTE]`

1. Celular real (o DevTools 360×640): escribir, leer, crear hojas y abrir diálogos sin scroll
   horizontal de la página.
2. Instalar desde el menú del navegador ("Instalar Studree") con `npm run build` + `preview`.
3. Cargar una materia, cortar la red (DevTools → Offline), recargar: el shell abre y las hojas
   siguen visibles con el aviso de error y "Reintentar".

## Fuera de alcance

Sincronización de cambios sin conexión (solo lectura + borradores locales como hoy), varias
fotos por transcripción y notificaciones push.
