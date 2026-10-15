# Plantillas de hoja

## Estado

✅ Implementado (2026-10-15, Fase 13). Migración `0006_fase13.sql` aplicada el 2026-10-15.

## Archivos clave

- `src/constants/sheetTemplates.js` — las 4 de fábrica y los límites.
- `src/services/sheetTemplates.service.js` — CRUD de las propias (`sheet_templates`).
- `src/hooks/useSheetTemplates.js` — fábrica + propias, con validación.
- `src/components/features/templates/NewSheetButton.jsx` — botón partido "Nueva hoja ▾".
- `src/components/features/templates/TemplatesManager.jsx` — administrar las propias.
- `src/pages/SubjectFolderPage.jsx`, `src/components/features/folder/FolderSheet.jsx` — conexión.

## Descripción

Al crear una hoja se puede partir de una plantilla: un texto Markdown con estructura.
Hay 4 de fábrica (en el código) y las que guarda cada usuario (en la base).

## Las 4 de fábrica

| id | Nombre | Contenido |
|----|--------|-----------|
| `factory:clase` | Clase | `# Clase`, Conceptos clave, Ejemplos, Dudas para preguntar |
| `factory:resumen` | Resumen | `# Resumen`, Idea principal, Puntos clave, Para recordar |
| `factory:practica` | Práctica | `# Práctica`, Ejercicio 1 (enunciado/resolución), Errores que cometí |
| `factory:repaso` | Repaso para parcial | `# Repaso`, Temas que entran, Fórmulas y definiciones, Preguntas de práctica |

Todas arrancan con un `#` para que aparezcan en el índice de temas. No se pueden borrar.

## Propias

Tabla `sheet_templates` (migración 0006, ver `DB_SCHEMA.md`): `id`, `user_id`, `name`
(1..60), `content_md` (1..20000), `created_at`, `updated_at`. RLS por usuario.

## Flujos

- **Nueva hoja ▾:** el botón principal crea una hoja en blanco; la flecha abre el menú
  con las de fábrica, las "Tuyas" y "Administrar plantillas…".
- **Guardar como plantilla:** botón en la barra de cada hoja; pide un nombre y guarda el
  contenido actual del editor, sin las referencias a adjuntos (`stripAttachmentRefs`).
- **Administrar:** modal para renombrar, editar el Markdown y borrar (con confirmación).

## Regla

Una hoja creada desde una plantilla se guarda al crearse (`createNow`), aunque el
usuario todavía no haya escrito: tiene contenido. La hoja en blanco sigue sin guardarse
hasta tener contenido.

## Errores

Nombre vacío o de más de 60 caracteres, contenido vacío o de más de 20000, o falla de
red/RLS: el hook devuelve el mensaje y la UI lo muestra en el diálogo.

## Pendiente

- [ ] Verificar en el navegador (la extensión de Chrome no estaba conectada al implementar): crear una hoja desde "Clase", guardar una hoja como plantilla y administrar las propias.
- [ ] Plantillas por materia o compartidas.
- [ ] Reordenar las propias.
