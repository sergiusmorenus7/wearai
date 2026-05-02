import { useState, useRef } from 'react'
import { addItem, removeItem, CAT_LABELS, CAT_ORDER } from '../lib/wardrobe.js'
import { compressImage, isStorageNearLimit } from '../lib/imageUtils.js'
import styles from './WardrobePage.module.css'

const CATS = [
  { id: 'all', label: 'Todas' },
  ...CAT_ORDER.map(id => ({ id, label: CAT_LABELS[id].split(' /')[0] })),
]

export default function WardrobePage({ wardrobe, setWardrobe }) {
  const [filter, setFilter] = useState('all')
  const [pendingCat, setPendingCat] = useState('top')
  const [showAddModal, setShowAddModal] = useState(false)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [itemName, setItemName] = useState('')
  const [itemColor, setItemColor] = useState('')
  const [itemSeason, setItemSeason] = useState('todas')
  const fileRef = useRef()

  const visible = filter === 'all' ? wardrobe : wardrobe.filter(i => i.cat === filter)
  const categoryCounts = CAT_ORDER.map(cat => ({
    cat,
    label: CAT_LABELS[cat].split(' /')[0],
    count: wardrobe.filter(item => item.cat === cat).length,
  }))

  function openAdd(cat) {
    setPendingCat(cat || 'top')
    setPreviewUrl(null)
    setItemName('')
    setItemColor('')
    setShowAddModal(true)
  }

  function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async ev => {
      const compressed = await compressImage(ev.target.result)
      setPreviewUrl(compressed)
    }
    reader.readAsDataURL(file)
    if (!itemName) setItemName(file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '))
    e.target.value = ''
  }

  function handleAdd() {
    if (!previewUrl) return
    if (isStorageNearLimit()) {
      if (!confirm('El almacenamiento local está casi lleno. Es posible que la prenda no se guarde correctamente. ¿Continuar de todas formas?')) return
    }
    const updated = addItem({
      id: Date.now(),
      name: itemName || CAT_LABELS[pendingCat],
      cat: pendingCat,
      color: itemColor,
      season: itemSeason,
      dataUrl: previewUrl,
      addedAt: new Date().toISOString(),
    })
    setWardrobe(updated)
    setShowAddModal(false)
  }

  function handleRemove(id) {
    if (!confirm('¿Eliminar esta prenda del armario?')) return
    setWardrobe(removeItem(id))
  }

  return (
    <div className={styles.page}>
      <section className={styles.summary}>
        <div className={styles.summaryMain}>
          <p className={styles.eyebrow}>Armario digital</p>
          <h2 className={styles.summaryTitle}>{wardrobe.length} prendas registradas</h2>
          <p className={styles.summaryText}>
            Sube fotos limpias, etiqueta lo básico y deja que la IA use tu ropa real para construir looks.
          </p>
        </div>
        <div className={styles.summaryStats}>
          {categoryCounts.map(item => (
            <button
              key={item.cat}
              className={`${styles.stat} ${filter === item.cat ? styles.statActive : ''}`}
              onClick={() => setFilter(item.cat)}
            >
              <span className={styles.statValue}>{item.count}</span>
              <span className={styles.statLabel}>{item.label}</span>
            </button>
          ))}
        </div>
      </section>

      <div className={styles.toolbar}>
        <div className={styles.cats}>
          {CATS.map(c => (
            <button
              key={c.id}
              className={`${styles.catChip} ${filter === c.id ? styles.active : ''}`}
              onClick={() => setFilter(c.id)}
            >
              {c.label}
            </button>
          ))}
        </div>
        <button className={styles.addBtn} onClick={() => openAdd(pendingCat)}>
          + Añadir prenda
        </button>
      </div>

      {wardrobe.length === 0 && (
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>Tu armario está vacío</p>
          <p className={styles.emptyHint}>Sube fotos de tu ropa para generar outfits personalizados.</p>
          <button className={styles.addBtn} onClick={() => openAdd('top')}>
            + Añadir primera prenda
          </button>
        </div>
      )}

      <div className={styles.grid}>
        {visible.map(item => (
          <div key={item.id} className={styles.card}>
            <div className={styles.imgWrap}>
              <img src={item.dataUrl} alt={item.name} className={styles.img} />
              <button className={styles.removeBtn} onClick={() => handleRemove(item.id)} title="Eliminar">x</button>
              <span className={styles.catTag}>{CAT_LABELS[item.cat]?.split(' /')[0] || item.cat}</span>
            </div>
            <div className={styles.cardInfo}>
              <p className={styles.cardName}>{item.name}</p>
              <p className={styles.cardMeta}>{[item.color, item.season !== 'todas' ? item.season : ''].filter(Boolean).join(' · ') || 'Sin detalles'}</p>
            </div>
          </div>
        ))}

        <button className={styles.addCard} onClick={() => openAdd('top')}>
          <span className={styles.addIcon}>+</span>
          <span className={styles.addLabel}>Añadir prenda</span>
        </button>
      </div>

      {showAddModal && (
        <div className={styles.overlay} onClick={e => e.target === e.currentTarget && setShowAddModal(false)}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <div>
                <p className={styles.modalKicker}>Nueva prenda</p>
                <h2 className={styles.modalTitle}>Añadir al armario</h2>
              </div>
              <button className={styles.closeBtn} onClick={() => setShowAddModal(false)}>x</button>
            </div>

            <div className={styles.modalBody}>
              <div
                className={`${styles.uploadZone} ${previewUrl ? styles.hasPreview : ''}`}
                onClick={() => fileRef.current.click()}
              >
                {previewUrl
                  ? <img src={previewUrl} alt="Vista previa" className={styles.previewImg} />
                  : <>
                      <span className={styles.uploadIcon}>IMG</span>
                      <p className={styles.uploadText}>Haz clic para subir una foto</p>
                      <p className={styles.uploadHint}>JPG, PNG o WEBP</p>
                    </>
                }
              </div>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Categoría</label>
                  <select
                    className={styles.formSelect}
                    value={pendingCat}
                    onChange={e => setPendingCat(e.target.value)}
                  >
                    {CAT_ORDER.map(c => <option key={c} value={c}>{CAT_LABELS[c]}</option>)}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Temporada</label>
                  <select
                    className={styles.formSelect}
                    value={itemSeason}
                    onChange={e => setItemSeason(e.target.value)}
                  >
                    <option value="todas">Todas</option>
                    <option value="primavera">Primavera/Verano</option>
                    <option value="otono">Otoño/Invierno</option>
                  </select>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Nombre</label>
                <input
                  className={styles.formInput}
                  value={itemName}
                  onChange={e => setItemName(e.target.value)}
                  placeholder="Ej: Camisa Oxford azul"
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Color principal</label>
                <input
                  className={styles.formInput}
                  value={itemColor}
                  onChange={e => setItemColor(e.target.value)}
                  placeholder="Ej: azul marino, verde oliva, negro..."
                />
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button className={styles.cancelBtn} onClick={() => setShowAddModal(false)}>Cancelar</button>
              <button className={styles.confirmBtn} onClick={handleAdd} disabled={!previewUrl}>
                Añadir al armario
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
