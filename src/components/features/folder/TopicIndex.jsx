/**
 * Índice de temas de la carpeta (ADR-017): los headings `#`–`####` de todas
 * las hojas de la materia, en orden. Un click lleva al inicio del tema.
 * Es presentacional: los temas y el activo los calcula la página.
 * Ver docs/features/folder.md.
 */

/**
 * @typedef {Object} FolderTopic
 * @property {string} id - `${sheetKey}:${index}`.
 * @property {string} sheetKey
 * @property {number} index - Posición del heading dentro de su hoja.
 * @property {1|2|3|4} level
 * @property {string} text
 */

const INDENT = { 1: 'pl-2', 2: 'pl-5', 3: 'pl-8', 4: 'pl-11' }

/**
 * @param {Object} props
 * @param {FolderTopic[]} props.topics
 * @param {string|null} props.activeId
 * @param {(topic: FolderTopic) => void} props.onGo
 */
export function TopicIndex({ topics, activeId, onGo }) {
  if (topics.length === 0) {
    return (
      <p className="px-2 text-xs leading-relaxed text-text-muted">
        Todavía no hay temas. Escribí un título con <code className="rounded bg-surface-2 px-1"># Tema</code> en una hoja
        y aparece acá.
      </p>
    )
  }

  return (
    <nav aria-label="Temas de la materia">
      <ul className="space-y-0.5">
        {topics.map((topic) => {
          const active = topic.id === activeId
          return (
            <li key={topic.id}>
              <button
                type="button"
                onClick={() => onGo(topic)}
                aria-current={active ? 'location' : undefined}
                className={`w-full truncate rounded-md py-1 pr-2 text-left text-sm transition-colors ${INDENT[topic.level]} ${
                  topic.level === 1 ? 'font-medium' : ''
                } ${active ? 'bg-accent/15 text-accent' : 'text-text-muted hover:bg-surface-2 hover:text-text'}`}
                title={topic.text}
              >
                {topic.text}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
