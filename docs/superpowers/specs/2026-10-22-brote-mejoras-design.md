# Fase 14.1: el Brote, mejoras de uso (respuestas en la hoja, exámenes, resúmenes y "Mi estudio")

> **Fecha:** 2026-10-22 · **Estado:** borrador del brainstorming, pendiente de aprobación
> **Rama:** `fase-14` (la Fase 14 todavía no se mergeó) · **Versión objetivo:** 0.18.0 (decisión del
> diseño) · **Migración:** `0009_mi_estudio.sql` · **ADR nuevo:** ADR-022 ("Mi estudio" y PDF por
> impresión del navegador)
> **Depende de:** la Fase 14 tal como está en `fase-14` (spec
> `2026-10-19-asistente-ia-design.md`, doc `docs/features/assistant.md`, ADR-021). Las reglas de
> esa fase siguen vigentes salvo donde este documento diga otra cosa.
> **Maqueta aprobada:** `.superpowers/brainstorm/1286-1792670734/content/mejoras-brote.html`
> (opción **C** para dónde viven resúmenes y exámenes).

## 1. Intención

El estudiante probó el Brote y le molestaron cuatro cosas:

1. **Los atajos responden en el chat**, no debajo del texto seleccionado como mostraba la maqueta
   de la Fase 14. Para leer la respuesta tiene que mirar a otro lado de la pantalla.
2. **Lo que acepta queda en el chat:** después de pasar a la hoja lo que propuso el Brote, la
   propuesta sigue ahí ocupando lugar ("es molesto").
3. **Los exámenes se hacen en la ventanita del chat.** Quiere una ventana más grande y, al
   terminar, que quede **un registro con las preguntas y su resultado**.
4. **Los resúmenes son texto suelto en el chat.** Quiere un documento más ordenado, que pueda
   **descargar en PDF** y también **abrir dentro de la app**.

Para ubicar resúmenes y exámenes eligió la opción **C**: una sección propia, **"Mi estudio"**, con
todo junto, y desde cada materia un acceso directo filtrado a lo de esa materia.

## 2. Objetivos, no-objetivos y anti-objetivos

**Objetivos**
- Los atajos (Explicar, Refutar, Completar, Preguntame) responden en una **tarjeta debajo del
  texto seleccionado**, sin abrir el panel.
- En la tarjeta, lo que el Brote propone se agrega a la hoja con un botón, y la tarjeta
  **desaparece** al agregarlo.
- En el panel, una propuesta ya resuelta **se achica a una línea**.
- Las pruebas se hacen en una **ventana grande**; al terminar queda guardado **el registro
  completo** (cada pregunta, la respuesta del usuario, si estuvo bien y la correcta).
- Los resúmenes salen como **documento ordenado**, se **guardan solos**, se abren en la app y se
  **descargan en PDF**.
- Nueva sección **"Mi estudio"** con resúmenes y exámenes, filtrable por materia, y un botón
  **"Estudio"** en cada carpeta que abre esa sección ya filtrada.

**No-objetivos**
- Cambiar planes, topes o precios: los límites de uso quedan exactamente como están. (El
  estudiante pidió no tratar lo de Premium por ahora.)
- Elegir la cantidad o el tipo de preguntas antes de un examen, repetir un examen, o PDF de un
  examen.
- Editar un resumen dentro de "Mi estudio" (para editarlo se guarda como hoja, § 6).
- Crear resúmenes o exámenes desde "Mi estudio": se siguen pidiendo al Brote.
- Guardar el historial del chat (sigue viviendo en la sesión).
- Adaptación fina a celular (Fase 16): solo se exige que nada se salga de la pantalla.
- El diseño final del personaje (pendiente con Claude Design).

**Anti-objetivos** (fallaría aunque "funcione")
- Algo entra en una hoja sin que el usuario toque "Agregar a la hoja" (o "Aceptar" en el panel).
- La tarjeta tapa lo que el usuario está escribiendo, o queda flotando sola cuando el texto ya no
  está en pantalla.
- Se pierde un resumen o un examen que ya gastó cupo por cerrar la ventana del examen, por navegar
  dentro de la app o porque falló el guardado sin avisar. (Cerrar o recargar la **pestaña del
  navegador** con un examen a medias sí lo pierde, como hoy pasa con el chat; ver § 5.)
- El PDF sale con partes de la interfaz (menú, botones, el Brote) o con el texto cortado.
- Algo que escribió el modelo se pinta como HTML.
- Un usuario ve resúmenes o exámenes de otro.

## 3. Respuestas de los atajos debajo del texto

**Cómo se usa**
1. El usuario selecciona texto en una hoja guardada y toca un atajo (la barra flotante actual no
   cambia).
2. Debajo del texto seleccionado aparece una **tarjeta del Brote**: título "Brote · Completar"
   (o el atajo que sea), una ✕ para cerrar, y la respuesta que va llegando. Mientras piensa
   muestra el estado ("Leyendo tus hojas…"). El panel **no se abre**.
3. Si el Brote propone texto para la hoja, la tarjeta lo muestra resaltado (como en la maqueta) y
   ofrece **Agregar a la hoja**, **Descartar** y **Seguir en el chat**. Si no propone nada, solo
   **Seguir en el chat** y la ✕.
4. **Agregar a la hoja** aplica la propuesta por el mismo camino de hoy (editor y autosave, con la
   verificación de la selección y la marca de conocimiento externo) y **la tarjeta desaparece**.
   El texto queda en la hoja; deshacer es el Ctrl+Z del editor.
5. **Seguir en el chat** abre el panel con ese intercambio ya cargado en la conversación (el
   pedido como mensaje del usuario, "Completar: «…»", la respuesta del Brote y la propuesta si
   seguía pendiente) y cierra la tarjeta.
6. **Preguntame:** la tarjeta muestra la pregunta del Brote y un cuadro chico para responder; la
   corrección llega en la misma tarjeta. Para seguir más allá de esa respuesta, "Seguir en el
   chat". *Decisión del diseño.*

**Reglas**
- Hay **una tarjeta a la vez**: un atajo nuevo reemplaza a la anterior (si estaba respondiendo,
  ese pedido se corta).
- La tarjeta se cierra con la ✕, con Esc, con Descartar, al agregar, al seguir en el chat o al
  salir de la carpeta. Cerrar mientras responde corta el pedido; el cupo se descuenta con las
  mismas reglas de hoy (Ruling Q).
- **Ubicación: dentro del texto, no flotando.** La tarjeta se mete en la hoja **debajo del párrafo
  donde termina la selección** y empuja hacia abajo lo que sigue, como en la maqueta; así nunca
  tapa lo que se está escribiendo y se mueve sola con el scroll. Es solo visual: **no forma parte
  del Markdown** ni se guarda (en TipTap, por ejemplo, un widget de decoración). Ancho de lectura,
  sin pasar unos 28 rem; en pantallas angostas usa el ancho disponible sin salirse. *Decisión del
  diseño, según la maqueta aprobada.*
- La tarjeta queda pegada a ese párrafo aunque el usuario cambie la selección o siga escribiendo
  en otro lado. Si el texto seleccionado se editó mientras tanto, "Agregar a la hoja" no reemplaza
  y avisa, como hoy. Si el párrafo se borra, la tarjeta se cierra.
- **Fuente:** usa el modo elegido en el panel ("Mis apuntes" o "Con conocimiento externo"; por
  defecto "Mis apuntes" aunque el panel nunca se haya abierto). Si es externo, la tarjeta lo dice
  y lo que se agrega lleva la marca de siempre.
- **Un pedido a la vez en todo el Brote**, como hoy: si el panel está respondiendo, la tarjeta
  avisa que espere; y al revés. *Decisión del diseño.*
- El pedido del atajo **no manda el historial del chat** (es sobre el texto seleccionado); la
  respuesta del Preguntame sí manda el intercambio de la propia tarjeta. *Decisión del diseño.*
- Los atajos siguen contando en el mismo balde que hoy. Sin cambios en el servidor para esta parte
  más allá de lo que haga falta para lo anterior.
- Accesible: la tarjeta tiene nombre para lectores de pantalla, anuncia la respuesta al terminar
  (no letra por letra), sus botones se alcanzan con Tab y Esc devuelve el foco al editor.

## 4. Propuestas en el panel

- Una propuesta **aceptada** se achica a una línea: "Agregado a tu hoja del 17/10" (la fecha de la
  hoja; "a una hoja nueva" si era `new_sheet`). Una **rechazada**, a "Descartado". Una que falló
  sigue mostrando el error, como hoy. *Decisión del diseño (el estudiante pidió que no moleste).*
- Cada propuesta se muestra **junto a la respuesta que la trajo**, no siempre al final del chat
  (hoy se apilan abajo de todo y por eso "se quedan"). *Decisión del diseño.*

## 5. Exámenes en una ventana grande y su registro

**La ventana**
- Cuando llega una prueba ("Tomame examen" o "Repaso de errores"), se abre una **ventana grande**
  sobre la app (centrada, ancha y alta, fondo oscurecido; en pantallas chicas, pantalla completa),
  no dentro del panel. El panel y el botón del Brote quedan detrás.
- Arriba: "Examen · {materia o alcance}", "Pregunta 3 de 10" con una barra de progreso,
  **Salir** y **Descartar prueba**. Las preguntas funcionan como hoy (opción múltiple,
  verdadero/falso, desarrollo con un cuadro más grande), con Anterior / Siguiente / Terminar.
- **Salir** (o Esc) cierra la ventana **sin perder la prueba**: en el panel queda "Tenés una
  prueba abierta · Seguir", que la vuelve a abrir donde estaba, aunque mientras tanto se haya
  navegado por la app. *Decisión del diseño: es una ventana sobre la página y no una página
  aparte, para no perder el lugar.*
- La prueba abierta vive en la sesión, como hoy: **no se guarda a medias**. Si el usuario intenta
  cerrar o recargar la pestaña con una prueba sin terminar (o mientras se arma un resumen), el
  navegador le pregunta si quiere salir. *Decisión del diseño: guardar pruebas a medias sería otra
  función.*
- Al terminar, en la misma ventana: **"Sacaste 7 de 10"** y **todas** las preguntas con ✔ o ✘;
  en las falladas, la respuesta del usuario, la correcta (o de referencia), la explicación y el
  link a la hoja de origen; las de desarrollo que no se pudieron corregir figuran "Sin corregir" y
  no cuentan en el puntaje (como hoy). Botones: **Ver en Mi estudio** y **Cerrar**.

**El registro**
- Al corregirse, el examen se guarda **con todo su detalle**: fecha, alcance (y materia cuando la
  hay), puntaje, y por pregunta: enunciado, tipo, opciones, respuesta del usuario, respuesta
  correcta o de referencia, si estuvo bien (o sin corregir), explicación, comentario de la
  corrección y hoja de origen.
- Se guarda en la tabla de intentos que ya existe (`quiz_attempts`), sumándole el detalle y la
  materia (§ 8). Los temas flojos para el Repaso de errores se siguen guardando como hoy.
- Si el guardado falla, la ventana lo dice y ofrece **Reintentar** (el resultado ya corregido no se
  pierde mientras la ventana siga abierta).

## 6. Resúmenes como documento

**Cómo sale**
- "Resumir materia" (con el alcance del panel, como hoy) ya no escribe el resumen en el chat. El
  Brote arma un **documento estructurado**:
  - título ("Resumen · Biología"), fecha, alcance, si usó conocimiento externo, y **en qué hojas se
    basó** (fecha de cada una, con link);
  - **secciones por tema**, cada una con su título y su desarrollo (párrafos y listas);
  - **conceptos clave**: términos con una línea de definición cada uno. *Decisión del diseño.*
- Mientras se arma, el panel muestra el progreso; al terminar, el chat muestra una sola línea
  "Tu resumen de Biología está listo · Abrir" y el resumen se abre en la ventana grande.
- Se **guarda solo** en "Mi estudio" apenas termina. *Decisión del diseño: ya gastó cupo, no puede
  depender de acordarse de guardarlo.* Si el guardado falla, se avisa y se ofrece Reintentar.
- Si la materia tiene más contenido del que entra en un pedido, el resumen lo dice ("basado en 12
  de 20 hojas"). *Decisión del diseño: honestidad antes que un resumen que parece completo.*

**Cómo se ve y se descarga**
- Abierto en la app (ventana grande o desde "Mi estudio"): papel claro, título, datos, secciones
  numeradas y conceptos clave, como en la maqueta.
- **Descargar PDF:** abre la ventana de impresión del navegador con una hoja de estilos de
  impresión que deja **solo el resumen** (sin menú, botones ni el Brote), en papel blanco, con
  márgenes y sin cortar secciones a la mitad cuando se pueda; el nombre sugerido del archivo es
  "Resumen - Biología - 22-10-2026". Junto al botón, una ayuda corta: "Elegí «Guardar como PDF»".
  *Decisión del diseño: sin librerías nuevas (Mandamiento X).*
- **Guardar como hoja:** cuando el resumen es de una sola materia, lo agrega como hoja nueva de esa
  materia (con la marca si usó conocimiento externo), por el mismo camino que una hoja nueva de
  hoy. Así se conserva lo que ya hacía la Fase 14 ("puede guardarlo como hoja nueva"). Cómo llega
  a la carpeta (navegar y agregar, por ejemplo) queda para el implementador.

## 7. "Mi estudio" (opción C)

- **Entrada propia** en la navegación de arriba: Inicio · Carreras · **Mi estudio** · Perfil.
- La página lista **Resúmenes** y **Exámenes** en dos pestañas, del más nuevo al más viejo, con un
  **filtro por materia**. Cada ítem muestra título, materia (o "Varias materias" si el alcance fue
  la carrera o todo), fecha y, en los exámenes, el puntaje ("7 de 10").
- Al abrir un ítem se ve el resumen (con Descargar PDF y Guardar como hoja) o el registro del
  examen (como el resultado de § 5). Cada ítem tiene su propia dirección para volver a abrirlo.
- **Desde cada materia:** un botón **"Estudio"** en la cabecera de la carpeta abre "Mi estudio"
  filtrado por esa materia. Los de alcance más amplio aparecen solo sin filtro.
- **Borrar:** cada resumen y cada examen se puede borrar, con confirmación. *Decisión del diseño:
  si no, la lista solo crece. Se borra de verdad (no va a la papelera).*
- **Papelera:** lo de una materia **o carrera** que está en la papelera no se muestra; si la
  materia o la carrera se borra para siempre, se borran sus resúmenes y exámenes (también los de
  alcance "toda la carrera"). Los de alcance "todas mis materias" no dependen de ninguna y quedan
  hasta que el usuario los borre. *Decisión del diseño.*
- Vacío: un texto que explica que los resúmenes y exámenes se piden al Brote.

## 8. Datos y servidor

- **Migración `0009_mi_estudio.sql`** (aditiva e idempotente, como la 0007):
  - `quiz_attempts`: se agregan la **materia** y la **carrera** (opcionales, referencias reales
    que se borran con ellas; la carrera también se completa cuando el alcance es una materia o una
    hoja), un **título** y el **detalle** de las preguntas (JSON, con un tope de tamaño). Los
    intentos viejos sin detalle se muestran solo con el puntaje.
  - Tabla nueva **`summaries`**: dueño, alcance, materia y carrera (igual que arriba), título, si
    usó conocimiento externo, hojas en las que se basó, contenido estructurado (JSON, con tope de
    tamaño) y fecha.
  - RLS por `auth.uid() = user_id` en todo, con lectura, alta y borrado propios. Sin funciones
    nuevas.
  - Se documenta en `DB_SCHEMA.md` y `03-security.md`.
- **Servidor (Edge Function `assistant`):** el resumen pasa a salida estructurada, con el mismo
  patrón que la prueba (el servidor junta las hojas del alcance dentro de los topes y pide la
  respuesta con un esquema; valida y recorta lo que devuelve el modelo y, si viene mal armado,
  falla cerrado). Un evento nuevo lleva el resumen al cliente. El cupo de resúmenes no cambia.
- El cliente guarda resúmenes y exámenes con la sesión del usuario (como hoy guarda los intentos).
- Todo lo que vino del modelo se muestra como texto (listas y negritas armadas como elementos de
  React, nunca HTML inyectado).

## 9. Entrega

- Se hace en la rama `fase-14` y sale como **0.18.0** en el CHANGELOG.
- Documentación: `docs/features/assistant.md` (atajos, propuestas, ventana del examen, resúmenes),
  un doc nuevo `docs/features/study.md` para "Mi estudio" (antes de codear, según el protocolo de
  `CLAUDE.md`), ADR-022 en `02-architecture.md`, `DB_SCHEMA.md`, `API_DOCS.md`, `03-security.md`,
  la tabla de lookup de `CLAUDE.md` y sus cuatro copias.
- La migración 0009 la aplica Claude (el estudiante lo autorizó para esta fase); el nuevo deploy de
  la función se confirma con el estudiante antes de hacerlo (Ley 4).

## 10. Criterios de éxito

- Selecciona un párrafo, toca **Completar**: la respuesta aparece debajo del párrafo, el panel no
  se abre; toca **Agregar a la hoja**, el texto queda guardado en la hoja y la tarjeta desaparece.
- Con **Preguntame**, responde en la tarjeta y recibe la corrección ahí mismo.
- **Seguir en el chat** abre el panel con el intercambio y la conversación sigue desde ahí.
- En el panel, una propuesta aceptada queda en una línea.
- Pide un examen: se abre la ventana grande; sale a mitad de camino y lo retoma sin perder
  respuestas; al terminar ve el puntaje y todas las preguntas, y el examen aparece en "Mi estudio"
  con su detalle.
- Pide un resumen: se abre ordenado, aparece en "Mi estudio", **Descargar PDF** produce un PDF solo
  con el resumen y legible, y **Guardar como hoja** lo agrega a la materia.
- Desde la carpeta, **Estudio** muestra solo lo de esa materia.
- Con dos cuentas, ninguna ve los resúmenes ni los exámenes de la otra.
- `npm test`, lint y `npm run build` pasan, sin dependencias nuevas.

## 11. Decisiones que tomó el diseño (el estudiante no las pidió)

1. En **Preguntame** la tarjeta tiene un cuadro para responder y corrige ahí.
2. Un pedido a la vez en todo el Brote (tarjeta y panel).
3. Los atajos no mandan el historial del chat.
4. Propuesta rechazada → "Descartado" en una línea; cada propuesta junto a su respuesta.
5. El examen es una ventana sobre la página (no una página), y "Salir" no lo pierde.
6. El resultado muestra todas las preguntas, no solo las falladas.
7. Conceptos clave con una línea de definición.
8. El resumen se guarda solo y dice en cuántas hojas se basó.
9. PDF con la impresión del navegador, sin librerías.
10. Se conserva "Guardar como hoja" del resumen.
11. Resúmenes y exámenes se pueden borrar (de verdad, con confirmación).
12. Versión 0.18.0 y ADR-022.
13. La tarjeta del atajo va dentro del texto (empuja lo de abajo), no flotando encima.
14. Una prueba a medias no se guarda: cerrar la pestaña la pierde, con aviso del navegador.
15. Resúmenes y exámenes siguen a su materia y a su carrera (papelera y borrado definitivo).
