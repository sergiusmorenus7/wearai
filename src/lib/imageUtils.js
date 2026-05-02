// Comprime una dataURL a JPEG con un ancho máximo y calidad configurables.
// Evita que localStorage se llene con imágenes de varios MB.
export function compressImage(dataUrl, maxDim = 900, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const ratio = Math.min(maxDim / img.width, maxDim / img.height, 1)
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * ratio)
      canvas.height = Math.round(img.height * ratio)
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.onerror = reject
    img.src = dataUrl
  })
}

// Comprime una foto de perfil (un poco más grande para que la IA tenga más detalle).
export function compressProfilePhoto(dataUrl) {
  return compressImage(dataUrl, 1024, 0.85)
}

const STORAGE_WARN_BYTES = 3.5 * 1024 * 1024  // avisa a partir de 3.5 MB

export function getStorageBytes() {
  return Object.keys(localStorage).reduce((total, key) => {
    return total + (localStorage.getItem(key)?.length ?? 0)
  }, 0)
}

export function isStorageNearLimit() {
  return getStorageBytes() > STORAGE_WARN_BYTES
}
