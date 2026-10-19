# Fase 14: el Brote, asistente de IA

> **Fecha:** 2026-10-19 · **Estado:** borrador del brainstorming, pendiente de aprobación
> **Rama:** `fase-14`, creada desde `fase-13` (§ 11) · **Versión objetivo:** 0.17.0 ·
> **ADR nuevo:** ADR-021 (Asistente de IA; la 019 y la 020 son de la Fase 13) ·
> **Migración:** `0007_asistente.sql` (la `0006` es de la Fase 13)
> **Depende de:** rediseño visual (ADR-018) y de la Fase 13 (papelera, adjuntos), que está
> implementada en la rama `fase-13` y todavía no se mergeó a `rama-nicolas` (§ 11).
> **Maquetas elegidas:** `.superpowers/brainstorm/1771-1792409619/content/asistente-formas.html`
> y `personaje-opciones.html`.

## 1. Intención

Studree guarda los apuntes del estudiante en Markdown, ordenados en Carrera → Materia → Hoja.
Falta que alguien **estudie con ellos**: que los repase, los cuestione y los complete. El
estudiante lo describió así: estoy leyendo sobre la mitocondria y quiero que un asistente me diga
qué conceptos faltan, responda mis dudas y, si quiero, **lo escriba en mi hoja**. Además quiere
resúmenes de materias y pruebas tipo examen, como las de Astra IA.

El asistente es un personaje, **el Brote**, que vive siempre en pantalla. No es un chat de
preguntas frecuentes: conoce los apuntes de toda la carrera del usuario y puede actuar sobre sus
hojas, siempre con su permiso.

## 2. Objetivos, no-objetivos y anti-objetivos

**Objetivos**
- Un único punto de entrada: el Brote flotante, en toda la app con sesión.
- Conversar sobre los apuntes de **cualquier materia de la carrera**, no solo la abierta.
- Refutar, explicar y completar un tema, y **proponer** cambios a una hoja que el usuario acepta o
  rechaza.
- Resúmenes de materia y pruebas tipo examen con corrección explicada.
- Dos modos de fuente: **solo mis apuntes** o **con conocimiento externo**.
- Límite de uso por plan, controlado en el servidor (§ 8).

**No-objetivos (esta fase)**
- Cobrar de verdad o mostrar la pantalla de planes (Fase 17, § 9).
- Detector de huecos y conexiones entre materias (segunda etapa de la misma fase, § 5).
- Vectorización o búsqueda semántica (`DB_SCHEMA.md` lo difiere); se usa el índice de temas.
- Adaptación a celular (Fase 16) y compartir por link (Fase 15).
- Voz, imágenes o subir archivos al asistente.

**Anti-objetivos** (fallaría aunque "funcione")
- La IA escribe en una hoja **sin que el usuario lo apruebe**.
- Contenido de afuera mezclado con los apuntes sin marca visible.
- El Brote tapa lo que se está escribiendo, o la app se siente más lenta por él.
- La clave de Gemini, o cualquier secreto, llega al navegador.
- Un usuario ve o modifica datos de otro a través del asistente.

## 3. Cómo se usa

1. **Brote flotante** abajo a la derecha, siempre visible con sesión (no en login). Tocarlo abre el
   panel. Se anima según el estado: reposo, pensando, escribiendo, acierto, error, dormido.
2. **Panel lateral** (se abre desde el Brote): chat con acciones rápidas "Resumir materia" y
   "Tomame examen", más un selector de modo (apuntes / con conocimiento externo) y el alcance
   (hoja, materia o carrera).
3. **Atajos en el texto:** al seleccionar texto en una hoja aparece una barra con **Explicar,
   Refutar, Completar y Preguntame**. Cada uno abre el panel con la acción ya lanzada sobre esa
   selección.
4. El panel y la barra comparten el mismo asistente y la misma conversación.

## 4. Capacidades de la primera etapa

| Capacidad | Qué hace |
|---|---|
| Pregunta puntual | Responde usando las hojas que necesite, y cita de qué hoja salió. |
| Refutar / completar un tema | Marca conceptos faltantes o flojos y propone texto para agregar. |
| Explicar / Explicámelo simple | Reescribe un fragmento o tema con otras palabras o ejemplos. |
| Resumen de materia | Resume la materia o una selección de hojas; puede guardarlo como hoja nueva. |
| Prueba tipo examen | Opción múltiple, verdadero/falso y desarrollo; alcance elegible; corrección con explicación y referencia a la hoja. |
| Repaso de errores | Arma una prueba solo con lo que el usuario falló antes. |
| Plan de estudio | Usa las fechas importantes del Inicio para sugerir qué repasar y cuándo. |

## 5. Segunda etapa (misma fase, después de cerrar la primera)

- **Detector de huecos:** temas mencionados en una materia pero nunca desarrollados.
- **Conexiones entre materias:** avisa si un concepto aparece en otra materia del usuario.

## 6. Contexto: el mapa y las herramientas

El estudiante pidió que el asistente tenga "todo un `.md` con los mapas de dónde está la info".
No se manda la carrera completa en cada pregunta (lento, caro y poco preciso).

- En cada pedido, el servidor arma un **mapa liviano**: carreras, materias, hojas (id, fecha) y
  los temas `#` de cada hoja. Se calcula con la misma lógica que `extractHeadings`.
- El modelo recibe el mapa y **herramientas** para leer lo que necesita: leer una hoja, leer los
  temas de una materia, buscar texto. Las herramientas consultan Supabase **con la sesión del
  usuario**, así que RLS decide qué puede ver.
- El tamaño del mapa y de lo leído tiene un tope por pedido.

## 7. Escribir en la hoja

- El asistente **nunca escribe directamente**: devuelve una **propuesta** (Markdown a insertar o a
  reemplazar, con el lugar). El cliente la muestra resaltada y el usuario elige **Aceptar**,
  **Rechazar** o **Ver cambios**.
- Al aceptar, el cambio entra por el mismo camino que cualquier edición del usuario (editor y
  `useSheetAutosave`), para respetar las reglas vigentes: borrador local, autosave con debounce,
  una hoja nueva no se guarda hasta tener contenido y no se pisan cambios de otro dispositivo.
- **Marca de origen:** lo que viene de conocimiento externo se inserta con una marca visible
  (por ejemplo un bloque o línea "agregado por el Brote"). Lo agregado a partir de los apuntes del
  propio usuario no la lleva. *Decisión del diseño; el formato exacto es del implementador.*

## 8. Arquitectura y límites

- **Edge Function de Supabase** (`assistant`): único lugar que habla con Gemini. La clave de Gemini
  es un *secret* de la función, nunca un `VITE_*` (Mandamiento VIII).
- La función valida el JWT del usuario y **consulta datos con ese JWT** (cliente con la `anon key` y
  el token del usuario), nunca con `service_role`. Así RLS aplica igual que en la app.
- **Streaming** de la respuesta al panel.
- **Contenido de las hojas = datos, no instrucciones.** Un apunte que diga "ignorá lo anterior…" no
  puede cambiar el comportamiento del asistente. Las herramientas solo **leen**; la única salida de
  escritura es la propuesta que el usuario aprueba.
- **Cuotas en el servidor:** tabla de uso por usuario, por tipo de acción y por período. La función
  cuenta y rechaza al llegar al tope, con un mensaje claro. El cliente solo muestra el estado.
- **Plan del usuario:** un campo `plan` (`free` | `premium`) en base de datos, por defecto `free`.
  Hasta la Fase 17 se cambia a mano para probar.
- **Datos nuevos a modelar** (se documentan en `DB_SCHEMA.md` al implementar): uso de IA, plan,
  resultados de pruebas y temas fallados (para el repaso de errores). Todas con RLS por
  `auth.uid() = user_id`. El historial del chat **no se guarda** en esta fase: vive en la sesión.
- Los límites exactos de la capa gratuita de Gemini y el modelo a usar se **verifican al
  implementar**; no se asumen en este documento.

## 9. Planes (se definen ahora, se construyen en parte)

| | Gratis | Premium |
|---|---|---|
| Carreras, materias, hojas, Inicio, exportar | Todo | Todo |
| Preguntas puntuales y atajos | Tope diario | Tope diario mucho mayor |
| Resúmenes de materia | Pocos por mes | Ilimitados |
| Pruebas tipo examen | Pocas por mes, de una hoja | Ilimitadas, de materias enteras |
| Contexto de toda la carrera | Solo la materia actual | Toda la carrera |
| Repaso de errores y plan de estudio | No | Sí |
| Conocimiento externo | Limitado | Completo |

Los **números** de los topes y el precio son del equipo y se fijan en el plan de negocio del
proyecto; el código los lee de configuración, no los tiene escritos.

**Esta fase construye** el campo `plan`, el conteo de uso y los topes del servidor. **Fase 17
(pendiente, al final del roadmap):** pantalla de planes y checkout **simulado** para la demo. No se
integra ningún procesador de pagos.

## 10. El personaje

- **Brote:** brote verde redondo con dos hojas, boceto aprobado en `personaje-opciones.html`.
  Crece con el uso (más hojas cuantas más hojas de apuntes tiene el usuario).
- **Técnica:** animación 2D con look 3D (Lottie o Rive), **no** Three.js, para no sumar peso a un
  bundle que ya tiene un chunk de 539 kB y para que rinda en celular (Fase 16). Se carga de forma
  diferida. El diseño final y sus estados se afinan con Claude Design antes de implementar la
  animación.
- Íconos de la interfaz del panel en SVG, nunca emojis (ADR-018). Respeta `prefers-reduced-motion`.
  El Brote es un botón accesible con foco visible y nombre para lectores de pantalla.

## 11. Cruces con otras fases

- **Fase 13 (papelera, adjuntos, plantillas, importar):** ya está implementada en la rama
  `fase-13` (migración `0006` aplicada, ADR-019 y ADR-020, 0.16.0), pero **no está mergeada** a
  `rama-nicolas`. La Fase 14 se hace sobre una rama creada **desde `fase-13`**, para heredar la
  papelera (`deleted_at`), el script `npm test` (`node --test`) y los adjuntos. Mergear `fase-13`
  a `rama-nicolas` sigue siendo decisión del estudiante.
- **Papelera:** las herramientas del asistente **ignoran** carreras, materias y hojas con
  `deleted_at`: no ve lo que está en la papelera. No borra nada.
- **Adjuntos:** las referencias `adjunto:<id>` del Markdown se tratan como texto; el asistente no
  lee el contenido de los archivos.
- **Exportar para IA** ya existe; el mapa del § 6 puede reutilizar su lógica de recorrido.

## 12. Criterios de éxito

- Desde cualquier pantalla con sesión, el usuario abre el Brote y le pregunta algo de una materia
  distinta a la abierta; la respuesta cita la hoja de origen.
- Selecciona un párrafo, toca **Completar**, ve la propuesta resaltada, la acepta y queda guardada
  (con autosave) y marcada si era conocimiento externo.
- Genera un resumen y una prueba de una materia, la responde y recibe corrección explicada.
- Un usuario gratis que supera su tope recibe un mensaje claro y el servidor no llama a Gemini.
- La clave de Gemini no aparece en el bundle ni en el cliente.
- Con dos cuentas, ninguna ve datos de la otra a través del asistente.
- `npm run build` sin errores y sin sumar peso notable al bundle principal.

## 13. Decisiones que tomó el diseño (el estudiante no las pidió)

1. Edge Function única con herramientas de lectura que usan la sesión del usuario.
2. Mapa liviano + herramientas, en vez de mandar toda la carrera.
3. Historial de chat solo en sesión; sí se guardan resultados de pruebas y temas fallados.
4. Pagos simulados como Fase 17; en esta fase solo plan, conteo y topes.
5. Brote en 2D animado, no 3D real.
6. Marca de origen solo para conocimiento externo.
7. El asistente no borra hojas en esta fase.
