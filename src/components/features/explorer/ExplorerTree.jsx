/**
 * Árbol del explorador: Carrera → Materia (ADR-017). Las hojas y los temas no
 * se listan acá: viven en la carpeta de cada materia (índice de temas).
 * Ver docs/features/navigation-shell.md.
 */

import { ExplorerItem } from './ExplorerItem'

const ICONS = {
  career: '🎓',
  subject: '📚',
}

/**
 * @param {Object} props
 * @param {Array<Object>} props.careers - Árbol (ver useExplorerTree): cada materia trae `sheetCount`.
 * @param {{has: (key: string) => boolean}} props.expandedKeys - Claves `"career:id"` expandidas.
 * @param {(key: string, forceOpen?: boolean) => void} props.onToggle
 * @param {(careerId: string) => void} props.onNavigateCareer
 * @param {(subjectId: string) => void} props.onNavigateSubject
 * @param {(type: 'career'|'subject', id: string, name: string, node: Object) => Promise<string|null>} props.onRenameEntity
 * @param {string} [props.activeCareerId]
 * @param {string} [props.activeSubjectId]
 */
export function ExplorerTree({
  careers,
  expandedKeys,
  onToggle,
  onNavigateCareer,
  onNavigateSubject,
  onRenameEntity,
  activeCareerId,
  activeSubjectId,
}) {
  return (
    <div>
      {careers.map((career) => {
        const careerKey = `career:${career.id}`
        const careerExpanded = expandedKeys.has(careerKey)

        return (
          <div key={career.id}>
            <ExplorerItem
              icon={ICONS.career}
              label={career.name}
              depth={0}
              hasChildren={career.subjects.length > 0}
              expanded={careerExpanded}
              onToggle={() => onToggle(careerKey)}
              active={career.id === activeCareerId && !activeSubjectId}
              onSelect={() => {
                onToggle(careerKey, true)
                onNavigateCareer(career.id)
              }}
              onRename={(name) => onRenameEntity('career', career.id, name, career)}
            />

            {careerExpanded &&
              career.subjects.map((subject) => (
                <ExplorerItem
                  key={subject.id}
                  icon={ICONS.subject}
                  label={subject.name}
                  hint={subject.sheetCount > 0 ? String(subject.sheetCount) : undefined}
                  depth={1}
                  active={subject.id === activeSubjectId}
                  onSelect={() => onNavigateSubject(subject.id)}
                  onRename={(name) => onRenameEntity('subject', subject.id, name, subject)}
                />
              ))}
          </div>
        )
      })}
    </div>
  )
}
