# Studree

> **El conocimiento no se guarda. Crece.**

Studree es una plataforma web para organizar los apuntes de una carrera o curso como una
**carpeta escolar digital**, con una IA, **el Brote**, que conoce esos apuntes y estudia con vos.
Su nombre une *Study + Tree*: cada carrera es un árbol, las materias son sus ramas y los apuntes
son sus hojas.

Studree es el primer producto de **Mnemora**, la empresa detrás del proyecto. El nombre viene del
griego *mnḗmē*, "memoria": Mnemora construye la memoria de lo que aprendés.

**App online: [studree.vercel.app](https://studree.vercel.app)** · funciona en la compu y en el
celular (se instala como app).

---

## El problema

Los estudiantes reparten sus apuntes entre fotos del pizarrón, el chat del grupo, documentos
sueltos, PDFs y cuadernos. Cuando llega el parcial:

- se pierde tiempo buscando la información;
- cuesta saber qué falta estudiar de cada tema;
- las IA genéricas responden "cualquier cosa", porque no conocen lo que se dio en clase.

Está pensado para estudiantes secundarios y universitarios, y para cualquier persona que haga
cursos o capacitaciones.

## La solución

1. **Tus apuntes, ordenados.** La jerarquía es fija y simple: **Carrera → Materia → Hoja**. Cada
   materia es una carpeta con sus hojas fechadas, una detrás de otra, sobre papel con renglones.
   Los temas son los títulos que escribís (`# Tema`), con un índice automático, y `[[Tema]]` salta
   a cualquiera de ellos.
2. **Una IA que conoce tu materia.** El Brote lee tus hojas, responde citando de cuál sacó cada
   dato, marca lo que falta y **propone** el texto. Nunca escribe en una hoja sin que aprietes
   *Aceptar*.
3. **Herramientas para estudiar** con ese mismo material: exámenes, resúmenes, tarjetas de repaso
   y plan de estudio.

---

## Funcionalidades

### Organización
- **Carreras y materias** con tarjetas de progreso y un **mapa de correlativas** interactivo
  (React Flow). Las correlativas son opcionales, así que también sirve para un curso suelto.
- **La Carpeta:** todas las hojas de una materia seguidas y en orden, con índice de temas,
  buscador interno (`Ctrl+F`) y modo lectura.
- **Editor de hojas** enriquecido (TipTap) con guardado automático; el contenido se guarda como
  **Markdown**.
- **Adjuntos** en las hojas (imágenes y archivos): se pueden soltar, pegar o subir.
- **Plantillas de hoja:** cuatro incluidas y las que crees vos.
- **Inicio:** "Seguí donde dejaste", calendario de fechas importantes, tareas con vencimiento y
  notas rápidas.
- **Buscador global** (`Ctrl+K`) de carreras, materias y contenido de las hojas.
- **Papelera:** lo que borrás queda 30 días, con *Deshacer*.

### El Brote (asistente de IA)
- Chat sobre tus apuntes, en dos modos: **solo con tus hojas** o **con conocimiento externo**
  (que queda marcado en la hoja).
- Atajos sobre el texto seleccionado: **Explicar, Refutar, Completar y Preguntame**, con la
  respuesta debajo del texto.
- **Exámenes** de opción múltiple, verdadero o falso y desarrollo, con corrección explicada y
  registro de cada intento.
- **Resúmenes** de una materia: se pueden guardar como hoja o exportar a PDF.
- **Mi estudio:** historial de resúmenes y exámenes, filtrable por materia.
- **Foto a hoja:** sacás una foto del pizarrón o del cuaderno desde el celular y el Brote la pasa
  a texto, que revisás antes de guardar.

### Estudiar y compartir
- **Tarjetas de repaso** por materia, con repaso espaciado (sistema de cajas de Leitner).
- **Compartir una materia** con un link público de solo lectura, revocable en cualquier momento.
- **Exportar** a un único `.md` o a un `.zip` con adjuntos, más **"Copiar para IA"**.
- **Importar** archivos `.md` y `.zip` (también un vault de Obsidian o un export de Studree).

### Plataforma
- **Castellano e inglés**: toda la interfaz y el Brote.
- **Celular y PWA:** interfaz adaptada al teléfono, se instala como app y permite leer los
  apuntes sin señal.

---

## Arquitectura

```
 Navegador (React SPA)                      Supabase
 ┌───────────────────────────┐   HTTPS    ┌──────────────────────────────────┐
 │ components → hooks →       │──────────▶│ Postgres + Row Level Security     │
 │ services (única capa que   │           │ Auth (sesión del usuario)         │
 │ habla con Supabase)        │           │ Storage (bucket privado adjuntos) │
 │ localStorage = cache       │           │ Edge Function "assistant" ───────▶│── Gemini (Google)
 │ Service worker (PWA)       │◀──────────│   (la clave vive solo acá)        │
 └───────────────────────────┘ streaming └──────────────────────────────────┘
```

- **Supabase es la fuente de verdad.** `localStorage` es solo una cache optimista para que la UI
  responda al instante y para leer sin señal.
- **El Markdown es la fuente de verdad del contenido.** El editor convierte de ida y vuelta, y por
  eso todo es exportable sin pérdida.
- **Capas separadas:** la lógica pura vive en `src/lib/` (con tests), el acceso a datos en
  `src/services/`, el estado en `src/hooks/` y la presentación en `src/components/`.
- **El Brote corre en el servidor:** la Edge Function usa el token del usuario (así respeta la
  RLS), controla los topes de uso y transmite la respuesta en streaming.
- Cada decisión importante está registrada como **ADR** (25 en total) en
  [`docs/02-architecture.md`](docs/02-architecture.md).

## Seguridad

- **Row Level Security** en todas las tablas: cada cuenta ve solo sus datos.
- En el navegador solo está la clave pública `anon` de Supabase. La clave de Gemini vive como
  secret de la Edge Function y **nunca llega al cliente**.
- Los adjuntos van a un bucket **privado**; en el Markdown se referencian por id (`adjunto:<id>`),
  nunca con una URL pública.
- El link compartido usa un token aleatorio (122 bits de azar, imposible de adivinar), se puede
  revocar y solo expone esa materia.
- El historial del repositorio no contiene secretos (`.env.local` está en `.gitignore`).

Detalle completo en [`docs/03-security.md`](docs/03-security.md).

## Calidad y proceso

- **629 tests automatizados** (`npm test`, con el runner nativo de Node) sobre la lógica pura, el
  Markdown, los permisos del asistente, el repaso espaciado, los tokens y la paridad de idiomas.
- **ESLint** sin errores y build de producción verificado.
- Tests que **fallan si falta una traducción** o si queda texto visible sin traducir.
- **Documentation-Driven Development (Método AInnovate):** antes de cada cambio se escribe o
  actualiza el doc de la funcionalidad, el modelo de datos y el CHANGELOG. Cada fase tiene su
  diseño y su plan en [`docs/superpowers/`](docs/superpowers/).

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18 + Vite 5 |
| Lenguaje | JavaScript (ES2022) + JSDoc, sin TypeScript |
| Estilos | TailwindCSS 3 (design system propio en `tailwind.config.js`) |
| Editor | TipTap 3 (ProseMirror), con Markdown como formato de guardado |
| Mapas | React Flow (`@xyflow/react`) + dagre |
| Routing | React Router 6 |
| Backend | Supabase: PostgreSQL, Auth, Storage, Row Level Security y Edge Functions (Deno) |
| IA | Google Gemini, solo desde la Edge Function |
| Deploy | Vercel (frontend) + Supabase (base y función) |

## Estructura

```
src/
  components/   UI por funcionalidad (features/) y componentes base (ui/, layout/)
  hooks/        estado y orquestación (useFolder, useAssistant, useFlashcards, …)
  services/     acceso a Supabase (única capa que lo hace)
  lib/          lógica pura con tests (markdown, editor, asistente, i18n, repaso, …)
  pages/        una por ruta
supabase/
  migrations/   0001 … 0014, en orden
  functions/assistant/   Edge Function del Brote
docs/           visión, arquitectura, seguridad, modelo de datos, API y una ficha por funcionalidad
public/         manifest y service worker de la PWA
```

---

## Probalo

Entrá a **[studree.vercel.app](https://studree.vercel.app)**. No hace falta registrarse: entrás
como invitado y, si querés guardar tus apuntes con una cuenta, la creás desde el Perfil.

En el celular o en la compu podés **instalarla como app**, sin tiendas: en la landing, sección
**"Usalo donde estudies"**, está el botón para instalarla en la compu (Windows, Mac o Linux, con
Chrome o Edge) y en Android, y los pasos para iPhone (Safari → Compartir → "Agregar a inicio").

📘 **[Manual de usuario](https://studree.vercel.app/manual.html)**: todo Studree explicado paso a paso
(también en [`docs/MANUAL_USUARIO.md`](docs/MANUAL_USUARIO.md)).

---

## Documentación

| Doc | Contenido |
|-----|-----------|
| [`docs/MANUAL_USUARIO.md`](docs/MANUAL_USUARIO.md) | **Manual de usuario**: cómo usar Studree paso a paso |
| [`docs/01-project-overview.md`](docs/01-project-overview.md) | Visión, stack y estado de cada fase |
| [`docs/02-architecture.md`](docs/02-architecture.md) | Estructura, convenciones y decisiones (ADRs) |
| [`docs/03-security.md`](docs/03-security.md) | RLS, claves, adjuntos y asistente |
| [`docs/04-deployment.md`](docs/04-deployment.md) | Deploy en Vercel y Supabase |
| [`docs/DB_SCHEMA.md`](docs/DB_SCHEMA.md) | Modelo de datos |
| [`docs/API_DOCS.md`](docs/API_DOCS.md) | Services y Edge Function |
| [`docs/features/`](docs/features/) | Una ficha por funcionalidad |
| [`CHANGELOG.md`](CHANGELOG.md) | Historial de versiones |
