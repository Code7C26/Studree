/**
 * Panel "Enlaces" debajo del editor (ADR-015). Ver docs/features/sheet-editor.md.
 *
 * Muestra a qué hojas enlaza esta, cuáles la enlazan (backlinks) y los
 * `[[Títulos]]` escritos que todavía no existen, con un botón para crearlos.
 * Es presentacional: los datos vienen de `useSheetLinks`.
 */

/**
 * @param {Object} props
 * @param {Array<{id: string, title: string}>} props.outgoing
 * @param {Array<{id: string, title: string}>} props.incoming
 * @param {string[]} props.unresolved
 * @param {(sheet: {id: string, title: string}) => void} props.onOpenSheet
 * @param {(title: string) => void} props.onCreateSheet
 * @param {string|null} [props.creating] - Título que se está creando.
 */
export function SheetLinksPanel({ outgoing, incoming, unresolved, onOpenSheet, onCreateSheet, creating = null }) {
  const empty = outgoing.length === 0 && incoming.length === 0 && unresolved.length === 0

  return (
    <section aria-label="Enlaces" className="rounded-lg border border-border bg-surface px-4 py-3 text-sm">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-text-muted">Enlaces</h2>

      {empty ? (
        <p className="mt-1.5 text-xs text-text-muted">
          Escribí <code className="rounded bg-surface-2 px-1">[[Título de otra hoja]]</code> para enlazar hojas de esta
          materia.
        </p>
      ) : (
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          <LinkGroup title="Enlaza a" sheets={outgoing} onOpenSheet={onOpenSheet} />
          <LinkGroup title="Enlazada desde" sheets={incoming} onOpenSheet={onOpenSheet} />

          {unresolved.length > 0 && (
            <div className="sm:col-span-2">
              <p className="text-xs text-text-muted">Todavía no existen:</p>
              <ul className="mt-1 flex flex-wrap gap-1.5">
                {unresolved.map((title) => (
                  <li key={title}>
                    <button
                      type="button"
                      onClick={() => onCreateSheet(title)}
                      disabled={creating != null}
                      className="rounded-md border border-dashed border-border px-2 py-0.5 text-xs text-text-muted transition-colors hover:border-accent hover:text-accent disabled:opacity-50"
                      title={`Crear la hoja "${title}"`}
                    >
                      {creating === title ? 'Creando…' : `＋ ${title}`}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  )
}

/**
 * @param {Object} props
 * @param {string} props.title
 * @param {Array<{id: string, title: string}>} props.sheets
 * @param {(sheet: {id: string, title: string}) => void} props.onOpenSheet
 */
function LinkGroup({ title, sheets, onOpenSheet }) {
  return (
    <div>
      <p className="text-xs text-text-muted">{title}</p>
      {sheets.length === 0 ? (
        <p className="mt-1 text-xs text-text-muted">—</p>
      ) : (
        <ul className="mt-1 space-y-0.5">
          {sheets.map((sheet) => (
            <li key={sheet.id}>
              <button
                type="button"
                onClick={() => onOpenSheet(sheet)}
                className="max-w-full truncate text-left text-accent hover:underline"
              >
                📝 {sheet.title}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
