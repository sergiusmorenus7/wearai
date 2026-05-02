import { useRef, useState } from 'react'
import { saveProfile, getProfileCompleteness } from '../lib/profile.js'
import { compressProfilePhoto } from '../lib/imageUtils.js'
import styles from './ProfilePage.module.css'

const PHOTO_SLOTS = [
  { key: 'front', title: 'Frontal', hint: 'Cuerpo entero, de frente' },
  { key: 'side',  title: 'Lateral', hint: 'Perfil completo' },
  { key: 'full',  title: 'Referencia principal', hint: 'La foto que usaremos para probar outfits' },
]

export default function ProfilePage({ profile, setProfile }) {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState('')
  const [error, setError] = useState('')
  const fileRefs = useRef({})
  const completeness = getProfileCompleteness(profile)

  function update(field, value) {
    setProfile({ ...profile, [field]: value })
    setSaved('')
  }

  function updateSize(field, value) {
    setProfile({ ...profile, sizes: { ...profile.sizes, [field]: value } })
    setSaved('')
  }

  function handlePhoto(key, file) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = async ev => {
      // Guardamos el dataUrl en el estado; saveProfile lo subirá a Storage
      const compressed = await compressProfilePhoto(ev.target.result)
      setProfile(prev => ({
        ...prev,
        photos: { ...prev.photos, [key]: compressed },
      }))
      setSaved('')
    }
    reader.readAsDataURL(file)
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      await saveProfile(profile)
      setSaved('Perfil guardado')
      setTimeout(() => setSaved(''), 3000)
    } catch (err) {
      setError(`No se pudo guardar: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>Perfil de prueba</p>
          <h2 className={styles.title}>Tu cuerpo, tus tallas y tus fotos base</h2>
          <p className={styles.copy}>
            Este perfil sirve para que la IA entienda proporciones, ajuste preferido y referencia visual antes de proponer o renderizar outfits.
          </p>
        </div>
        <div className={styles.progressBox}>
          <span className={styles.progressValue}>{completeness}%</span>
          <span className={styles.progressLabel}>completo</span>
          <div className={styles.progressTrack}>
            <span style={{ width: `${completeness}%` }} />
          </div>
        </div>
      </section>

      <div className={styles.layout}>
        <section className={styles.panel}>
          <h3 className={styles.panelTitle}>Datos personales</h3>
          <div className={styles.formGrid}>
            <label className={styles.field}>
              <span>Nombre</span>
              <input value={profile.name} onChange={e => update('name', e.target.value)} placeholder="Ej: Sergio" />
            </label>
            <label className={styles.field}>
              <span>Altura</span>
              <input value={profile.height} onChange={e => update('height', e.target.value)} placeholder="Ej: 178 cm" />
            </label>
            <label className={styles.field}>
              <span>Peso opcional</span>
              <input value={profile.weight} onChange={e => update('weight', e.target.value)} placeholder="Ej: 74 kg" />
            </label>
            <label className={styles.field}>
              <span>Complexión</span>
              <select value={profile.bodyType} onChange={e => update('bodyType', e.target.value)}>
                <option value="">Selecciona</option>
                <option value="delgada">Delgada</option>
                <option value="media">Media</option>
                <option value="atletica">Atlética</option>
                <option value="robusta">Robusta</option>
              </select>
            </label>
            <label className={styles.field}>
              <span>Ajuste preferido</span>
              <select value={profile.fitPreference} onChange={e => update('fitPreference', e.target.value)}>
                <option value="slim">Slim</option>
                <option value="regular">Regular</option>
                <option value="oversize">Oversize</option>
                <option value="relajado">Relajado</option>
              </select>
            </label>
          </div>

          <h3 className={styles.panelTitle}>Tallas</h3>
          <div className={styles.sizeGrid}>
            <label className={styles.field}>
              <span>Parte superior</span>
              <input value={profile.sizes.top} onChange={e => updateSize('top', e.target.value)} placeholder="M / 40 / L" />
            </label>
            <label className={styles.field}>
              <span>Pantalón</span>
              <input value={profile.sizes.bottom} onChange={e => updateSize('bottom', e.target.value)} placeholder="42 / W32" />
            </label>
            <label className={styles.field}>
              <span>Calzado</span>
              <input value={profile.sizes.shoes} onChange={e => updateSize('shoes', e.target.value)} placeholder="42 EU" />
            </label>
          </div>

          <label className={styles.field}>
            <span>Preferencias y límites</span>
            <textarea
              value={profile.styleNotes}
              onChange={e => update('styleNotes', e.target.value)}
              placeholder="Colores que te favorecen, prendas que no te gustan, marcas, presupuesto, estilo..."
            />
          </label>

          <div className={styles.actions}>
            <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar perfil'}
            </button>
            {saved && <span className={styles.saved}>{saved}</span>}
            {error && <span className={styles.error}>{error}</span>}
          </div>
        </section>

        <section className={styles.panel}>
          <h3 className={styles.panelTitle}>Fotos de referencia</h3>
          <div className={styles.photoGrid}>
            {PHOTO_SLOTS.map(slot => (
              <div key={slot.key} className={styles.photoCard}>
                <button className={styles.photoDrop} onClick={() => fileRefs.current[slot.key].click()}>
                  {profile.photos[slot.key]
                    ? <img src={profile.photos[slot.key]} alt={slot.title} />
                    : <span>Subir foto</span>
                  }
                </button>
                <input
                  ref={el => { fileRefs.current[slot.key] = el }}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={e => handlePhoto(slot.key, e.target.files[0])}
                />
                <div>
                  <p className={styles.photoTitle}>{slot.title}</p>
                  <p className={styles.photoHint}>{slot.hint}</p>
                </div>
              </div>
            ))}
          </div>
          <div className={styles.privacy}>
            Las fotos se guardan en Supabase Storage (bucket privado). Solo tú puedes acceder a ellas. Para eliminar tu cuenta y datos, contacta con el soporte.
          </div>
        </section>
      </div>
    </div>
  )
}
