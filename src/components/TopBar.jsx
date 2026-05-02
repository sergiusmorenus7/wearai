import styles from './TopBar.module.css'

const TITLES = {
  profile: { title: 'Perfil', sub: 'Fotos, tallas y preferencias para pruebas visuales' },
  wardrobe: { title: 'Mi armario', sub: 'Organiza tus prendas por categoria, color y temporada' },
  tryon: { title: 'Probarme', sub: 'Visualiza outfits de armario o compra sobre tu perfil' },
  outfit: { title: 'Crear outfit', sub: 'Genera combinaciones segun ocasion, clima y estilo' },
  shop: { title: 'Comprar', sub: 'Encuentra piezas que completan lo que ya tienes' },
  saved: { title: 'Guardados', sub: 'Recupera tus mejores combinaciones' },
}

export default function TopBar({ page, onSettings }) {
  const { title, sub } = TITLES[page] || TITLES.wardrobe
  return (
    <header className={styles.topbar}>
      <div>
        <p className={styles.kicker}>wearAI Studio</p>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.sub}>{sub}</p>
      </div>
      <button className={styles.settingsBtn} onClick={onSettings} title="Configuracion">
        Ajustes
      </button>
    </header>
  )
}
