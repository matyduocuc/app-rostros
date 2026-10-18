# App movil - Reconocimiento de rostros (EP2 Deep Learning AVY1103)

App hecha con Expo (React Native). Toma o elige una foto, la recorta en cuadrado, la reduce a **128x128 pixeles (RGB)** y la envia a la API de reconocimiento. Muestra el nombre de la persona o "La persona no esta en la base de datos", con la confianza y el top 3.

La API esta en otro repositorio: https://github.com/matyduocuc/proyecto-api-vision (rama `matyduocuc`).

## Requisitos

- Node.js LTS (https://nodejs.org)
- App **Expo Go** instalada en el celular (esta app usa Expo SDK 57)
- La API corriendo en el PC (ver su README)
- Celular y PC conectados al **mismo WiFi**

## Como ejecutarla

1. Levantar la API en el PC (en el repo `proyecto-api-vision`):

```powershell
.venv\Scripts\activate
uvicorn app:app --host 0.0.0.0 --port 8000
```

2. Averiguar la IP del PC en el WiFi:

```powershell
ipconfig | Select-String "IPv4"
```

3. Abrir `App.js` y cambiar la IP de esta linea por la del PC:

```js
const API_URL = 'http://192.168.100.4:8000';
```

4. Abrir los puertos en el firewall de Windows (PowerShell como administrador, una sola vez):

```powershell
New-NetFirewallRule -DisplayName "API Rostros 8000" -Direction Inbound -Protocol TCP -LocalPort 8000 -Action Allow
New-NetFirewallRule -DisplayName "Expo 8081" -Direction Inbound -Protocol TCP -LocalPort 8081 -Action Allow
```

5. Instalar y arrancar la app:

```powershell
npm install
npx expo start
```

6. Escanear el codigo QR con Expo Go (Android: desde Expo Go; iPhone: con la camara).

Al abrir debe aparecer en verde: `API conectada (16 clases, umbral ...)`. Si aparece en rojo, la API no esta corriendo, la IP es incorrecta o el celular no esta en el mismo WiFi. Si la red bloquea la conexion, usar `npx expo start --tunnel`.

## Uso

1. Tocar **Tomar foto** (o **Galeria**) y recortar la cara en cuadrado.
2. La app envia la imagen de 128x128 a `POST /predecir/` (campo `archivo`).
3. Muestra el resultado: nombre, confianza y top 3.

Consejo: foto de frente, a la altura de la cara, con buena luz y la cara centrada.

## Limitaciones

- El modelo se entreno con pocas fotos por persona, por lo que la confianza baja con angulos, distancias o luz distintos a los de entrenamiento.
- La IP de la API esta escrita en `App.js` y cambia si el PC cambia de red.

## Autor

Nicolas Cuevas - DuocUC, Deep Learning (AVY1103).
