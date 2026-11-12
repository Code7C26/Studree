# Feature: Presentación del pitch (`pitch/`)

> **Estado:** ✅ Implementado (2026-11-11)
> **Archivos clave:** `pitch/index.html`, `pitch/styles.css`, `pitch/app.js`, `pitch/fonts/`,
> `pitch/assets/`, `pitch/media/`
> **Dependencias nuevas:** ninguna (HTML + CSS + JS sin frameworks ni CDN)

---

## Descripción

Diapositivas web para la defensa del proyecto (jueves 2026-11-12, 30 min). Son 16 diapositivas
16:9 con la marca de Studree (modo oscuro, acento verde, Bricolage Grotesque + Inter) y la de
Mnemora arriba. El texto de cada diapositiva apoya a la exposición: un dato o una frase fuerte,
nunca el guion completo.

**Se abre con doble click en `pitch/index.html`.** No necesita servidor ni internet: las fuentes
y los videos están dentro de la carpeta. Solo la demo (diapositiva 5) necesita internet, porque
se hace en la web desplegada.

## Decisiones

- **Defensa del proceso, no venta** (devolución de la profesora, 2026-11-11): el pitch final es como
  defender una tesis. Cuenta de dónde salió la idea, cómo se validó, en qué se diferencia de lo que ya
  existe, cómo se construyó, qué hizo cada uno y qué aprendieron. **Premium va como futuro**: hoy
  está la versión gratuita y el cobro se activa cuando haya demanda real. El guion para ensayar está
  fuera del repo (artifact privado del equipo).
- **Sin Reveal.js ni CDN** (decisión del equipo, 2026-11-11): un motor propio de ~200 líneas en
  `app.js`. Así funciona sin internet y no suma dependencias al proyecto.
- **Lienzo fijo de 1920×1080** que se escala a la pantalla (letterbox): se ve igual en el
  proyector, en una notebook y en pantalla completa.
- **Fuentes locales** (`pitch/fonts/`, Google Fonts, licencia OFL), subsets latin y latin-ext.
- **Videos dentro del repo** (`pitch/media/`): el spot (`spot.mp4`, 43 s) y el anuncio en inglés
  (`anuncio-en.mp4`, 40 s). Arrancan con Espacio o click, se agrandan a toda la diapositiva y al
  terminar vuelven a su lugar. Los fuentes de los videos están en `motion-architect/` (Remotion).
- **Un solo QR, a la landing** (`assets/qr-landing.svg` → `studree.vercel.app/bienvenida`): chico en
  la esquina de todas las diapositivas y grande en el cierre. Sin QR al repo (decisión del equipo,
  2026-11-11).
- **Flyer estilo Meta Ads** (feed de Instagram/Facebook, 4:5, 1080×1350): la fuente es
  `pitch/flyer.html` y se exporta a `pitch/media/flyer.png` con una captura del navegador (Edge
  headless, ventana de 1080×1350). Aparece en la diapositiva 12.
- **Sin notas del orador ni video de respaldo de la demo** (decisión del equipo).
- **Fuera de la regla de idiomas (ADR-023):** la presentación no es parte de la app (`src/`): no
  usa `t()` y está solo en castellano. El componente en inglés es el anuncio.

## Contenido y fuentes de los datos

| # | Diapositiva | Dato | Fuente |
|---|-------------|------|--------|
| 1 | Portada + spot | — | — |
| 2 | El problema | La pregunta del apunte perdido (el origen: la carpeta con hojas de bloc de Nico) | Encuesta de validación |
| 3 | Datos del problema | Solo el **5 %** dice que nunca pierde información | Matriz de la encuesta (rama `mateo-rama`) |
| 4 | Validación: encuesta | **76,2 %** muy útil · **71,4 %** probablemente la usaría | Encuesta (escala 1 a 5), 24 respuestas (dato del equipo) |
| 5 | Validación del cliente | CUPID + matriz impacto-frecuencia | `Perfil del Cliente y Validación de la Idea.pdf` |
| 6 | Lo que existe | Libreta/carpeta/Word, ChatGPT y Astra AI frente a Studree | La encuesta; Astra AI según su ficha de la App Store (tutor: subís material y te prepara para un examen) |
| 7 | La solución | Tus apuntes + una IA que los conoce | Producto |
| 8 | Demo en vivo | studree.vercel.app | — |
| 9 | Recorrido | Mayo → noviembre de 2026 · **230+** commits · **18** fases · 3 personas de afuera la probaron | `git log`, `docs/01-project-overview.md`, dato del equipo |
| 10 | I+D técnica | 621 tests · 25 ADR · 13 migraciones · de 5 niveles a la Carpeta (ADR-014, ADR-017) | `npm test`, `docs/02-architecture.md`, `supabase/migrations/` |
| 11 | Equipo | Mateo: investigación, negocio y documentación final · Nico: la idea y el desarrollo | Dato del equipo |
| 12 | Mercado | TAM **2.540.854** universitarios (pregrado y grado, 2022) · SAM **337.086** universitarios en Córdoba · SOM **40** estudiantes, como todo su curso, con la versión gratuita (el TP decía 100; el equipo lo bajó a algo concreto de hoy, sin meta de Premium) | Síntesis de Información Estadísticas Universitarias 2022-2023 (Min. de Capital Humano) · Indicadores Provinciales de CyT, Min. de Ciencia y Tecnología de Córdoba (2023) · TP de mercado |
| 13 | Lanzamiento | Hoy gratis (mantenerlo cuesta $0) · Premium **ARS 4.999/mes** cuando haya uso · equilibrio en **6 clientes**: $20.000 ÷ ($4.999 − $1.000) = 5,0 → 6 | `constants/plans.js`, TP de punto de equilibrio (costos al crecer) con el precio actual |
| 14 | Difusión | Anuncio en inglés, landing, Instagram @studree_ y el flyer grande, como se ve en el feed | — |
| 15 | Aprendizajes | Lo simple le gana a lo completo · los datos antes que las pantallas · la IA acelera, el criterio es nuestro | Historia del proyecto (ADR-014, ADR-017, migraciones, método AInnovate) |
| 16 | Cierre | "Empezá a hacer crecer tu árbol." + QR grande a la landing | — |

**Precio:** los TPs estimaban $7.000 y después $8.000; al lanzar se fijó en $4.999 para que sea
accesible a estudiantes. La presentación muestra solo el precio actual (el equipo pidió no mencionar
el del TP). Si cambia `PREMIUM_PRICE`, actualizar la diapositiva 13. El número de commits de la
diapositiva 9 va como piso redondo ("230+", con `data-suffix`): sigue siendo cierto aunque se sigan
sumando commits. Al 2026-11-12 eran 237.

## Controles

| Tecla | Acción |
|-------|--------|
| → · PageDown · Enter | Siguiente (los punteros de presentación mandan PageDown/PageUp) |
| ← · PageUp · Backspace | Anterior |
| Espacio | Reproduce o pausa el video de la diapositiva; si no hay video, avanza |
| Esc | Cierra el video agrandado |
| F | Pantalla completa |
| Inicio · Fin | Primera · última |
| ? | Ayuda con los atajos |

La URL guarda la diapositiva (`#5`), así que recargar no vuelve al principio.

## Pendiente

- [ ] Revisar la encuesta: 76,2 % y 71,4 % salen exactos sobre 21 respuestas (16/21 y 15/21), no
  sobre 24. Si 3 personas no contestaron esas preguntas, está bien; si no, corregir los porcentajes.
