# Fase 18 — Studree en inglés (diseño)

> Fecha: 2026-10-28 · Estado: borrador para aprobación · Hoja de ruta:
> `docs/01-project-overview.md` (Fase 18).

## Intención

Que cualquier persona pueda usar Studree en **inglés o castellano**, como en cualquier web:
un selector de idioma dentro de la configuración, sin molestar en el resto de la app. Hoy
todo el texto de la interfaz está escrito a mano en castellano rioplatense (74 componentes
`.jsx`, sin ningún sistema de idiomas).

## Qué pidió el estudiante (sus palabras, resumidas)

- "Simplemente un botón para poner inglés o español como en todas las web."
- "Puede estar en configuración, así no molesta."
- El Brote (asistente): "si le hablás en inglés responde en inglés". Responde en el idioma en
  que le escriben, sin depender del selector.

Todo lo demás de este documento es **decisión de quien diseña** (marcada "mi decisión") y se
puede cambiar.

## Objetivos

1. Selector **Castellano / English** en la pantalla **Perfil** (no existe una pantalla
   "Configuración"; Perfil es lo más cercano). Al elegir, **toda la interfaz** cambia al
   instante, sin recargar.
2. El idioma elegido se **recuerda** entre sesiones.
3. El Brote **contesta en el idioma del mensaje del usuario**.
4. Fechas, horas y orden alfabético siguen el idioma elegido.
5. El castellano queda **idéntico** al de hoy (cero regresiones de texto).

## No-objetivos

- **El contenido del usuario no se traduce:** hojas, nombres de carreras y materias, notas
  rápidas, tareas, fechas importantes.
- Otros idiomas además de los dos. La estructura debe permitir sumarlos después, pero no se
  construye ninguno más.
- Idiomas de derecha a izquierda; formatos de moneda o número específicos de un país.
- Traducir con una API externa en tiempo de ejecución.
- Un selector de idioma en la landing (ver "Landing").

## Anti-objetivos (fallaría aunque "ande")

- Texto en castellano que sobrevive en modo inglés (aunque sea un botón, un `aria-label`, un
  `title`, un placeholder o un mensaje de error).
- Que alguien en inglés vea errores del servidor en castellano.
- Que una cadena larga en inglés rompa un layout (botones, pastillas, tabs, tarjetas).
- Una dependencia nueva de npm sin autorización (regla del proyecto).
- Que el castellano cambie de redacción.

## Decisiones

### Sistema de idiomas (mi decisión)

- **Diccionario propio, sin librería.** Dos archivos de diccionario (`es`, `en`) con claves
  agrupadas por feature (`home.greeting`, `folder.exportAll`, …), una función `t(clave,
  valores?)` con interpolación (`{name}`) y plurales simples, y un proveedor de React que
  expone `t`, el idioma y `setLang`. La lógica es JS puro con JSDoc (ADR-002); los
  componentes solo llaman a `t`.
- **Carpetas nuevas** (hace falta autorización, Mandamiento VI): `src/lib/i18n/`
  (diccionarios y función `t`, puro y testeable con `node --test`) y el hook/proveedor en
  `src/hooks/` y `src/components/layout/`, como el resto de proveedores. Ninguna otra.
- **Idioma inicial:** el guardado; si no hay, el del navegador (`en*` → inglés, el resto →
  castellano). Se guarda en `localStorage` (clave nueva en `constants/storageKeys.js`, con el
  prefijo `studree:ui:`). Es una preferencia del dispositivo: **no se guarda en Supabase** (así
  no hay migración).
- `document.documentElement.lang` se actualiza al cambiar (accesibilidad).
- **Textos que hoy viven en constantes** (etiquetas de estado de materia, tipos de recurso,
  nombres de plantillas de fábrica, nombres de colores, límites, etc.) pasan a guardar una
  **clave** y se traducen al renderizar, no al definirse.
- **Plantillas de hoja de fábrica:** su contenido es Markdown que termina siendo contenido del
  usuario; se crea en el idioma activo **al momento de crear la hoja** y después no cambia.

### Datos en Supabase (verificado en el código)

- La base guarda **identificadores, no textos de pantalla**: `subjects.status`
  (`pendiente|cursando|aprobada`), `prerequisites.kind` (`cursar|rendir`), colores en hex. No
  hay filas sembradas con nombres en castellano. **No hace falta migración**; las etiquetas se
  traducen en el cliente a partir de esos identificadores, que no cambian.

### Fechas y orden (mi decisión)

- **El castellano no cambia ni un carácter.** Los formateadores actuales
  (`lib/format/sheetDate.js`, resumen de Inicio, calendario, "Próximas") se mantienen para
  `es`; para `en` se usa `Intl` con `en-US`. Se les pasa el idioma como argumento.
- Los `localeCompare(…, 'es')` usan el idioma activo.

### El Brote y los mensajes del servidor

- **Regla (del estudiante):** en `chat` y `shortcut`, el Brote responde en el idioma del
  mensaje del usuario.
- **Mi decisión:** el pedido a la Edge Function suma un campo `uiLang` (`'es'|'en'`). Se usa
  como **desempate** cuando el mensaje es ambiguo (por ejemplo, un atajo sobre un texto) y como
  idioma de las acciones que no tienen mensaje escrito (`summary`, `quiz`, `weak_review`,
  `study_plan`, `gaps`, `connections`, que salen de un botón). El `prompt.js` cambia la línea
  "hablás en castellano rioplatense" por la regla de idioma; el **registro rioplatense se
  mantiene cuando responde en castellano**.
- **Errores y cuotas (verificado en el código):** hoy `decideAccess` solo manda `code:
  'feature'|'quota'` y un `message` distinto por función o por balde; los errores del stream
  (`STREAM_ERRORS`) sí tienen un `code` por tipo. El cliente hoy no se guía por `code`. Por eso
  el servidor suma un campo **`reason`** (el nombre de la función o del balde que se agotó,
  p. ej. `weakReview`, `chat`) y mantiene `code` y `message` como están. El cliente traduce por
  `code` + `reason`; si llega algo desconocido, muestra el `message` del servidor. Los textos
  de `translateAssistantError` pasan por `t`.
- **Hay que volver a desplegar la función** `assistant` (paso **[ESTUDIANTE]**: el código no
  lo despliega ni carga secretos sin confirmación). Mientras no se despliegue, todo anda, pero
  los mensajes de tope y de función Premium llegan en castellano y las respuestas del Brote no
  siguen la regla de idioma.
- **Contenido generado por la IA** (resúmenes, exámenes, registros de Mi estudio, hojas
  creadas desde una propuesta): se genera en el idioma de ese momento y **queda congelado**,
  como las plantillas. Lo ya guardado no se retraduce.
- **Errores de terceros** (Supabase Auth, PostgREST, navegador): se traducen los de **nuestro**
  código y los frecuentes del login (credenciales inválidas, email ya registrado, contraseña
  débil, red caída) por su código; el resto muestra un mensaje genérico traducido, no el texto
  crudo en inglés o castellano del proveedor.

### Landing (mi decisión)

- `/bienvenida` también se traduce y sigue el idioma guardado o el del navegador. **No** lleva
  selector propio (el estudiante pidió el botón solo en configuración). Consecuencia: un
  visitante con navegador en castellano que prefiera inglés no puede cambiarlo antes de entrar.
  Se acepta; si molesta, se agrega un selector chico después.
- `landingCopy.test.js` (sin emojis, precios ni cifras inventadas) se extiende a los textos en
  inglés.
- `index.html` (`<title>`, descripción, Open Graph) queda estático en castellano.

### Cómo se construye (mi decisión, por etapas)

1. **Base:** carpeta `i18n`, `t`, proveedor, clave de storage, selector en Perfil, tests de
   paridad entre `es` y `en`.
2. **Shell, Inicio, Perfil, Papelera y login.**
3. **Carpeta y editor** (barra de herramientas, adjuntos, plantillas, importar, exportar).
4. **Carreras, mapa de carrera, Mi estudio y el Brote** (panel, tarjetas, examen, resúmenes) +
   cambio del `prompt.js` y de los errores del servidor.
5. **Landing.**
6. **Barrido final:** búsqueda de castellano que quedó, revisión visual en inglés de cada
   pantalla.

### Pruebas (mi decisión)

- Test de paridad: `es` y `en` tienen **exactamente las mismas claves** y los mismos
  `{marcadores}`.
- Tests de `t` (interpolación, plural, clave inexistente → devuelve la clave en desarrollo y
  el castellano en producción, nunca vacío).
- Test que revise los `.jsx`/`.js` de `src/` en busca de texto en castellano suelto (letras con
  tilde o `¿`/`¡` dentro de JSX o de literales) con una lista corta de excepciones. **El
  constructor decide la heurística exacta**; el objetivo es que no se cuele castellano nuevo.
- Verificación manual en navegador de las pantallas principales en inglés, en escritorio.

## Documentación (Mandamientos III, IV, V)

- `docs/features/i18n.md` (nuevo): qué hace, cómo agregar una clave, cómo agregar un idioma.
- **ADR-023** en `docs/02-architecture.md` (diccionario propio frente a librería, qué se
  traduce y qué no, idioma como preferencia del dispositivo).
- `docs/API_DOCS.md`: campo `uiLang` del pedido y traducción de errores por `code`.
- `docs/features/assistant.md`, `landing.md`, `profile.md`: la parte de idioma.
- `docs/01-project-overview.md` (Fase 18) y `CHANGELOG.md`.
- `docs/DB_SCHEMA.md`: **sin cambios** (no hay datos nuevos en Supabase).
- Fila nueva en la tabla de lookup de `CLAUDE.md` (y sus 4 copias) para `src/lib/i18n/**`.

## Riesgos conocidos

- **Volumen:** unas 8.000 líneas de JSX con texto a mano; es trabajo mecánico pero grande y
  fácil de dejar a medias. Por eso las etapas y el test que detecta castellano suelto.
- **Textos con variables y plurales** ("3 hojas", "Hace 2 días"): hay que reescribirlos como
  claves con valores, no concatenar.
- **El Brote en dos idiomas:** el modelo puede equivocarse de idioma en mensajes cortos o
  mezclados; `uiLang` lo mitiga, no lo garantiza.
- **Rama base:** la Fase 18 toca casi todas las pantallas, incluida la landing (rama
  `landing`) y el asistente y Mi estudio (rama `fase-14`), que todavía no están mergeadas a
  `main`.

## Lo que queda a criterio del constructor

- Nombres exactos de claves y su agrupación.
- Cómo se resuelven los plurales (helper propio mínimo).
- La heurística del test de castellano suelto.
- Los textos en inglés (redacción natural, no literal); se revisan al final.
- Si el texto estructural de los archivos exportados (`.md`, `.zip`) sigue el idioma activo:
  por defecto **sí**, salvo que rompa la importación de un export viejo (el importador debe
  seguir leyendo los exports en castellano).
