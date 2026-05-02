const STORAGE_KEY = 'wearai_api_key'

export function setApiKey(key) {
  localStorage.setItem(STORAGE_KEY, key.trim())
}

export function getApiKey() {
  return localStorage.getItem(STORAGE_KEY) || ''
}

export function imageToContent(dataUrl) {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/)
  if (!match) return null
  return { inlineData: { mimeType: match[1], data: match[2] } }
}

export async function callGemini({ messages, system, maxTokens = 4000, temperature = 0.7 }) {
  const key = getApiKey()
  if (!key) throw new Error('NO_KEY')

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

  const model = 'gemini-2.5-flash'
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`

  const body = {
    contents: [{ role: 'user', parts }],
    generationConfig: {
      maxOutputTokens: maxTokens,
      temperature,
      responseMimeType: 'application/json',
    },
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 60000)

  let res
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
  } catch (e) {
    clearTimeout(timeout)
    if (e.name === 'AbortError') throw new Error('La IA tardó demasiado. Inténtalo de nuevo.')
    throw e
  }
  clearTimeout(timeout)

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message || `HTTP ${res.status}`)
  }

  const data = await res.json()
  const textParts = data.candidates?.[0]?.content?.parts || []
  const text = textParts.filter(p => p.text && !p.thought).map(p => p.text).join('')
  if (!text) throw new Error('La IA no devolvió respuesta. Inténtalo de nuevo.')
  return text
}

// Legacy alias so imports que usan callClaude siguen funcionando durante la transición
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
