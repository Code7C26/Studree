# Landing pública de Studree

> **Fecha:** 2026-10-21 · **Estado:** borrador del brainstorming, pendiente de aprobación
> **Maqueta elegida:** `.superpowers/brainstorm/1594-1792612319/content/landing-hero-opciones.html`
> (opción C) y `landing-estructura.html` (estructura de bloques).
> **Doc de feature a crear al implementar:** `docs/features/landing.md`

## 1. Intención

Studree es una app de apuntes cuyo fin es que el conocimiento que adquirís en un curso o una
carrera se pueda **clonar a una IA más potente que vos**, para que te ayude y llegues más lejos.
El puente es el Markdown: todo lo que escribiste se exporta (`Copiar para IA`, `.zip`) y el
asistente (el Brote, Fase 14) lo lee y trabaja con eso.

La landing es la puerta de entrada pública. Habla a estudiantes (secundario, universidad, cursos)
que **no consideran a la IA como herramienta de estudio**, o la usan como un chat suelto que no
sabe nada de su materia. Tiene que hacerles ver que, con sus apuntes ordenados, la IA deja de ser
genérica y estudia con *su* conocimiento.

Se presenta **todo el producto como terminado, incluida la Fase 14 (el Brote)**, por decisión del
estudiante.

## 2. Objetivos, no-objetivos y anti-objetivos

**Objetivos**
- Que en el hero se entienda la idea: el conocimiento crece como un árbol y una IA lo cuida con vos.
- Que el visitante entienda en segundos la diferencia entre una IA genérica y una IA con *sus*
  apuntes.
- Llevar a crear la cuenta (CTA "Empezar gratis" → login/registro).
- Verse como Studree: mismo sistema visual de la app (ADR-018), no una plantilla genérica de SaaS.

**No-objetivos**
- Blog, página de precios separada, textos legales completos, multilenguaje.
- Testimonios o métricas de usuarios (no existen; **no se inventan**).
- Animaciones pesadas o 3D; la landing no debe sumar peso notable al bundle de la app.

**Anti-objetivos** (fallaría aunque "funcione")
- Que parezca la plantilla genérica de IA: degradés violetas, tarjetas idénticas, ilustraciones
  de stock.
- Que el titular hable de "organizar materias" y no de la idea central (conocimiento + IA).
- Prometer algo que el producto no hace (p. ej. que la IA escriba sin aprobación del usuario).
- Testimonios, logos de universidades o cifras inventadas.
- Emojis como íconos (ADR-018); texto que no se lee bien sobre papel o sobre oscuro.
- **Que la landing altere la app:** cualquier cambio de comportamiento, estilo, peso o rutas de lo
  que ya funciona (ver § 6, Aislamiento).

## 3. Dirección visual (decidida)

- **Hero = opción C, "El conocimiento crece":** titular "El conocimiento no se guarda. Crece.",
  bajada, CTA primario "Empezar gratis" y, a la derecha, un árbol de materias (ramas, hojas,
  nodos con nombre de materia) con el **Brote** en la raíz. Fondo oscuro con luz verde suave.
- **Sistema:** el de la app. Modo oscuro (`bg`, `surface`), acento verde, **papel crema**
  (`paper`, `ink`) para todo lo que sea "una hoja", Bricolage Grotesque (títulos) + Inter
  (texto), íconos SVG. Colores solo desde `tailwind.config.js` (Mandamiento VII).
- **Una sola cosa memorable:** el árbol del hero. El resto, sobrio. El Brote aparece donde la
  IA actúa; no se reparte decoración.
- Movimiento: a lo sumo una animación de entrada del árbol. Respeta `prefers-reduced-motion`.
  Sin efectos de aparición en cada sección.
- Referencias de estructura de 21st.dev (hero con mockup, bento) solo como inspiración; no se
  copia código de terceros. Cualquier pieza que se adapte se anota en el doc de la feature.

## 4. Estructura de la página

| # | Bloque | Contenido |
|---|---|---|
| 1 | Hero | Opción C. CTA "Empezar gratis"; enlace secundario baja a "Cómo funciona". |
| 2 | El problema | Misma pregunta a un chat genérico (respuesta vaga) y al Brote con tus hojas (respuesta que cita tu apunte). |
| 3 | Cómo funciona | Tres pasos reales (esto sí es una secuencia): escribís tus hojas → se ordenan (Carrera → Materia → Hoja) → el Brote las lee y estudia con vos. |
| 4 | El Brote | Responde citando la hoja · refuta y completa un tema · resume una materia · toma examen · arma un plan con tus fechas. Propone, nunca escribe sin tu "Aceptar". Dos modos: solo mis apuntes / con conocimiento externo (marcado). |
| 5 | Tu carpeta | La base de la que lee la IA: hojas fechadas en papel crema con índice de temas, mapa de correlativas, Inicio con calendario y tareas. |
| 6 | Tu conocimiento es tuyo | Exportás todo a Markdown (`Copiar para IA`, `.zip`) cuando quieras. Datos separados por cuenta; la clave de la IA nunca llega al navegador. |
| 7 | Planes | Gratis y Premium, con qué incluye cada uno según `asistente-ia-design.md § 9`. **Sin precios ni topes numéricos** (siguen sin definirse). |
| 8 | Cierre | Un CTA final y pie de página. |

Todos los datos y capacidades de la landing deben coincidir con lo documentado en
`docs/features/*` y en `2026-10-19-asistente-ia-design.md`. Lo que se muestra en los mockups
(hojas, respuesta del Brote) son **ejemplos ilustrativos hechos a mano**, no capturas de datos
reales.

## 5. Decisiones que tomó el diseño (el estudiante no las pidió)

1. **Ruta:** la landing vive en `/` cuando **no hay sesión**; con sesión, `/` sigue siendo el
   Inicio (como hoy, Fase 12). Hoy `/` está detrás de `RequireAuth`; el cambio consiste en que, sin
   sesión, en vez de redirigir a `/entrar` se muestre la landing. El CTA lleva a `/entrar`.
2. **Estructura de carpetas:** `src/pages/LandingPage.jsx` y `src/features/landing/` con un
   componente por bloque. **Requiere permiso** (Mandamiento VI) y actualizar
   `docs/02-architecture.md` y la tabla de lookup de `CLAUDE.md` (y sus copias).
3. **Planes sin números:** se muestran las diferencias cualitativas y se evita fijar precios.
4. **Idioma y tono:** español rioplatense (voseo), directo, verbos simples, sin relleno.
5. **Contenido de mockups inventado a mano**, con un tema de ejemplo (Mitocondria, Biología
   celular).
6. **Logo/marca:** el logo SVG vigente (`public/`); el Brote como personaje SVG simple en la landing
   (la animación final se define en la Fase 14).
7. **Responsive:** la landing sí es responsive (celular incluido), aunque la app todavía no lo sea.
   El árbol del hero se apila bajo el titular en pantallas angostas.
8. **Calidad base:** contraste AA, foco visible, HTML semántico, sin dependencias nuevas, imágenes
   perezosas, mismo bundle principal (landing en chunk aparte con `lazy`).

9. **Sesión cargando:** `useAuth` ya expone `loading`. Mientras carga no se muestra ni la landing
   ni el Inicio (el mismo "Cargando…" neutro de `RequireAuth`), para que quien tiene sesión no
   vea un destello de la landing al recargar. El chunk de la landing se pide recién cuando se
   sabe que no hay sesión.
10. **CTA a registro:** `LoginPage` ya tiene modos `signin`/`signup`, pero sin parámetro de URL.
    Se agrega `?modo=registro` para que "Empezar gratis" abra directo en "Crear cuenta"; el enlace
    "Entrar" del menú abre el modo normal. Es un cambio mínimo en `LoginPage.jsx`.
11. **Hero, referencia visual:** las maquetas viven en `.superpowers/` (ignorado por git). Lo
    normativo es esta descripción: a la izquierda titular de tres líneas ("El conocimiento / no
    se guarda. / Crece." con "Crece." en verde), bajada y CTA; a la derecha un árbol en SVG con
    tronco, tres ramas que terminan en nodos-píldora con el nombre de una materia (Anatomía,
    Química, Biología), pequeñas hojas verdes en las puntas y el Brote al pie del tronco. Fondo
    `bg` con una luz verde radial detrás del árbol. El trazado exacto es del implementador.
12. **Planes provisorios:** la Fase 14 es un diseño aprobado pero el reparto Gratis/Premium
    (§ 9 de su spec) no tiene números; la landing muestra solo las diferencias cualitativas y se
    revisa cuando se fijen los topes.
13. **SEO básico:** se actualizan `<title>`, `meta description` y Open Graph de `index.html`
    (compartidos por toda la SPA, porque no hay prerenderizado). Sin sitemap ni `robots` propios.

## 6. Aislamiento: la landing no puede afectar a la app

**Permiso:** el estudiante autorizó crear `src/pages/LandingPage.jsx` y `src/features/landing/`
(2026-10-21), con la condición de que la landing no afecte a la app.

**Reglas:**
- Todo el código nuevo vive en esas dos ubicaciones. Ningún componente de la app importa algo de
  `features/landing/`, salvo la ruta que la carga con `lazy`.
- **No se modifican** `tailwind.config.js` ni `src/index.css` ni `constants/palette.js`. La landing
  usa solo los tokens existentes; lo que falte se resuelve con clases dentro de sus componentes.
  Así no puede cambiar el aspecto de ninguna pantalla de la app.
- **No se modifican** `RequireAuth`, `WorkspaceLayout`, `AuthProvider`, los services ni la base de
  datos. La landing no lee ni escribe datos.
- Chunk aparte (`lazy`): quien usa la app con sesión nunca descarga la landing.
- Sin dependencias nuevas.

**Únicos puntos de contacto con código existente (los tres cambios mínimos):**
1. `src/App.jsx` y `constants/routes.js`: la ruta `/` pasa a decidir entre landing e Inicio.
2. `src/pages/LoginPage.jsx`: leer `?modo=registro` para abrir en "Crear cuenta".
3. `index.html`: `<title>` y metadatos.

**Cómo se verifica antes de entregar** (no basta con que compile):
- `npm run build` y `npm run lint` sin errores nuevos; tamaño del chunk principal igual al de antes.
- Con sesión: `/` muestra el Inicio exactamente como hoy; recargar con sesión no muestra la landing.
- Sin sesión: `/` muestra la landing; `/carreras`, `/materias/:id` y `/hojas/:id` siguen
  redirigiendo a `/entrar` y, al entrar, vuelven a donde iba.
- Login, registro (con y sin `?modo=registro`), cerrar sesión y volver a entrar funcionan.
- Si hay tests (`npm test`), pasan sin cambios.

## 7. Fuera del código que se toca

- Si se toca `src/App.jsx`/rutas: leer `docs/features/navigation-shell.md` y `docs/features/home.md`.
- Documentar: `docs/features/landing.md` (nuevo), CHANGELOG, `01-project-overview.md` (fase) y
  `02-architecture.md` (carpeta nueva).

## 8. Criterios de éxito

- Sin sesión, `/` muestra la landing; con sesión, el Inicio de siempre. `/entrar` sigue igual.
- Un visitante que lee solo el hero y el bloque 2 puede explicar "mis apuntes → una IA que los usa".
- Ningún dato, testimonio o cifra inventado como real; los ejemplos están claramente armados a mano.
- Se ve bien en 375, 768, 1024 y 1440 px, sin scroll horizontal.
- `npm run build` sin errores; el bundle de la app no crece notablemente (landing en su propio chunk).
- Respeta `prefers-reduced-motion`; todo se maneja con teclado.

## 9. Qué se le deja al implementador

Redacción final de los textos (dentro del tono fijado), medidas y espaciados, el dibujo exacto
del árbol y del Brote en SVG, y el detalle de la animación de entrada.
