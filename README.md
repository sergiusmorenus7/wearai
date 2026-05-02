# wearAI

App web para gestionar tu armario, crear un perfil corporal, probar outfits con IA y recibir recomendaciones de compra.

## Stack

- **Frontend:** React 18 + Vite
- **IA de texto/análisis:** Google Gemini 2.5 Flash (llamada desde el navegador con la API key del usuario)
- **IA de imagen (try-on real):** Google Gemini 2.0 Flash Exp con generación de imagen (llamada desde backend serverless)
- **Despliegue:** Vercel (incluye función serverless `/api/try-on`) o Netlify

---

## Ejecutar en local

```bash
npm install
npm run dev
```

Abre `http://localhost:3000`.

## Configurar IA (análisis y outfits)

La app usa Google Gemini desde el navegador. Al abrirla, entra en `Ajustes` y pega una API key de Google AI Studio:

https://aistudio.google.com/apikey

La clave se guarda solo en `localStorage` del navegador del usuario. No se envía al servidor.

---

## Activar generación de imagen real (try-on)

La función `/api/try-on` usa la API de Gemini desde el backend. La API key **nunca va al frontend**.

### 1. Crear API key de Google AI Studio

Entra en https://aistudio.google.com/apikey y crea una clave con acceso a modelos de generación de imagen.

### 2. Configurar variables de entorno

En local crea `.env.local`:

```bash
GEMINI_API_KEY=AIza...tu-clave
```

En Vercel:

1. Project Settings → Environment Variables
2. Añade `GEMINI_API_KEY` con tu clave
3. Redeploy

### 3. Probar en local con API

El servidor de Vite no ejecuta `/api/try-on`. Para probarlo en local usa Vercel CLI:

```bash
npm install -g vercel
vercel dev
```

### 4. Probar en producción

Despliega en Vercel, completa Perfil, sube prendas en Mi armario, entra en Probarme, genera la prueba visual y después pulsa `Generar foto real con IA`.

---

## Flujo principal

1. Completa `Perfil` con fotos frontal/lateral/principal, tallas y preferencias.
2. Sube prendas reales en `Mi armario`.
3. En `Probarme`, selecciona prendas de tu armario o candidatos de tienda.
4. La IA genera un análisis de fit y un prompt técnico.
5. Pulsa `Generar foto real con IA` para llamar a `/api/try-on`.

---

## Limitaciones conocidas

- **Almacenamiento local:** fotos y prendas se guardan en `localStorage` (~5 MB). Para armarios grandes conviene migrar a Supabase Storage.
- **Con recomendaciones sin foto de producto:** el modelo usa solo descripción textual. Para mejor fidelidad, guardar imagen de producto.
- **Try-on con `gemini-2.0-flash-exp`:** funciona bien pero no es un modelo dedicado de virtual try-on. Para producción seria, evaluar IDM-VTON, Kolors o la API de Doppl/Google Shopping Try-on.

---

## Desplegar en Vercel

1. Sube el proyecto a GitHub.
2. En Vercel, importa el repositorio.
3. Framework: `Vite`.
4. Build command: `npm run build`.
5. Output directory: `dist`.
6. Añade la variable de entorno `GEMINI_API_KEY`.
7. Publica.

El archivo `vercel.json` ya tiene la configuración lista.

## Desplegar en Netlify

1. Sube el proyecto a GitHub.
2. En Netlify, importa el repositorio.
3. Build command: `npm run build`.
4. Publish directory: `dist`.
5. Publica.

El archivo `netlify.toml` ya tiene la configuración lista.  
**Nota:** en Netlify la función `/api/try-on` requiere moverla a `netlify/functions/try-on.js` con la sintaxis de Netlify Functions.

---

## Estructura

```text
src/
  components/     Navegación, cabecera y ajustes
  lib/            ai.js (Gemini), imageUtils.js, wardrobe.js, profile.js
  pages/          Armario, outfits, compras y guardados
  styles/         Estilos globales
api/
  try-on.js       Función serverless: genera imagen con Gemini
```

## Afiliados

Antes de publicar campañas reales, registra programas de afiliado reales:
- **Amazon:** Amazon Associates España (añade `tag=tu-tag` al final de la URL)
- **Zara / Mango / H&M / ASOS:** programa de afiliados vía **Awin** o **Tradedoubler** — los tags actuales en `src/lib/wardrobe.js` son placeholders y NO generan comisión hasta configurarse correctamente con los IDs de Awin.
