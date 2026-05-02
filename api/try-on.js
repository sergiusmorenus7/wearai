export default async function handler(req, res) {
  function json(status, body) {
    res.statusCode = status
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify(body))
  }

  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' })

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return json(500, { error: 'Variable de entorno GEMINI_API_KEY no configurada en el servidor' })

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    const { userImage, garmentImages = [], prompt } = body || {}

    if (!userImage) return json(400, { error: 'Falta userImage' })

    function dataUrlToPart(dataUrl) {
      const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/)
      if (!match) return null
      return { inlineData: { mimeType: match[1], data: match[2] } }
    }

    const parts = []

    const userPart = dataUrlToPart(userImage)
    if (userPart) parts.push(userPart)

    for (const g of garmentImages.filter(Boolean).slice(0, 8)) {
      const part = dataUrlToPart(g)
      if (part) parts.push(part)
    }

    const safetyPrompt = `Virtual try-on task. You are given a reference photo of a real person (first image) and garment images.

STRICT IDENTITY PRESERVATION RULES — these override everything else:
- Keep the EXACT same person: same face, same facial features, same skin tone, same ethnicity, same hair color and texture, same body shape, same age appearance.
- Keep the EXACT same pose, body position, and posture.
- Keep the EXACT same background, lighting, and environment.
- Do NOT change, idealize, or alter the person in any way.
- Do NOT replace the person with a model or stock photo person.

CLOTHING TASK:
- Replace only the clothing with the garments shown in the reference images (images 2 onward).
- Fit the garments naturally to the person's body proportions.
- Preserve fabric texture, color, and details from the garment reference images.

OUTPUT: photorealistic fashion photography quality. The result must look like the same person wearing the new clothes.

${prompt || ''}`

    parts.push({ text: safetyPrompt })

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent?key=${apiKey}`

    const geminiRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts }],
        generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
      }),
    })

    const data = await geminiRes.json().catch(() => ({}))

    if (!geminiRes.ok) {
      return json(geminiRes.status, {
        error: data?.error?.message || `Gemini HTTP ${geminiRes.status}`,
      })
    }

    const responseParts = data.candidates?.[0]?.content?.parts || []
    const imagePart = responseParts.find(p => p.inlineData?.mimeType?.startsWith('image/'))

    if (!imagePart) {
      return json(502, { error: 'Gemini no devolvio imagen', raw: data })
    }

    const image = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`
    return json(200, { image })

  } catch (error) {
    return json(500, { error: error.message || 'Error inesperado en try-on' })
  }
}
