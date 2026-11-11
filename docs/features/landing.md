# Landing pública

> Spec: `docs/superpowers/specs/2026-10-21-landing-design.md` · plan: `docs/superpowers/plans/2026-10-21-landing.md`.

## Qué es

La puerta de entrada pública de Studree, en **`/bienvenida`**. Cuenta una idea: los apuntes que
escribís se pueden exportar a Markdown y dárselos a una IA (el Brote) que los conoce, para
completar temas, tomar examen y responder dudas. Presenta el producto, incluida la Fase 14,
como terminado.

## Ruta y cuándo aparece

- `ROUTES.welcome = '/bienvenida'`, declarada en `App.jsx` **fuera de `AppLayout`** (sin header
  ni explorador). La página se carga con `lazy` en su propio chunk.
- **Primera visita (2026-11-11, al desplegar):** quien entra por `/` desde un dispositivo que
  nunca usó Studree va a la landing (`useFirstVisitRedirect` en `App.jsx`). Al abrirla se guarda
  `studree:ui:landing-seen` (`useMarkLandingSeen`), así que "Empezar gratis" → `/` ya muestra el
  Inicio y las visitas siguientes van directo a la app.
- "Primera visita" = no hay ninguna clave `studree:` en `localStorage` salvo el idioma
  (`lib/landing/firstVisit.js`, con test). Quien ya usaba Studree en ese dispositivo tiene cache
  y no ve la landing de golpe.
- Solo se desvía la raíz: un link directo (una materia, `/compartido/...`) entra normal.
- `studree:ui:landing-seen` es del dispositivo: sobrevive a "cerrar sesión" (`PRESERVED_KEYS`).
- Desde la app se llega con **"Conocé Studree"**, al pie del Perfil.
- `AuthProvider` sigue creando la sesión anónima a todo visitante nuevo, también en
  `/bienvenida`: no se tocó.

## Estructura

| Archivo | Responsabilidad |
|---|---|
| `pages/LandingPage.jsx` | Compone los bloques; scrollea el documento (sin contenedor interno, para que Espacio y RePág funcionen). |
| `src/features/landing/landingCopy.js` | Casi todos los textos y `START_PATH` (Mandamiento II). Carpeta de primer nivel, no `components/features/`. |
| `paperTones.js` | Verde de los títulos sobre el papel (AA, de `getSubjectTones`). |
| `LandingNav`, `HeroSection`, `HeroTree`, `Brote` | Barra, hero y el árbol de materias con el Brote (SVG). |
| `ProblemSection`, `HowItWorksSection`, `BroteSection`, `FolderSection`, `OwnershipSection`, `PlansSection`, `ClosingSection`, `LandingFooter` | Un bloque cada uno. |
| `PaperSheet` | Hoja de papel crema con renglones, como la carpeta de la app. |
| `landingCopy.test.js` | `node --test`: sin emojis, precios ni cifras de usuarios inventadas. |

## Reglas

- **Aislamiento:** no se modifican `tailwind.config.js`, `index.css`, `package.json`, `LoginPage`,
  `AuthProvider` ni servicios. Solo tokens existentes. La landing no lee ni escribe datos del
  usuario; lo único que guarda es la marca `studree:ui:landing-seen` del dispositivo.
- "Empezar gratis" → `/` (entra como invitado; la cuenta con email se agrega en el Perfil). No hay
  botón "Entrar": `/entrar` rebota a quien ya tiene sesión.
- Los ejemplos (hojas, respuesta del Brote) son ilustrativos y hechos a mano. Sin testimonios,
  logos ni cifras de usuarios.
- Planes: solo diferencias cualitativas (`asistente-ia-design.md § 9`); sin precios ni topes.
- Una animación de entrada (el árbol se dibuja), solo con `prefers-reduced-motion: no-preference`.
- Si cambia lo que hace el Brote o los planes, actualizar `landingCopy.js`.

## Cómo probarla

`npm run dev` y abrir `/bienvenida`. Verificar: `/` sigue mostrando el Inicio; 375, 768, 1024 y
1440 px sin scroll horizontal; Tab recorre todo con foco visible; con "reducir movimiento" no hay
animación. Tests: `node --test "src/features/landing/*.test.js"`.

## Idioma (Fase 18)

La landing se ve en castellano o inglés. **No lleva selector propio**: sigue el idioma guardado en el
dispositivo (el que se elige en Perfil) o, si no hay ninguno, el del navegador. Consecuencia: quien entra por
primera vez con el navegador en castellano la ve en castellano, aunque prefiera inglés; si molesta, se puede
sumar un selector chico más adelante.

- Todo el copy vive en los diccionarios `src/lib/i18n/{es,en}/landing.js` (misma forma que antes:
  `hero`, `navLinks`, `problem`, `steps`, `brote`, `folder`, `ownership`, `plans`, `closing`, `footer`).
  `landingCopy.js` quedó con `START_PATH` y `getLandingCopy(lang)`; cada bloque llama a `useI18n()` y lee su
  parte del copy. En inglés el asistente se llama "Sprout".
- `landingCopy.test.js` aplica las mismas reglas de contenido (sin emojis, precios, cifras inventadas ni
  promesas de que el asistente escriba solo) a **los dos idiomas** y verifica que tengan la misma cantidad de
  textos.
- Los anclas (`#como-funciona`, `#brote`, `#planes`) y el `<title>`/Open Graph de `index.html` quedan igual
  (el título estático sigue en castellano).
