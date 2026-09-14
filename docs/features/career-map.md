# Feature: Canvas de Carrera (materias + correlativas)

> **Estado:** ✅ Implementado (2026-09-09)
> **Archivos clave:** `src/pages/CareerMapPage.jsx`,
> `src/components/features/careerMap/`, `src/hooks/useCareerMap.js`,
> `src/lib/graph/dagreLayout.js`, `src/lib/graph/validateDag.js`,
> `src/lib/graph/subjectStatus.js`
> **Dependencias nuevas:** `@dagrejs/dagre`

---

## Descripción

Canvas estilo n8n donde **cada nodo es una materia** de la carrera y **cada arista es una
correlativa real**. Muestra de un vistazo qué se puede cursar, qué está bloqueado y por qué.

## Las correlativas son opcionales, no un requisito

> Decisión registrada 2026-09-09, antes de implementar (Fase 7.3 sigue pendiente).

Studree no es solo para carreras universitarias: también sirve para cursos,
capacitaciones o simplemente para guardar y organizar material de estudio sin
ningún requisito entre materias (ver "Público objetivo" en
`docs/01-project-overview.md`).

- Cargar correlativas es una acción **opcional y secundaria** ("Editar
  correlativas" en el nodo), nunca un paso obligatorio al crear una materia.
- Una materia **sin ninguna correlativa cargada** es un nodo suelto, normal,
  con todas sus funciones (unidades, temas, hojas) disponibles igual. Nunca
  queda `bloqueada` (ver fórmula de derivación en `docs/DB_SCHEMA.md`).
- Una carrera entera sin ninguna correlativa cargada es un caso de uso válido:
  el canvas se ve como una lista de materias sueltas ordenadas por dagre, sin
  ningún candado. Es el modo "organizador simple" (curso, capacitación, notas
  personales).
- La implementación (Fase 7.3) **no debe** pedir correlativas en el alta de
  materia ni mostrar ningún estado que sugiera que falten si el usuario nunca
  las usó.

## Por qué acá sí se justifica un canvas

Las correlativas son un **grafo real, no una jerarquía decorativa**: una materia puede
tener varias correlativas y ser requisito de varias otras. Esa relación
muchos-a-muchos es exactamente lo que un diagrama de nodos comunica mejor que una lista.

## Layout: dagre, sin coordenadas guardadas

Las posiciones se **calculan siempre** con dagre a partir del grafo de correlativas
(**ADR-008**). **No se guarda ningún `x`/`y`**: la estructura es la única fuente de verdad.

- Dirección `LR` (izquierda → derecha): las correlativas se leen como progresión temporal.
- Cada nivel del layout equivale, en la práctica, a un cuatrimestre alcanzable.
- Consecuencia de UX aceptada: el usuario **no puede** reacomodar nodos de forma
  permanente.

> **El grafo debe ser un DAG.** Un ciclo haría que dagre no termine. Se garantiza
> validando **al guardar** la correlativa (ADR-009), nunca al renderizar.

## Estados de una materia

| Estado | Borde | Origen |
|--------|-------|--------|
| `aprobada` | `accent` (verde) | Declarado por el usuario |
| `cursando` | `accent-soft` | Declarado por el usuario |
| `pendiente` | `border` (gris) | Default |
| `bloqueada` | `border` + candado 🔒 | **Derivado**: le falta alguna correlativa de `cursar` |

`bloqueada` **no se persiste**: se calcula en `src/lib/graph/subjectStatus.js` a partir de
las correlativas y del estado de cada materia (ver `docs/DB_SCHEMA.md`).

### Indicador de bloqueo

Una materia bloqueada muestra el candado y, al pasar el mouse o tocarla, un tooltip con
**qué materias concretas le faltan**: *"Bloqueada — falta aprobar: Análisis I, Álgebra"*.
Sin ese detalle el bloqueo no es accionable.

## Correlativas: dos tipos

Se distinguen visualmente porque son requisitos distintos (ver `DB_SCHEMA.md`):

| `kind` | Arista | Significado |
|--------|--------|-------------|
| `cursar` | Línea sólida | Debe estar aprobada para **cursar** esta materia |
| `rendir` | Línea punteada | Debe estar aprobada para **rendir el final** |

Solo las de `cursar` participan del cálculo de `bloqueada`.

## Componentes / Archivos

| Archivo | Responsabilidad |
|---------|----------------|
| `src/pages/CareerMapPage.jsx` | Página: toolbar + canvas |
| `src/components/features/careerMap/CareerMap.jsx` | Lienzo React Flow (nodos + aristas) |
| `src/components/features/careerMap/SubjectNode.jsx` | Nodo: nombre, estado, candado, progreso |
| `src/components/features/careerMap/PrerequisiteEditor.jsx` | Modal para editar correlativas |
| `src/hooks/useCareerMap.js` | Estado del grafo + acciones |
| `src/lib/graph/dagreLayout.js` | Cálculo de posiciones con dagre |
| `src/lib/graph/validateDag.js` | Detección de ciclos (DFS 3 colores) |
| `src/lib/graph/subjectStatus.js` | Deriva `bloqueada` |
| `src/services/prerequisites.service.js` | CRUD de correlativas + validación DAG |

## Flujo de uso

1. El usuario entra a `/carreras/:careerId`.
2. Ve el canvas con sus materias, ordenado por dagre según las correlativas.
3. Click en una materia → navega a su canvas (`/materias/:subjectId`).
4. **(Opcional)** "Editar correlativas" → elige materias requeridas y el tipo (`cursar` / `rendir`). Si nunca se usa, la materia funciona igual, solo que nunca queda bloqueada.
5. Al guardar: si se cerrara un ciclo → **se rechaza** y se muestra el ciclo concreto.
6. Cambia el estado de una materia → las bloqueadas se recalculan al instante.

## Restricciones

- **Nunca** persistir `x`/`y` (ADR-008).
- **Nunca** llamar a dagre sin haber validado el DAG (ADR-009).
- Colores solo del design system de `tailwind.config.js` (Mandamiento VII).
- El bloqueo es informativo: **no impide** abrir la materia ni cargar contenido.

## Pendiente

- [ ] Crear correlativas arrastrando una arista entre nodos.
- [ ] Filtrar por cuatrimestre / año.
- [ ] Resaltar el camino crítico de la carrera.
