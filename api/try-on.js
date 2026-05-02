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

    const safetyPrompt = [
      'Genera una imagen realista de virtual try-on.',
      'Mantén la identidad, cara, cuerpo, postura, iluminación y fondo de la persona de la primera imagen.',
      'Solo cambia la ropa según las instrucciones y las imágenes de prendas de referencia.',
      'No alteres edad, complexión, rasgos faciales, tono de piel ni identidad.',
      'Calidad fotorrealista de moda y e-commerce.',
      '',
      prompt || '',
    ].join(' ')

    parts.push({ text: safetyPrompt })

    // gemini-2.0-flash-exp soporta responseModalities IMAGE+TEXT (imagen generativa)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`

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
