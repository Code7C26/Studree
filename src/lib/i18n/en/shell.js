/** App shell: header, tabs, explorer, search (Ctrl K), drawer and 404. */
export default {
  nav: { home: 'Home', careers: 'Careers', study: 'My study', profile: 'Profile', signOut: 'Sign out', signIn: 'Sign in' },
  header: { search: 'Search a topic or a subject' },
  tabs: {
    hideExplorer: 'Hide explorer (Ctrl+B)',
    showExplorer: 'Show explorer (Ctrl+B)',
    explorerTitle: 'Explorer (Ctrl+B)',
    close: 'Close {title}',
  },
  explorer: {
    title: 'Explorer',
    filterPlaceholder: 'Filter…',
    filterLabel: 'Filter the explorer',
    noCareersTitle: 'No careers',
    noCareersMessage: 'Create one from “My careers”.',
    noResults: 'No results for “{query}”.',
    trash: 'Trash',
    collapse: 'Collapse {label}',
    expand: 'Expand {label}',
    rename: 'Rename {label}',
  },
  palette: {
    label: 'Search',
    placeholder: 'Search a subject or text inside your sheets…',
    noResults: 'No results.',
  },
  drawer: { close: 'Close panel' },
  notFound: {
    title: 'Page not found',
    message: 'This section does not exist yet or has moved.',
    back: 'Back to home',
  },
}
