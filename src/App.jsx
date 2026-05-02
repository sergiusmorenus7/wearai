import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar.jsx'
import TopBar from './components/TopBar.jsx'
import WardrobePage from './pages/WardrobePage.jsx'
import ProfilePage from './pages/ProfilePage.jsx'
import TryOnPage from './pages/TryOnPage.jsx'
import OutfitPage from './pages/OutfitPage.jsx'
import ShopPage from './pages/ShopPage.jsx'
import SavedPage from './pages/SavedPage.jsx'
import SettingsModal from './components/SettingsModal.jsx'
import { getApiKey } from './lib/ai.js'
import { loadWardrobe } from './lib/wardrobe.js'
import { loadProfile } from './lib/profile.js'
import styles from './App.module.css'

export default function App() {
  const [page, setPage] = useState('wardrobe')
  const [wardrobe, setWardrobe] = useState([])
  const [profile, setProfile] = useState(loadProfile())
  const [showSettings, setShowSettings] = useState(false)
  const [hasKey, setHasKey] = useState(!!getApiKey())

  useEffect(() => {
    setWardrobe(loadWardrobe())
  }, [])

  useEffect(() => {
    if (!hasKey) setShowSettings(true)
  }, [hasKey])

  const pages = {
    profile: <ProfilePage profile={profile} setProfile={setProfile} />,
    wardrobe: <WardrobePage wardrobe={wardrobe} setWardrobe={setWardrobe} />,
    tryon: <TryOnPage wardrobe={wardrobe} profile={profile} />,
    outfit: <OutfitPage wardrobe={wardrobe} />,
    shop: <ShopPage wardrobe={wardrobe} />,
    saved: <SavedPage wardrobe={wardrobe} />,
  }

  return (
    <div className={styles.layout}>
      <Sidebar page={page} setPage={setPage} wardrobeCount={wardrobe.length} profile={profile} />
      <div className={styles.main}>
        <TopBar page={page} onSettings={() => setShowSettings(true)} />
        <div className={styles.content}>
          {pages[page]}
        </div>
      </div>
      {showSettings && (
        <SettingsModal
          onClose={() => { setShowSettings(false); setHasKey(!!getApiKey()) }}
        />
      )}
    </div>
  )
}
