import { useState } from 'react'
import { signIn, signUp, signInWithMagicLink } from '../lib/auth.js'
import styles from './AuthPage.module.css'

export default function AuthPage() {
  const [mode, setMode] = useState('signin')  // 'signin' | 'signup' | 'magic'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)

    try {
      if (mode === 'magic') {
        await signInWithMagicLink(email)
        setMessage('Enlace enviado. Revisa tu correo para acceder.')
      } else if (mode === 'signup') {
        await signUp(email, password)
        setMessage('Cuenta creada. Revisa tu correo para confirmar el acceso.')
      } else {
        await signIn(email, password)
        // La redirección al app ocurre automáticamente via onAuthStateChange en App
      }
    } catch (err) {
      const msg = err.message || 'Error desconocido'
      if (msg.includes('Invalid login')) setError('Email o contraseña incorrectos.')
      else if (msg.includes('already registered')) setError('Este email ya tiene cuenta. Inicia sesión.')
      else setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>
          <span className={styles.logoMark}>w</span>
          <span className={styles.logoName}>wearAI</span>
        </div>

        <p className={styles.tagline}>Tu armario inteligente</p>

        <div className={styles.tabs}>
          <button
            className={mode === 'signin' ? styles.tabActive : styles.tab}
            onClick={() => { setMode('signin'); setError(''); setMessage('') }}
          >
            Entrar
          </button>
          <button
            className={mode === 'signup' ? styles.tabActive : styles.tab}
            onClick={() => { setMode('signup'); setError(''); setMessage('') }}
          >
            Crear cuenta
          </button>
        </div>

        {mode !== 'magic' ? (
          <form className={styles.form} onSubmit={handleSubmit}>
            <label className={styles.field}>
              <span>Email</span>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
                autoComplete="email"
              />
            </label>

            <label className={styles.field}>
              <span>Contraseña</span>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={mode === 'signup' ? 'Mínimo 6 caracteres' : ''}
                required
                minLength={mode === 'signup' ? 6 : undefined}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              />
            </label>

            {error && <p className={styles.error}>{error}</p>}
            {message && <p className={styles.success}>{message}</p>}

            <button type="submit" className={styles.primaryBtn} disabled={loading}>
              {loading ? 'Cargando...' : mode === 'signup' ? 'Crear cuenta' : 'Entrar'}
            </button>

            <button
              type="button"
              className={styles.magicLink}
              onClick={() => { setMode('magic'); setError(''); setMessage('') }}
            >
              Entrar sin contraseña (link por email)
            </button>
          </form>
        ) : (
          <form className={styles.form} onSubmit={handleSubmit}>
            <p className={styles.magicInfo}>
              Te enviaremos un enlace mágico a tu correo para que entres sin contraseña.
            </p>
            <label className={styles.field}>
              <span>Email</span>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
                autoComplete="email"
              />
            </label>

            {error && <p className={styles.error}>{error}</p>}
            {message && <p className={styles.success}>{message}</p>}

            <button type="submit" className={styles.primaryBtn} disabled={loading}>
              {loading ? 'Enviando...' : 'Enviar enlace'}
            </button>

            <button
              type="button"
              className={styles.magicLink}
              onClick={() => { setMode('signin'); setError(''); setMessage('') }}
            >
              Volver al acceso con contraseña
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
