import { supabase } from './supabase.js'
import { uploadImage, getSignedUrl, compressProfilePhoto } from './imageUtils.js'

export const DEFAULT_PROFILE = {
  name: '',
  height: '',
  weight: '',
  bodyType: '',
  fitPreference: 'regular',
  sizes: { top: '', bottom: '', shoes: '' },
  styleNotes: '',
  photos: { front: null, side: null, full: null },
}

// Convierte fila de DB + URLs firmadas a objeto del frontend
async function rowToProfile(row) {
  const photos = { front: null, side: null, full: null }
  const slots = [
    { key: 'front', path: row.photo_front_path },
    { key: 'side',  path: row.photo_side_path },
    { key: 'full',  path: row.photo_full_path },
  ]
  await Promise.all(slots.map(async ({ key, path }) => {
    if (!path) return
    try { photos[key] = await getSignedUrl('profiles', path, 3600) } catch {}
  }))

  return {
    name:          row.name || '',
    height:        row.height || '',
    weight:        row.weight || '',
    bodyType:      row.body_type || '',
    fitPreference: row.fit_preference || 'regular',
    sizes:         { top: '', bottom: '', shoes: '', ...(row.sizes || {}) },
    styleNotes:    row.style_notes || '',
    photos,
    // Conservamos los paths para poder actualizar el storage
    _paths: {
      front: row.photo_front_path,
      side:  row.photo_side_path,
      full:  row.photo_full_path,
    },
  }
}

export async function loadProfile() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .single()

  if (error) {
    // Sin perfil en DB (primera vez, el trigger aún no corrió)
    if (error.code === 'PGRST116') return { ...DEFAULT_PROFILE, _paths: {} }
    throw error
  }
  return rowToProfile(data)
}

export async function saveProfile(profile) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const paths = { ...(profile._paths || {}) }

  // Sube fotos nuevas (dataUrl) y reemplaza el path almacenado
  const photoSlots = ['front', 'side', 'full']
  await Promise.all(photoSlots.map(async (slot) => {
    const photo = profile.photos?.[slot]
    if (!photo || !photo.startsWith('data:')) return  // ya es URL firmada, no cambió
    const compressed = await compressProfilePhoto(photo)
    const path = await uploadImage(compressed, 'profiles', user.id, `photo_${slot}`)
    paths[slot] = path
  }))

  const { error } = await supabase
    .from('profiles')
    .upsert({
      id:                user.id,
      name:              profile.name,
      height:            profile.height,
      weight:            profile.weight,
      body_type:         profile.bodyType,
      fit_preference:    profile.fitPreference,
      sizes:             profile.sizes,
      style_notes:       profile.styleNotes,
      photo_front_path:  paths.front || null,
      photo_side_path:   paths.side  || null,
      photo_full_path:   paths.full  || null,
      updated_at:        new Date().toISOString(),
    })

  if (error) throw error
}

export function getProfileCompleteness(profile) {
  if (!profile) return 0
  const checks = [
    profile.name,
    profile.height,
    profile.bodyType,
    profile.fitPreference,
    profile.photos?.front,
    profile.photos?.full,
  ]
  return Math.round((checks.filter(Boolean).length / checks.length) * 100)
}

export function getPrimaryPhoto(profile) {
  return profile?.photos?.full || profile?.photos?.front || profile?.photos?.side || null
}
