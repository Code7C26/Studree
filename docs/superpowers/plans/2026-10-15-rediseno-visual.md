# Rediseño visual (lámpara + bento + papel crema) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rediseñar la presentación del Inicio y la Carpeta (hojas centradas, color por materia, estilo "lámpara + bento + papel crema", logo original) sin tocar datos ni lógica.

**Architecture:** Tokens nuevos en Tailwind + clases de componente en `index.css`; una tabla estática de tonos por color de materia que se inyecta como variables CSS en la Carpeta; el shell oculta explorador/tabs en `/` y el explorador arranca cerrado; los componentes del Inicio y la Carpeta cambian solo su JSX/clases.

**Tech Stack:** React 18, Vite 5, Tailwind 3.4, JS + JSDoc. Tests: scripts Node (`node:assert`) en el scratchpad de la sesión, como en las fases anteriores (el repo no tiene runner de tests).

**Spec:** `docs/superpowers/specs/2026-10-15-rediseno-visual-design.md`

## Global Constraints

- Sin dependencias npm nuevas. Fuentes desde Google Fonts (`Inter`, `Bricolage Grotesque`) con `display=swap`.
- Colores solo desde `tailwind.config.js` (Mandamiento VII); los colores por dato (materia) van por `style`/variables CSS.
- Papel `#fbf8ef`, renglón `#ebe5d5`, borde de papel `#e3dcc9`, tinta `#2b2620`, tinta suave `#7a6f5a`, post-it `#fff3a8` / tinta `#3b3415`.
- Nada de: etiquetas en MAYÚSCULAS (`uppercase tracking-wide`), texto en degradé, emojis como íconos, `outline-none` sin foco visible, `transition: all`.
- Animaciones: solo `transform`/`opacity`, desactivadas con `prefers-reduced-motion`.
- No cambia ningún service, hook de datos, tabla ni RLS. `useHome`, `useFolder`, `useSheetAutosave` intactos.
- Docs + CHANGELOG (0.15.0) en el mismo cambio; `CLAUDE.md` se copia a `.cursorrules`, `.windsurfrules`, `.clinerules`, `.github/copilot-instructions.md`.
- Verificación: `npx eslint src` (no `npm run lint`: falla por `.claude/worktrees`), `npm run build`.

## Review Focus

1. **Materia con color fuera de la paleta o `null`** (materias viejas): la Carpeta y la tab deben verse con el verde, no sin color ni con `undefined` en el CSS → test en Task 2.
2. **Ruta `/` con tabs guardadas en cache**: al volver al Inicio no deben aparecer tabs ni explorador, y al ir a una materia las tabs siguen ahí → checklist manual Task 5.
3. **Ancho intermedio (768–1023 px)**: la grilla de la Carpeta no debe desbordar ni dejar las hojas angostas → captura a 768 px en Task 9.
4. **Saludo en los bordes de hora (5:59 / 6:00 / 12:59 / 13:00 / 19:59 / 20:00)** → test en Task 4.
5. **Navegación solo con teclado**: el ✕ de tabs, el borrar hoja y los botones de íconos deben verse con foco → grep + prueba con Tab en Task 9.

---

## File Structure

| Archivo | Responsabilidad |
|---|---|
| `tailwind.config.js` | Tokens (papel crema, tinta, post-it, fuente display) |
| `src/index.css` | `.lamp`, `.glass`, `.paper-sheet`, foco global, editor con variables de materia |
| `index.html` | Fuentes, favicon `logo.jpg`, `theme-color` |
| `public/logo.jpg` (nuevo), `public/logo.svg` (borrar) | Logo original |
| `src/constants/subjectTones.js` (nuevo) | Tabla de tonos + `getSubjectTones`, `subjectCssVars` |
| `src/lib/home/greeting.js` (nuevo) | `greetingFor`, `formatLongDay`, `describeNextDate` |
| `src/components/ui/Icon.jsx` (nuevo) | Íconos SVG inline |
| `src/components/layout/{Header,WorkspaceLayout,TabBar}.jsx` | Shell |
| `src/pages/SubjectFolderPage.jsx`, `features/folder/*`, `sheetEditor/EditorToolbar.jsx` | Carpeta |
| `src/pages/HomePage.jsx`, `features/home/*` | Inicio |
| `src/constants/storageKeys.js` | `uiExplorerOpen` |

Tests (scratchpad `SP=C:\Users\nicom\AppData\Local\Temp\claude\c--Users-nicom-FAT-Studree\d93e251d-61b5-4058-89d6-4729f0b879a5\scratchpad`): `test_redesign_tokens.mjs`, `test_subject_tones.mjs`, `test_greeting.mjs`, `suite_redesign.sh`.

---

### Task 1: Tokens, clases base, fuentes y logo

**Files:**
- Modify: `tailwind.config.js`, `src/index.css`, `index.html`
- Create: `public/logo.jpg` (desde git) · Delete: `public/logo.svg`
- Test: `$SP/test_redesign_tokens.mjs`

**Interfaces:**
- Produces: clases Tailwind `bg-paper`, `bg-paper-line`, `border-paper-border`, `text-ink`, `text-ink-muted`, `bg-postit`, `text-postit-ink`, `font-display`; clases CSS `.lamp`, `.glass`, `.paper-sheet`; variables CSS consumidas por el editor: `--subject`, `--subject-ink`, `--subject-light`, `--subject-soft` (con fallback al verde).

- [ ] **Step 1: Test que falla** — `$SP/test_redesign_tokens.mjs`:

```js
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const root = 'C:/Users/nicom/FAT/Studree/'
const cfg = (await import('file:///' + root + 'tailwind.config.js')).default
const c = cfg.theme.extend.colors
assert.equal(c.paper.DEFAULT, '#fbf8ef'); assert.equal(c.paper.line, '#ebe5d5'); assert.equal(c.paper.border, '#e3dcc9')
assert.equal(c.ink.DEFAULT, '#2b2620'); assert.equal(c.ink.muted, '#7a6f5a')
assert.equal(c.postit.DEFAULT, '#fff3a8'); assert.equal(c.postit.ink, '#3b3415')
assert.equal(cfg.theme.extend.fontFamily.display[0], 'Bricolage Grotesque')

// contraste WCAG
const lum = (hex) => { const v = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4)); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2] }
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05) }
assert.ok(ratio(c.ink.DEFAULT, c.paper.DEFAULT) >= 7, 'ink/paper')
assert.ok(ratio(c.ink.muted, c.paper.DEFAULT) >= 4.5, 'ink-muted/paper')
assert.ok(ratio(c.postit.ink, c.postit.DEFAULT) >= 7, 'postit')
assert.ok(ratio(c.text.muted, '#13181f') >= 4.5, 'text-muted sobre vidrio')

const css = readFileSync(root + 'src/index.css', 'utf8')
for (const k of ['.lamp', '.glass', '.paper-sheet', ':focus-visible', 'var(--subject-ink', 'prefers-reduced-motion']) assert.ok(css.includes(k), 'css: ' + k)
const html = readFileSync(root + 'index.html', 'utf8')
assert.ok(html.includes('/logo.jpg') && !html.includes('logo.svg'), 'favicon')
assert.ok(html.includes('name="theme-color" content="#0d1117"'), 'theme-color')
assert.ok(html.includes('Bricolage+Grotesque') && html.includes('display=swap'), 'fuentes')
assert.ok(readFileSync(root + 'public/logo.jpg').length > 1000, 'logo.jpg')
console.log('tokens OK')
```

- [ ] **Step 2: Correr y ver que falla** — `node "$SP/test_redesign_tokens.mjs"` → FAIL en `paper.DEFAULT`.

- [ ] **Step 3: `tailwind.config.js`** — reemplazar los bloques `paper` e `ink` y agregar `postit` y `display`:

```js
        // Papel de la carpeta (ADR-017, ADR-018): papel crema con renglones,
        // como una hoja de carpeta real sobre el escritorio oscuro.
        paper: {
          DEFAULT: '#fbf8ef', // hoja
          line: '#ebe5d5', // renglones
          border: '#e3dcc9', // bordes / separadores sobre el papel
        },
        ink: {
          DEFAULT: '#2b2620', // texto sobre el papel (tinta cálida)
          muted: '#7a6f5a', // fecha y texto secundario sobre el papel
        },
        // Notas rápidas del Inicio (post-it).
        postit: {
          DEFAULT: '#fff3a8',
          ink: '#3b3415',
        },
```

y en `fontFamily`:

```js
        sans: ['Inter', 'system-ui', 'Segoe UI', 'sans-serif'],
        // Títulos, saludo, números grandes y marca (ADR-018).
        display: ['Bricolage Grotesque', 'Inter', 'system-ui', 'sans-serif'],
```

- [ ] **Step 4: `index.html`** — en `<head>`, reemplazar el favicon y agregar:

```html
    <meta name="theme-color" content="#0d1117" />
    <link rel="icon" type="image/jpeg" href="/logo.jpg" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      rel="stylesheet"
      href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=Inter:wght@400;500;600;700&display=swap"
    />
```

Descripción: `content="Studree — tus materias como carpetas de hojas, listas para estudiar y exportar a IA."`

- [ ] **Step 5: Logo** — `git show 6fb2f30^:public/logo.jpg > public/logo.jpg`; `git rm public/logo.svg`. Verificar que no queden referencias: `grep -rn "logo.svg" src index.html` → vacío (el Header se actualiza en Task 5; si el grep encuentra `Header.jsx`, cambiar ya `src="/logo.svg"` por `src="/logo.jpg"`).

- [ ] **Step 6: `src/index.css`** — en `@layer base`, después de `body`:

```css
  h1, h2, h3 {
    text-wrap: balance;
  }

  /* Foco visible y uniforme (web-design-guidelines): reemplaza los outline-none. */
  :focus-visible {
    @apply outline outline-2 outline-offset-2 outline-accent-soft;
  }
```

En `@layer components`, antes del bloque del editor:

```css
  /*
   * La lámpara (ADR-018): un único cono de luz verde suave desde arriba a la
   * izquierda. Estático. El contenedor necesita `relative` e `isolate`.
   */
  .lamp::before {
    content: '';
    position: absolute;
    left: -10%;
    top: -35%;
    width: 85%;
    height: 110%;
    pointer-events: none;
    z-index: -1;
    background: radial-gradient(
      ellipse 60% 55% at 35% 30%,
      theme('colors.accent.soft / 20%'),
      theme('colors.accent.DEFAULT / 7%') 45%,
      transparent 72%
    );
  }

  /* Panel de vidrio translúcido sobre la luz. */
  .glass {
    @apply rounded-xl border border-white/[0.07] bg-surface/60 backdrop-blur-md;
  }

  /* Hoja: papel crema con renglones y sombra de escritorio. */
  .paper-sheet {
    @apply bg-paper text-ink;
    background-image: repeating-linear-gradient(
      transparent,
      transparent 27px,
      theme('colors.paper.line') 28px
    );
    box-shadow: 0 22px 48px rgb(0 0 0 / 0.55);
  }

  @media (prefers-reduced-motion: reduce) {
    .motion-peek {
      transition: none !important;
      transform: none !important;
    }
  }
```

En el bloque del editor, cambiar estas reglas (el resto queda):

```css
  .sheet-editor .ProseMirror h1 {
    @apply mb-3 mt-6 font-display text-3xl font-extrabold first:mt-0;
    color: var(--subject-ink, theme('colors.accent.hover'));
  }
  .sheet-editor .ProseMirror h2 {
    @apply mb-2 mt-5 font-display text-xl font-bold text-ink first:mt-0;
  }
  .sheet-editor .ProseMirror blockquote {
    @apply my-3 border-l-2 pl-4 text-ink-muted;
    border-color: var(--subject, theme('colors.accent.DEFAULT'));
  }
  .sheet-editor .ProseMirror a,
  .sheet-editor .wiki-link {
    @apply cursor-pointer underline underline-offset-2;
    color: var(--subject-ink, theme('colors.accent.hover'));
  }
```

(Borrar las reglas viejas de `a` y `.wiki-link`. Actualizar el comentario "PAPEL BLANCO" → "PAPEL CREMA (ADR-018)".)

- [ ] **Step 7: Correr el test** → `tokens OK`. Correr `npm run build` → OK.

- [ ] **Step 8: Commit**

```bash
git add tailwind.config.js src/index.css index.html public/logo.jpg public/logo.svg
git commit -m "feat(estilos): papel crema, lámpara, vidrio, foco visible, fuentes y logo original"
```

---

### Task 2: Tonos por color de materia

**Files:**
- Create: `src/constants/subjectTones.js`
- Test: `$SP/test_subject_tones.mjs`

**Interfaces:**
- Consumes: `PALETTE`, `DEFAULT_COLOR` de `src/constants/palette.js`.
- Produces:
  - `getSubjectTones(color?: string|null) → { base, onPaper, onDark, soft }` (hex/rgba strings).
  - `subjectCssVars(color?: string|null) → { '--subject', '--subject-ink', '--subject-light', '--subject-soft' }` (objeto para `style`).

- [ ] **Step 1: Test que falla** — `$SP/test_subject_tones.mjs`:

```js
import assert from 'node:assert/strict'
const t = await import('file:///C:/Users/nicom/FAT/Studree/src/constants/subjectTones.js')
const { PALETTE } = await import('file:///C:/Users/nicom/FAT/Studree/src/constants/palette.js')
const lum = (hex) => { const v = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4)); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2] }
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05) }

for (const { value } of PALETTE) {
  const tones = t.getSubjectTones(value)
  assert.equal(tones.base, value)
  assert.ok(ratio(tones.onPaper, '#fbf8ef') >= 4.5, `onPaper ${value}`)
  assert.ok(ratio(tones.onDark, '#0d1117') >= 4.5, `onDark ${value}`)
  assert.match(tones.soft, /^rgba\(/)
}
// mayúsculas
assert.deepEqual(t.getSubjectTones('#3B82F6'), t.getSubjectTones('#3b82f6'))
// fuera de paleta / null / undefined / basura → verde
const green = t.getSubjectTones('#22c55e')
for (const odd of ['#123456', null, undefined, '', 'rojo']) assert.deepEqual(t.getSubjectTones(odd), green)
// variables CSS
assert.deepEqual(t.subjectCssVars('#8b5cf6'), {
  '--subject': '#8b5cf6', '--subject-ink': '#6d28d9', '--subject-light': '#c4b5fd', '--subject-soft': 'rgba(139,92,246,.16)',
})
assert.equal(t.subjectCssVars(null)['--subject'], '#22c55e')
console.log('subject tones OK')
```

- [ ] **Step 2: Correr** → FAIL (módulo no existe).

- [ ] **Step 3: Implementar** — `src/constants/subjectTones.js`:

```js
/**
 * Tonos de cada color de materia (ADR-018). Ver docs/features/folder.md.
 *
 * Las materias usan la paleta fija de `palette.js`. Cada color tiene tres
 * variantes elegidas para pasar contraste (≥ 4.5:1): `onPaper` para títulos y
 * links sobre el papel crema, `onDark` para el índice sobre el fondo oscuro y
 * `soft` como fondo del tema activo. Son valores POR DATO: se aplican con
 * `style` / variables CSS (Mandamiento II permite inline para lo dinámico).
 */

import { DEFAULT_COLOR } from './palette.js'

/** @typedef {{base: string, onPaper: string, onDark: string, soft: string}} SubjectTones */

/** @type {Readonly<Record<string, SubjectTones>>} */
const TONES = Object.freeze({
  '#22c55e': { base: '#22c55e', onPaper: '#15803d', onDark: '#86efac', soft: 'rgba(34,197,94,.16)' },
  '#3b82f6': { base: '#3b82f6', onPaper: '#1d4ed8', onDark: '#93c5fd', soft: 'rgba(59,130,246,.16)' },
  '#8b5cf6': { base: '#8b5cf6', onPaper: '#6d28d9', onDark: '#c4b5fd', soft: 'rgba(139,92,246,.16)' },
  '#f59e0b': { base: '#f59e0b', onPaper: '#b45309', onDark: '#fcd34d', soft: 'rgba(245,158,11,.16)' },
  '#ec4899': { base: '#ec4899', onPaper: '#be185d', onDark: '#f9a8d4', soft: 'rgba(236,72,153,.16)' },
  '#06b6d4': { base: '#06b6d4', onPaper: '#0e7490', onDark: '#67e8f9', soft: 'rgba(6,182,212,.16)' },
})

/**
 * @param {string|null} [color] - `subjects.color`.
 * @returns {SubjectTones} Los del verde si el color no es de la paleta.
 */
export function getSubjectTones(color) {
  const key = typeof color === 'string' ? color.toLowerCase() : ''
  return TONES[key] ?? TONES[DEFAULT_COLOR]
}

/**
 * Variables CSS para el contenedor de una materia (las usa `index.css`).
 * @param {string|null} [color]
 * @returns {Record<string, string>}
 */
export function subjectCssVars(color) {
  const tones = getSubjectTones(color)
  return {
    '--subject': tones.base,
    '--subject-ink': tones.onPaper,
    '--subject-light': tones.onDark,
    '--subject-soft': tones.soft,
  }
}
```

- [ ] **Step 4: Correr** → `subject tones OK`.

- [ ] **Step 5: Commit** — `git add src/constants/subjectTones.js && git commit -m "feat(estilos): tonos con contraste por color de materia"`

---

### Task 3: Íconos SVG

**Files:**
- Create: `src/components/ui/Icon.jsx`

**Interfaces:**
- Produces: `<Icon name="search|close|plus|edit|book-open|sidebar|chevron-left|chevron-right|arrow-up|arrow-down|file-text|link" size={16} className? />` — siempre `aria-hidden="true"`; el botón que lo contiene pone el `aria-label`.

- [ ] **Step 1: Implementar**

```jsx
/**
 * Íconos SVG inline (stroke, estilo Lucide) — reemplazan a los emojis usados
 * como íconos (web-design-guidelines, ADR-018). Sin dependencias.
 * Siempre decorativos: el botón que los contiene lleva el `aria-label`.
 */

/** @type {Record<string, string[]>} paths de cada ícono (viewBox 24×24). */
const PATHS = {
  search: ['M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z', 'm21 21-4.3-4.3'],
  close: ['M18 6 6 18', 'm6 6 12 12'],
  plus: ['M12 5v14', 'M5 12h14'],
  edit: ['M12 20h9', 'M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z'],
  'book-open': ['M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2Z', 'M22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7Z'],
  sidebar: ['M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z', 'M9 3v18'],
  'chevron-left': ['m15 18-6-6 6-6'],
  'chevron-right': ['m9 18 6-6-6-6'],
  'arrow-up': ['m5 12 7-7 7 7', 'M12 19V5'],
  'arrow-down': ['M12 5v14', 'm19 12-7 7-7-7'],
  'file-text': ['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z', 'M14 2v6h6', 'M8 13h8', 'M8 17h5'],
  link: ['M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7', 'M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7'],
}

/**
 * @param {Object} props
 * @param {keyof typeof PATHS} props.name
 * @param {number} [props.size=16]
 * @param {string} [props.className]
 */
export function Icon({ name, size = 16, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={`shrink-0 ${className}`}
    >
      {(PATHS[name] ?? []).map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  )
}
```

- [ ] **Step 2: Verificar** — `npx eslint src/components/ui/Icon.jsx` → sin errores.

- [ ] **Step 3: Commit** — `git add src/components/ui/Icon.jsx && git commit -m "feat(ui): set de íconos SVG propios"`

---

### Task 4: Saludo del Inicio (lógica pura)

**Files:**
- Create: `src/lib/home/greeting.js`
- Test: `$SP/test_greeting.mjs`

**Interfaces:**
- Produces:
  - `greetingFor(date: Date) → 'Buenos días.'|'Buenas tardes.'|'Buenas noches.'` (6:00–12:59 días, 13:00–19:59 tardes, resto noches).
  - `formatLongDay(date: Date) → 'Jueves 15 de octubre'`.
  - `describeNextDate(title: string, days: number) → string` — 0: `hoy tenés ${title}`, 1: `mañana tenés ${title}`, n>1: `${title} en ${n} días`.

- [ ] **Step 1: Test que falla**

```js
import assert from 'node:assert/strict'
const g = await import('file:///C:/Users/nicom/FAT/Studree/src/lib/home/greeting.js')
const at = (h, m) => new Date(2026, 9, 15, h, m)
assert.equal(g.greetingFor(at(5, 59)), 'Buenas noches.')
assert.equal(g.greetingFor(at(6, 0)), 'Buenos días.')
assert.equal(g.greetingFor(at(12, 59)), 'Buenos días.')
assert.equal(g.greetingFor(at(13, 0)), 'Buenas tardes.')
assert.equal(g.greetingFor(at(19, 59)), 'Buenas tardes.')
assert.equal(g.greetingFor(at(20, 0)), 'Buenas noches.')
assert.equal(g.formatLongDay(new Date(2026, 9, 15)), 'Jueves 15 de octubre')
assert.equal(g.formatLongDay(new Date(2026, 0, 1)), 'Jueves 1 de enero')
assert.equal(g.describeNextDate('el parcial de Química', 0), 'hoy tenés el parcial de Química')
assert.equal(g.describeNextDate('Final', 1), 'mañana tenés Final')
assert.equal(g.describeNextDate('Final', 3), 'Final en 3 días')
console.log('greeting OK')
```

- [ ] **Step 2: Correr** → FAIL.

- [ ] **Step 3: Implementar**

```js
/**
 * Saludo del Inicio (ADR-018). Ver docs/features/home.md. Funciones puras.
 */

const WEEKDAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

/** @param {Date} date @returns {string} */
export function greetingFor(date) {
  const hour = date.getHours()
  if (hour >= 6 && hour < 13) return 'Buenos días.'
  if (hour >= 13 && hour < 20) return 'Buenas tardes.'
  return 'Buenas noches.'
}

/** @param {Date} date @returns {string} "Jueves 15 de octubre" */
export function formatLongDay(date) {
  return `${WEEKDAYS[date.getDay()]} ${date.getDate()} de ${MONTHS[date.getMonth()]}`
}

/**
 * @param {string} title - Título de la fecha importante.
 * @param {number} days - Días que faltan (0 = hoy).
 * @returns {string}
 */
export function describeNextDate(title, days) {
  if (days <= 0) return `hoy tenés ${title}`
  if (days === 1) return `mañana tenés ${title}`
  return `${title} en ${days} días`
}
```

- [ ] **Step 4: Correr** → `greeting OK`.

- [ ] **Step 5: Commit** — `git add src/lib/home/greeting.js && git commit -m "feat(home): saludo y frase de la próxima fecha"`

---

### Task 5: Shell — Header, WorkspaceLayout, TabBar

**Files:**
- Modify: `src/components/layout/Header.jsx`, `src/components/layout/WorkspaceLayout.jsx`, `src/components/layout/TabBar.jsx`, `src/constants/storageKeys.js`

**Interfaces:**
- Consumes: `Icon` (Task 3), `getSubjectTones` (Task 2), `.lamp` (Task 1).
- Produces: evento de ventana `OPEN_PALETTE_EVENT = 'studree:open-palette'` exportado desde `WorkspaceLayout.jsx`; tabs `{ id, title, color }`; `STORAGE_KEYS.uiExplorerOpen = 'studree:ui:explorer-open'`.

- [ ] **Step 1: `storageKeys.js`** — agregar debajo de `uiExplorer`:

```js
  /** Explorador lateral abierto/cerrado (ADR-018: arranca cerrado). */
  uiExplorerOpen: 'studree:ui:explorer-open',
```

- [ ] **Step 2: `WorkspaceLayout.jsx`**
  - Exportar `export const OPEN_PALETTE_EVENT = 'studree:open-palette'`.
  - Quitar `DESKTOP_QUERY`. Estado del explorador: `useState(() => readCache(STORAGE_KEYS.uiExplorerOpen, false))` + `useEffect(() => writeCache(STORAGE_KEYS.uiExplorerOpen, explorerOpen), [explorerOpen])`.
  - `const location = useLocation()`; `const isHome = location.pathname === ROUTES.home`; `const showShell = !reading && !isHome`.
  - `collectSubjectNames` → `collectSubjects` que devuelve `Map<id, {name, color}>`; el efecto de sincronización actualiza `title` **y** `color` (comparar ambos para `changed`).
  - `openTab(id, title, color)` guarda `{ id, title, color }`.
  - Bindings: `'mod+b'` solo si `!isHome`: `useMemo(() => ({ 'mod+k': ..., ...(isHome ? {} : { 'mod+b': ... }) }), [isHome])`.
  - Escuchar el header:

```js
  useEffect(() => {
    const open = () => setPaletteOpen(true)
    window.addEventListener(OPEN_PALETTE_EVENT, open)
    return () => window.removeEventListener(OPEN_PALETTE_EVENT, open)
  }, [])
```

  - Render: `aside` y `Drawer` solo con `explorerOpen && showShell`; la barra mobile "☰ Explorador" se elimina (el botón pasa a la TabBar, visible también en mobile); `TabBar` solo si `showShell`, con props nuevas `explorerOpen` y `onToggleExplorer={() => setExplorerOpen((v) => !v)}`.
  - `main`: `className="lamp relative isolate flex-1 overflow-y-auto px-4 py-6 sm:px-6"`.

- [ ] **Step 3: `SubjectFolderPage.jsx`** — `openTab(subject.id, subject.name, subject.color)` y agregar `subject?.color` a las dependencias del efecto.

- [ ] **Step 4: `TabBar.jsx`** — reescribir:

```jsx
/**
 * Fila de pastillas de las materias abiertas (ADR-017, ADR-018) + botón del
 * explorador. Ver docs/features/navigation-shell.md.
 */

import { Icon } from '../ui/Icon'
import { getSubjectTones } from '../../constants/subjectTones.js'

/**
 * @param {Object} props
 * @param {Array<{id: string, title: string, color?: string|null}>} props.tabs
 * @param {string} [props.activeId]
 * @param {(id: string) => void} props.onActivate
 * @param {(id: string) => void} props.onClose
 * @param {boolean} props.explorerOpen
 * @param {() => void} props.onToggleExplorer
 */
export function TabBar({ tabs, activeId, onActivate, onClose, explorerOpen, onToggleExplorer }) {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto border-b border-border/60 px-2 py-1.5">
      <button
        type="button"
        onClick={onToggleExplorer}
        aria-label={explorerOpen ? 'Ocultar explorador (Ctrl+B)' : 'Mostrar explorador (Ctrl+B)'}
        aria-pressed={explorerOpen}
        title="Explorador (Ctrl+B)"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-surface-2 hover:text-text"
      >
        <Icon name="sidebar" />
      </button>
      {tabs.map((tab) => {
        const active = tab.id === activeId
        const tones = getSubjectTones(tab.color)
        return (
          <div
            key={tab.id}
            className={`group flex shrink-0 items-center gap-1 rounded-lg border pl-2.5 pr-1 text-sm transition-colors ${
              active ? 'text-text' : 'border-transparent text-text-muted hover:bg-surface-2 hover:text-text'
            }`}
            style={active ? { backgroundColor: tones.soft, borderColor: tones.base } : undefined}
          >
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: tones.base }} aria-hidden="true" />
            <button type="button" onClick={() => onActivate(tab.id)} className="max-w-[160px] truncate py-1" title={tab.title}>
              {tab.title}
            </button>
            <button
              type="button"
              onClick={() => onClose(tab.id)}
              aria-label={`Cerrar ${tab.title}`}
              className={`rounded p-1 text-text-muted transition-opacity hover:bg-surface-2 hover:text-text focus-visible:opacity-100 ${
                active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'
              }`}
            >
              <Icon name="close" size={14} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 5: `Header.jsx`** — reescribir el JSX:

```jsx
import { NavLink, useLocation } from 'react-router-dom'
import { ROUTES } from '../../constants/routes'
import { useAuth } from '../../hooks/useAuth.js'
import { Icon } from '../ui/Icon'
import { OPEN_PALETTE_EVENT } from './WorkspaceLayout'

const NAV_ITEMS = [
  { to: ROUTES.home, label: 'Inicio' },
  { to: ROUTES.careers, label: 'Carreras' },
  { to: ROUTES.profile, label: 'Perfil' },
]
/** Rutas con command palette (las del workspace, ver AppLayout). */
const PALETTE_PREFIXES = ['/carreras', '/materias', '/hojas']

const LINK = 'rounded-lg px-2 py-1.5 text-sm transition-colors sm:px-3'

/** Cabecera: logo original, buscador (Ctrl K) y navegación. Ver navigation-shell.md. */
export function Header() {
  const { user, isAnonymous, signOut } = useAuth()
  const { pathname } = useLocation()
  const hasPalette = pathname === ROUTES.home || PALETTE_PREFIXES.some((prefix) => pathname.startsWith(prefix))

  return (
    <header className="border-b border-border/60">
      <div className="flex items-center gap-3 px-3 py-2.5 sm:px-5">
        <span className="flex items-center gap-2.5">
          <img src="/logo.jpg" alt="" width="28" height="28" className="h-7 w-7 rounded-md" />
          <span className="font-display text-lg font-bold tracking-tight text-text" translate="no">
            Studree
          </span>
        </span>

        {hasPalette && (
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event(OPEN_PALETTE_EVENT))}
            className="ml-auto hidden min-w-[16rem] items-center gap-2 rounded-lg border border-border bg-surface/70 px-3 py-1.5 text-sm text-text-muted transition-colors hover:border-text-muted/60 hover:text-text sm:flex"
          >
            <Icon name="search" />
            <span>Buscar un tema o una materia</span>
            <kbd className="ml-auto rounded border border-border px-1 text-[11px]">Ctrl&nbsp;K</kbd>
          </button>
        )}

        <nav className={`flex items-center gap-0.5 ${hasPalette ? '' : 'ml-auto'}`}>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === ROUTES.home}
              className={({ isActive }) =>
                `${LINK} ${isActive ? 'font-medium text-accent-soft' : 'text-text-muted hover:bg-surface-2 hover:text-text'}`
              }
            >
              {item.label}
            </NavLink>
          ))}
          {/* (bloque Salir / Entrar igual que antes, con className={`${LINK} text-text-muted hover:bg-surface-2 hover:text-text`}) */}
        </nav>
      </div>
    </header>
  )
}
```

Mantener intacto el bloque condicional Salir/Entrar y su comentario sobre la sesión anónima, solo cambiando su `className` como indica el comentario. En mobile (`< sm`) el buscador no se ve: `Ctrl+K` sigue funcionando y el palette se abre igual.

- [ ] **Step 6: Verificar** — `npx eslint src` y `npm run build` → OK. Grep: `grep -n "☰" src/components/layout/*.jsx` → vacío.

- [ ] **Step 7: Commit** — `git add src/components/layout src/constants/storageKeys.js src/pages/SubjectFolderPage.jsx && git commit -m "feat(shell): Inicio sin explorador ni tabs, pastillas con color, buscador en el header"`

---

### Task 6: Carpeta — grilla centrada, índice, hoja, herramientas

**Files:**
- Modify: `src/pages/SubjectFolderPage.jsx`, `src/components/features/folder/TopicIndex.jsx`, `src/components/features/folder/FolderSheet.jsx`, `src/components/features/folder/FolderSearchBar.jsx`, `src/components/features/sheetEditor/EditorToolbar.jsx`, `src/components/ui/EmptyState.jsx`

**Interfaces:**
- Consumes: `subjectCssVars` (Task 2), `Icon` (Task 3), `.glass`, `.paper-sheet`, `font-display` (Task 1).

- [ ] **Step 1: `SubjectFolderPage.jsx` — contenedor y grilla.** Reemplazar el `return` principal: el `div` raíz pasa a

```jsx
    <div
      ref={containerRef}
      style={subjectCssVars(subject?.color)}
      className={
        reading
          ? 'flex justify-center'
          : 'grid justify-center gap-8 md:grid-cols-[13rem_minmax(0,52rem)] lg:grid-cols-[15rem_minmax(0,52rem)_15rem]'
      }
    >
```

- `aside`: `className="sticky top-0 hidden max-h-[calc(100vh-8rem)] self-start overflow-y-auto md:block"` (sin `w-60`). Contenido:

```jsx
          {subject && (
            <Link to={careerPath(subject.career_id)} className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-text">
              <Icon name="chevron-left" size={14} /> Volver a la carrera
            </Link>
          )}
          <h1 className="mt-2 flex items-center gap-2 font-display text-xl font-bold" title={subject?.name}>
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--subject)] shadow-[0_0_10px_var(--subject)]"
              aria-hidden="true"
            />
            <span className="truncate">{subject?.name ?? 'Cargando…'}</span>
          </h1>
          <p className="mb-4 mt-1 text-xs text-text-muted">
            {sheets.length} hoja{sheets.length === 1 ? '' : 's'}, {topics.length} tema{topics.length === 1 ? '' : 's'}
          </p>
          <h2 className="mb-2 text-xs font-medium text-text-muted">Temas</h2>
          <TopicIndex topics={topics} activeId={activeTopicId} onGo={goToTopic} />
```

- La columna central (`<div className="min-w-0 flex-1">`) pasa a `<div className="min-w-0">`; su barra sticky:

```jsx
          <div className="glass sticky top-0 z-10 mx-auto mb-5 flex w-full flex-wrap items-center gap-2 px-2 py-1.5">
            <div className="min-w-[12rem] flex-1">
              <FolderSearchBar {/* mismas props que hoy */} />
            </div>
            <EditorToolbar editor={activeEditor} />
            <span className="mx-1 hidden h-5 w-px bg-border sm:block" aria-hidden="true" />
            <button type="button" onClick={() => setReading(true)} title="Ocultar todo menos las hojas (Esc para salir)" className={TOOL}>
              <Icon name="book-open" /> Leer
            </button>
            <button type="button" onClick={() => setExportOpen(true)} disabled={!subject} className={`${TOOL} text-accent-soft`}>
              Exportar
            </button>
          </div>
```

con, arriba del componente, `const TOOL = 'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-text-muted transition-colors hover:bg-surface-2 hover:text-text disabled:opacity-40'`. Quitar el import de `Button` si queda sin uso.

- Lista de hojas: `<div className="space-y-8 pb-24">` (sin `mx-auto max-w-3xl`: el ancho lo da la grilla). `EmptyState` sin prop `icon` (ver Step 6). Botón "Nueva hoja":

```jsx
                <button
                  type="button"
                  onClick={handleAddSheet}
                  className="flex w-full items-center justify-center gap-2 rounded-md border-2 border-dashed border-border py-4 text-sm text-text-muted transition-colors hover:border-[var(--subject)] hover:text-[var(--subject-light)]"
                >
                  <Icon name="plus" /> Nueva hoja
                </button>
```

- El ✕ del aviso de error → `<Icon name="close" size={14} />`. El botón "Salir del modo lectura" → `className="glass fixed right-4 top-4 z-50 px-3 py-1.5 text-sm text-text-muted hover:text-text"`.
- En `lg` la tercera columna queda vacía sin elemento (la grilla la reserva igual porque `justify-center` centra las 3 pistas). Verificar visualmente en Task 9; si no se reserva, agregar `<div className="hidden lg:block" aria-hidden="true" />` al final.
- Imports nuevos: `Icon`, `subjectCssVars`.

- [ ] **Step 2: `TopicIndex.jsx`** — lista con línea y tema activo con el color de la materia:

```jsx
const INDENT = { 1: 'pl-3', 2: 'pl-6', 3: 'pl-9', 4: 'pl-12' }
// vacío:
      <p className="text-xs leading-relaxed text-text-muted">
        Todavía no hay temas. Escribí un título con <code className="rounded bg-surface-2 px-1"># Tema</code> en una hoja
        y aparece acá.
      </p>
// lista:
    <nav aria-label="Temas de la materia">
      <ul className="border-l border-border">
        {topics.map((topic) => {
          const active = topic.id === activeId
          return (
            <li key={topic.id}>
              <button
                type="button"
                onClick={() => onGo(topic)}
                aria-current={active ? 'location' : undefined}
                title={topic.text}
                className={`-ml-px block w-full truncate border-l-2 py-1 pr-2 text-left text-sm transition-colors ${INDENT[topic.level]} ${
                  active
                    ? 'border-[var(--subject)] font-semibold text-[var(--subject-light)]'
                    : `border-transparent hover:text-text ${topic.level === 1 ? 'text-text' : 'text-text-muted'}`
                }`}
              >
                {topic.text}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
```

- [ ] **Step 3: `FolderSheet.jsx`** — `article`:

```jsx
    <article
      id={`hoja-${sheet.id}`}
      data-sheet-key={sheet.key}
      className="paper-sheet scroll-mt-28 rounded-md border-l-[6px] border-[var(--subject)]"
    >
      <header className="group flex items-center justify-between gap-3 border-b border-paper-border px-7 py-2 text-xs text-ink-muted">
        <span className="font-medium">{formatSheetDateLong(sheet.created_at)}</span>
        <span className="flex items-center gap-2">
          {status && <span className={syncStatus === 'error' ? 'text-red-700' : ''} title={error ?? undefined}>{status}</span>}
          <button
            type="button"
            onClick={() => onRequestDelete(sheet)}
            aria-label={`Eliminar la hoja del ${formatSheetDate(sheet.created_at)}`}
            className="rounded p-1 opacity-0 transition-opacity hover:text-red-700 focus-visible:opacity-100 group-hover:opacity-100"
          >
            <Icon name="close" size={14} />
          </button>
        </span>
      </header>
      <div className="px-7 py-5">
```

(import `formatSheetDateLong` e `Icon`; el resto igual). Nota: `formatSheetDateLong` hoy da "Miércoles 14/10/2026 · 18:30"; se usa tal cual (no se cambia su formato: lo usa el export).

- [ ] **Step 4: `FolderSearchBar.jsx`** — contenedor `className="flex items-center gap-1 rounded-lg bg-bg/60 px-2 focus-within:ring-1 focus-within:ring-accent-soft"`; el 🔍 → `<Icon name="search" className="text-text-muted" />`; ↑/↓ → `<Icon name="arrow-up" size={14} />` / `<Icon name="arrow-down" size={14} />`; botones con `className="rounded p-1 text-text-muted hover:text-text disabled:opacity-40"`; el input conserva `outline-none` (el foco lo muestra el `focus-within:ring` del contenedor). El contador con `tabular-nums`.

- [ ] **Step 5: `EditorToolbar.jsx`**
  - Contenedor: `className="flex flex-wrap items-center gap-0.5"` (sin `border-b`: va dentro de la cápsula).
  - Títulos: reemplazar el `map` de 1–4 por dos botones y dejar H3/H4 en el mismo formato:

```jsx
      <ToolbarButton title="Título" label="Título" active={editor.isActive('heading', { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} />
      <ToolbarButton title="Subtítulo" label="Subtítulo" active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} />
      <ToolbarButton title="Título 3" label="H3" active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} />
      <ToolbarButton title="Título 4" label="H4" active={editor.isActive('heading', { level: 4 })} onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()} />
```

  - Enlace: `label={<Icon name="link" size={14} />}` (cambiar el JSDoc de `label` a `React.ReactNode`). "☑" → `label="Tarea"`, "❝" → `label="Cita"`.
  - `ToolbarButton` activo: `'bg-accent/20 text-accent-soft'`.

- [ ] **Step 6: `EmptyState.jsx`** — el `icon` deja de tener default emoji: `icon` opcional (`React.ReactNode`); si no viene, mostrar `<Icon name="file-text" size={32} className="text-text-muted" />`. Revisar con `grep -rn "<EmptyState" src` que los otros usos con `icon="…"` sigan funcionando (siguen: renderiza el nodo que le pasen).

- [ ] **Step 7: Verificar** — `npx eslint src`, `npm run build`. `grep -nE "📖|📝|🔍|🔗|☑|❝" src/pages/SubjectFolderPage.jsx src/components/features/folder src/components/features/sheetEditor` → vacío.

- [ ] **Step 8: Commit** — `git add src/pages/SubjectFolderPage.jsx src/components/features/folder src/components/features/sheetEditor/EditorToolbar.jsx src/components/ui/EmptyState.jsx && git commit -m "feat(carpeta): hojas centradas en crema con el color de la materia y barra de vidrio"`

---

### Task 7: Inicio — saludo, bento y post-its

**Files:**
- Modify: `src/pages/HomePage.jsx`, `src/components/features/home/{HomePanel,ContinueCard,NextDateCard,WeekSummary,TaskList,CalendarPanel,QuickNotes}.jsx`

**Interfaces:**
- Consumes: `greetingFor`, `formatLongDay`, `describeNextDate` (Task 4); `daysUntil`, `parseDateKey` de `lib/home/dates.js`; `getSubjectTones` (Task 2); `Icon` (Task 3).
- `HomePanel` gana prop opcional `variant?: 'glass'|'hero'` (default `'glass'`).

- [ ] **Step 1: `HomePanel.jsx`**

```jsx
const VARIANTS = {
  glass: 'glass p-4',
  hero: 'relative overflow-hidden rounded-2xl border border-accent/35 bg-[#14201a]/70 p-5 backdrop-blur-md',
}
// …
    <section className={`${VARIANTS[variant]} ${className}`} aria-label={title}>
      <div className="mb-2 flex min-h-8 items-center justify-between gap-2">
        <h2 className={`text-sm font-medium ${variant === 'hero' ? 'text-accent-soft' : 'text-text-muted'}`}>{title}</h2>
        {action}
      </div>
```

> `#14201a` no es token: agregar en `tailwind.config.js` `'surface-lit': '#14201a'` (superficie bajo la lámpara) y usar `bg-surface-lit/70`. Documentarlo en ADR-018.

- [ ] **Step 2: `HomePage.jsx`** — reemplazar el `h1` y la grilla:

```jsx
  const now = new Date()
  const next = home.dates.next
  const nextLine = next ? describeNextDate(next.title, daysUntil(next.date, home.todayKey)) : null

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-6">
        <h1 className="font-display text-4xl font-extrabold tracking-tight">{greetingFor(now)}</h1>
        <p className="mt-1 text-text-muted">
          {formatLongDay(parseDateKey(home.todayKey))}
          {nextLine && <> — {nextLine}.</>}
        </p>
      </header>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <ContinueCard … className="md:col-span-2 lg:row-span-2" />
        <NextDateCard … className="" />
        <WeekSummary … className="" />
        <TaskList … className="md:col-span-2" />
        <CalendarPanel … className="md:col-span-2 lg:col-span-3" />
        <QuickNotes … className="md:col-span-2 lg:col-span-1" />
      </div>
      {/* DateFormModal igual */}
    </div>
  )
```

(Mantener todas las props actuales de cada bloque; solo cambian `className`. El orden del DOM queda: Continue, NextDate, WeekSummary, Tasks, Calendar, Notes.) Actualizar el JSDoc del componente.

- [ ] **Step 3: `WeekSummary.jsx`** — pasa a bloque con número (acepta `className`):

```jsx
export function WeekSummary({ summary, loading, failed, className = '' }) {
  const { calm, parts } = describeWeekSummary(summary)
  return (
    <section className={`glass p-4 ${className}`} aria-label="Esta semana" aria-live="polite">
      <h2 className="text-sm font-medium text-text-muted">Esta semana</h2>
      {loading ? (
        <p className="mt-2 text-sm text-text-muted">Cargando…</p>
      ) : failed ? (
        <p className="mt-2 text-sm text-text-muted">No se pudo cargar el resumen.</p>
      ) : calm ? (
        <p className="mt-2 text-sm">Semana tranquila: no tenés fechas ni tareas.</p>
      ) : (
        <>
          <p className="mt-1 font-display text-4xl font-extrabold tabular-nums">{summary.tasks}</p>
          <p className="text-sm text-text-muted">
            {summary.tasks === 1 ? 'tarea' : 'tareas'}, {parts[0].text}
            {summary.overdue > 0 && <span className="font-medium text-red-300">, {parts[2].text}</span>}
          </p>
        </>
      )}
    </section>
  )
}
```

- [ ] **Step 4: `ContinueCard.jsx`** — `variant="hero"`; con hoja:

```jsx
        <Link
          to={subjectFolderPath(sheet.subject_id, sheet.id)}
          className="group block min-h-[9.5rem] rounded-xl"
        >
          <p className="font-display text-2xl font-bold text-text">{sheet.subject_name}</p>
          <p className="mt-0.5 text-sm text-text-muted">Escribiste {formatRelativeTime(sheet.updated_at)}</p>
          <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-accent-soft">
            Seguir escribiendo <Icon name="chevron-right" size={14} />
          </span>
          {sheet.preview && (
            <div
              aria-hidden="true"
              className="paper-sheet motion-peek pointer-events-none absolute -bottom-5 right-[-0.25rem] hidden w-48 -rotate-[4deg] rounded-md border-l-[5px] px-3 py-2 text-xs leading-[1.4] transition-transform duration-200 group-hover:-translate-y-1 group-hover:-rotate-[2deg] sm:block"
              style={{ borderLeftColor: getSubjectTones(sheet.subject_color).base }}
            >
              <p className="line-clamp-4">{sheet.preview}</p>
            </div>
          )}
        </Link>
```

  Revisar que `formatRelativeTime` devuelva una frase que encaje con "Escribiste …" (p. ej. "hace 2 horas" / "ayer"); si devuelve con mayúscula inicial, usar `formatDateTime` en su lugar con el texto "Última edición: …". Sin hoja: botón `btn-accent` como hoy.

- [ ] **Step 5: `NextDateCard.jsx`** — con fecha:

```jsx
  const days = date ? daysUntil(date.date, todayKey) : null
  // …
    <HomePanel title="Próxima fecha" error={error} className={`${className} ${days !== null && days <= 7 ? '!border-warn/40' : ''}`}>
        <div>
          <p className="break-words text-sm text-text">{date.title}</p>
          <p className="mt-1 font-display text-4xl font-extrabold tabular-nums text-warn">
            {days === 0 ? 'Hoy' : days}
            {days > 0 && <span className="ml-1 font-sans text-sm font-medium">{days === 1 ? 'día' : 'días'}</span>}
          </p>
          <p className="text-xs text-text-muted">{formatShortDate(date.date)}</p>
        </div>
```

  "＋ Agregar fecha" → `<Icon name="plus" size={14} /> Agregar fecha`. Quitar el import de `formatCountdown` si queda sin uso.

- [ ] **Step 6: `TaskList.jsx`** — `✎` → `<Icon name="edit" size={14} />`, `✕` → `<Icon name="close" size={14} />`. Inputs: cambiar `outline-none` + `focus:border-accent` por `focus-visible:border-accent` sin `outline-none` (el anillo global se encarga); el input de edición sin `outline-none`. Borde de vencida `border-red-800` queda.

- [ ] **Step 7: `CalendarPanel.jsx`** — `＋ Fecha` → `<Icon name="plus" size={14} /> Fecha`; `‹`/`›` → `<Icon name="chevron-left" />`/`<Icon name="chevron-right" />`. Hoy: `bg-accent font-semibold text-bg` (en vez de `border border-accent`). Días con fecha: además del punto, `underline decoration-warn decoration-2 underline-offset-4`; el punto de fechas pasa a `bg-warn` y la leyenda "Fecha" también. Grilla y lista "Próximas" con `tabular-nums`. El `h3` "Próximas" sin `uppercase tracking-wide`: `className="mt-4 text-sm font-medium text-text-muted"`.

- [ ] **Step 8: `QuickNotes.jsx`** — cada nota es un post-it:

```jsx
    <li
      className={`flex gap-1 rounded-sm bg-postit p-2 text-postit-ink shadow-[0_8px_18px_rgb(0_0_0/0.45)] ${
        index % 2 === 0 ? 'rotate-[1.5deg]' : '-rotate-[1.5deg]'
      } motion-reduce:rotate-0`}
    >
```

  (pasar `index` desde el `map` de la lista). Texto de la nota `text-postit-ink`; textarea de edición `bg-postit text-postit-ink border-postit-ink/30`; botón borrar `text-postit-ink/70 hover:bg-black/5` con `<Icon name="close" size={14} />`. El textarea de alta (`TEXTAREA`) sin `outline-none` y con `focus-visible:border-accent`.

- [ ] **Step 9: Verificar** — `npx eslint src`, `npm run build`. `grep -nE "＋|✎|✕|‹|›|uppercase" src/components/features/home src/pages/HomePage.jsx` → vacío.

- [ ] **Step 10: Commit** — `git add src/pages/HomePage.jsx src/components/features/home tailwind.config.js && git commit -m "feat(home): saludo, grilla bento con vidrio y notas como post-it"`

---

### Task 8: Documentación

**Files:**
- Modify: `docs/02-architecture.md`, `docs/01-project-overview.md`, `docs/features/{folder,home,navigation-shell,sheet-editor}.md`, `CHANGELOG.md`, `CLAUDE.md` (+ 4 copias)

- [ ] **Step 1: ADR-018** en `docs/02-architecture.md` (después de ADR-017):

```markdown
### ADR-018 — Identidad visual: la lámpara, el papel crema y el color de materia

**Fecha:** 2026-10-15 · **Estado:** ✅ Vigente · **Spec:** `docs/superpowers/specs/2026-10-15-rediseno-visual-design.md`

**Contexto:** las hojas se veían corridas y chicas, todo era de un solo color y la interfaz se
sentía genérica para una app que va a integrar IA.

**Decisión:**
- Concepto "estudiar de noche con la lámpara": fondo oscuro (escritorio), un único cono de luz
  verde (`.lamp`, estático) y paneles de vidrio (`.glass`) con distinto peso (grilla bento).
- Las hojas van en **papel crema** con renglones (`.paper-sheet`, tokens `paper`/`ink`) y un margen
  del **color de la materia**. Reemplaza el "papel blanco" de ADR-017.
- Color de materia: tabla `src/constants/subjectTones.js` (base / onPaper / onDark / soft, todos
  ≥ 4.5:1), aplicada como variables CSS `--subject*` en la Carpeta.
- Tipografía: Inter (texto) + Bricolage Grotesque (`font-display`: títulos, saludo, números).
- Íconos SVG propios (`components/ui/Icon.jsx`), nunca emojis. Foco visible global.
- Se evitan: etiquetas en mayúsculas, texto en degradé, tarjetas idénticas, animaciones de entrada.
- El Inicio no muestra explorador ni tabs; el explorador arranca cerrado (Ctrl+B).

**Consecuencias:** la Carpeta centra las hojas en la pantalla; agregar un color a la paleta exige
agregar sus tonos a `subjectTones.js`.
```

  En ADR-017, cambiar "sobre papel blanco" por "sobre papel crema (ADR-018)". En la sección del sistema de estilos, listar los tokens nuevos (`paper.line`, `postit`, `surface-lit`, `font-display`) y las clases `.lamp`, `.glass`, `.paper-sheet`. En el árbol de carpetas, agregar `constants/subjectTones.js`, `lib/home/greeting.js`, `components/ui/Icon.jsx`.

- [ ] **Step 2: Features**
  - `folder.md`: layout de 3 columnas centrado; color de materia (variables); índice con línea; barra de vidrio con "Leer"/"Exportar"; papel crema.
  - `home.md`: saludo (`greeting.js`), bento, "Esta semana" como bloque, post-its; agregar `greeting.js` a archivos.
  - `navigation-shell.md`: Inicio sin explorador ni tabs; explorador cerrado por defecto (`studree:ui:explorer-open`); tabs como pastillas con color; buscador del header y evento `studree:open-palette`; sección Logo → `public/logo.jpg` (256 px, del original `assets/Logo.jpg`).
  - `sheet-editor.md` sección Estilos: tinta `ink` sobre papel crema, `h1` en `font-display` con `--subject-ink`, links/`[[links]]` y citas con el color de la materia; toolbar "Título"/"Subtítulo".
  - `docs/DB_SCHEMA.md`: agregar la clave `studree:ui:explorer-open` en la tabla de localStorage.

- [ ] **Step 3: `CHANGELOG.md`** — entrada nueva arriba:

```markdown
## [0.15.0] — 2026-10-15

### Rediseño visual (ADR-018)
- **Carpeta:** hojas centradas en la pantalla y más anchas, en papel crema con renglones y el
  margen del color de la materia; títulos y links en ese color; índice con línea y tema activo
  resaltado; herramientas en una barra de vidrio ("Título", "Subtítulo", "Leer", "Exportar").
- **Inicio:** saludo con la fecha y la próxima fecha importante, grilla bento de paneles de vidrio,
  "Seguí donde dejaste" con la hoja asomando, notas como post-it. Sin explorador ni tabs.
- **Shell:** logo original (header y favicon), buscador `Ctrl K` en el header, materias abiertas
  como pastillas con su color, explorador cerrado por defecto (`Ctrl+B`).
- **Estilo:** luz de lámpara, Bricolage Grotesque para títulos, Inter cargada de verdad, íconos SVG
  en lugar de emojis, foco visible en todo, `theme-color`.
```

- [ ] **Step 4: `docs/01-project-overview.md`** — estado: rediseño visual 0.15.0 hecho.

- [ ] **Step 5: `CLAUDE.md`** — línea Diseño: `- **Diseño:** modo oscuro + acento verde con la "lámpara" (ADR-018): papel crema con el color de la materia, Bricolage Grotesque + Inter, íconos SVG (nunca emojis).` En "Reglas del rediseño" cambiar "sobre papel blanco" → "sobre papel crema (ADR-018)" y agregar: `- **Colores de materia:** usar `getSubjectTones`/`subjectCssVars` (constants/subjectTones.js); nunca el color crudo para texto.` Agregar a la tabla de lookup: `constants/subjectTones.js` · `components/ui/Icon.jsx` → `docs/02-architecture.md` (ADR-018). Copiar a las 4 copias con su encabezado de copia (mismo procedimiento que en fases anteriores: conservar la primera línea de encabezado de cada copia y pegar el resto).

- [ ] **Step 6: Commit** — `git add docs CHANGELOG.md CLAUDE.md .cursorrules .windsurfrules .clinerules .github/copilot-instructions.md && git commit -m "docs: ADR-018 identidad visual, features y CHANGELOG 0.15.0"`

---

### Task 9: Verificación final

- [ ] **Step 1: Suite** — `$SP/suite_redesign.sh`:

```bash
set -e
SP="$(dirname "$0")"
cd /c/Users/nicom/FAT/Studree
node "$SP/test_redesign_tokens.mjs"
node "$SP/test_subject_tones.mjs"
node "$SP/test_greeting.mjs"
bash "$SP/suite_carpeta.sh"   # regresión de la Carpeta (incluye eslint src y build)
! grep -rnE "📖|📝|🔍|🔗|☑|❝|＋|✎|☰" src/pages/HomePage.jsx src/pages/SubjectFolderPage.jsx src/components/features/home src/components/features/folder src/components/layout src/components/features/sheetEditor/EditorToolbar.jsx
! grep -rn "uppercase tracking-wide" src/components/features/home src/components/features/folder src/pages/SubjectFolderPage.jsx
! grep -rn "logo.svg" src index.html
echo "SUITE REDISEÑO OK"
```

  Correr `bash "$SP/suite_redesign.sh"` → `SUITE REDISEÑO OK`. Si `suite_carpeta.sh` tiene asserts de estilos viejos (`test_styles.mjs`: p. ej. `paper` `#ffffff`), actualizarlos a los valores nuevos.

- [ ] **Step 2: Visual** — `npm run dev`, abrir con el navegador (claude-in-chrome) `/` y una materia con hojas; capturas a 375, 768 y 1440 px de ancho. Verificar: hojas centradas respecto de la pantalla en 1440; sin desborde horizontal en 768 y 375; color de materia en margen, título y tema activo; luz visible arriba a la izquierda; post-its; Inicio sin explorador ni tabs; `Ctrl+B` abre el explorador en la Carpeta; botón del header abre el palette.

- [ ] **Step 3: Teclado** — recorrer con Tab el Inicio y la Carpeta: anillo de foco visible en todo; el ✕ de una tab no activa y el borrar hoja aparecen con foco.

- [ ] **Step 4: Auditoría** — correr `web-design-guidelines` sobre los archivos tocados; corregir lo que corresponda al alcance y commitear (`fix(estilos): ajustes de la auditoría`).

- [ ] **Step 5: Revisión final de la rama** — un revisor sobre todo el diff desde `f51bf62`.
