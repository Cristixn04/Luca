# ADR-003: Dominio puro en TypeScript en el cliente

- **Estado:** Aceptada
- **Fecha:** 2026-11-18

## Contexto

El probador de calce debe responder en ≤ 50 ms al mover controles y garantizar que las medidas nunca salgan del dispositivo.

## Decisión

Implementar toda la lógica de negocio (cuerpo, calce, colorimetría, outfits y gustos) en el paquete independiente `@luca/domain` en TypeScript estricto, sin dependencias de navegador, red ni frameworks.

## Alternativas descartadas

- Ejecutar el motor de calce en el servidor FastAPI.

## Consecuencias

- Cero latencia de red, funcionamiento 100 % offline y pruebas unitarias/propiedades rápidas con Vitest y `fast-check`.
