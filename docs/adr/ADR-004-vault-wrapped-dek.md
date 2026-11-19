# ADR-004: Bóveda cifrada con DEK envuelta por contraseña y clave de recuperación

- **Estado:** Aceptada
- **Fecha:** 2026-11-18

## Contexto

Los datos locales deben estar protegidos ante robo del dispositivo o del perfil del navegador, permitiendo cambiar de contraseña sin recifrar todo el clóset ni perder acceso por olvido.

## Decisión

Usar una clave de datos aleatoria AES-256 (**DEK**) envuelta dos veces: una con la **KEK** derivada de la contraseña (PBKDF2-HMAC-SHA256 ≥ 600.000 iteraciones) y otra con una **clave de recuperación** aleatoria de 256 bits mostrada una sola vez. Todos los registros usan AES-GCM con nonce aleatorio de 96 bits y AAD (`id`, `store`) sobre WebCrypto.

## Alternativas descartadas

- Cifrar registros directamente con la clave derivada de la contraseña.

## Consecuencias

- Cambiar la contraseña solo reenvuelve la DEK.
- Si el usuario pierde tanto la contraseña como la clave de recuperación, los datos son irrecuperables por diseño.
