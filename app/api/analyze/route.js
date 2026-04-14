// app/api/analyze/route.js
// Esta ruta corre en el SERVER — la API key nunca llega al navegador
// Usa Google Gemini (gratis hasta 1,500 requests/día)

const SYSTEM_PROMPT = `Eres un consultor de marketing digital experto que trabaja para Ungrowth (también conocida como Unanimous Growth), una agencia digital en Saltillo, México, especializada en servicios para pequeños negocios.

Los servicios de Ungrowth incluyen:
- Sitio Web Profesional: Diseño moderno, rápido y optimizado para móviles
- ChatBot 24/7: Asistente automático para WhatsApp o sitio web que responde preguntas y captura leads
- Piloto Automático: Automatización de respuestas, publicaciones y seguimiento de clientes
- Marketing Digital: Gestión de redes sociales, contenido, anuncios pagados
- SEO Local: Optimización para aparecer en búsquedas locales (Google Maps, etc.)
- Identidad Visual: Logotipo, branding, materiales gráficos coherentes

Tu tarea es analizar la captura de pantalla de un perfil de negocio en redes sociales (TikTok, Instagram o Facebook) e identificar OPORTUNIDADES CONCRETAS para que Ungrowth ayude a ese negocio a crecer.

Estructura tu respuesta exactamente así:

## 🔍 Diagnóstico del perfil
Describe brevemente lo que ves: tipo de negocio, presencia actual, calidad del contenido, interacción aparente.

## ⚠️ Problemas detectados
Lista los principales puntos débiles o áreas de mejora (máx. 5, concretos y específicos).

## 🚀 Cómo Ungrowth puede ayudar
Para cada problema, propón el servicio específico y el beneficio tangible para el negocio.

## 💬 Frase de apertura para el vendedor
Una frase natural, no agresiva, que el vendedor pueda usar para iniciar conversación con el dueño, referenciando algo específico del perfil.

Sé directo y útil. Responde siempre en español.`;

export async function POST(request) {
  try {
    const { imageBase64, imageMime } = await request.json();

    if (!imageBase64 || !imageMime) {
      return Response.json({ error: "Faltan datos de la imagen" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return Response.json({ error: "API key no configurada en el servidor" }, { status: 500 });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [
            {
              role: "user",
              parts: [
                { inline_data: { mime_type: imageMime, data: imageBase64 } },
                { text: "Analiza este perfil de negocio en redes sociales y dime cómo Ungrowth puede ayudarles a crecer." },
              ],
            },
          ],
          generationConfig: { maxOutputTokens: 1024 },
        }),
      }
    );

    const data = await response.json();

    if (data.error) {
      return Response.json({ error: data.error.message }, { status: 500 });
    }

    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("\n") || "";
    return Response.json({ result: text });
  } catch (err) {
    return Response.json({ error: "Error interno: " + err.message }, { status: 500 });
  }
}
