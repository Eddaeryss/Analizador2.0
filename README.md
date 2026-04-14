# 📊 Ungrowth — Analizador de Perfiles

Herramienta interna para identificar oportunidades de venta analizando perfiles de TikTok, Instagram y Facebook con IA.

---

## 🚀 Cómo desplegarlo en Vercel (10 minutos)

### 1. Sube el proyecto a GitHub
```bash
# Desde esta carpeta:
git init
git add .
git commit -m "primer commit"
# Crea un repo en github.com y sigue las instrucciones para subir
```

### 2. Consigue tu API key (gratis)
- Ve a **aistudio.google.com**
- Inicia sesión con tu cuenta de Google
- Clic en "Get API key" → "Create API key"
- Copia la key (empieza con `AIza...`)
- **Es completamente gratis** hasta 1,500 análisis por día

### 3. Despliega en Vercel
- Ve a **vercel.com** → New Project → importa tu repo de GitHub
- En el paso de configuración, agrega una variable de entorno:
  - **Name:** `GEMINI_API_KEY`
  - **Value:** tu key de Anthropic
- Clic en Deploy

### 4. ¡Listo!
Vercel te da una URL pública. Compártela con tu equipo.

---

## 🔧 Para correrlo local

```bash
# 1. Instala dependencias
npm install

# 2. Crea el archivo de variables de entorno
cp .env.local.example .env.local
# Edita .env.local y pon tu API key real

# 3. Corre el servidor
npm run dev
# Abre http://localhost:3000
```

---

## 🔒 Seguridad
- La API key **nunca** llega al navegador — vive solo en el servidor
- El archivo `.env.local` está en `.gitignore` y nunca se sube a GitHub
- En Vercel, las variables de entorno se guardan encriptadas

---

## 💰 Costos
- **Gratis:** hasta 1,500 análisis por día con Gemini 1.5 Flash
- Sin tarjeta de crédito requerida
