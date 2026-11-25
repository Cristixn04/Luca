# Política de Seguridad — Luca

## Arquitectura Zero-Knowledge Local-First

Luca está diseñado para que los datos personales del usuario (**medidas corporales, perfil de colorimetría, clóset, fotos privadas, historial de uso y preferencias aprendidas**) permanezcan exclusivamente en el dispositivo del usuario, cifrados en reposo con **AES-256-GCM** (WebCrypto) y clave derivada con **PBKDF2-HMAC-SHA256** ($\ge 600\,000$ iteraciones).

- La API de visión (`services/api`) es sin estado y procesa imágenes en memoria descartándolas al finalizar cada petición (`Cache-Control: no-store`).
- El servicio RAG (`services/rag-api`) indexa únicamente metadatos textuales mínimos aislados por tenant (JWT + PostgreSQL Row-Level Security), nunca fotos, medidas ni contraseñas.

## Versiones soportadas

| Versión | Soporte de seguridad |
| :-- | :-- |
| `1.x` (`main`) | Activo |
| `< 1.0` | Sin soporte |

## Reportar una vulnerabilidad

Si detectas una vulnerabilidad de seguridad (fuga de red, fallo criptográfico, XSS, CSP, aislamiento RLS o manejo inseguro de archivos):

1. **No abras un issue público** con detalles explotables.
2. Envía un reporte privado mediante [GitHub Security Advisories](https://github.com/Cristixn04/Luca/security/advisories/new) o escribe directamente a `7b.munoz.cristian@gmail.com` indicando:
   - Descripción del problema y vector de impacto.
   - Pasos mínimos reproducibles o prueba de concepto.
   - Versión o commit afectado.

El tiempo objetivo de respuesta inicial es de **72 horas**.
