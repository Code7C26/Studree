# Feature: Panel de Carreras (inicio del workspace)

> **Estado:** ✅ Implementado (2026-10-14)
> **Archivos clave:** `src/pages/CareersPage.jsx`,
> `src/components/features/careers/CareerCard.jsx`,
> `src/components/features/careers/CareerFormModal.jsx`, `src/hooks/useCareers.js`
> **Reemplaza a:** `docs/features/folders-and-subjects.md` (modelo viejo de carpetas)

---

## Descripción

Pantalla de entrada del workspace (`/carreras`). Muestra las carreras / cursos del usuario
como **tarjetas grandes y visuales** — no es un canvas de nodos (decisión del usuario,
2026-10-14): los nodos empiezan dentro de cada carrera (materias).

## Qué muestra cada tarjeta

| Elemento | Origen |
|----------|--------|
| Franja / ícono con el color de la carrera | `careers.color` (paleta de `constants/palette.js`, vía `style` inline) |
| Nombre | `careers.name` |
| Tipo: *Carrera con correlativas* o *Curso / organizador* | `careers.uses_prerequisites` (ADR-013) |
| Cantidad de materias y aprobadas | Agregado de `subjects` (una sola consulta para todas las carreras) |
| Barra de progreso (% aprobadas) | `computeCareerProgress` (`lib/graph/subjectStatus.js`) |
| Menú: editar / eliminar | Editar abre `CareerFormModal`; eliminar pide confirmación |

Arriba de la grilla hay una fila de **métricas** (carreras, materias, aprobadas) y la última
tarjeta es un **"+ Nueva carrera"** punteado, como en el diseño de referencia
(`desing/EJEMPLO DE INTERFAZ.jpeg`).

## ¿Carrera o curso? (correlativas opcionales — ADR-013)

Al crear o editar se elige el tipo:

- **Carrera con correlativas** (`uses_prerequisites = true`): el canvas muestra aristas,
  candados de bloqueo, el botón "Correlativas" y permite conectar materias arrastrando.
- **Curso / organizador** (`uses_prerequisites = false`): el canvas es un organizador
  libre de materias — sin aristas, sin bloqueos, sin UI de correlativas.

Cambiar de tipo **no borra** las correlativas ya cargadas: solo se ocultan. Si se vuelve a
activar, reaparecen.

## Flujo de uso

1. El usuario entra a `/carreras`.
2. "+ Nueva carrera" → modal: nombre, color y tipo.
3. Click en una tarjeta → `/carreras/:careerId` (canvas de materias, ver `career-map.md`).
4. Menú ⋯ → Editar (nombre, color, tipo) o Eliminar (con confirmación: borra en cascada
   todas sus materias y hojas).

## Restricciones

- Borrar siempre con `ConfirmDialog` (la cascada de Postgres no se puede deshacer).
- Colores solo de la paleta (Mandamiento VII).
- Las estadísticas se calculan con **una** consulta de materias, no una por carrera.

## Pendiente

- [ ] Reordenar carreras (drag).
- [ ] Ícono elegible por carrera.

## Idioma (Fase 18)

El panel de carreras, las tarjetas y el formulario salen del diccionario `careers` (castellano / inglés,
ver `docs/features/i18n.md`). Los nombres de carreras y materias son contenido del usuario y no se traducen.
El tipo "Carrera con correlativas" / "Curso u organizador" sigue guardándose como `uses_prerequisites`.
