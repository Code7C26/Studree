/**
 * Índice de temas de la carpeta (ADR-017): los headings `#`–`####` de todas
 * las hojas de la materia, en orden. Un click lleva al inicio del tema. El
 * tema activo va en el color de la materia (variables `--subject*`, ADR-018).
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

const INDENT = { 1: 'pl-3', 2: 'pl-6', 3: 'pl-9', 4: 'pl-12' }

/**
 * @param {Object} props
 * @param {FolderTopic[]} props.topics
 * @param {string|null} props.activeId
 * @param {(topic: FolderTopic) => void} props.onGo
 */
export function TopicIndex({ topics, activeId, onGo }) {
  if (topics.length === 0) {
    return (
      <p className="text-xs leading-relaxed text-text-muted">
        Todavía no hay temas. Escribí un título con <code className="rounded bg-surface-2 px-1"># Tema</code> en una hoja
        y aparece acá.
      </p>
    )
  }

  return (
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
  )
}
