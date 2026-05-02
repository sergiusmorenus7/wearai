import { useState, useEffect } from 'react'
import { supabase, supabaseConfigured } from './lib/supabase.js'
import { onAuthChange } from './lib/auth.js'
import { loadWardrobe } from './lib/wardrobe.js'
import { loadProfile, DEFAULT_PROFILE } from './lib/profile.js'
import Sidebar from './components/Sidebar.jsx'
import TopBar from './components/TopBar.jsx'
import WardrobePage from './pages/WardrobePage.jsx'
import ProfilePage from './pages/ProfilePage.jsx'
import TryOnPage from './pages/TryOnPage.jsx'
import OutfitPage from './pages/OutfitPage.jsx'
import ShopPage from './pages/ShopPage.jsx'
import SavedPage from './pages/SavedPage.jsx'
import SettingsModal from './components/SettingsModal.jsx'
import AuthPage from './components/AuthPage.jsx'
import styles from './App.module.css'

export default function App() {
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [page, setPage] = useState('wardrobe')
  const [wardrobe, setWardrobe] = useState([])
  const [profile, setProfile] = useState(DEFAULT_PROFILE)
  const [dataLoading, setDataLoading] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  // Auth listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setAuthLoading(false)
    })
    return onAuthChange(setUser)
  }, [])

  // Carga datos cuando el usuario se autentifica
  useEffect(() => {
    if (!user) {
      setWardrobe([])
      setProfile(DEFAULT_PROFILE)
      return
    }
    setDataLoading(true)
    Promise.all([loadWardrobe(), loadProfile()])
      .then(([items, prof]) => {
        setWardrobe(items)
        setProfile(prof || DEFAULT_PROFILE)
      })
      .catch(console.error)
      .finally(() => setDataLoading(false))
  }, [user?.id])

  if (!supabaseConfigured) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', flexDirection:'column', gap:16, fontFamily:'inherit' }}>
        <h2 style={{margin:0}}>Configuración requerida</h2>
        <p style={{color:'#888', maxWidth:380, textAlign:'center', margin:0}}>
          Crea un archivo <code>.env.local</code> con <code>VITE_SUPABASE_URL</code> y <code>VITE_SUPABASE_ANON_KEY</code>.<br/>
          Consulta el README para los pasos completos.
        </p>
      </div>
    )
  }

  if (authLoading) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh' }}>
        <div style={{ width:32, height:32, border:'3px solid #eee', borderTopColor:'#111', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
      </div>
    )
  }

  if (!user) return <AuthPage />

  const pages = {
    profile: <ProfilePage profile={profile} setProfile={setProfile} />,
    wardrobe: <WardrobePage wardrobe={wardrobe} setWardrobe={setWardrobe} />,
    tryon: <TryOnPage wardrobe={wardrobe} profile={profile} />,
    outfit: <OutfitPage wardrobe={wardrobe} />,
    shop: <ShopPage wardrobe={wardrobe} />,
    saved: <SavedPage />,
  }

  return (
    <div className={styles.layout}>
      <Sidebar page={page} setPage={setPage} wardrobeCount={wardrobe.length} profile={profile} />
      <div className={styles.main}>
        <TopBar page={page} onSettings={() => setShowSettings(true)} />
        <div className={styles.content}>
          {dataLoading
            ? <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh' }}>
                <p style={{ color:'#999' }}>Cargando tu armario...</p>
              </div>
            : pages[page]
          }
        </div>
      </div>
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  )
}
