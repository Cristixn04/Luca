# ADR-005: Un `BodyModel` único con tres proyecciones SVG

- **Estado:** Aceptada
- **Fecha:** 2026-11-18

## Contexto

El probador muestra vistas de frente, perfil y espalda. Si cada vista calculara sus dimensiones o estados por separado, podrían contradecirse entre sí.

## Decisión

Construir un único `BodyModel` independiente de la vista basado en secciones elípticas (aproximación de Ramanujan + bisección) y proyectarlo en frente, perfil y espalda compartiendo los mismos estados de calce por zona.

## Alternativas descartadas

- Tres dibujos SVG independientes por vista.
- Avatar 3D completo (costo desproporcionado para el alcance de v1).

## Consecuencias

- Coherencia garantizada entre vistas y determinismo verificable por hash de SVG.
- Las dimensiones no medidas (como fondos) se estiman y se marcan explícitamente como `"estimado"`.
