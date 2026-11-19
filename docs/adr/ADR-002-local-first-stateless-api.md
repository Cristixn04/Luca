# ADR-002: Datos locales en IndexedDB y API sin estado

- **Estado:** Aceptada
- **Fecha:** 2026-11-18

## Contexto

Las medidas corporales, el perfil de color, el clóset y los gustos son datos personales sensibles. Operar cuentas y bases de datos en servidor aumenta el riesgo de brechas y el costo de infraestructura.

## Decisión

Almacenar todos los datos del usuario **exclusivamente en el dispositivo** (IndexedDB vía Dexie, cifrados con WebCrypto) y limitar el backend a una **API FastAPI sin estado y sin cuentas**.

## Alternativas descartadas

- Cuentas de usuario con base de datos en la nube (PostgreSQL/Firebase).

## Consecuencias

- Privacidad por diseño verificable mediante pruebas automáticas de red.
- En v1 no existe sincronización automática entre dispositivos; se cubre con respaldo cifrado exportable.
