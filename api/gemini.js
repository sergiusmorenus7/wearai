import { createClient } from '@supabase/supabase-js'

const DAILY_LIMIT = 60

function json(res, status, body) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' })

  // ── Auth ────────────────────────────────────────────────────
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return json(res, 401, { error: 'No autenticado' })

  const supabaseUrl = process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_KEY
  const geminiKey = process.env.GEMINI_API_KEY

  if (!supabaseUrl || !serviceKey) return json(res, 500, { error: 'SUPABASE_URL o SUPABASE_SERVICE_KEY no configuradas' })
  if (!geminiKey) return json(res, 500, { error: 'GEMINI_API_KEY no configurada' })

  const admin = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

  const { data: { user }, error: authError } = await admin.auth.getUser(token)
  if (authError || !user) return json(res, 401, { error: 'Token inválido' })

  // ── Rate limiting ────────────────────────────────────────────
  const today = new Date().toISOString().split('T')[0]
  const { data: usage } = await admin
    .from('api_usage')
    .select('calls')
    .eq('user_id', user.id)
    .eq('date', today)
    .maybeSingle()

  if ((usage?.calls ?? 0) >= DAILY_LIMIT) {
    return json(res, 429, { error: `Límite de ${DAILY_LIMIT} consultas diarias alcanzado. Vuelve mañana.` })
  }

  // ── Gemini call ──────────────────────────────────────────────
  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  const { contents, generationConfig } = body

  if (!contents) return json(res, 400, { error: 'Falta el campo contents' })

  const model = generationConfig?.model || 'gemini-2.5-flash'
  const config = { ...generationConfig }
  delete config.model  // no es un campo válido de Gemini

  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`

  let geminiRes, data
  try {
    geminiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents, generationConfig: config }),
    })
    data = await geminiRes.json().catch(() => ({}))
  } catch (err) {
    return json(res, 502, { error: `Error contactando con Gemini: ${err.message}` })
  }

  if (!geminiRes.ok) {
    return json(res, geminiRes.status, { error: data?.error?.message || `Gemini HTTP ${geminiRes.status}` })
  }

  // ── Incrementar uso ──────────────────────────────────────────
  await admin.from('api_usage').upsert(
    { user_id: user.id, date: today, calls: (usage?.calls ?? 0) + 1 },
    { onConflict: 'user_id,date' }
  )

  return json(res, 200, data)
}
