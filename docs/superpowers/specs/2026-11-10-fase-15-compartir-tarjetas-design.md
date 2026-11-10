# Fase 15 — Compartir por link y tarjetas (flashcards): diseño

> Spec de la Fase 15 del roadmap (`docs/01-project-overview.md`).
> Plan: `docs/superpowers/plans/2026-11-10-fase-15.md`.

## Problema

Un estudiante quiere dos cosas que todavía no puede hacer:

1. **Pasarle apuntes a alguien sin darle su cuenta.** Hoy todo vive detrás de RLS: no hay forma
   de mostrar una materia a un compañero, a un docente o a alguien sin cuenta.
2. **Repasar sin releer todo.** El Brote toma exámenes, pero no hay tarjetas de repaso (pregunta
   y respuesta) que se puedan estudiar en cualquier momento y que espacien los repasos.

## Alcance de esta fase

### A. Compartir una materia por link

- Se comparte **una materia** (la Carpeta completa), no una hoja suelta: es la unidad natural
  del producto (ADR-017) y evita una segunda interfaz.
- El dueño genera un link con un **token aleatorio**, lo copia, y puede **revocarlo**. Un solo
  link activo por materia: revocar y volver a generar es la forma de cambiar el token.
- La página pública (`/compartido/:token`) es **de solo lectura**, sin header ni explorador, y
  no requiere cuenta. Muestra el nombre de la materia, el de la carrera, las hojas en orden
  cronológico con su fecha y el contenido.
- **Sin adjuntos** en la vista pública: los archivos del bucket privado no se pueden leer sin
  sesión, y firmar una URL exige ser el dueño. Se quitan las referencias `adjunto:` del texto
  (queda el texto alternativo cuando existe). Los `[[Tema]]` se muestran como texto.
- El link no vence solo: queda activo hasta que el dueño lo revoca. (Agregar vencimiento es una
  mejora posterior; no está en el roadmap.)

### B. Tarjetas (flashcards)

- **Un mazo por materia.** Cada tarjeta tiene frente y dorso (texto plano corto, 1–2000
  caracteres cada uno) y pertenece a una materia; opcionalmente recuerda de qué hoja salió.
- Se crean, editan y borran a mano desde el mazo de la materia. Generarlas con el Brote queda
  para una fase posterior: exige una acción nueva de la Edge Function y cuotas.
- **Repaso con cajas de Leitner:** 5 cajas. Acertar sube una caja; fallar vuelve a la caja 1.
  El intervalo hasta el próximo repaso es 0, 1, 2, 4 y 8 días según la caja. Una tarjeta es
  "para hoy" si `due_at <= hoy`.
- La sesión de repaso muestra el frente, el usuario piensa, muestra el dorso y elige "La sabía"
  o "No la sabía". No hay puntaje ni historial de sesiones: el estado vive en la tarjeta.
- Las tarjetas son privadas (RLS por dueño). Borrar la materia borra sus tarjetas.

## Decisiones y por qué

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| Compartir la materia completa | Compartir hoja suelta | La Carpeta es la unidad del producto; una hoja sin contexto se lee peor. |
| Un link activo por materia | Muchos links por materia | Menos UI y menos estados que explicar; revocar + generar cubre el caso. |
| Link sin vencimiento | Vencimiento a 7/30 días | Nadie lo pidió y agrega una fecha que nadie configura. Revocar es explícito. |
| RPC `security definer` para la lectura pública | Política RLS anónima por token | RLS no puede comparar contra un parámetro de la request; una tabla pública dejaría listar todos los links. La RPC devuelve solo el link pedido. |
| Sin adjuntos en la vista pública | Firmar URLs desde el servidor | Requiere otra Edge Function; el contenido de estudio es el Markdown. |
| Tarjetas manuales | Generarlas con el Brote | Mantiene la fase sin tocar la Edge Function ni las cuotas. |
| Leitner 5 cajas | SM-2 completo | Simple, explicable y sin estado oculto; suficiente para el uso real. |

## Seguridad de la lectura pública (revisión obligatoria)

`get_shared_subject(p_token text)` es la **única** función `security definer` del proyecto. Reglas:

- `set search_path = public`, sin SQL dinámico, sin concatenar texto.
- Valida que el link exista, no esté revocado y que su materia siga viva (`deleted_at is null`).
- Devuelve **solo** los datos de esa materia: nombre, color, nombre de la carrera y sus hojas
  vivas (`id`, `created_at`, `content_md`). No devuelve ids de usuario ni de otras materias.
- `revoke all on function ... from public; grant execute ... to anon, authenticated`.
- El token tiene 32 caracteres hex (128 bits): adivinarlo no es viable.
- La tabla `shared_links` no tiene política de lectura para `anon`; solo el dueño la ve.

## Modelo de datos (migración 0010)

```sql
shared_links (
  id uuid pk,
  user_id uuid default auth.uid() -> auth.users on delete cascade,
  subject_id uuid -> subjects on delete cascade,
  token text unique not null check (token ~ '^[0-9a-f]{32}$'),
  created_at timestamptz default now(),
  revoked_at timestamptz
)
-- índice único parcial: un link activo por materia
unique (subject_id) where revoked_at is null

flashcards (
  id uuid pk,
  user_id uuid default auth.uid() -> auth.users on delete cascade,
  subject_id uuid -> subjects on delete cascade,
  sheet_id uuid -> sheets on delete set null,
  front text not null check (length(trim(front)) between 1 and 2000),
  back text not null check (length(trim(back)) between 1 and 2000),
  box int not null default 1 check (box between 1 and 5),
  due_at timestamptz not null default now(),
  last_reviewed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
)
```

RLS `to authenticated` con `auth.uid() = user_id` en ambas. `flashcards` tiene select/insert/
update/delete propios. `shared_links` select/insert/update/delete propios.

## Protocolo / interfaces

- `sharedLinks.service.js`: `getForSubject(subjectId)`, `create(subjectId)`, `revoke(id)`,
  `getPublic(token)`.
- `flashcards.service.js`: `listBySubject(subjectId)`, `create(values)`, `update(id, values)`,
  `remove(id)`, `review(id, correct)`.
- Librerías puras: `src/lib/share/token.js` (validar/normalizar token) y
  `src/lib/flashcards/srs.js` (`nextReview`, `isDue`, `dueCards`, `boxLabel`).
- Rutas: `ROUTES.shared = '/compartido/:token'` (pública, fuera del layout) y
  `ROUTES.subjectCards = '/materias/:subjectId/tarjetas'` (workspace, con sesión).

## Fuera de alcance

- Compartir carreras u hojas sueltas.
- Links con vencimiento, contraseña o permiso de edición.
- Adjuntos en la vista pública.
- Generar tarjetas con el Brote.
- Historial de repasos o estadísticas.

## Criterios de aceptación

1. El dueño genera un link, lo abre en una ventana privada y ve su materia sin iniciar sesión.
2. Revocar el link hace que la página pública diga que no existe.
3. La vista pública nunca muestra adjuntos ni datos de otras materias.
4. Un usuario no puede leer ni escribir `shared_links` ni `flashcards` de otro.
5. Crear una tarjeta, estudiarla y fallarla la devuelve a la caja 1 con vencimiento hoy.
6. Acertar 5 veces seguidas la deja en la caja 5 con vencimiento a 8 días.
7. Todo texto nuevo está en castellano e inglés y pasa el trinquete de i18n.
