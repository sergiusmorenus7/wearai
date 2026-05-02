import styles from './Sidebar.module.css'
import { getProfileCompleteness } from '../lib/profile.js'

const NAV = [
  { id: 'profile', icon: 'PF', label: 'Perfil' },
  { id: 'wardrobe', icon: 'AR', label: 'Mi armario' },
  { id: 'tryon', icon: 'PR', label: 'Probarme' },
  { id: 'outfit', icon: 'IA', label: 'Crear outfit' },
  { id: 'shop', icon: 'CO', label: 'Comprar' },
  { id: 'saved', icon: 'GU', label: 'Guardados' },
]

export default function Sidebar({ page, setPage, wardrobeCount, profile }) {
  const profileScore = getProfileCompleteness(profile)

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        <span className={styles.logoMark}>w</span>
        <span className={styles.logoText}>wearAI</span>
      </div>

      <nav className={styles.nav} aria-label="Navegacion principal">
        {NAV.map(item => (
          <button
            key={item.id}
            className={`${styles.navItem} ${page === item.id ? styles.active : ''}`}
            onClick={() => setPage(item.id)}
          >
            <span className={styles.navIcon}>{item.icon}</span>
            <span className={styles.navLabel}>{item.label}</span>
            {item.id === 'wardrobe' && wardrobeCount > 0 && (
              <span className={styles.badge}>{wardrobeCount}</span>
            )}
          </button>
        ))}
      </nav>

      <div className={styles.footer}>
        <p className={styles.footerKicker}>Estado</p>
        <p className={styles.tagline}>{profileScore}% perfil · {wardrobeCount || 0} prendas listas</p>
      </div>
    </aside>
  )
}
