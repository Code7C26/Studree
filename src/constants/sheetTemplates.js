/**
 * Plantillas de hoja de fábrica (Fase 13, ver docs/features/sheet-templates.md).
 * Viven en el código, no en la base: no se pueden borrar. Las del usuario
 * están en la tabla `sheet_templates` (migración 0006).
 */

export const TEMPLATE_NAME_MAX = 60
export const TEMPLATE_CONTENT_MAX = 20000

export const FACTORY_TEMPLATES = Object.freeze([
  {
    id: 'factory:clase',
    name: 'Clase',
    factory: true,
    content_md: '# Clase\n\n## Conceptos clave\n\n- \n\n## Ejemplos\n\n\n## Dudas para preguntar\n\n- [ ] ',
  },
  {
    id: 'factory:resumen',
    name: 'Resumen',
    factory: true,
    content_md: '# Resumen\n\n## Idea principal\n\n\n## Puntos clave\n\n- \n\n## Para recordar\n\n> ',
  },
  {
    id: 'factory:practica',
    name: 'Práctica',
    factory: true,
    content_md: '# Práctica\n\n## Ejercicio 1\n\n**Enunciado:** \n\n**Resolución:** \n\n## Errores que cometí\n\n- ',
  },
  {
    id: 'factory:repaso',
    name: 'Repaso para parcial',
    factory: true,
    content_md: '# Repaso\n\n## Temas que entran\n\n- [ ] \n\n## Fórmulas y definiciones\n\n\n## Preguntas de práctica\n\n1. ',
  },
])
