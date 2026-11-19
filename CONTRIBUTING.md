# Guía de contribución y convenciones

Este proyecto sigue las prácticas definidas en la sección 17 del `README.md`.

## Ramas

- `main` es siempre estable y desplegable.
- Cada tarea se desarrolla en una rama corta con el formato:
  `feat/T<hito>.<tarea>-<descripcion-corta>` (por ejemplo, `feat/T1.1-modelos-dominio`).
- Correcciones de errores: `fix/<descripcion-corta>`.

## Commits

Usamos [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` nueva funcionalidad
- `fix:` corrección de error
- `test:` pruebas unitarias, de integración o e2e
- `docs:` documentación o ADRs
- `refactor:` refactorización sin cambio de comportamiento
- `chore:` mantenimiento, dependencias o CI

## Reglas de arquitectura y seguridad

1. `packages/domain` no puede importar APIs de navegador (`window`, `document`, `fetch`, `localStorage`, `indexedDB`), React ni módulos de Node.
2. Nunca escribir criptografía propia; usar únicamente WebCrypto.
3. Nunca enviar medidas corporales, perfil de color, gustos ni historial a la API.
4. Nunca guardar claves de proveedores en el frontend.
5. Cero emojis en la interfaz de usuario; usar iconografía SVG (Lucide).

## Criterio de "Hecho"

Antes de fusionar a `main`:

- [ ] `pnpm lint` en verde
- [ ] `pnpm typecheck` en verde
- [ ] `pnpm test` en verde (cobertura del dominio ≥ 90 %)
- [ ] `pnpm build` en verde
- [ ] Documentación y `CHANGELOG.md` actualizados si aplica
