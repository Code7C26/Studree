# Feature: Asistente de IA (el Brote)

> **Fase 14** · Estado: 🟡 En desarrollo (rama `fase-14`, versión objetivo 0.17.0).
> Spec: [`docs/superpowers/specs/2026-10-19-asistente-ia-design.md`](../superpowers/specs/2026-10-19-asistente-ia-design.md) ·
> Plan: [`docs/superpowers/plans/2026-10-19-fase-14-asistente.md`](../superpowers/plans/2026-10-19-fase-14-asistente.md).
> Leer antes de tocar el asistente, sus servicios, la Edge Function o las claves de Gemini.

## Descripción

El **Brote** es el asistente de IA de Studree: un personaje flotante que vive en pantalla (con
sesión) y conoce los apuntes de toda la carrera del usuario. Estudia con ellos: repasa, cuestiona,
completa, resume y toma pruebas tipo examen. Nunca escribe en una hoja sin que el usuario lo
apruebe.

Decisiones de la primera etapa (detalle en el spec):

- Un único punto de entrada: el Brote flotante, con panel lateral y barra de atajos sobre el texto seleccionado.
- Modo de fuente a elegir: **solo mis apuntes** o **con conocimiento externo** (lo externo lleva marca visible).
- Límite de uso por plan, controlado en el servidor (spec § 8).
- Proveedor de IA: Gemini, llamado desde una Edge Function de Supabase. La clave es un secret del servidor.

## Capacidades (primera etapa)

Tabla del spec § 4:

| Capacidad | Qué hace |
|---|---|
| Pregunta puntual | Responde usando las hojas que necesite, y cita de qué hoja salió. |
| Refutar / completar un tema | Marca conceptos faltantes o flojos y propone texto para agregar. |
| Explicar / Explicámelo simple | Reescribe un fragmento o tema con otras palabras o ejemplos. |
| Resumen de materia | Resume la materia o una selección de hojas; puede guardarlo como hoja nueva. |
| Prueba tipo examen | Opción múltiple, verdadero/falso y desarrollo; alcance elegible; corrección con explicación y referencia a la hoja. |
| Repaso de errores | Arma una prueba solo con lo que el usuario falló antes. |
| Plan de estudio | Usa las fechas importantes del Inicio para sugerir qué repasar y cuándo. |

Segunda etapa (misma fase, después de cerrar la primera): detector de huecos y conexiones entre
materias (spec § 5).

## Reglas

- El asistente **nunca escribe directamente**: devuelve una propuesta que el usuario acepta, rechaza o revisa (spec § 7).
- Las herramientas del modelo consultan Supabase **con la sesión del usuario**; RLS decide qué puede ver.
- No se manda la carrera completa en cada pedido: el servidor arma un mapa liviano y el modelo lee lo que necesita (spec § 6).
- Ningún secreto llega al navegador: `GEMINI_API_KEY` y `GEMINI_MODEL` son secrets de la Edge Function.

## Archivos de esta fase

Se completa en la Tarea 12 del plan.

## Pendiente

- [ ] Implementar las capacidades de la tabla (tareas 1 a 11 del plan).
- [ ] Verificar en el navegador el panel, el Brote y la propuesta de cambios.
