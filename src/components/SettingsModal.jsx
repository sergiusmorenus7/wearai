import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { signOut } from '../lib/auth.js'
import styles from './SettingsModal.module.css'

export default function SettingsModal({ onClose }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [email, setEmail] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.email) setEmail(data.user.email)
    })
  }, [])

  async function handleSignOut() {
    setLoading(true)
    try {
      await signOut()
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <div>
            <p className={styles.kicker}>Cuenta</p>
            <h2 className={styles.title}>Ajustes</h2>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={styles.body}>
          <div className={styles.section}>
            <label className={styles.label}>Cuenta activa</label>
            <p className={styles.emailDisplay}>{email || '—'}</p>
          </div>

          <div className={styles.section}>
            <label className={styles.label}>Plan</label>
            <div className={styles.planBadge}>
              <span className={styles.planName}>Free</span>
              <span className={styles.planLimit}>60 consultas IA / día</span>
            </div>
            <p className={styles.hint}>
              Próximamente: plan Premium con consultas ilimitadas, generación de imagen prioritaria y exportación de looks.
            </p>
          </div>

          <div className={styles.section}>
            <label className={styles.label}>Afiliados</label>
            <p className={styles.hint}>
              Configura tus IDs de afiliado en <code>src/lib/wardrobe.js</code> (Awin para Zara/H&M/Mango, Amazon Associates para Amazon) antes de publicar campañas reales.
            </p>
          </div>

          {error && <p className={styles.error}>{error}</p>}
        </div>

        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onClose}>Cerrar</button>
          <button className={styles.signOutBtn} onClick={handleSignOut} disabled={loading}>
            {loading ? 'Saliendo...' : 'Cerrar sesión'}
          </button>
        </div>
      </div>
    </div>
  )
}
