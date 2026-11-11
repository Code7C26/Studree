/** Armazón de la app: cabecera, tabs, explorador, buscador (Ctrl K), drawer y 404. */
export default {
  nav: { home: 'Inicio', careers: 'Carreras', study: 'Mi estudio', profile: 'Perfil', signOut: 'Salir', signIn: 'Entrar' },
  header: { search: 'Buscar un tema o una materia' },
  tabs: {
    hideExplorer: 'Ocultar explorador (Ctrl+B)',
    showExplorer: 'Mostrar explorador (Ctrl+B)',
    explorerTitle: 'Explorador (Ctrl+B)',
    close: 'Cerrar {title}',
  },
  explorer: {
    title: 'Explorador',
    filterPlaceholder: 'Filtrar…',
    filterLabel: 'Filtrar el explorador',
    noCareersTitle: 'Sin carreras',
    noCareersMessage: 'Creá una desde “Mis carreras”.',
    noResults: 'Sin resultados para “{query}”.',
    trash: 'Papelera',
    collapse: 'Colapsar {label}',
    expand: 'Expandir {label}',
    rename: 'Renombrar {label}',
  },
  palette: {
    label: 'Buscar',
    placeholder: 'Buscar una materia o un texto dentro de tus hojas…',
    noResults: 'Sin resultados.',
  },
  drawer: { close: 'Cerrar panel' },
  notFound: {
    title: 'Página no encontrada',
    message: 'Esta sección todavía no existe o cambió de lugar.',
    back: 'Volver al inicio',
  },
}
