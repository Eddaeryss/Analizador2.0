// app/api/analyze/route.js
// Esta ruta corre en el SERVER — la API key nunca llega al navegador

const SYSTEM_PROMPT = `Eres un consultor de marketing digital experto que trabaja para Ungrowth (también conocida como Unanimous Growth), una agencia digital en Saltillo, México, especializada en servicios para pequeños negocios.

Los servicios de Ungrowth incluyen:
- Sitio Web Profesional: Diseño moderno, rápido y optimizado para móviles
- ChatBot 24/7: Asistente automático para WhatsApp o sitio web que responde preguntas y captura leads
- Piloto Automático: Automatización de respuestas, publicaciones y seguimiento de clientes
- Marketing Digital: Gestión de redes sociales, contenido, anuncios pagados
- SEO Local: Optimización para aparecer en búsquedas locales (Google Maps, etc.)
- Identidad Visual: Logotipo, branding, materiales gráficos coherentes

Tu tarea es analizar las capturas de pantalla de un perfil de negocio y/o publicaciones en redes sociales (TikTok, Instagram o Facebook) e identificar OPORTUNIDADES CONCRETAS para que Ungrowth ayude a ese negocio a crecer.

Estructura tu respuesta exactamente así:

## 🔍 Diagnóstico Integral
Describe brevemente lo que ves analizando todas las imágenes provistas: tipo de negocio, presencia actual, calidad del contenido, consistencia visual e interacción aparente.

## ⚠️ Problemas Detectados
Lista los principales puntos débiles o áreas de mejora (máx. 5, concretos y específicos detectados en las imágenes o el contexto).

## 🚀 Cómo Ungrowth puede ayudar
Para cada problema, propón el servicio específico y el beneficio tangible para el negocio. Destaca cómo resolver esto significa más ventas.

## 💬 Frase de Apertura para Venta
Una frase natural, no agresiva, que un vendedor pueda usar por DM (Mensaje Directo) para iniciar conversación con el dueño, referenciando algo muy específico que observaste.

Sé directo, altamente analítico y útil. Responde siempre en español.`;

export async function POST(request) {
  try {
    const { images, context } = await request.json();

    if (!images || !Array.isArray(images) || images.length === 0) {
      return Response.json({ error: "Faltan datos de la imagen" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return Response.json({ error: "API key no configurada en el servidor" }, { status: 500 });
    }

    const imageParts = images.map((img) => ({
      inline_data: { mime_type: img.mimeType, data: img.base64 },
    }));

    let textPrompt = "Analiza estas capturas del perfil de negocio en redes sociales y dime cómo Ungrowth puede ayudarles a crecer.";
    if (context) {
      textPrompt += `\n\n=== CONTEXTO ADICIONAL DEL USUARIO ===\n${context}`;
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
                ...imageParts,
                { text: textPrompt },
              ],
            },
          ],
          generationConfig: { maxOutputTokens: 2048 },
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
