# Tablero de proyecto · Issues M1 a M3 (T0.7)

Columnas recomendadas en GitHub Projects: **Backlog → Listo → En curso → Revisión → Hecho**.
Límite WIP: **1 tarea** (máximo 2 si una está bloqueada). Todas las tareas respetan el tope de **≤ 4 h**.

---

## Hito M1 · Dominio en TypeScript: cuerpo y calce (24 h)

| ID | Título | Estimación | Etiquetas | Criterio de aceptación principal |
| :-- | :-- | :-: | :-- | :-- |
| T1.1 | Modelos: medidas obligatorias/opcionales, prenda, zona, estado y vista | 2 h | `M1`, `domain` | Tipos estrictos exportados desde `@luca/domain` sin dependencias de navegador. |
| T1.2 | Validación de medidas: rangos, advertencias sin juicios y cm/in | 3 h | `M1`, `domain` | Validador determinista con pruebas de bordes y mensajes neutros sobre la prenda/medida. |
| T1.3 | Motor de holgura, elasticidad y bandas desde configuración | 4 h | `M1`, `domain` | Intervalos semiabiertos `[a, b)` sin huecos desde `config/fit_bands.json`. |
| T1.4 | `BodyModel` independiente de la vista (elipses Ramanujan y bisección) | 4 h | `M1`, `domain` | Exactitud geométrica ≤ 0,5 % (RNF-05) con y sin fondo medido. |
| T1.5 | Proyecciones frente, perfil y espalda + visor wireframe de depuración | 3 h | `M1`, `domain` | Las 3 proyecciones comparten zonas y estados coherentes; wireframe HTML/SVG verificable. |
| T1.6 | Recomendador de talla según banda objetivo y zonas relevantes | 3 h | `M1`, `domain` | Selecciona la talla de menor distancia a la banda objetivo por categoría. |
| T1.7 | 30+ casos *golden* en JSON y pruebas de propiedades (`fast-check`) | 4 h | `M1`, `test` | Cobertura ≥ 90 % (RNF-12); más holgura nunca empeora estado "tenso". |
| T1.8 | Documentación `docs/fit-engine.md` y ADR-001 a ADR-005 | 1 h | `M1`, `docs` | Fórmulas y decisiones arquitectónicas documentadas en `docs/`. |

---

## Hito M2 · Avatar de frente y probador con mapa de calor (26 h) → v0.1

| ID | Título | Estimación | Etiquetas | Criterio de aceptación principal |
| :-- | :-- | :-: | :-- | :-- |
| T2.1 | Formulario de medidas con guía, validación, cm/in y estado en memoria | 3 h | `M2`, `web` | Validación en tiempo real y conversión cm/in sin persistencia IDB aún. |
| T2.2 | Avatar SVG de frente desde `BodyModel` | 4 h | `M2`, `web` | Respuesta ≤ 50 ms al mover controles (RNF-03) y hash determinista (RNF-04). |
| T2.3 | Arquitectura de anclajes paramétricos SVG y plantilla de camiseta (frente) | 4 h | `M2`, `web` | La holgura se refleja entre silueta corporal y contorno de la prenda. |
| T2.4 | Plantilla SVG paramétrica de pantalón (frente) | 3 h | `M2`, `web` | Cintura, cadera y entrepierna coherentes con `BodyModel`. |
| T2.5 | Panel de prenda temporal con medidas manuales en plano | 3 h | `M2`, `web` | Permite ingresar ancho plano, elasticidad y categoría para probar al instante. |
| T2.6 | Mapa de calor accesible (paleta, etiquetas numéricas, patrones y leyenda) | 4 h | `M2`, `web`, `a11y` | Cumple daltonismo + etiquetas numéricas + patrones SVG. |
| T2.7 | Preferencia de calce, estados vacíos y manejo de errores | 2 h | `M2`, `web` | Selector ajustado/regular/holgado actualiza veredicto y guía. |
| T2.8 | PWA base: manifiesto, service worker, instalable y sin conexión | 2 h | `M2`, `pwa` | Funciona offline (RNF-13) y cumple requisitos de instalación. |
| T2.9 | Prueba e2e Playwright: medidas → prenda → mapa de calor | 1 h | `M2`, `e2e` | Flujo completo en verde en CI. |

---

## Hito M3 · Almacenamiento local seguro y bóveda cifrada (26 h) → v0.2

| ID | Título | Estimación | Etiquetas | Criterio de aceptación principal |
| :-- | :-- | :-: | :-- | :-- |
| T3.1 | Puerto `LocalStore` y adaptador Dexie con esquema versionado | 4 h | `M3`, `storage` | Esquema versionado y migración probada sin pérdida de datos (RNF-08). |
| T3.2 | Capa de cifrado AES-GCM 256 (WebCrypto, nonce 96 bits, AAD) | 4 h | `M3`, `security` | Solo WebCrypto, PBKDF2 ≥ 600.000 iteraciones (RNF-07). |
| T3.3 | Bóveda: crear, desbloquear, bloqueo automático y cambio de contraseña | 4 h | `M3`, `security` | DEK envuelta; cambiar contraseña no recifra registros. |
| T3.4 | Clave de recuperación (256 bits, mostrada una sola vez) | 3 h | `M3`, `security` | Permite recuperar acceso y reenvolver DEK. |
| T3.5 | Registro de eventos de solo añadir y compactación (infraestructura) | 3 h | `M3`, `storage` | `INTERACTION_EVENT` append-only y resumen `TASTE_SNAPSHOT`. |
| T3.6 | Almacenamiento persistente, cuota, aviso iOS y recordatorio de respaldo | 3 h | `M3`, `pwa` | Solicita `navigator.storage.persist()` y muestra estado claro. |
| T3.7 | Exportar/importar respaldo cifrado y borrado total | 3 h | `M3`, `security` | Respaldo restaurable en otro navegador con contraseña o clave de recuperación. |
| T3.8 | Pruebas de vectores criptográficos, manipulación y e2e de desbloqueo | 2 h | `M3`, `test` | AES-GCM detecta manipulación de ciphertext/AAD y flujo e2e pasa. |
