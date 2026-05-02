import { useState, useEffect } from 'react'
import { loadOutfits, deleteOutfit } from '../lib/wardrobe.js'
import styles from './SavedPage.module.css'

export default function SavedPage() {
  const [outfits, setOutfits] = useState([])

  useEffect(() => {
    setOutfits(loadOutfits())
  }, [])

  function handleDelete(id) {
    if (!confirm('¿Eliminar este outfit guardado?')) return
    setOutfits(deleteOutfit(id))
  }

  if (outfits.length === 0) {
    return (
      <div className={styles.empty}>
        <p className={styles.emptyTitle}>No tienes outfits guardados</p>
        <p className={styles.emptyHint}>Genera outfits en "Crear outfit" y guárdalos aquí.</p>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.grid}>
        {outfits.map(outfit => (
          <div key={outfit.id} className={styles.card}>
            <div className={styles.piecesRow}>
              {outfit.pieces.slice(0, 4).map((p, i) => (
                <div key={i} className={styles.pieceThumb}>
                  <img src={p.dataUrl} alt={p.name || ''} className={styles.pieceImg} />
                </div>
              ))}
            </div>
            <div className={styles.cardBody}>
              <p className={styles.headline}>{outfit.analysis?.headline || 'Outfit guardado'}</p>
              <p className={styles.meta}>
                {outfit.occasion} · {new Date(outfit.savedAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
              </p>
              {outfit.analysis?.description && (
                <p className={styles.desc}>{outfit.analysis.description}</p>
              )}
              <div className={styles.tags}>
                {(outfit.analysis?.occasions || []).map(t => (
                  <span key={t} className={styles.tag}>{t}</span>
                ))}
              </div>
            </div>
            <button className={styles.deleteBtn} onClick={() => handleDelete(outfit.id)} title="Eliminar">x</button>
          </div>
        ))}
      </div>
    </div>
  )
}
