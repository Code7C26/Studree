# 📚 Studree

## Descripción

**Studree** es una plataforma web diseñada para ayudar a los estudiantes a organizar sus materias y recursos de estudio de una forma visual e intuitiva.

Su nombre surge de la unión de **Study + Tree**, representando la idea de que el conocimiento crece como un árbol. En lugar de organizar la información mediante carpetas tradicionales, cada materia se convierte en un **árbol conceptual**, donde los temas principales actúan como el tronco y se ramifican en unidades, subtemas y recursos relacionados.

La aplicación permite almacenar apuntes, archivos, enlaces y material de estudio en un solo lugar, facilitando una organización más clara y un acceso rápido a toda la información.

---

## Problemática

Muchos estudiantes distribuyen sus apuntes entre carpetas del celular, WhatsApp, Google Drive, PDFs y diferentes aplicaciones.

Esta desorganización provoca:

* pérdida de tiempo buscando información;
* dificultad para relacionar conceptos entre materias;
* pérdida de archivos importantes;
* una experiencia de estudio poco eficiente.

---

## Propuesta de solución

Studree propone una nueva forma de organizar el aprendizaje mediante una jerarquía visual e interactiva: **Carrera → Materia → Unidad → Tema → Hoja**.

* 🎓 La carrera (o curso/capacitación) agrupa las materias.
* 📚 Cada materia puede tener correlativas con otras (opcional — ver más abajo).
* 📁🔖 Las unidades y los temas se navegan como un canvas de nodos.
* 📝 Las hojas son los apuntes en sí: se editan en un editor de texto enriquecido y quedan guardadas en Markdown.

De esta manera, el estudiante puede explorar visualmente el contenido y comprender cómo se conectan los distintos conceptos.

Entre las funcionalidades implementadas se encuentran:

* creación y organización de carreras/cursos y materias;
* correlativas entre materias (**opcionales**: una carrera sin ninguna cargada funciona igual, como organizador simple — útil para cursos y capacitaciones, no solo carreras universitarias);
* navegación mediante canvases interactivos (React Flow) y un explorador lateral tipo VSCode;
* editor de apuntes en rico (negrita, listas, checklists, citas, enlaces), guardado como Markdown;
* búsqueda rápida de cualquier hoja, materia, unidad o tema (`Ctrl+K`);
* autenticación y persistencia real en la nube (Supabase).

---

## Público objetivo

Studree está dirigido a:

* estudiantes de nivel secundario;
* estudiantes universitarios;
* personas que realizan cursos o capacitaciones;
* cualquier persona que desee organizar su material de estudio de manera visual.

---

## Diseño e identidad visual

La interfaz está pensada para transmitir una experiencia moderna, limpia y profesional.

Características principales:

* modo oscuro como diseño principal;
* tonos grises oscuros para mejorar la concentración;
* color de acento verde que simboliza crecimiento y aprendizaje;
* diseño minimalista;
* navegación basada en un explorador lateral, tabs y un canvas de nodos interactivo.

El objetivo es que el usuario sienta que cada materia crece como un árbol y que su conocimiento evoluciona de forma natural a medida que incorpora nuevos conceptos.

---

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18 + Vite 5 |
| Lenguaje | JavaScript (ES2022) + JSDoc — sin TypeScript |
| Estilos | TailwindCSS |
| Canvas / nodos | React Flow (`@xyflow/react`) + `@dagrejs/dagre` (auto-layout) |
| Editor de hojas | TipTap v3 (Markdown como fuente de verdad) |
| Backend / base de datos | Supabase (PostgreSQL + Auth + Row Level Security) |
| Cache local | `localStorage` (optimista, descartable — Supabase es la fuente de verdad) |
| Routing | React Router DOM |

Documentación técnica completa en [`docs/`](docs/): visión y estado (`01-project-overview.md`), arquitectura y decisiones de diseño —ADRs— (`02-architecture.md`), seguridad (`03-security.md`), modelo de datos (`DB_SCHEMA.md`) y una ficha por funcionalidad en `docs/features/`.

---

## Instalación y uso

### Requisitos

* Node.js 18 o superior.
* Una cuenta de [Supabase](https://supabase.com) (tiene plan gratuito).

### Pasos

1. Clonar el repositorio e instalar dependencias:

   ```bash
   git clone <url-del-repo>
   cd Studree
   npm install
   ```

2. Crear un proyecto en Supabase y copiar la URL y la `anon key` (**Project Settings → API**).

3. Copiar el archivo de variables de entorno y completar las claves:

   ```bash
   cp .env.example .env.local
   ```

   ```
   VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
   VITE_SUPABASE_ANON_KEY=tu-clave-publica-anon
   ```

   > La `anon key` es pública por diseño: lo que protege los datos es Row Level Security (RLS), no el secreto de esta clave. Ver `docs/03-security.md`.

4. Aplicar el esquema de la base: en el **SQL Editor** del dashboard de Supabase, correr el contenido de [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql). Esto crea las 6 tablas, los índices, los triggers y las políticas de RLS.

5. (Opcional pero recomendado) Activar el inicio de sesión anónimo en **Authentication → Providers → Anonymous Sign-Ins**, para poder entrar sin crear una cuenta con email. Si se deja desactivado, la app pide crear una cuenta con email y contraseña.

6. Levantar el servidor de desarrollo:

   ```bash
   npm run dev
   ```

   La app queda disponible en `http://localhost:5173`.

### Otros comandos

```bash
npm run build    # build de producción
npm run preview  # sirve el build localmente
npm run lint     # ESLint
```

---

## Estado técnico actual

✅ **Funcional de punta a punta**, sobre una base real en Supabase (no hay datos mock ni placeholders):

* Autenticación (email/contraseña o sesión anónima) con Row Level Security en las 6 tablas.
* Alta, edición y borrado de carreras, materias, unidades, temas y hojas.
* Correlativas entre materias con validación de ciclos (no se puede crear una dependencia circular).
* Canvas de carrera (materias + correlativas) y canvas de materia (unidades → temas), con auto-layout automático.
* Editor de hojas en rico con guardado automático (Markdown como formato de fuente de verdad).
* Explorador lateral, tabs de hojas abiertas y buscador global (`Ctrl+K`), con soporte básico de uso en mobile.

🚧 **Pendiente / próximos pasos:**

* Exportar una materia completa a un único archivo `.md` (o `.zip`), pensado para poder llevar los apuntes a una IA como contexto.
* Reordenar unidades/temas/tabs arrastrando.
* Progreso por unidad y filtro del canvas de carrera por cuatrimestre/año.
* Imágenes en las hojas (requiere Supabase Storage) e historial de versiones.
* Pulido general de la experiencia en dispositivos móviles.

---

## Filosofía del proyecto

> **El conocimiento no se guarda en carpetas, crece como un árbol.**

Studree busca transformar la forma en que los estudiantes organizan y exploran sus contenidos académicos, convirtiendo el estudio en una experiencia más visual, intuitiva y conectada.
