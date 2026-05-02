import { useState } from 'react'
import { callClaude, imageToContent, parseJSON } from '../lib/ai.js'
import { CAT_LABELS } from '../lib/wardrobe.js'
import styles from './ShopPage.module.css'

const NEEDS = [
  'Completar outfits que me faltan',
  'Renovar el armario para verano',
  'Renovar para otono/invierno',
  'Necesito algo para el trabajo',
  'Look para una ocasion especial',
  'Piezas clave minimalistas',
]

const STORES = [
  { key: 'zara', name: 'Zara', url: q => `https://www.zara.com/es/es/search?searchTerm=${encodeURIComponent(q)}` },
  { key: 'hm', name: 'H&M', url: q => `https://www2.hm.com/es_es/search-results.html?q=${encodeURIComponent(q)}` },
  { key: 'mango', name: 'Mango', url: q => `https://shop.mango.com/es/busqueda?q=${encodeURIComponent(q)}` },
  { key: 'asos', name: 'ASOS', url: q => `https://www.asos.com/es/buscar/?q=${encodeURIComponent(q)}` },
  { key: 'amazon', name: 'Amazon', url: q => `https://www.amazon.es/s?k=${encodeURIComponent(q)}&i=fashion` },
  { key: 'zalando', name: 'Zalando', url: q => `https://www.zalando.es/catalogo/?q=${encodeURIComponent(q)}` },
]

function buildLinks(searchQuery) {
  return STORES.map(s => ({ ...s, href: s.url(searchQuery) }))
}

function normalizeRecommendations(data) {
  const items = Array.isArray(data)
    ? data
    : Array.isArray(data?.recommendations)
      ? data.recommendations
      : Array.isArray(data?.recomendaciones)
        ? data.recomendaciones
        : Array.isArray(data?.items)
          ? data.items
          : []

  return items.slice(0, 6).map((item, index) => {
    const searchQuery = item.search_query || item.busqueda || item.search || item.name || item.nombre || 'moda'
    return {
      id: item.id || index + 1,
      name: item.name || item.nombre || 'Prenda recomendada',
      category: item.category || item.categoria || '',
      price_range: item.price_range || item.precio || item.price || '',
      search_query: searchQuery,
      why: item.why || item.por_que || item.reason || item.motivo || '',
      how_to_wear: item.how_to_wear || item.como_llevarlo || item.combination || '',
      style_notes: item.style_notes || item.que_buscar || item.notes || '',
      priority: item.priority || item.prioridad || (index === 0 ? 'alta' : 'media'),
      affiliateLinks: buildLinks(searchQuery),
    }
  })
}

function extractRecommendationObjects(raw) {
  const arrayKey = raw.search(/"recommendations"|"recomendaciones"|"items"/i)
  if (arrayKey === -1) return []

  const arrayStart = raw.indexOf('[', arrayKey)
  if (arrayStart === -1) return []

  const objects = []
  let depth = 0
  let start = -1
  let inString = false
  let escaped = false

  for (let i = arrayStart + 1; i < raw.length; i++) {
    const ch = raw[i]
    if (escaped) {
      escaped = false
      continue
    }
    if (ch === '\\') {
      escaped = true
      continue
    }
    if (ch === '"') {
      inString = !inString
      continue
    }
    if (inString) continue

    if (ch === '{') {
      if (depth === 0) start = i
      depth++
    } else if (ch === '}') {
      depth--
      if (depth === 0 && start !== -1) {
        objects.push(raw.slice(start, i + 1))
        start = -1
      }
    } else if (ch === ']' && depth === 0) {
      break
    }
  }

  return objects
    .map(text => {
      try { return JSON.parse(text) } catch { return null }
    })
    .filter(Boolean)
}

function looksLikeJson(raw) {
  const trimmed = raw.trim()
  return trimmed.startsWith('{') || trimmed.startsWith('```json') || /"recommendations"|"recomendaciones"|"items"/i.test(trimmed)
}

function parseTextRecommendations(raw) {
  const blocks = raw
    .split(/\n(?=(?:\d+[\).-]|[-*]\s+))/)
    .map(block => block.trim())
    .filter(Boolean)

  if (blocks.length < 2) return []

  return blocks.slice(0, 6).map((block, index) => {
    const lines = block.split('\n').map(line => line.trim()).filter(Boolean)
    const first = (lines[0] || '').replace(/^(?:\d+[\).-]|[-*])\s*/, '')
    const parts = first.split('|').map(part => part.trim())
    const name = parts[0] || `Recomendacion ${index + 1}`
    const category = parts[1] || ''
    const price = parts[2] || ''
    const search = (parts[3] || name).replace(/^busqueda:\s*/i, '').trim()
    const body = lines.slice(1).join(' ')

    return {
      id: index + 1,
      name,
      category,
      price_range: price,
      search_query: search,
      why: body || 'Encaja con las prendas y necesidades indicadas.',
      how_to_wear: body,
      style_notes: search,
      priority: index === 0 ? 'alta' : 'media',
      affiliateLinks: buildLinks(search),
    }
  })
}

export default function ShopPage({ wardrobe }) {
  const [need, setNeed] = useState('Completar outfits que me faltan')
  const [budget, setBudget] = useState('medio')
  const [loading, setLoading] = useState(false)
  const [loadMsg, setLoadMsg] = useState('')
  const [recs, setRecs] = useState(null)
  const [intro, setIntro] = useState('')
  const [error, setError] = useState('')
  const [expandedRec, setExpandedRec] = useState(null)

  async function getRecommendations() {
    if (wardrobe.length === 0) {
      setError('Anade prendas a tu armario primero.')
      return
    }
    setError('')
    setRecs(null)
    setIntro('')
    setLoading(true)

    const msgs = ['Analizando tu armario...', 'Detectando huecos de estilo...', 'Buscando piezas clave...', 'Preparando recomendaciones...']
    let mi = 0
    setLoadMsg(msgs[0])
    const interval = setInterval(() => { mi = (mi + 1) % msgs.length; setLoadMsg(msgs[mi]) }, 1800)

    try {
      const sample = wardrobe.slice(0, 6)
      const imageBlocks = sample.map(p => imageToContent(p.dataUrl)).filter(Boolean)
      const wardrobeDesc = wardrobe.map(p =>
        `${CAT_LABELS[p.cat] || p.cat}${p.name ? ': ' + p.name : ''}${p.color ? ' (' + p.color + ')' : ''}`
      ).join(', ')
      const budgetLabel = { bajo: 'menos de 30 EUR', medio: '30-80 EUR', alto: 'mas de 80 EUR' }[budget]

      const prompt = `Eres un personal shopper experto. Analiza las fotos y los datos del armario.

Armario del usuario: ${wardrobeDesc}
Necesidad: ${need}
Presupuesto por prenda: ${budgetLabel}

Devuelve SOLO JSON valido, sin markdown y sin texto antes ni despues.
Genera exactamente 6 recomendaciones completas.

Formato:
{
  "intro": "frase breve de maximo 22 palabras",
  "recommendations": [
    {
      "id": 1,
      "name": "nombre concreto de la prenda",
      "category": "categoria",
      "price_range": "precio estimado",
      "search_query": "termino exacto para buscar en tienda online",
      "why": "por que encaja con el armario real del usuario",
      "how_to_wear": "como combinarlo con prendas que ya tiene",
      "style_notes": "color, tejido, corte y ajuste que debe buscar",
      "priority": "alta"
    }
  ]
}`

      const raw = await callClaude({
        messages: [{ role: 'user', content: [...imageBlocks, { type: 'text', text: prompt }] }],
        maxTokens: 5000,
        responseMimeType: 'application/json',
        temperature: 0.25,
      })

      const parsed = parseJSON(raw)
      let normalized = normalizeRecommendations(parsed)

      if (normalized.length === 0) {
        normalized = normalizeRecommendations(extractRecommendationObjects(raw))
      }

      if (normalized.length === 0 && !looksLikeJson(raw)) {
        normalized = parseTextRecommendations(raw)
      }

      if (normalized.length > 0) {
        setIntro(parsed?.intro || parsed?.introduccion || 'Estas piezas completan tu armario actual sin duplicar compras.')
        setRecs(normalized)
        setExpandedRec(normalized[0].id)
      } else {
        setError('La IA devolvio JSON incompleto o no valido. Pulsa de nuevo en Analizar y recomendar.')
      }
    } catch (err) {
      setError(err.message === 'NO_KEY' ? 'Configura tu API key en Ajustes.' : 'Error: ' + err.message)
    } finally {
      clearInterval(interval)
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.layout}>
        <div className={styles.controls}>
          <div className={styles.controlCard}>
            <p className={styles.controlTitle}>Que necesitas</p>
            <div className={styles.needsList}>
              {NEEDS.map(n => (
                <button key={n} className={styles.needBtn + (need === n ? ' ' + styles.selected : '')} onClick={() => setNeed(n)}>{n}</button>
              ))}
            </div>
          </div>

          <div className={styles.controlCard}>
            <p className={styles.controlTitle}>Presupuesto por prenda</p>
            <div className={styles.budgetRow}>
              {[['bajo','Bajo','<30 EUR'],['medio','Medio','30-80 EUR'],['alto','Alto','80 EUR+']].map(([v,l,p]) => (
                <button key={v} className={styles.budgetBtn + (budget === v ? ' ' + styles.selected : '')} onClick={() => setBudget(v)}>
                  <span>{l}</span><span className={styles.budgetPrice}>{p}</span>
                </button>
              ))}
            </div>
          </div>

          <div className={styles.controlCard}>
            <p className={styles.controlTitle}>Tiendas</p>
            <div className={styles.storeChips}>
              {STORES.map(s => <span key={s.key} className={styles.storeChip}>{s.name}</span>)}
            </div>
          </div>

          <button className={styles.genBtn} onClick={getRecommendations} disabled={loading}>
            {loading ? <><span className={styles.spinner} />{loadMsg}</> : 'Analizar y recomendar'}
          </button>

          {error && <p className={styles.errorMsg}>{error}</p>}

          <div className={styles.affiliateNote}>
            <p className={styles.noteTitle}>Siguiente paso</p>
            <p className={styles.noteText}>
              Estas recomendaciones pueden enviarse al probador visual para generar una imagen con la persona usando la prenda.
            </p>
          </div>
        </div>

        <div className={styles.recsCol}>
          {!recs && !loading && (
            <div className={styles.placeholder}>
              <p className={styles.placeholderTitle}>Recomendaciones personalizadas</p>
              <p className={styles.placeholderHint}>La IA analiza tu armario real y devuelve piezas completas, con motivo, uso y enlaces de busqueda.</p>
            </div>
          )}

          {loading && (
            <div className={styles.loadingArea}>
              <div className={styles.bigSpinner} />
              <p className={styles.loadingMsg}>{loadMsg}</p>
            </div>
          )}

          {recs && !loading && (
            <div className={styles.recsArea}>
              {intro && <div className={styles.introCard}><p className={styles.introText}>{intro}</p></div>}

              <div className={styles.recsList}>
                {recs.map(rec => (
                  <div key={rec.id} className={styles.recCard + (expandedRec === rec.id ? ' ' + styles.expanded : '')}>
                    <div className={styles.recHeader} onClick={() => setExpandedRec(expandedRec === rec.id ? null : rec.id)}>
                      <div className={styles.recMain}>
                        <div className={styles.recTitleRow}>
                          <span className={styles.priorityDot + ' ' + (rec.priority === 'alta' ? styles.high : styles.med)} />
                          <h3 className={styles.recName}>{rec.name}</h3>
                          {rec.category && <span className={styles.recCat}>{rec.category}</span>}
                        </div>
                        <p className={styles.recWhy}>{rec.why}</p>
                      </div>
                      <div className={styles.recRight}>
                        <span className={styles.recPrice}>{rec.price_range}</span>
                        <span className={styles.expandIcon}>{expandedRec === rec.id ? '-' : '+'}</span>
                      </div>
                    </div>

                    {expandedRec === rec.id && (
                      <div className={styles.recDetail}>
                        <div className={styles.detailSection}>
                          <p className={styles.detailLabel}>Como combinarlo</p>
                          <p className={styles.detailText}>{rec.how_to_wear || 'Combinalo con prendas base de tu armario.'}</p>
                        </div>
                        <div className={styles.detailSection}>
                          <p className={styles.detailLabel}>Que buscar exactamente</p>
                          <p className={styles.detailText}>{rec.style_notes || rec.search_query}</p>
                        </div>
                        <div className={styles.detailSection}>
                          <p className={styles.detailLabel}>Buscar en tiendas</p>
                          <div className={styles.storeLinks}>
                            {rec.affiliateLinks.map(link => (
                              <a key={link.key} href={link.href} target="_blank" rel="noreferrer noopener" className={styles.storeBtn}>
                                {link.name} <span className={styles.storeArrow}>abrir</span>
                              </a>
                            ))}
                          </div>
                          <p className={styles.searchTerm}>Buscando: <em>"{rec.search_query}"</em></p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <button className={styles.regenBtn} onClick={getRecommendations}>Nuevas recomendaciones</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
