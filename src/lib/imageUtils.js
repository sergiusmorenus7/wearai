import { supabase } from './supabase.js'

// Comprime imagen a JPEG con ancho máximo y calidad configurables
export function compressImage(dataUrl, maxDim = 900, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const ratio = Math.min(maxDim / img.width, maxDim / img.height, 1)
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * ratio)
      canvas.height = Math.round(img.height * ratio)
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.onerror = reject
    img.src = dataUrl
  })
}

export function compressProfilePhoto(dataUrl) {
  return compressImage(dataUrl, 1024, 0.85)
}

// Convierte dataUrl a Blob
function dataUrlToBlob(dataUrl) {
  const [header, data] = dataUrl.split(',')
  const mimeType = header.match(/:(.*?);/)[1]
  const binary = atob(data)
  const buffer = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) buffer[i] = binary.charCodeAt(i)
  return new Blob([buffer], { type: mimeType })
}

// Sube imagen al bucket de Supabase Storage y devuelve el path
export async function uploadImage(dataUrl, bucket, userId, itemId) {
  const blob = dataUrlToBlob(dataUrl)
  const path = `${userId}/${itemId}.jpg`

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, blob, { contentType: 'image/jpeg', upsert: true })

  if (error) throw error
  return path
}

// URL pública para el bucket 'wardrobe' (público)
export function getPublicUrl(path) {
  const { data } = supabase.storage.from('wardrobe').getPublicUrl(path)
  return data.publicUrl
}

// URL firmada para buckets privados (profiles, tryons)
export async function getSignedUrl(bucket, path, expiresIn = 3600) {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn)
  if (error) throw error
  return data.signedUrl
}
