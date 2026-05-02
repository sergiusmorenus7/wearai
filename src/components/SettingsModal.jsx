import { useState } from 'react'
import { setApiKey, getApiKey } from '../lib/ai.js'
import styles from './SettingsModal.module.css'

export default function SettingsModal({ onClose }) {
  const [key, setKey] = useState(getApiKey())

  function handleSave() {
    if (!key.trim()) return
    setApiKey(key.trim())
    onClose()
  }

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <div>
            <p className={styles.kicker}>Configuración</p>
            <h2 className={styles.title}>Conecta la IA</h2>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>x</button>
        </div>

        <div className={styles.body}>
          <div className={styles.section}>
            <label className={styles.label}>API Key de Google Gemini</label>
            <p className={styles.hint}>
              Necesaria para analizar prendas y generar outfits. Puedes crearla en{' '}
              <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" className={styles.link}>
                Google AI Studio
              </a>.
            </p>
            <input
              type="password"
              className={styles.input}
              value={key}
              onChange={e => setKey(e.target.value)}
              placeholder="AIza..."
              autoComplete="off"
            />
            <p className={styles.note}>
              La clave se guarda solo en este navegador con localStorage.
            </p>
          </div>

          <div className={styles.section}>
            <label className={styles.label}>Links de afiliado</label>
            <p className={styles.hint}>
              Antes de publicar, cambia los tags en <code>src/lib/wardrobe.js</code> o en las URLs de tiendas.
            </p>
            <div className={styles.affiliateList}>
              {['Zara', 'H&M', 'Mango', 'ASOS', 'Amazon Moda'].map(s => (
                <span key={s} className={styles.affiliateTag}>{s}</span>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onClose}>Cancelar</button>
          <button className={styles.saveBtn} onClick={handleSave} disabled={!key.trim()}>
            Guardar y continuar
          </button>
        </div>
      </div>
    </div>
  )
}
