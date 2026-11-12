# Feature: Presentación del pitch (`pitch/`)

> **Estado:** ✅ Implementado (2026-11-11)
> **Archivos clave:** `pitch/index.html`, `pitch/styles.css`, `pitch/app.js`, `pitch/fonts/`,
> `pitch/assets/`, `pitch/media/`
> **Dependencias nuevas:** ninguna (HTML + CSS + JS sin frameworks ni CDN)

---

## Descripción

Diapositivas web para la defensa del proyecto (jueves 2026-11-12, 30 min). Son 12 diapositivas
16:9 con la marca de Studree (modo oscuro, acento verde, Bricolage Grotesque + Inter) y la de
Mnemora arriba. El texto de cada diapositiva apoya a la exposición: un dato o una frase fuerte,
nunca el guion completo.

**Se abre con doble click en `pitch/index.html`.** No necesita servidor ni internet: las fuentes
y los videos están dentro de la carpeta. Solo la demo (diapositiva 5) necesita internet, porque
se hace en la web desplegada.

## Decisiones

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
| 2 | El problema | La pregunta del apunte perdido | Encuesta de validación |
| 3 | Datos del problema | Solo el **5 %** dice que nunca pierde información | Matriz de la encuesta (rama `mateo-rama`) |
| 4 | La solución | Tus apuntes + una IA que los conoce | Producto |
| 5 | Demo en vivo | studree.vercel.app | — |
| 6 | Validación: encuesta | **76,2 %** muy útil · **71,4 %** probablemente la usaría | Encuesta (escala 1 a 5), 24 respuestas (dato del equipo) |
| 7 | Validación del cliente | CUPID + matriz impacto-frecuencia | `Perfil del Cliente y Validación de la Idea.pdf` |
| 8 | I+D técnica | 621 tests · 25 ADR · 13 migraciones · de 5 niveles a la Carpeta (ADR-014, ADR-017) | `npm test`, `docs/02-architecture.md`, `supabase/migrations/` |
| 9 | Mercado | TAM **2.540.854** universitarios (pregrado y grado, 2022) · SAM **337.086** universitarios en Córdoba · SOM 100 usuarios / 10 Premium | Síntesis de Información Estadísticas Universitarias 2022-2023 (Min. de Capital Humano) · Indicadores Provinciales de CyT, Min. de Ciencia y Tecnología de Córdoba (2023) · TP de mercado |
| 10 | Modelo de negocio | Freemium: Gratis $0 / Premium **ARS 4.999/mes** y sus topes | `constants/plans.js`, `supabase/functions/assistant/config.js` |
| 11 | Finanzas | Equilibrio en **6 clientes**: $20.000 ÷ ($4.999 − $1.000) = 5,0 → 6 | TP de punto de equilibrio (costos al lanzar) con el precio actual |
| 12 | Difusión y cierre | Anuncio en inglés, landing, Instagram @studree_, flyer, QR a la landing | — |

**Precio:** los TPs estimaban $7.000 y después $8.000; al lanzar se fijó en $4.999 para que sea
accesible a estudiantes. La presentación muestra solo el precio actual (el equipo pidió no mencionar
el del TP). Si cambia `PREMIUM_PRICE`, actualizar las diapositivas 10 y 11.

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
