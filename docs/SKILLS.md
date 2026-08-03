# Skills Instaladas

> Última actualización: 2026-06-28
> Registra las skills, MCP servers y herramientas especializadas disponibles en el
> entorno de desarrollo. **Consultar este archivo ANTES de implementar una feature.**

---

## ¿Qué son las Skills?

Las skills son capacidades especializadas que la IA puede usar para implementar
funcionalidades de forma más eficiente y correcta. Antes de implementar cualquier
feature, la IA DEBE revisar este archivo para ver si hay una skill relevante.

---

## Skills Activas (relevantes para Studree)

| # | Nombre | Tipo | Descripción | Usar cuando |
|---|--------|------|-------------|-------------|
| 1 | `ui-ux-pro-max` | Skill | Diseño UI/UX para web/móvil: estilos, paletas, font pairings, guías UX, charts. Soporta React/Tailwind/shadcn. | Diseñar o revisar cualquier pantalla (Home, Materias, Mapa, Perfil) |
| 2 | `ui-styling` | Skill | Componentes shadcn/ui (Radix + Tailwind), estilos Tailwind, dark mode, layouts accesibles. | Crear componentes UI base, modo oscuro, layouts responsive |
| 3 | `design` | Skill | Identidad de marca, design tokens, logos, sistema de diseño, banners, iconos. | Definir/ajustar el design system, logo, identidad visual de Studree |
| 4 | `design-system` | Skill | Arquitectura de tokens (primitive→semantic→component), specs de componentes. | Estructurar `tailwind.config.js` y los tokens del proyecto |
| 5 | `brand` | Skill | Voz de marca, identidad visual, mensajería, consistencia. | Textos de marca, tono, consistencia visual |
| 6 | `banner-design` | Skill | Banners para redes/web/print (varios estilos). | Material de difusión o hero de la landing |
| 7 | `slides` | Skill | Presentaciones HTML con Chart.js y design tokens. | Presentar el proyecto Studree (entregas, pitch) |

---

## MCP Servers Conectados

| # | Servidor | Herramientas | Descripción | Usar cuando |
|---|----------|-------------|-------------|-------------|
| 1 | Gamma | `generate`, `generate_from_template`, ... | Genera presentaciones, documentos y webpages con IA. | Crear una presentación o documento visual del proyecto |
| 2 | Canva | `generate-design`, `export-design`, ... | Diseño gráfico asistido (plantillas, exportación). | Diseñar piezas gráficas / mockups exportables |

---

## Historial de Skills

| Fecha | Acción | Skill | Motivo |
|-------|--------|-------|--------|
| 2026-06-28 | Registradas | (todas las anteriores) | Setup inicial FASE 1 — inventario del entorno |

---

## Protocolo de Skills

1. **Antes de implementar una feature** → revisar esta tabla por una skill relevante.
2. **Al instalar una skill nueva** → agregar fila con nombre, qué hace, cuándo usarla.
3. **Si no existe skill pero ayudaría** → sugerir al usuario buscar/instalar una.
