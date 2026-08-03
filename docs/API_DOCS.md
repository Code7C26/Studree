# Documentación de API — Studree

**Estado:** ⚠️ **Sin API aún.** Studree es, por ahora, una app de **solo frontend** y no
expone endpoints HTTP. La persistencia se hace contra `localStorage` (ver
`docs/DB_SCHEMA.md`).

**Última actualización:** 2026-06-28

---

## ¿Cuándo se llena este documento?

Cuando se incorpore un **backend** (Fase 6 del `01-project-overview.md`). A partir de ahí,
cada endpoint nuevo se documenta aquí siguiendo el formato de abajo (Mandamiento III/IV).

---

## Capa de acceso a datos actual (services)

Mientras no haya HTTP, el rol de "API" lo cumplen los **services** del frontend, que
encapsulan el acceso a `localStorage`. Estos NO son endpoints, pero se documentan para
que la lógica de datos esté trazada:

| Service (previsto) | Responsabilidad |
|--------------------|-----------------|
| `subjects.service.js` | CRUD de materias en `localStorage` |
| `nodes.service.js` | CRUD de nodos del árbol |
| `resources.service.js` | CRUD de recursos de cada nodo |

> Cada service se documentará en el `docs/features/*.md` de su funcionalidad al crearse.

---

## Template para cuando exista backend

> Base URL prevista: `/api/v1` · Auth prevista: Bearer Token (JWT)

### Formato de respuestas

```json
// Éxito
{ "data": { }, "message": "Operación exitosa" }

// Error
{ "error": "Tipo de error", "message": "Descripción", "details": { } }
```

### Índice de Endpoints

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| _(se completará al crear el backend)_ | | | |

### Códigos de Error Globales

| Código | Descripción |
|--------|-------------|
| 400 | Datos inválidos |
| 401 | Token inválido/expirado |
| 403 | Sin permisos |
| 404 | No encontrado |
| 500 | Error del servidor |
