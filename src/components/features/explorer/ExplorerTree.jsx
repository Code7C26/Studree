/**
 * Render (de profundidad fija, ADR-014) de los 3 niveles:
 * Carrera → Materia → Hoja. Ver docs/features/navigation-shell.md.
 */

import { ExplorerItem } from './ExplorerItem'

const ICONS = {
  career: '🎓',
  subject: '📚',
  sheet: '📝',
}

/**
 * @param {Object} props
 * @param {Array<Object>} props.careers - Árbol completo (ver useExplorerTree).
 * @param {{has: (key: string) => boolean}} props.expandedKeys - Claves `"tipo:id"` expandidas.
 * @param {(key: string, forceOpen?: boolean) => void} props.onToggle
 * @param {(careerId: string) => void} props.onNavigateCareer
 * @param {(subjectId: string) => void} props.onNavigateSubject
 * @param {(sheet: {id: string, title: string}) => void} props.onOpenSheet
 * @param {(type: 'career'|'subject'|'sheet', id: string, name: string, node: Object) => Promise<string|null>} props.onRenameEntity
 * @param {string} [props.activeCareerId]
 * @param {string} [props.activeSubjectId]
 * @param {string} [props.activeSheetId]
 */
export function ExplorerTree({
  careers,
  expandedKeys,
  onToggle,
  onNavigateCareer,
  onNavigateSubject,
  onOpenSheet,
  onRenameEntity,
  activeCareerId,
  activeSubjectId,
  activeSheetId,
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
              career.subjects.map((subject) => {
                const subjectKey = `subject:${subject.id}`
                const subjectExpanded = expandedKeys.has(subjectKey)

                return (
                  <div key={subject.id}>
                    <ExplorerItem
                      icon={ICONS.subject}
                      label={subject.name}
                      depth={1}
                      hasChildren={subject.sheets.length > 0}
                      expanded={subjectExpanded}
                      onToggle={() => onToggle(subjectKey)}
                      active={subject.id === activeSubjectId && !activeSheetId}
                      onSelect={() => {
                        onToggle(subjectKey, true)
                        onNavigateSubject(subject.id)
                      }}
                      onRename={(name) => onRenameEntity('subject', subject.id, name, subject)}
                    />

                    {subjectExpanded &&
                      subject.sheets.map((sheet) => (
                        <ExplorerItem
                          key={sheet.id}
                          icon={ICONS.sheet}
                          label={sheet.title}
                          depth={2}
                          active={sheet.id === activeSheetId}
                          onSelect={() => onOpenSheet(sheet)}
                          onRename={(name) => onRenameEntity('sheet', sheet.id, name, sheet)}
                        />
                      ))}
                  </div>
                )
              })}
          </div>
        )
      })}
    </div>
  )
}
