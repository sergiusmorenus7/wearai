import { supabase } from './supabase.js'

// Convierte dataUrl (base64) a bloque inlineData de Gemini
export function imageToContent(dataUrl) {
  const match = dataUrl?.match(/^data:([^;]+);base64,(.+)$/)
  if (!match) return null
  return { inlineData: { mimeType: match[1], data: match[2] } }
}

// Carga imagen desde URL (Supabase Storage o dataUrl) y devuelve inlineData
export async function fetchImageContent(urlOrDataUrl) {
  if (!urlOrDataUrl) return null
  if (urlOrDataUrl.startsWith('data:')) return imageToContent(urlOrDataUrl)

  try {
    const res = await fetch(urlOrDataUrl)
    const blob = await res.blob()
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(imageToContent(reader.result))
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

export async function callGemini({ messages, system, maxTokens = 4000, temperature = 0.7 }) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('NO_AUTH')

  // Construye el array de parts para Gemini
  const parts = []
  if (system) parts.push({ text: system + '\n\n' })

  for (const msg of messages) {
    const content = Array.isArray(msg.content) ? msg.content : [{ type: 'text', text: msg.content }]
    for (const block of content) {
      if (block.type === 'text') {
        parts.push({ text: block.text })
      } else if (block.type === 'image') {
        parts.push({ inlineData: { mimeType: block.source.media_type, data: block.source.data } })
      } else if (block.inlineData) {
        parts.push({ inlineData: block.inlineData })
      }
    }
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 90000)

  let res
  try {
    res = await fetch('/api/gemini', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts }],
        generationConfig: {
          maxOutputTokens: maxTokens,
          temperature,
          responseMimeType: 'application/json',
          model: 'gemini-2.5-flash',
        },
      }),
      signal: controller.signal,
    })
  } catch (e) {
    clearTimeout(timeout)
    if (e.name === 'AbortError') throw new Error('La IA tardó demasiado. Inténtalo de nuevo.')
    throw e
  }
  clearTimeout(timeout)

  if (res.status === 429) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Límite diario de consultas alcanzado.')
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error || `HTTP ${res.status}`)
  }

  const data = await res.json()
  const textParts = data.candidates?.[0]?.content?.parts || []
  const text = textParts.filter(p => p.text && !p.thought).map(p => p.text).join('')
  if (!text) throw new Error('La IA no devolvió respuesta. Inténtalo de nuevo.')
  return text
}

// Alias para compatibilidad con imports existentes
export const callClaude = callGemini

export function parseJSON(raw) {
  if (!raw) return null
  let cleaned = raw.trim()
  cleaned = cleaned.replace(/^```(?:json)?\s*/im, '').replace(/\s*```\s*$/im, '').trim()
  try { return JSON.parse(cleaned) } catch {}
  const match = cleaned.match(/\{[\s\S]*\}/)
  if (match) { try { return JSON.parse(match[0]) } catch {} }
  return null
}
