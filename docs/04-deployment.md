# Deployment — Studree

> **Estado:** Pendiente. Este documento se completará cuando se prepare el primer deploy.

## Resumen

Studree es una **SPA (Single Page Application)** construida con Vite. El resultado de
`npm run build` es un sitio estático (carpeta `dist/`) que puede servirse en cualquier
hosting de estáticos.

## Candidatos de hosting

| Opción | Tipo | Notas |
|--------|------|-------|
| Vercel | Estático / SPA | Deploy automático desde GitHub, muy simple |
| Netlify | Estático / SPA | Similar a Vercel, buen tier gratuito |
| GitHub Pages | Estático | Gratis; requiere configurar `base` en `vite.config.js` |

## Build de producción

```bash
npm run build      # genera dist/
npm run preview    # sirve dist/ localmente para verificar
```

## Checklist de pre-deploy (completar cuando aplique)

- [ ] `npm run build` corre sin errores.
- [ ] Revisado el checklist de seguridad (`docs/03-security.md`).
- [ ] `.env.example` actualizado con todas las variables.
- [ ] Variables de entorno configuradas en el hosting (si las hay).
- [ ] Probado el routing de la SPA (fallback a `index.html`).
- [ ] CHANGELOG actualizado con la versión a desplegar.

---

> _Este archivo se irá completando con el proceso real de deploy cuando el proyecto
> llegue a esa fase (ver Fase 5/6 en `01-project-overview.md`)._
