# App Reconocimiento de rostros

App móvil (React Native / Expo) del EP2 de Deep Learning (AVY1103). Toma o elige una foto, la reduce a 128x128 y la envía a la API de reconocimiento. Muestra el nombre de la persona (con % de confianza y top 3) o "no está en la base de datos".

API: https://github.com/matyduocuc/proyecto-api-vision

## Instalar la app (APK)

1. Descargar el `.apk` desde [Releases](https://github.com/matyduocuc/app-rostros/releases/tag/1.0) en un celular Android.
2. Abrirlo y permitir "instalar apps de origen desconocido" si el celular lo pide.
3. Abrir la app "Reconocimiento de rostros" y aceptar los permisos de cámara y galería.

## Usarla

1. Levantar la API en el PC (ver README del repo de la API):
   ```
   uvicorn app:app --host 0.0.0.0 --port 8000
   ```
2. Conectar el celular y el PC a la misma red (WiFi del hogar o hotspot del celular). Permitir el puerto 8000 en el Firewall de Windows.
3. Obtener la IP del PC con `ipconfig` (IPv4). Cambia según la red.
4. En la app, escribir esa IP en el campo superior y presionar "Probar". Debe indicar que la API responde (la IP queda guardada).
5. Tomar una foto o elegir una de la galería. La app la reduce a 128x128 y muestra el resultado.

Errores posibles: sin conexión a la API (IP o red incorrecta), imagen inválida (400), modelo no cargado (503).

## Ejecutar en desarrollo

```
npm install
npx expo start
```
Abrir con Expo Go (SDK 58) escaneando el QR.

## Generar el APK

```
npx eas build -p android --profile preview
```