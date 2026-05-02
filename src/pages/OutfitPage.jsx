import { useState } from 'react'
import { callClaude, fetchImageContent, parseJSON } from '../lib/ai.js'
import { saveOutfit, CAT_LABELS, CAT_ORDER } from '../lib/wardrobe.js'
import styles from './OutfitPage.module.css'

const OCCASIONS = ['Trabajo', 'Casual', 'Noche / evento', 'Deporte', 'Viaje', 'Primera cita']
const WEATHERS = ['Templado (15-20°C)', 'Calor (25°C+)', 'Frío (bajo 10°C)', 'Lluvia', 'Nieve']
const STYLES = ['Smart casual', 'Minimalista', 'Streetwear', 'Formal', 'Bohemio', 'Sorpréndeme']

export default function OutfitPage({ wardrobe }) {
  const [occasion, setOccasion] = useState('Casual')
  const [weather, setWeather] = useState('Templado (15-20°C)')
  const [style, setStyle] = useState('Smart casual')
  const [loading, setLoading] = useState(false)
  const [loadMsg, setLoadMsg] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [savedMsg, setSavedMsg] = useState('')

  async function generate() {
    if (wardrobe.length < 2) {
      setError('Añade al menos 2 prendas en "Mi armario" antes de generar un outfit.')
      return
    }
    setError('')
    setResult(null)
    setLoading(true)

    const msgs = [
      'Analizando colores y texturas...',
      'Buscando combinaciones perfectas...',
      'Evaluando ocasión y clima...',
      'Generando análisis de estilo...',
    ]
    let mi = 0
    setLoadMsg(msgs[0])
    const interval = setInterval(() => {
      mi = (mi + 1) % msgs.length
      setLoadMsg(msgs[mi])
    }, 1800)

    try {
      const bycat = {}
      CAT_ORDER.forEach(c => { bycat[c] = wardrobe.filter(i => i.cat === c) })
      const picks = []
      CAT_ORDER.forEach(cat => {
        if (bycat[cat].length) {
          const p = bycat[cat][Math.floor(Math.random() * bycat[cat].length)]
          picks.push(p)
        }
      })

      const imageBlocks = (await Promise.all(picks.map(p => fetchImageContent(p.imageUrl || p.dataUrl)))).filter(Boolean)
      const pieceDesc = picks.map((p, i) =>
        `Imagen ${i + 1}: ${CAT_LABELS[p.cat] || p.cat}${p.name ? ` (${p.name})` : ''}${p.color ? `, color ${p.color}` : ''}`
      ).join('\n')

      const prompt = `Eres un experto asesor de moda personal. El usuario te muestra fotos reales de prendas de su armario.

PRENDAS (en orden de imágenes):
${pieceDesc}

CONTEXTO:
- Ocasión: ${occasion}
- Clima: ${weather}
- Estilo deseado: ${style}

Analiza las imágenes visualmente y responde SOLO con JSON puro, sin markdown:
{
  "headline": "Titular del outfit en 5-8 palabras",
  "description": "Descripción del outfit en 2-3 frases. Menciona colores y texturas reales.",
  "style_tip": "Consejo práctico de cómo llevar este outfit mejor.",
  "scores": { "combinacion": 85, "estilo": 78, "ocasion": 90 },
  "occasions": ["Trabajo", "Smart casual"],
  "missing": "Prenda concreta que completaría este outfit, o null",
  "missing_search": "Término de búsqueda en español para encontrar esa prenda"
}`

      const raw = await callClaude({
        messages: [{ role: 'user', content: [...imageBlocks, { type: 'text', text: prompt }] }],
        maxTokens: 1000,
      })

      const parsed = parseJSON(raw)
      setResult({
        pieces: picks,
        analysis: parsed || {
          headline: 'Outfit generado',
          description: raw,
          scores: { combinacion: 80, estilo: 75, ocasion: 80 },
          occasions: [occasion],
        },
      })
    } catch (err) {
      setError(err.message === 'NO_KEY' ? 'Configura tu API key de Gemini en Ajustes.' : `Error: ${err.message}`)
    } finally {
      clearInterval(interval)
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!result) return
    try {
      await saveOutfit({ pieces: result.pieces, analysis: result.analysis, occasion, weather })
      setSavedMsg('Outfit guardado')
      setTimeout(() => setSavedMsg(''), 2500)
    } catch (err) {
      setSavedMsg(`Error: ${err.message}`)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.layout}>
        <div className={styles.controls}>
          <div className={styles.controlCard}>
            <p className={styles.controlTitle}>Ocasión</p>
            <div className={styles.optionGrid}>
              {OCCASIONS.map(o => (
                <button
                  key={o}
                  className={`${styles.optionBtn} ${occasion === o ? styles.selected : ''}`}
                  onClick={() => setOccasion(o)}
                >{o}</button>
              ))}
            </div>
          </div>

          <div className={styles.controlCard}>
            <p className={styles.controlTitle}>Clima</p>
            <div className={styles.optionGrid}>
              {WEATHERS.map(w => (
                <button
                  key={w}
                  className={`${styles.optionBtn} ${weather === w ? styles.selected : ''}`}
                  onClick={() => setWeather(w)}
                >{w}</button>
              ))}
            </div>
          </div>

          <div className={styles.controlCard}>
            <p className={styles.controlTitle}>Estilo</p>
            <div className={styles.optionGrid}>
              {STYLES.map(s => (
                <button
                  key={s}
                  className={`${styles.optionBtn} ${style === s ? styles.selected : ''}`}
                  onClick={() => setStyle(s)}
                >{s}</button>
              ))}
            </div>
          </div>

          <button className={styles.genBtn} onClick={generate} disabled={loading}>
            {loading ? <><span className={styles.spinner} /> {loadMsg}</> : 'Generar outfit con IA'}
          </button>

          {error && <p className={styles.errorMsg}>{error}</p>}
        </div>

        <div className={styles.resultCol}>
          {!result && !loading && (
            <div className={styles.placeholder}>
              <p className={styles.placeholderTitle}>Tu outfit aparecerá aquí</p>
              <p className={styles.placeholderHint}>Configura el contexto y pulsa generar.</p>
            </div>
          )}

          {loading && (
            <div className={styles.loadingArea}>
              <div className={styles.bigSpinner} />
              <p className={styles.loadingMsg}>{loadMsg}</p>
            </div>
          )}

          {result && !loading && (
            <div className={styles.resultArea}>
              <h2 className={styles.outfitHeadline}>
                {result.analysis.headline || 'Outfit generado'}
              </h2>

              <div className={styles.piecesGrid}>
                {result.pieces.map(p => (
                  <div key={p.id} className={styles.pieceCard}>
                    <img src={p.dataUrl} alt={p.name} className={styles.pieceImg} />
                    <p className={styles.pieceLabel}>{CAT_LABELS[p.cat]?.split(' /')[0] || p.cat}</p>
                  </div>
                ))}
              </div>

              <div className={styles.analysisCard}>
                <p className={styles.analysisText}>{result.analysis.description}</p>
                {result.analysis.style_tip && (
                  <p className={styles.styleTip}>{result.analysis.style_tip}</p>
                )}
              </div>

              {result.analysis.scores && (
                <div className={styles.scoresRow}>
                  {Object.entries(result.analysis.scores).map(([k, v]) => (
                    <div key={k} className={styles.scoreCard}>
                      <span className={styles.scoreNum}>{v}</span>
                      <span className={styles.scoreLbl}>{k.charAt(0).toUpperCase() + k.slice(1)}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className={styles.tagsRow}>
                {(result.analysis.occasions || []).map(t => (
                  <span key={t} className={styles.tag}>{t}</span>
                ))}
              </div>

              {result.analysis.missing && (
                <div className={styles.missingCard}>
                  <p className={styles.missingTitle}>Te faltaría para completar el look</p>
                  <p className={styles.missingItem}>{result.analysis.missing}</p>
                </div>
              )}

              <div className={styles.resultActions}>
                <button className={styles.regenBtn} onClick={generate}>Otra combinación</button>
                <button className={styles.saveBtn} onClick={handleSave}>
                  {savedMsg || 'Guardar outfit'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
