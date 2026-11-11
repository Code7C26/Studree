/** Public landing (/bienvenida): all the copy. Same shape that `getLandingCopy` reads. */
export default {
  hero: {
    title: ['Knowledge', 'is not kept.', 'It grows.'],
    subtitle:
      'Every note is a sheet on your tree. And now someone looks after it with you: an AI that knows your whole degree.',
    cta: 'Start free',
    secondary: 'See how it works',
    treeLabel: 'Subject tree: Anatomy, Chemistry and Biology, with the Sprout at the root',
    subjects: ['Anatomy', 'Chemistry', 'Biology'],
  },
  navLabel: 'Sections',
  navLinks: [
    { label: 'How it works', href: '#como-funciona' },
    { label: 'The Sprout', href: '#brote' },
    { label: 'Plans', href: '#planes' },
  ],
  problem: {
    title: 'An AI that does not know your subject will answer anything',
    question: 'What am I missing about the mitochondria for the exam?',
    generic: {
      label: 'Any old chat',
      answer:
        'The mitochondria is the powerhouse of the cell. It produces ATP and has a double membrane. I recommend reviewing cellular respiration.',
    },
    brote: {
      label: 'The Sprout, with your sheets',
      answer:
        'In your sheet you explain ATP and the cristae, but the electron transport chain is missing, where most of the ATP is produced. Shall I add it to your sheet?',
      source: 'Source: Cell biology, sheet from March 12',
    },
    sheet: {
      date: 'March 12, 6:40 PM',
      title: '# Mitochondria',
      lines: [
        'The mitochondria produces ATP in cellular respiration.',
        'It has a double membrane and its own DNA.',
        'The cristae increase the surface area.',
      ],
    },
  },
  steps: {
    title: 'How it works',
    items: [
      {
        title: 'You write your sheets',
        text: 'Each subject is a folder of dated sheets, organized as Career, Subject and Sheet. You write like you always do.',
      },
      {
        title: 'Everything stays organized and it is yours',
        text: 'A topic index per subject, and everything exportable to Markdown whenever you want.',
      },
      {
        title: 'The Sprout reads them and studies with you',
        text: 'It answers from your notes, quizzes you and fills in what is missing, always with your permission.',
      },
    ],
  },
  brote: {
    title: 'The Sprout works with what you know',
    intro: 'It lives across the whole app, knows your degree’s notes and acts on your sheets.',
    capabilities: [
      { title: 'Answers from your sheets', text: 'And tells you which one each fact came from.' },
      { title: 'Challenges and completes a topic', text: 'Flags what is missing or weak and proposes the text.' },
      { title: 'Summarizes a subject', text: 'And, if you want, saves the summary as a new sheet.' },
      { title: 'Quizzes you', text: 'Multiple choice, true or false and written answers, with the grading explained.' },
      { title: 'Builds your study plan', text: 'Uses the important dates on your Home to tell you what to review and when.' },
    ],
    demo: {
      label: 'Example of a Sprout proposal',
      date: 'March 12, 6:40 PM',
      heading: '# Mitochondria',
      kept: 'The mitochondria produces ATP in cellular respiration.',
      proposed: 'The electron transport chain, in the inner membrane, generates most of the ATP.',
      actions: ['Accept', 'Reject', 'See changes'],
    },
    guarantees: [
      'It proposes, you accept: the Sprout never writes to your sheets without your permission.',
      'Two modes: only with your notes, or with outside knowledge, which is marked in your sheet.',
    ],
  },
  folder: {
    title: 'The foundation of it all: your folder',
    intro: 'So the AI has something to read, your notes live organized.',
    sheets: {
      title: 'Dated sheets, with a topic index',
      text: 'Each subject shows all its sheets one after another, like a folder. Topics are the headings you write, and with [[Topic]] you jump to any of them.',
      date: 'April 3, 10:15 AM',
      topics: ['Mitochondria', 'Ribosomes', 'Cell membrane'],
      lines: ['The mitochondria produces ATP.', 'They synthesize proteins.'],
      indexLabel: 'Topic index',
    },
    map: {
      title: 'Prerequisite map',
      text: 'You see which subjects unlock which, and what state each one is in.',
      nodes: ['Chemistry', 'Biology', 'Genetics'],
    },
    home: {
      title: 'A Home that organizes your week',
      text: 'Calendar with important dates, tasks with due dates and quick notes.',
    },
  },
  ownership: {
    title: 'Your knowledge is yours',
    text: 'You export all your sheets to a single Markdown file, or to a .zip with one sheet per file. With "Copy for AI" you paste it into any assistant and give it everything you know at once.',
    fileName: 'my-career.md',
    sample: ['# Cell biology', '', '## Mitochondria', 'The mitochondria produces ATP in cellular respiration.', '', '## Ribosomes', 'They synthesize proteins.'],
    points: [
      'Each account sees only its own: data is separated by user.',
      'The AI key lives on the server and never reaches your browser.',
      'The Sprout does not delete sheets or change anything without your Accept.',
    ],
  },
  plans: {
    title: 'Free and Premium',
    intro: 'Your notes are yours on both plans. What changes is how much the Sprout works with them.',
    freeLabel: 'Free',
    premiumLabel: 'Premium',
    cta: 'See plans and pricing',
    free: [
      'Careers, subjects, sheets, Home and export: everything.',
      'Questions and shortcuts in the text, with a daily limit.',
      'Subject summaries: a few per month.',
      'Exam-style quizzes: a few per month, from one sheet.',
      'The Sprout reads the subject you have open.',
      'Limited outside knowledge.',
    ],
    premium: [
      'Everything in Free.',
      'A much higher daily limit for questions and shortcuts.',
      'Unlimited summaries and quizzes, of whole subjects.',
      'The Sprout reads your whole degree.',
      'Mistake review and study plan.',
      'Full outside knowledge.',
    ],
  },
  closing: {
    title: 'Start growing your tree',
    text: 'Write your first sheet today. The Sprout takes care of the rest.',
  },
  footer: {
    tagline: 'Your knowledge, cloned into an AI that helps you go further.',
    company: 'Studree is a Mnemora product',
  },
}
