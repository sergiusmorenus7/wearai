import { useMemo, useState } from 'react'
import { callClaude, imageToContent, parseJSON } from '../lib/ai.js'
import { CAT_LABELS, CAT_ORDER } from '../lib/wardrobe.js'
import { getPrimaryPhoto } from '../lib/profile.js'
import styles from './TryOnPage.module.css'

const SHOP_CANDIDATES = [
  { id: 'shop-blazer', cat: 'outer', name: 'Blazer recta azul marino', color: 'azul marino', store: 'Zara', price: '59,95€' },
  { id: 'shop-sneaker', cat: 'shoes', name: 'Sneaker minimal blanca', color: 'blanco', store: 'Zalando', price: '74,95€' },
  { id: 'shop-knit', cat: 'top', name: 'Polo de punto verde oliva', color: 'verde oliva', store: 'Mango', price: '39,99€' },
  { id: 'shop-trouser', cat: 'bottom', name: 'Pantalón sastre gris', color: 'gris medio', store: 'H&M', price: '34,99€' },
]

function buildProfileText(profile) {
  return [
    profile.name ? `Nombre: ${profile.name}` : '',
    profile.height ? `Altura: ${profile.height}` : '',
    profile.weight ? `Peso: ${profile.weight}` : '',
    profile.bodyType ? `Complexión: ${profile.bodyType}` : '',
    profile.fitPreference ? `Ajuste preferido: ${profile.fitPreference}` : '',
    profile.sizes?.top ? `Talla superior: ${profile.sizes.top}` : '',
    profile.sizes?.bottom ? `Talla inferior: ${profile.sizes.bottom}` : '',
    profile.sizes?.shoes ? `Calzado: ${profile.sizes.shoes}` : '',
    profile.styleNotes ? `Preferencias: ${profile.styleNotes}` : '',
  ].filter(Boolean).join('\n')
}

export default function TryOnPage({ wardrobe, profile }) {
  const primaryPhoto = getPrimaryPhoto(profile)
  const [source, setSource] = useState('wardrobe')
  const [selectedIds, setSelectedIds] = useState([])
  const [result, setResult] = useState(null)
  const [generatedImage, setGeneratedImage] = useState(null)
  const [loading, setLoading] = useState(false)
  const [imageLoading, setImageLoading] = useState(false)
  const [error, setError] = useState('')

  const candidates = source === 'wardrobe'
    ? wardrobe
    : SHOP_CANDIDATES.map(item => ({ ...item, isShop: true }))

  const selected = useMemo(
    () => candidates.filter(item => selectedIds.includes(String(item.id))),
    [candidates, selectedIds]
  )

  function toggle(item) {
    const id = String(item.id)
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
    setResult(null)
  }

  function autoPick() {
    const picks = []
    CAT_ORDER.forEach(cat => {
      const item = candidates.find(candidate => candidate.cat === cat)
      if (item) picks.push(String(item.id))
    })
    setSelectedIds(picks)
    setResult(null)
  }

  async function generateTryOn() {
    if (!primaryPhoto) {
      setError('Añade una foto principal en Perfil antes de probar outfits.')
      return
    }
    if (selected.length < 2) {
      setError('Selecciona al menos 2 prendas para probar el look.')
      return
    }

    setError('')
    setLoading(true)
    setResult(null)
    setGeneratedImage(null)

    try {
      const imageBlocks = [
        imageToContent(primaryPhoto),
        ...selected.filter(item => item.dataUrl).map(item => imageToContent(item.dataUrl)),
      ].filter(Boolean)

      const pieces = selected.map(item =>
        `${CAT_LABELS[item.cat] || item.cat}: ${item.name || 'Prenda'}${item.color ? `, ${item.color}` : ''}${item.store ? `, tienda ${item.store}` : ''}`
      ).join('\n')

      const prompt = `Actúa como stylist y director de imagen para un probador virtual.

PERFIL:
${buildProfileText(profile)}

PRENDAS A PROBAR:
${pieces}

TAREA:
Evalúa cómo le quedaría este outfit a la persona de la primera imagen. Si hay imágenes de prendas después, úsalas como referencia visual real.

Responde SOLO con JSON:
{
  "headline": "nombre corto del look",
  "fit_assessment": "cómo le quedaría según proporciones, tallas y ajuste",
  "visual_notes": "colores, silueta y equilibrio visual",
  "changes": ["ajuste o cambio concreto 1", "ajuste o cambio concreto 2"],
  "image_prompt": "prompt detallado para un modelo de virtual try-on: mantener identidad, cara, postura, iluminación y fondo; vestir a la persona con estas prendas; no cambiar cuerpo; resultado realista"
}`

      const raw = await callClaude({
        messages: [{ role: 'user', content: [...imageBlocks, { type: 'text', text: prompt }] }],
        maxTokens: 4000,
      })

      const parsed = parseJSON(raw)
      if (!parsed) throw new Error('La IA no devolvió un JSON válido.')
      setResult(parsed)
    } catch (err) {
      setError(err.message === 'NO_KEY' ? 'Configura tu API key en Ajustes.' : `No se pudo generar la prueba: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  async function generateRealImage() {
    if (!primaryPhoto || !result?.image_prompt) return

    setImageLoading(true)
    setGeneratedImage(null)
    setError('')

    try {
      const garmentImages = selected
        .filter(item => item.dataUrl)
        .map(item => item.dataUrl)

      const res = await fetch('/api/try-on', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userImage: primaryPhoto,
          garmentImages,
          prompt: result.image_prompt,
        }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`)
      }

      setGeneratedImage(data.image)
    } catch (err) {
      setError(
        err.message?.includes('Failed to fetch')
          ? 'No se encontró /api/try-on. Para probar la imagen real usa Vercel o vercel dev con GEMINI_API_KEY configurada.'
          : `No se pudo generar la imagen real: ${err.message}`
      )
    } finally {
      setImageLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <section className={styles.stage}>
        <div className={styles.personPanel}>
          <div className={styles.photoFrame}>
            {primaryPhoto
              ? <img src={primaryPhoto} alt="Foto principal del perfil" />
              : <div className={styles.noPhoto}>Añade una foto principal en Perfil</div>
            }
          </div>
          <div className={styles.profileCard}>
            <p className={styles.kicker}>Perfil activo</p>
            <h2>{profile.name || 'Usuario'}</h2>
            <p>{[profile.height, profile.bodyType, profile.fitPreference].filter(Boolean).join(' · ') || 'Completa tus datos para mejorar la prueba.'}</p>
          </div>
        </div>

        <div className={styles.tryPanel}>
          <div className={styles.panelHeader}>
            <div>
              <p className={styles.kicker}>Probador visual</p>
              <h2>Prueba prendas sobre tu foto</h2>
            </div>
            <button className={styles.secondaryBtn} onClick={autoPick}>Auto look</button>
          </div>

          <div className={styles.sourceTabs}>
            <button className={source === 'wardrobe' ? styles.active : ''} onClick={() => { setSource('wardrobe'); setSelectedIds([]) }}>Mi armario</button>
            <button className={source === 'shop' ? styles.active : ''} onClick={() => { setSource('shop'); setSelectedIds([]) }}>Recomendaciones</button>
          </div>

          <div className={styles.selectionGrid}>
            {candidates.length === 0 && (
              <p className={styles.empty}>Añade prendas a tu armario para probar combinaciones reales.</p>
            )}
            {candidates.map(item => (
              <button
                key={item.id}
                className={`${styles.itemCard} ${selectedIds.includes(String(item.id)) ? styles.selected : ''}`}
                onClick={() => toggle(item)}
              >
                {item.dataUrl
                  ? <img src={item.dataUrl} alt={item.name} />
                  : <span className={styles.shopTile}>{item.store}</span>
                }
                <span className={styles.itemName}>{item.name}</span>
                <span className={styles.itemMeta}>{CAT_LABELS[item.cat]?.split(' /')[0] || item.cat}{item.price ? ` · ${item.price}` : ''}</span>
              </button>
            ))}
          </div>

          <div className={styles.actions}>
            <button className={styles.primaryBtn} onClick={generateTryOn} disabled={loading}>
              {loading ? 'Analizando prueba...' : 'Generar prueba visual'}
            </button>
            {error && <p className={styles.error}>{error}</p>}
          </div>
        </div>
      </section>

      <section className={styles.output}>
        <div className={styles.outputPreview}>
          <p className={styles.kicker}>Vista previa</p>
          <div className={styles.composite}>
            {primaryPhoto ? <img src={primaryPhoto} alt="Referencia" /> : <span>Sin foto</span>}
            <div className={styles.outfitRail}>
              {selected.map(item => (
                <div key={item.id} className={styles.railItem}>
                  {item.dataUrl ? <img src={item.dataUrl} alt={item.name} /> : <span>{item.store}</span>}
                </div>
              ))}
            </div>
          </div>
          <p className={styles.previewNote}>
            Esta vista es el tablero de prueba. Cuando generes imagen real, se sustituirá por el resultado del modelo.
          </p>
          {generatedImage && (
            <div className={styles.generatedBlock}>
              <p className={styles.kicker}>Imagen generada</p>
              <img src={generatedImage} alt="Resultado virtual try-on" />
            </div>
          )}
        </div>

        <div className={styles.outputText}>
          {!result && (
            <div className={styles.placeholder}>
              <h3>Resultado pendiente</h3>
              <p>Cuando generes la prueba, verás ajuste, recomendaciones de fit y el prompt listo para crear la imagen final.</p>
            </div>
          )}

          {result && (
            <div className={styles.resultCard}>
              <p className={styles.kicker}>Análisis IA</p>
              <h3>{result.headline}</h3>
              <p>{result.fit_assessment}</p>
              <p>{result.visual_notes}</p>
              <div className={styles.changes}>
                {(result.changes || []).map(change => <span key={change}>{change}</span>)}
              </div>
              <label className={styles.promptBox}>
                <span>Prompt para imagen final</span>
                <textarea value={result.image_prompt || ''} readOnly />
              </label>
              <button className={styles.realImageBtn} onClick={generateRealImage} disabled={imageLoading}>
                {imageLoading ? 'Generando foto real...' : 'Generar foto real con IA'}
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
