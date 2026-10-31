# LibroVista — Actividad 17

**Prototipo de consulta bibliográfica con React Native + Expo + Open Library**  
Profesor: R. Vinicio Camacho  
Escenario: **Opción B. Catálogo de libros**  
Proyecto **nuevo e independiente** de CafeSoft.

## 1. Requisitos

- Node.js **22.13 o superior** (recomendado Node.js 22 LTS)
- npm
- Aplicación Expo Go actualizada en Android/iOS o un emulador compatible con **Expo SDK 58**
- Conexión a Internet

## 2. Ejecución

Desde la carpeta `Actividad17_LibroVista` (en Windows también puedes abrir `INICIAR_WINDOWS.bat`):

```bash
npm install
npx expo install --fix
npx expo start
```

En la terminal aparecerá un código QR. Escanéalo con **Expo Go**. También puedes presionar `a` para el emulador Android, si está configurado. Para solucionar problemas de conexión de la red local:

```bash
npx expo start --tunnel
```

> `--tunnel` puede requerir instalar `@expo/ngrok`, según tu instalación. No es necesario para la funcionalidad de la API.

**Nota de dependencias:** el proyecto usa Expo SDK 58, React 19.3 y React Native 0.88. El comando `npx expo install --fix` alinea dependencias con el SDK instalado.

## 3. Funcionalidades

- Consulta real por título o autor con una solicitud `GET`.
- Análisis de `JSON` y presentación de **título, autor, año, número de ediciones y portada**.
- Búsquedas rápidas por temas y opción de búsqueda manual.
- Recarga deslizando hacia abajo; actualización forzada.
- Indicador de carga, mensaje de cero coincidencias y errores de red, servidor, formato y límite de solicitudes.
- Enlace a cada ficha bibliográfica y atribución a Open Library.
- Validación de búsqueda (2 a 80 caracteres y filtro de caracteres especiales peligrosos).
- Solicitudes por HTTPS, cancelación de peticiones y tiempo límite de 12 segundos.
- Intervalo mínimo de 1.15 s entre solicitudes a la API y caché en memoria de 5 min para minimizar tráfico.

## 4. API: ficha técnica

| Elemento | Dato |
|---|---|
| Proveedor | Open Library, Internet Archive |
| Endpoint | `https://openlibrary.org/search.json` |
| Método | `GET` |
| Parámetro principal | `q`: título, autor o palabra clave codificados mediante `encodeURIComponent` |
| Parámetros adicionales | `fields=key,title,author_name,first_publish_year,cover_i,edition_count` y `limit=12` |
| Formato | `application/json` |
| Autenticación | No es necesaria para consultas públicas de búsqueda |
| Datos | `numFound` o `num_found`, `docs[]` y campos bibliográficos por libro |
| Carátula | `https://covers.openlibrary.org/b/id/{cover_i}-M.jpg?default=false` |
| Seguridad | HTTPS, validación, campos limitados, timeout, abort, control de tasa |
| Uso previsto | Prototipo educativo de consulta humana, bajo volumen |

**Ejemplo de consulta** (copiar en un navegador):

`https://openlibrary.org/search.json?q=El%20principito&fields=key,title,author_name,first_publish_year,cover_i,edition_count&limit=12`

**Ejemplo ilustrativo de estructura** (los datos reales varían):

```json
{
  "numFound": 1,
  "docs": [
    {
      "key": "/works/OL12345W",
      "title": "Ejemplo de libro",
      "author_name": ["Autora de ejemplo"],
      "first_publish_year": 2000,
      "cover_i": 12345,
      "edition_count": 12
    }
  ]
}
```

## 5. Uso justo, atribución y privacidad

- No se incluye ni requiere ninguna clave privada o credencial.
- Open Library define **1 solicitud/segundo para clientes no identificados**; la app usa una separación de **1.15 s** y caché temporal.
- Para integraciones de uso frecuente, el proveedor recomienda un `User-Agent` identificable con **información de contacto real**. No se inventó ni codificó ningún correo. La identificación debe configurarse antes de un uso sostenido, conforme al cliente y la política del proveedor.
- La app muestra atribución a **Open Library**, enlaza a sus fichas y no hace scraping.
- Los metadatos externos no se guardan en una base de datos local; la caché solo vive en la memoria de ejecución.
- No se recopilan cuentas, contraseñas, teléfonos, GPS ni información personal del usuario.
- No usar esta API como backend masivo ni para servicio comercial de tráfico alto.

Documentación oficial:
- https://openlibrary.org/dev/docs/api/search
- https://openlibrary.org/developers/api
- https://openlibrary.org/dev/docs/api/covers
- https://docs.expo.dev/versions/latest/

## 6. Pruebas

Se incluyen dos casos principales documentados y cuatro verificaciones complementarias.

```bash
npm test
```

`node --test` usa respuestas simuladas y comprueba el código de consulta sin depender de una conexión externa. El **funcionamiento real del prototipo en Expo Go debe validarse en el teléfono y fotografiarse**; una prueba simulada no demuestra que la API haya respondido en vivo.

| ID | Entrada | Expectativa | Procedimiento |
|---|---|---|---|
| CP-01 | `El principito` | GET, JSON válido y tarjetas con 3+ campos | Escribir y tocar `Buscar libros` |
| CP-02 | `xqvplmnz87654321` | Estado `Sin coincidencias` cuando la API devuelve `docs=[]` | Buscar esa cadena y comprobar visualmente, sin garantizar qué devuelve el servidor en todo momento |

Pruebas complementarias: caracteres inválidos, datos faltantes, HTTP 429, red desconectada y JSON inesperado.

## 7. Capturas necesarias para la entrega

| Captura | Qué se debe ver |
|---|---|
| 01 | Terminal con `npm install` y `npx expo start` sin errores |
| 02 | Pantalla principal de LibroVista en Expo Go |
| 03 | Búsqueda `El principito` con título, autor, año y portada |
| 04 | Otra búsqueda: por ejemplo, `Harry Potter` |
| 05 | Búsqueda sin coincidencias o texto inválido con mensaje visible |
| 06 | `npm test` con pruebas aprobadas |
| 07 | Código de `src/api/openLibrary.js` (HTTPS, GET, validación, manejo de 429) |

Los marcadores de captura en el informe Word están **vacíos intencionalmente**. Inserta evidencias reales del teléfono y la terminal; no se proporcionan imágenes simuladas como si fueran pruebas de ejecución.

## 8. Estructura

```text
Actividad17_LibroVista/
├── App.js
├── app.json
├── package.json
├── INICIAR_WINDOWS.bat
├── README.md
├── .gitignore
├── src/
│   └── api/openLibrary.js
├── tests/openLibrary.test.cjs
└── docs/
    ├── guia_evidencias.md
    ├── resultado_pruebas_automatizadas.txt
    └── Reporte_Actividad17_LibroVista.docx
```

## 9. Subir a repositorio NUEVO

```bash
git init
git add .
git commit -m "feat: crear prototipo Expo LibroVista"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/Actividad17-LibroVista.git
git push -u origin main
```

Primero crea el repositorio vacío de GitHub, reemplaza `TU_USUARIO` con tu cuenta y **no subas `node_modules`**. Estos comandos no afectan el repositorio de CafeSoft ni otro repositorio existente.
