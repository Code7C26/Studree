/** Sheet templates: "New sheet" menu, manager, validations and factory templates. */
export default {
  newBlank: 'New sheet',
  newFromTemplate: 'New sheet from a template',
  menuTemplates: 'Templates',
  menuOwn: 'Yours',
  manage: 'Manage templates…',
  manager: {
    title: 'Your templates',
    empty: 'You have not saved any yet. Use “Save as template” on a sheet.',
    pick: 'Template',
    name: 'Name',
    content: 'Content (Markdown)',
    delete: 'Delete',
    deleteTitle: 'Delete template',
    deleteMessage: 'The template “{name}” is deleted. Sheets created from it do not change.',
  },
  errors: {
    nameRequired: 'Enter a name.',
    nameTooLong: 'The name can be up to {max} characters long.',
    contentEmpty: 'The template is empty.',
    contentTooLong: 'The template can be up to {max} characters long.',
  },
  factory: {
    clase: {
      name: 'Class',
      content: '# Class\n\n## Key concepts\n\n- \n\n## Examples\n\n\n## Questions to ask\n\n- [ ] ',
    },
    resumen: {
      name: 'Summary',
      content: '# Summary\n\n## Main idea\n\n\n## Key points\n\n- \n\n## To remember\n\n> ',
    },
    practica: {
      name: 'Practice',
      content: '# Practice\n\n## Exercise 1\n\n**Problem:** \n\n**Solution:** \n\n## Mistakes I made\n\n- ',
    },
    repaso: {
      name: 'Exam review',
      content: '# Review\n\n## Topics covered\n\n- [ ] \n\n## Formulas and definitions\n\n\n## Practice questions\n\n1. ',
    },
  },
}
