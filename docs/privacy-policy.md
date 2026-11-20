# Política de Privacidad de Luca

**Última actualización:** 2026-11-20

Luca aplica **privacidad por diseño** (*zero-knowledge local-first*): tus datos personales viven exclusivamente en tu dispositivo.

## 1. Datos que nunca salen de tu dispositivo
- Medidas corporales obligatorias y opcionales.
- Perfil de colorimetría estacional y muestras elegidas.
- Clóset personal (prendas, tallas, precios, notas, historial de uso, outfits y fotos guardadas).
- Memoria de gustos, interacciones y reglas fijadas o vetadas.
- Clave de recuperación y contraseña de tu bóveda.

Cuando activas la bóveda cifrada, cada registro se cifra dentro de tu navegador con **AES-256-GCM** y una clave derivada con **PBKDF2-HMAC-SHA256 (600.000 iteraciones)**.

## 2. Servicios opcionales en la nube (API sin estado)
La API auxiliar de Luca **no tiene cuentas, no tiene base de datos de usuarios y no registra cuerpos ni direcciones IP en disco**:

1. **Análisis de fotos (`POST /v1/vision/analyze`):** solo se invoca tras tu consentimiento explícito. Antes de salir del dispositivo, la foto se reduce a `<= 1024 px` y se eliminan todos los metadatos EXIF/GPS. La API la procesa únicamente en memoria RAM y la descarta al instante. Si activas el etiquetado con Gemini Vision, la llamada se realiza con `store=False`.
2. **Consulta de clima (`GET /v1/weather`):** completamente opcional. Tus coordenadas se redondean a `~10 km` (1 decimal) antes de salir del navegador. Siempre puedes elegir una ciudad o ingresar la temperatura manualmente sin tocar la red.

## 3. Control del usuario
- Puedes desactivar la API por completo y trabajar 100 % sin conexión.
- Puedes pausar el aprendizaje de gustos, olvidar por categoría o borrar toda tu memoria.
- Puedes exportar un respaldo cifrado de tus datos o ejecutar un borrado total en un clic desde **Memoria**.
- Cero analítica, cero cookies de seguimiento y cero recursos externos de terceros.
