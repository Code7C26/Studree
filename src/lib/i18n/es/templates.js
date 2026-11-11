/** Plantillas de hoja: menú "Nueva hoja", administrador, validaciones y plantillas de fábrica. */
export default {
  newBlank: 'Nueva hoja',
  newFromTemplate: 'Nueva hoja desde una plantilla',
  menuTemplates: 'Plantillas',
  menuOwn: 'Tuyas',
  manage: 'Administrar plantillas…',
  manager: {
    title: 'Tus plantillas',
    empty: 'Todavía no guardaste ninguna. Usá «Guardar como plantilla» en una hoja.',
    pick: 'Plantilla',
    name: 'Nombre',
    content: 'Contenido (Markdown)',
    delete: 'Borrar',
    deleteTitle: 'Borrar plantilla',
    deleteMessage: 'Se borra la plantilla «{name}». Las hojas creadas con ella no cambian.',
  },
  errors: {
    nameRequired: 'Poné un nombre.',
    nameTooLong: 'El nombre puede tener hasta {max} caracteres.',
    contentEmpty: 'La plantilla está vacía.',
    contentTooLong: 'La plantilla puede tener hasta {max} caracteres.',
  },
  factory: {
    clase: {
      name: 'Clase',
      content: '# Clase\n\n## Conceptos clave\n\n- \n\n## Ejemplos\n\n\n## Dudas para preguntar\n\n- [ ] ',
    },
    resumen: {
      name: 'Resumen',
      content: '# Resumen\n\n## Idea principal\n\n\n## Puntos clave\n\n- \n\n## Para recordar\n\n> ',
    },
    practica: {
      name: 'Práctica',
      content: '# Práctica\n\n## Ejercicio 1\n\n**Enunciado:** \n\n**Resolución:** \n\n## Errores que cometí\n\n- ',
    },
    repaso: {
      name: 'Repaso para parcial',
      content: '# Repaso\n\n## Temas que entran\n\n- [ ] \n\n## Fórmulas y definiciones\n\n\n## Preguntas de práctica\n\n1. ',
    },
  },
}
