# Evidencias para llenar el reporte — Actividad 17

1. Arranque: ejecuta `npm install`, `npx expo install --fix` y `npx expo start`. Fotografía la consola y el QR, sin exponer credenciales.
2. Inicio: abre Expo Go y toma una captura vertical de LibroVista, con barra de búsqueda y título de la pantalla.
3. CP-01: consulta `El principito`; muestra tres campos de una tarjeta (título, autor, año) y, si aparece, la portada. Añade el resultado real observado al informe.
4. CP-02: consulta `xqvplmnz87654321`; si devuelve cero resultados, documenta el estado vacío. Si la API devuelve resultados inesperados, prueba otro término de búsqueda o demuestra la validación con `A` y registra exactamente el resultado observado.
5. Error de red: desactiva temporalmente Wi-Fi y datos, pulsa actualizar y captura el mensaje; reactiva la conexión inmediatamente después.
6. Validación: escribe `A` y pulsa buscar. Debería aparecer el aviso de mínimo dos caracteres.
7. Pruebas automáticas: ejecuta `npm test`, captura la salida con los casos que pasaron.
8. Seguridad: captura `src/api/openLibrary.js` mostrando el endpoint HTTPS, `encodeURIComponent`, `429`, `TIMEOUT_MS` y `MIN_INTERVAL_MS`.
9. GitHub: después de subirlo, captura el repositorio NUEVO mostrando los archivos y el commit.

**Importante:** no inventes o sustituyas evidencia del dispositivo por una captura diseñada; el documento Word tiene marcadores para las fotografías reales.
