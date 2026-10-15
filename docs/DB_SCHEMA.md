# Modelo de Datos — Studree

**Fuente de verdad:** **Supabase (PostgreSQL)** — ver ADR-007.
**Cache:** `localStorage` (optimista, descartable).
**Última actualización:** 2026-10-14 (migración 0004: La Carpeta)

> **La Carpeta (2026-10-14, ADR-017).** Jerarquía de 3 niveles (ADR-014): Carrera →
> Materia → Hoja. Las hojas **no tienen título** (se identifican por su fecha de creación y
> se muestran en orden cronológico); los temas son los headings `#` de su contenido. La
> 0004 convirtió cada título existente en el primer tema de su hoja y **eliminó**
> `sheet_links`, `units`, `topics` y las columnas sin uso.

---

## Jerarquía

```
Career (Carrera / curso)
└── Subject (Materia)        ←→ Prerequisite (correlativas entre materias)
    └── Sheet (Hoja — documento Markdown, fechado, sin título)
```

Cada nivel es una **tabla propia** con FK real al padre.

## Diagrama de Entidades

```mermaid
erDiagram
    CAREER ||--o{ SUBJECT : agrupa
    SUBJECT ||--o{ SHEET : contiene
    SUBJECT ||--o{ PREREQUISITE : "requiere (subject_id)"
    SUBJECT ||--o{ PREREQUISITE : "es requisito de (requires_id)"

    CAREER {
        uuid id PK
        uuid user_id FK
        string name
        string color
        boolean uses_prerequisites "ADR-013, default true"
        timestamp created_at
        timestamp updated_at
    }
    SUBJECT {
        uuid id PK
        uuid career_id FK
        uuid user_id FK
        string name
        string color
        string status "aprobada|cursando|pendiente"
        int position "orden manual en listas"
        float pos_x "canvas de carrera, nullable (ADR-012)"
        float pos_y "canvas de carrera, nullable"
        timestamp created_at
        timestamp updated_at
    }
    PREREQUISITE {
        uuid id PK
        uuid subject_id FK "la materia condicionada"
        uuid requires_id FK "la materia requerida"
        string kind "cursar|rendir"
        uuid user_id FK
    }
    SHEET {
        uuid id PK
        uuid subject_id FK "ADR-014"
        uuid user_id FK
        string title "LEGADO: siempre NULL (0004)"
        text content_md "Markdown — fuente de verdad"
        int position "LEGADO: el orden es created_at"
        timestamp created_at "orden de la carpeta + lo que se muestra"
        timestamp updated_at "solo cambia con title o content_md"
    }
```

> **Posiciones del canvas (ADR-012).** `subjects.pos_x/pos_y` son coordenadas
> **opcionales** del canvas de carrera. `NULL` = el nodo lo ubica dagre. "Reordenar" las
> vuelve a `NULL`. Se guardan en lote con `save_node_positions` (ADR-016).
>
> **Correlativas opcionales (ADR-013).** `careers.uses_prerequisites = false` oculta toda
> la UI de correlativas de esa carrera. Las filas de `prerequisites` no se borran.

---

## Hojas: la carpeta (ADR-017)

- **Sin título:** `title` es `NULL` (columna legada, nullable, sin check ni índice único).
  En la UI, la hoja se identifica por `created_at` ("Miércoles 14/10 · 18:30").
- **Orden:** cronológico por `created_at` (índice `sheets_subject_created_idx`). No hay
  reordenamiento.
- **Temas:** los headings `#`–`####` del `content_md`. No se guardan aparte: el índice de
  temas se calcula en el cliente.
- **`[[Tema]]`:** link a un tema de la misma materia, resuelto en el cliente. No hay tabla
  de links (la 0004 eliminó `sheet_links`, derivada desde la 0003).
- **Hoja vacía:** el cliente no la crea hasta que tiene contenido.
- **`updated_at`:** el trigger `sheets_set_updated_at` solo se dispara si cambia `title` o
  `content_md`. Lo usan el borrador local del editor y el "Seguí donde dejaste" del Inicio.

## Correlativas: dos tipos distintos

> **Son opcionales.** Una materia sin filas en `prerequisites` es un caso normal (cursos,
> capacitaciones). Ver `docs/features/career-map.md`.

| `kind` | Significado | Bloquea |
|--------|-------------|---------|
| `cursar` | Materias que deben estar aprobadas para **poder cursar** esta | Inscribirse a la cursada |
| `rendir` | Materias que deben estar aprobadas para **poder rendir el final** de esta | Rendir el final |

`Subject.status` guarda solo lo declarado (`pendiente` / `cursando` / `aprobada`). El
estado **`bloqueada` es derivado** (`src/lib/graph/subjectStatus.js`):

```
bloqueada  ⟺  ∃ correlativa de kind='cursar' cuya materia requerida NO está 'aprobada'
```

**Las correlativas deben ser un DAG:** se valida al guardar (ADR-009,
`src/lib/graph/validateDag.js`) y la base rechaza el caso trivial
(`CHECK (subject_id <> requires_id)`).

## Posiciones en lote (ADR-016)

`save_node_positions(p_table, p_x_column, p_y_column, p_moves jsonb)`: un único `UPDATE`
para todos los nodos movidos. **`security invoker`** (RLS aplica) y **whitelist**: desde la
0004 acepta **solo** `subjects (pos_x, pos_y)`. Solo `authenticated` puede ejecutarla.

---

## Esquema SQL (Supabase)

> **La implementación de referencia son los archivos de `supabase/migrations/`, en orden**:
> `0001_init.sql`, `0002_manual_layout_and_prereq_toggle.sql`,
> `0003_three_levels_and_sheet_links.sql`, `0004_carpeta.sql`. Lo de abajo es el **estado
> resultante**; si difiere, manda el `.sql`.

Además de las tablas, las migraciones incluyen:
1. **`user_id ... default auth.uid()`**: el cliente **nunca manda `user_id`**.
2. **Trigger `set_updated_at()`** en `careers`, `subjects` y `sheets` (en `sheets`, solo
   por título o contenido).
3. **RLS activado + política `_owner` por tabla** (`for all to authenticated`, `using` y
   `with check` sobre `auth.uid() = user_id`).
4. **RPC `save_node_positions`** (sección de arriba).

### Cómo aplicarla

Supabase Dashboard → **SQL Editor** → correr en orden `0001`, `0002`, `0003` y `0004`. La
`0004` es **destructiva** (borra `sheet_links`, `units`, `topics` y columnas): autorizada
por el usuario el 2026-10-14.

> **Estado (2026-10-14):** `0002`, `0003` y `0004` aplicadas vía Management API. La 0004 se
> probó antes dentro de `begin … rollback` con asserts. Esa prueba encontró un bug de orden:
> los triggers de la 0003 dejaban `content_md` en NULL al anular títulos, así que se
> dropean primero. Resultado verificado: 3 hojas con su título convertido en `# tema`, sin
> `sheet_links`/`units`/`topics`, whitelist solo `subjects`. Para aplicar migraciones así,
> ver `docs/03-security.md` § "Token de acceso personal".

### Estado de las tablas

```sql
create table careers (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name               text not null check (length(trim(name)) between 1 and 120),
  color              text not null default '#22c55e',
  uses_prerequisites boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create table subjects (
  id         uuid primary key default gen_random_uuid(),
  career_id  uuid not null references careers(id) on delete cascade,
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name       text not null check (length(trim(name)) between 1 and 120),
  color      text not null default '#22c55e',
  status     text not null default 'pendiente' check (status in ('pendiente', 'cursando', 'aprobada')),
  position   int  not null default 0,
  pos_x      double precision,   -- canvas de carrera (ADR-012)
  pos_y      double precision,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table prerequisites (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  subject_id  uuid not null references subjects(id) on delete cascade, -- la condicionada
  requires_id uuid not null references subjects(id) on delete cascade, -- la requerida
  kind        text not null check (kind in ('cursar', 'rendir')),
  constraint no_self_prerequisite check (subject_id <> requires_id),
  unique (subject_id, requires_id, kind)
);

create table sheets (
  id         uuid primary key default gen_random_uuid(),
  subject_id uuid not null references subjects(id) on delete cascade,
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title      text,                       -- LEGADO: siempre NULL desde la 0004
  content_md text not null default '',   -- Markdown: fuente de verdad (ADR-011)
  position   int  not null default 0,    -- LEGADO
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on subjects (career_id);
create index on prerequisites (subject_id);
create index on prerequisites (requires_id);
create index on sheets (subject_id);
create index sheets_subject_created_idx on sheets (subject_id, created_at);
```

### Reglas de integridad (cascada)

**La cascada la hace Postgres** (`ON DELETE CASCADE`):
- Borrar una **Career** → borra sus Subjects → Sheets.
- Borrar un **Subject** → borra sus Sheets **y** las `prerequisites` donde aparezca.
- Borrar el usuario → borra todo lo suyo.

---

## Cache en `localStorage`

> La cache **no es el modelo**: es una copia descartable para pintar rápido (ADR-007).

| Clave | Contenido |
|-------|-----------|
| `studree:cache:<tabla>` | Colección global (ej. `studree:cache:careers`) |
| `studree:cache:<tabla>:<parentId>` | Colección acotada a un padre |
| `studree:cache:<tabla>[<columnas>]:<parentId>` | Lista con columnas parciales (ej. las hojas de la carpeta) |
| `studree:cache:sheet:<id>` | Borrador local de una hoja: `{ content, baseUpdatedAt }` (ver `sheet-editor.md`) |
| `studree:ui:tabs` | Tabs abiertas (una por materia) |
| `studree:ui:explorer` | Carreras expandidas en el explorador |

**Todas las claves de Studree empiezan con `studree:`**, y `clearAllCache()` borra por ese
prefijo (cache **y** UI) al cerrar sesión o al entrar con otra cuenta.

### Límite de filas

PostgREST devuelve **como máximo 1000 filas por consulta**. `crudService.list` y
`listByParents` **paginan** con `.range()` hasta traer todo.

---

## Preparado para IA (sin implementar todavía)

`sheets.content_md` es Markdown plano, **chunkeable por hoja** y fechado. **No se
implementa vectorización en esta etapa.**

---

## Historial de cambios del modelo

| Fecha | Cambio | Estado |
|-------|--------|--------|
| 2026-06-28 | Modelo inicial en `localStorage` (Subject, TreeNode, Resource, Folder) | Obsoleto |
| 2026-08-24 | 5 niveles explícitos (Career/Subject/Unit/Topic/Sheet) + `prerequisites`; Supabase | Reemplazado (`0001_init.sql`) |
| 2026-10-14 | `careers.uses_prerequisites`; posiciones manuales (ADR-012, ADR-013) | ✅ `0002` |
| 2026-10-14 | 3 niveles (ADR-014): `sheets.subject_id`; `sheet_links` por triggers (ADR-015); RPC de posiciones (ADR-016) | ✅ `0003` (links derogados por la 0004) |
| 2026-10-14 | **La Carpeta** (ADR-017): hojas sin título (título → `# tema`), sin `sheet_links`/`units`/`topics`/posiciones de hojas/`map_*`; whitelist solo `subjects` | ✅ `0004` |
