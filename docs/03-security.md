# Seguridad — Studree

> Leer este documento antes de tocar: autenticación, credenciales, almacenamiento de
> datos del usuario o variables de entorno.

## Estado actual

Studree es una **SPA (React + Vite) sin servidor propio** que habla **directamente con
Supabase** (BaaS). Desde el **ADR-007**, la **fuente de verdad de los datos es Supabase
(Postgres)** y `localStorage` pasó a ser solo una **cache optimista descartable**.

Consecuencia de seguridad central: **no hay backend intermedio que valide nada.** Lo único
que separa los datos de un estudiante de los de otro es **Row Level Security (RLS) en
Postgres**. Si RLS está mal, la base queda abierta.

## Autenticación

- **Supabase Auth** (requerida por el ADR-007: las políticas RLS filtran por `auth.uid()`).
- **NUNCA** implementar auth propia ni guardar contraseñas en `localStorage` o en el
  código: la gestión de credenciales es responsabilidad de Supabase Auth.
- La sesión la maneja el SDK (`persistSession`), no el código de la app.
- Sin sesión iniciada, `auth.uid()` es `NULL` y las políticas no devuelven ni aceptan
  ninguna fila. Es el comportamiento correcto y esperado.

### Modos de sesión

| Modo | Cuándo | Nota |
|------|--------|------|
| **Anónima** (actual) | La app la pide sola al arrancar | Sin email ni contraseña. `is_anonymous = true`, pero el rol del JWT **es `authenticated`**: las políticas RLS aplican igual, sin cambiar el SQL |
| Email + contraseña | `LoginPage`, si las anónimas están desactivadas | Se eligió sobre magic link porque el SMTP por defecto de Supabase limita a pocos mails por hora |

- Una sesión anónima **no es un agujero de seguridad**: cada usuario anónimo tiene su
  propio `auth.uid()` y RLS lo aísla igual que a uno registrado. Verificado con dos
  sesiones simultáneas: ninguna ve los datos de la otra.
- **En sesión anónima NO se ofrece cerrar sesión** (`Header.jsx`): no existe credencial
  con la que volver a entrar, así que hacerlo dejaría los datos inaccesibles de forma
  permanente. Era una pérdida de datos a un click.
- Al cerrar sesión (modo con email) se ejecuta `clearAllCache()`: la cache de un usuario
  no puede quedar visible para el siguiente que entre en el mismo navegador.

> **Limitación de las sesiones anónimas:** el acceso está atado al token guardado en ese
> navegador. Limpiar los datos del sitio, o abrir la app en otro navegador, da un usuario
> nuevo y deja las filas anteriores huérfanas (no borradas, pero inaccesibles). Antes de
> un uso real, convertir la cuenta anónima agregándole email y contraseña.

## Autorización

- Se resuelve **en la base de datos**, no en el cliente: una política RLS por tabla que
  exige `auth.uid() = user_id`.
- El `user_id` **no se manda desde el cliente**: la columna lleva `default auth.uid()`
  y el `with check` de la política rechaza cualquier intento de escribir filas ajenas.
- Cualquier validación en JavaScript es **solo UX**: la decisión real la toma Postgres.

## Datos del usuario

- **En Supabase:** apuntes y estructura de estudio del usuario, aislados por RLS.
- **En `localStorage` (cache):** copia descartable para pintar rápido. Vale lo mismo que
  antes: es accesible por cualquier script de la página, así que **NUNCA** guardar ahí
  contraseñas, tokens de servicios externos ni datos personales sensibles.
- **Al cerrar sesión o entrar con otra cuenta** se borra todo lo de Studree en
  `localStorage` (prefijo `studree:`: cache, borradores, tabs y explorador). Antes las
  tabs y el explorador quedaban y mostraban títulos de hojas del usuario anterior.
- Validar y sanitizar todo input antes de renderizarlo para evitar **XSS** (React ya
  escapa por defecto; tener especial cuidado con `dangerouslySetInnerHTML`). Atención con
  el **editor de hojas**: el contenido es Markdown del usuario y se renderiza como HTML.

## Variables de entorno (regla crítica de frontend)

> En una app de **solo frontend**, TODO lo que se incluye en el bundle es **público**.
> Cualquier variable `VITE_*` queda visible para el usuario final.

- **NUNCA** poner secretos reales (API keys privadas, service keys) en variables `VITE_*`.
- Los secretos solo existirán cuando haya **backend**, y vivirán **únicamente en el
  servidor**, nunca en el cliente.
- `.env.local` / `.env` **NUNCA** se commitean (están en `.gitignore`).
- `.env.example` lista las variables necesarias **sin valores reales**.

## Supabase — claves y RLS

Studree usa **Supabase** como base de datos (ADR-007). Supabase expone dos tipos
de clave y confundirlas es el error de seguridad más grave posible en este proyecto:

| Clave | Nombre nuevo | ¿Va en el frontend? | Qué hace |
|-------|--------------|---------------------|----------|
| `anon` | *publishable key* (`sb_publishable_…`) | ✅ **SÍ** | Clave pública. **Respeta RLS**: solo puede leer/escribir lo que las políticas permitan. |
| `service_role` | *secret key* (`sb_secret_…`) | ❌ **JAMÁS** | **Ignora RLS**. Acceso total de administrador a toda la base. |

### Reglas

- La `anon key` va en `VITE_SUPABASE_ANON_KEY` y **es pública por diseño**: queda
  visible en el bundle y eso es esperado. No es una excepción a la regla de arriba —
  simplemente **no es un secreto**.
- La `service_role key` **NUNCA** se pone en un `VITE_*`, ni en el código, ni en
  `.env.local`. Solo tendría lugar en un servidor (Edge Function / backend), si algún
  día existe.
- **La seguridad real la da Row Level Security (RLS)**, no el secreto de la clave:
  - **RLS activado (`ENABLE ROW LEVEL SECURITY`) en TODAS las tablas.** Una tabla sin
    RLS con la anon key publicada = base de datos abierta a cualquiera que abra la web.
  - Cada política debe filtrar por el usuario dueño del dato (`auth.uid() = user_id`).
    Incluye `sheet_links` (migración 0003).
- **Funciones de la base (migración 0003)** — `refresh_sheet_links`, los triggers de
  links y `save_node_positions` son **`security invoker`**: corren con los permisos y el
  RLS de quien llama, nunca como dueño de la base. `save_node_positions` interpola el
  nombre de tabla en SQL dinámico, así que valida una **whitelist estricta** de
  tabla/columnas antes de ejecutar (y usa `format('%I')`). Solo `authenticated` tiene
  `execute`. Verificado con un E2E: otro usuario no puede mover nodos ajenos por la RPC.
  Regla para funciones futuras: **nunca `security definer`** sin una revisión de seguridad
  explícita.
- Si una clave se filtra por error (commit, captura, chat), **rotarla** desde
  Supabase Dashboard → Settings → API Keys.

### Token de acceso personal (`SUPABASE_ACCESS_TOKEN`) — solo para migraciones

Para aplicar migraciones (`ALTER TABLE`, etc.) sin pasar por el SQL Editor se usa la
**Management API** de Supabase (`POST /v1/projects/{ref}/database/query`) con un
*personal access token* (`sbp_…`, se genera en supabase.com/dashboard/account/tokens).
La anon key **no puede** cambiar el esquema, y está bien que sea así.

- Va en `.env.local` como `SUPABASE_ACCESS_TOKEN`, **SIN prefijo `VITE_`**: así Vite no
  lo incluye en el bundle. `.env.local` está en `.gitignore`.
- **Nunca** se usa desde `src/`: lo lee solo el proceso que aplica la migración, en local.
- Da acceso total a la **cuenta** de Supabase (todos los proyectos): revocarlo cuando no
  se use, y rotarlo ante cualquier sospecha de filtración.

## Storage (adjuntos, 0006)

- El bucket `attachments` es **privado**; nunca `public = true`.
- Las 4 políticas de `storage.objects` (select, insert, update, delete) exigen que la
  primera carpeta de la ruta sea `auth.uid()` (`<user_id>/<attachment_id>/<nombre>`).
- Los archivos se muestran con **links firmados** de 1 h (`createSignedUrl`); no se guardan
  URLs en el Markdown (solo `adjunto:<id>`).
- La política de la tabla `attachments` exige que la hoja sea del usuario.
- Borrar desde SQL una fila de `storage.objects` deja el archivo huérfano: siempre borrar
  con la API de Storage.

## Reglas INVIOLABLES

- NUNCA hardcodear credenciales, tokens o claves en el código.
- NUNCA exponer la `service_role` key de Supabase en el cliente.
- NUNCA crear una tabla sin activar RLS y escribir su política por `auth.uid()`.
- NUNCA confiar en validaciones solo del cliente para decisiones de seguridad: la
  autorización real la aplica Postgres vía RLS.
- NUNCA hacer `git push` ni deploy sin confirmación explícita del usuario.
- SIEMPRE sanitizar/escapar contenido generado por el usuario.
- SIEMPRE mantener `.env*` fuera del control de versiones (salvo `.env.example`).

## Checklist de seguridad (revisar antes de cada deploy)

- [ ] `.env.local` está en `.gitignore`.
- [ ] `.env.example` tiene todas las variables (sin valores reales).
- [ ] No hay claves/tokens hardcodeados en el código.
- [ ] No se guardan datos sensibles en `localStorage`.
- [ ] La `service_role` key de Supabase NO aparece en ningún `VITE_*` ni en el código.
- [ ] **RLS activado en todas las tablas** de Supabase, con políticas por usuario.
- [ ] `user_plans` NO tiene política de escritura (solo `select` propio): el plan se cambia a mano en el panel de Supabase. `ai_usage` solo permite `select` e `insert`.
- [ ] El contenido del usuario se renderiza de forma segura (sin XSS).
