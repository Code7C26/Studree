# Deployment — Studree

> **Estado:** Desplegado en Vercel el 2026-11-11: **https://studree.vercel.app**. El repositorio
> es público porque el plan Hobby no despliega repos privados de una organización de GitHub.

## Resumen

Studree es una **SPA (Single Page Application)** construida con Vite. `npm run build` genera
un sitio estático en `dist/` que se sirve desde cualquier hosting de estáticos. El archivo
`vercel.json` ya define lo necesario para Vercel.

## Vercel (hosting elegido)

`vercel.json` en la raíz trae:

- `buildCommand`: `npm run build`
- `outputDirectory`: `dist`
- **rewrites** de todas las rutas a `/index.html` (React Router sin 404 al recargar)
- `Cache-Control: no-cache` para `/sw.js` (el service worker se actualiza con cada deploy)

### Pasos

1. Subir `main` a GitHub (el deploy se dispara desde ahí).
2. En https://vercel.com → **Add New → Project** → importar el repositorio `Studree`.
3. Framework preset: **Vite** (Vercel detecta `npm run build` y `dist` solos; el
   `vercel.json` tiene la última palabra).
4. **Environment Variables** (Production y Preview), desde `Project Settings → API` de Supabase:

   | Variable | Valor |
   |----------|-------|
   | `VITE_SUPABASE_URL` | `https://<proyecto>.supabase.co` |
   | `VITE_SUPABASE_ANON_KEY` | la **anon key** pública |

   La `anon key` es pública por diseño: protege RLS, no el secreto de la clave
   (`docs/03-security.md`). **Nunca** cargar `service_role` ni `GEMINI_API_KEY` en Vercel:
   la clave de Gemini vive solo como secret de la Edge Function.
5. **Deploy**. La URL queda del tipo `https://studree.vercel.app`.

### Después del primer deploy

- **Edge Function `assistant`**: se despliega aparte con la CLI de Supabase, no con Vercel
  (ver `docs/features/assistant.md` → "Cómo desplegar"). Sin eso, el Brote y la Foto a hoja
  responden 404.
- **Auth**: en Supabase → **Authentication → URL Configuration**, agregar el dominio de
  Vercel a `Site URL` y `Redirect URLs`.
- Probar la PWA instalada y la lectura sin señal en el celular (`docs/features/mobile.md`).

### Mails de Auth (hecho el 2026-11-11)

El SMTP que trae Supabase solo entrega a los miembros del equipo y manda pocos mails por hora,
así que los mails de confirmación salen por un **Gmail de la marca**:

- **Authentication → Emails → SMTP Settings:** custom SMTP con `smtp.gmail.com`, puerto `465`,
  sender name `Studree`. La contraseña es una **contraseña de aplicación** de Google: vive solo en
  Supabase, nunca en el repo ni en un `VITE_*` (`docs/03-security.md`).
- **Authentication → Rate Limits:** límite de mails subido a 30 por hora.
- **Plantillas** en castellano con el diseño de Studree, pegadas en **Authentication → Emails →
  Templates**: *Confirm signup* (crear cuenta desde "Entrar") y *Change email address* (un invitado
  agrega email y contraseña en el Perfil). No se versionan en el repo.

## Build local

```bash
npm run build      # genera dist/
npm run preview    # sirve dist/ localmente para verificar
```

## Checklist de pre-deploy

- [x] `npm run build` corre sin errores.
- [x] Revisado el checklist de seguridad (`docs/03-security.md`).
- [x] `.env.example` actualizado con todas las variables.
- [x] Variables de entorno configuradas en Vercel (solo las tres `VITE_*`).
- [x] Routing de la SPA con fallback a `index.html` (`vercel.json`).
- [x] CHANGELOG actualizado con la versión a desplegar.
- [x] Edge Function `assistant` desplegada con la versión de esta fase.

## Otros hostings

| Opción | Notas |
|--------|-------|
| Netlify | Mismas variables; agregar `/* /index.html 200` en `_redirects` si no se usa `vercel.json`. |
| GitHub Pages | Requiere `base` en `vite.config.js` y un fallback de rutas propio; no recomendado para esta SPA. |

> Este archivo refleja el proceso real de deploy. Actualizarlo si cambia el hosting.
