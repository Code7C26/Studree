# Feature: Canvas de Carrera (materias + correlativas)

> **Estado:** ✅ Implementado (2026-09-09) · Rediseño estilo n8n (2026-10-14, ADR-012/013)
> **Archivos clave:** `src/pages/CareerMapPage.jsx`,
> `src/components/features/careerMap/`, `src/hooks/useCareerMap.js`,
> `src/lib/graph/dagreLayout.js`, `src/lib/graph/validateDag.js`,
> `src/lib/graph/subjectStatus.js`
> **Dependencias nuevas:** `@dagrejs/dagre`

---

## Descripción

Canvas estilo n8n donde **cada nodo es una materia** de la carrera y **cada arista es una
correlativa real**. Muestra de un vistazo qué se puede cursar, qué está bloqueado y por qué.

## Interacción estilo n8n (2026-10-14)

| Acción | Resultado |
|--------|-----------|
| Arrastrar un nodo | Se mueve y **la posición se guarda** (ADR-012) |
| Doble click / click derecho en el fondo | Nueva materia **en ese punto** |
| Botón **＋ Materia** (arriba a la izquierda) | Nueva materia (centro de la vista o lugar libre) |
| **＋** a la derecha de un nodo (hover) | Nueva materia a continuación; si la carrera usa correlativas, nace requiriendo a esa (para cursar) |
| Unir el punto derecho de A con el izquierdo de B | Correlativa "B requiere A" → se elige *para cursar* / *para rendir* |
| Click en una flecha | Quitar esa correlativa (con confirmación) |
| Doble click en un nodo / click en su nombre | Abrir la materia |
| ✕ en el nodo (hover) | Eliminar materia (con confirmación: cascada) |
| **⟲ Reordenar** | Borra las posiciones manuales → vuelve el acomodo automático |

- El canvas ocupa todo el alto disponible y **se muestra aunque esté vacío** (con un
  botón "Agregar primera materia").
- Supr / Backspace **no** borran nodos (`deleteKeyCode={null}`): borrar siempre pasa por
  la confirmación.

## Carrera vs curso: `uses_prerequisites` (ADR-013)

El header del canvas tiene el interruptor **"Usa correlativas"** (también se elige al crear
la carrera, ver `careers.md`). Con `false`: no se dibujan aristas, nada queda `bloqueada`,
no hay botón 🔗 ni puntos de conexión, y el layout automático es una **grilla** (dagre sin
aristas apilaría todo en una columna). Las correlativas ya cargadas no se borran.

## Las correlativas son opcionales, no un requisito

> Decisión registrada 2026-09-09, antes de implementar (Fase 7.3 sigue pendiente).

Studree no es solo para carreras universitarias: también sirve para cursos,
capacitaciones o simplemente para guardar y organizar material de estudio sin
ningún requisito entre materias (ver "Público objetivo" en
`docs/01-project-overview.md`).

- Cargar correlativas es una acción **opcional y secundaria** ("Editar
  correlativas" en el nodo), nunca un paso obligatorio al crear una materia.
- Una materia **sin ninguna correlativa cargada** es un nodo suelto, normal,
  con todas sus funciones (hojas y enlaces) disponibles igual. Nunca
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

## Layout: híbrido (ADR-012, reemplaza a ADR-008)

- **Modo automático** (ningún nodo guardado): dagre `LR` si hay correlativas de cursar
  (cada nivel ≈ un cuatrimestre alcanzable); grilla si no hay.
- **Modo manual**: al primer arrastre se guardan `pos_x`/`pos_y` de **todas** las materias
  visibles; desde ahí cada nodo queda donde el usuario lo deja. Las materias nuevas nacen
  en un lugar libre (o en el punto del doble click).
- **⟲ Reordenar** vuelve al modo automático.

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
| `src/pages/CareerMapPage.jsx` | Página: header (interruptor de correlativas, exportar) + canvas + diálogos |
| `src/components/features/careerMap/CareerMap.jsx` | Lienzo React Flow (nodos, aristas, toolbar, creación en el lienzo) |
| `src/components/features/careerMap/SubjectNode.jsx` | Nodo: nombre, estado, candado, puntos de conexión, "+" |
| `src/components/features/careerMap/PrerequisiteEditor.jsx` | Modal para editar correlativas |
| `src/components/features/careerMap/PrerequisiteKindDialog.jsx` | Al conectar dos nodos: ¿para cursar o para rendir? |
| `src/components/ui/PromptDialog.jsx` | Diálogo de nombre para crear materias |
| `src/hooks/useCareerMap.js` | Carrera + materias + correlativas + posiciones (en lote, ADR-016) + recarga silenciosa ante `studree:data-changed` |
| `src/hooks/useFlowCanvas.js` | Arrastrar/guardar, modo auto/manual, crear en el lienzo |
| `src/lib/graph/canvasPositions.js` | Posición guardada vs automática, grilla, lugar libre |
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

- **Estados distinguibles (2026-10-14):** cada materia muestra un chip con ícono y color
  propio — `○ Pendiente` (gris), `◐ Cursando` (ámbar, token `warn`), `✓ Aprobada` (verde,
  fondo suave), `🔒 Bloqueada` (gris apagado, borde punteado). Antes "aprobada" y
  "cursando" eran dos verdes casi iguales. Ver `STATUS_STYLES` en
  `src/constants/subjectStatus.js`. Click en una materia abre su **carpeta**.
- Las posiciones se guardan solo por arrastre / creación en el lienzo (ADR-012), en **un
  solo request** para todos los nodos (`subjectsService.savePositions` → RPC
  `save_node_positions`, ADR-016).
- Si otra vista cambia datos (ej. renombrar una materia en el explorador), el canvas se
  recarga en silencio (debounce 300 ms).
- **Nunca** llamar a dagre sin haber validado el DAG (ADR-009).
- Borrar materias y correlativas siempre con confirmación.
- Colores solo del design system de `tailwind.config.js` (Mandamiento VII).
- El bloqueo es informativo: **no impide** abrir la materia ni cargar contenido.

## Pendiente

- [x] Crear correlativas arrastrando una arista entre nodos (2026-10-14).
- [ ] Filtrar por cuatrimestre / año.
- [ ] Resaltar el camino crítico de la carrera.

## Idioma (Fase 18)

El lienzo, los nodos y los diálogos de correlativas salen del diccionario `careerMap`. Las constantes
`STATUS_STYLES` (`subjectStatus.js`) y `PREREQUISITE_KIND_META` (`prerequisiteKinds.js`) guardan una
`labelKey`/`helpKey` y los componentes hacen `t(entry.labelKey)`; los identificadores que van a la base
(`aprobada`, `cursando`, `pendiente`, `cursar`, `rendir`) no cambian. `describeBlockReason(state, lang)`
traduce el motivo del candado y los errores de `prerequisites.service` (ciclo, correlativa de sí misma)
salen de `careerMap.errors`.
