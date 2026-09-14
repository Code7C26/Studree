/**
 * Render recursivo (de profundidad fija, ADR-010) de los 5 niveles:
 * Carrera → Materia → Unidad → Tema → Hoja. Ver docs/features/navigation-shell.md.
 */

import { ExplorerItem } from './ExplorerItem'

const ICONS = {
  career: '🎓',
  subject: '📚',
  unit: '📁',
  topic: '🔖',
  sheet: '📝',
}

/**
 * @param {Object} props
 * @param {Array<Object>} props.careers - Árbol completo (ver useExplorerTree).
 * @param {Set<string>} props.expandedKeys - Claves `"tipo:id"` expandidas.
 * @param {(key: string) => void} props.onToggle
 * @param {(careerId: string) => void} props.onNavigateCareer
 * @param {(subjectId: string) => void} props.onNavigateSubject
 * @param {(sheet: {id: string, title: string}) => void} props.onOpenSheet
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
                      hasChildren={subject.units.length > 0}
                      expanded={subjectExpanded}
                      onToggle={() => onToggle(subjectKey)}
                      active={subject.id === activeSubjectId}
                      onSelect={() => {
                        onToggle(subjectKey, true)
                        onNavigateSubject(subject.id)
                      }}
                    />

                    {subjectExpanded &&
                      subject.units.map((unit) => {
                        const unitKey = `unit:${unit.id}`
                        const unitExpanded = expandedKeys.has(unitKey)

                        return (
                          <div key={unit.id}>
                            <ExplorerItem
                              icon={ICONS.unit}
                              label={unit.name}
                              depth={2}
                              hasChildren={unit.topics.length > 0}
                              expanded={unitExpanded}
                              onToggle={() => onToggle(unitKey)}
                              onSelect={() => {
                                onToggle(unitKey, true)
                                onNavigateSubject(subject.id)
                              }}
                            />

                            {unitExpanded &&
                              unit.topics.map((topic) => {
                                const topicKey = `topic:${topic.id}`
                                const topicExpanded = expandedKeys.has(topicKey)

                                return (
                                  <div key={topic.id}>
                                    <ExplorerItem
                                      icon={ICONS.topic}
                                      label={topic.name}
                                      depth={3}
                                      hasChildren={topic.sheets.length > 0}
                                      expanded={topicExpanded}
                                      onToggle={() => onToggle(topicKey)}
                                      onSelect={() => {
                                        onToggle(topicKey, true)
                                        onNavigateSubject(subject.id)
                                      }}
                                    />

                                    {topicExpanded &&
                                      topic.sheets.map((sheet) => (
                                        <ExplorerItem
                                          key={sheet.id}
                                          icon={ICONS.sheet}
                                          label={sheet.title}
                                          depth={4}
                                          active={sheet.id === activeSheetId}
                                          onSelect={() => onOpenSheet(sheet)}
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
              })}
          </div>
        )
      })}
    </div>
  )
}
