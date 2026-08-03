# Seguridad — Studree

> Leer este documento antes de tocar: autenticación, credenciales, almacenamiento de
> datos del usuario o variables de entorno.

## Estado actual

Studree es, en esta etapa, una **aplicación puramente frontend** (React + Vite) sin
backend ni base de datos remota. Los datos del usuario (materias, nodos, apuntes) se
guardan en el **`localStorage` del navegador**. Esto tiene implicancias de seguridad
concretas que se documentan abajo.

## Autenticación

- **Pendiente.** No hay sistema de login/usuarios todavía (ver Fase 6 en el overview).
- Mientras no haya backend, NO se debe simular "auth real" guardando contraseñas en
  `localStorage` ni en el código.

## Autorización

- **No aplica todavía** (no hay roles ni multiusuario).

## Datos del usuario (`localStorage`)

- Solo se guardan datos **no sensibles** generados por el propio usuario en su
  dispositivo (materias, temas, apuntes, enlaces).
- `localStorage` es accesible por cualquier script de la página: **NUNCA** guardar ahí
  contraseñas, tokens de servicios externos ni datos personales sensibles.
- Validar y sanitizar todo input antes de renderizarlo para evitar **XSS** (React ya
  escapa por defecto; tener especial cuidado con `dangerouslySetInnerHTML`).

## Variables de entorno (regla crítica de frontend)

> En una app de **solo frontend**, TODO lo que se incluye en el bundle es **público**.
> Cualquier variable `VITE_*` queda visible para el usuario final.

- **NUNCA** poner secretos reales (API keys privadas, service keys) en variables `VITE_*`.
- Los secretos solo existirán cuando haya **backend**, y vivirán **únicamente en el
  servidor**, nunca en el cliente.
- `.env.local` / `.env` **NUNCA** se commitean (están en `.gitignore`).
- `.env.example` lista las variables necesarias **sin valores reales**.

## Reglas INVIOLABLES

- NUNCA hardcodear credenciales, tokens o claves en el código.
- NUNCA exponer secretos de servicio en el cliente (cuando exista backend).
- NUNCA confiar en validaciones solo del cliente para decisiones de seguridad
  (cuando exista backend, validar también en el servidor).
- NUNCA hacer `git push` ni deploy sin confirmación explícita del usuario.
- SIEMPRE sanitizar/escapar contenido generado por el usuario.
- SIEMPRE mantener `.env*` fuera del control de versiones (salvo `.env.example`).

## Checklist de seguridad (revisar antes de cada deploy)

- [ ] `.env.local` está en `.gitignore`.
- [ ] `.env.example` tiene todas las variables (sin valores reales).
- [ ] No hay claves/tokens hardcodeados en el código.
- [ ] No se guardan datos sensibles en `localStorage`.
- [ ] El contenido del usuario se renderiza de forma segura (sin XSS).
