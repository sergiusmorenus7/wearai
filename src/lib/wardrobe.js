import { supabase } from './supabase.js'
import { uploadImage, getPublicUrl, compressImage } from './imageUtils.js'

export const CAT_LABELS = {
  top: 'Top / Camisa',
  bottom: 'Pantalón / Falda',
  outer: 'Abrigo / Chaqueta',
  shoes: 'Zapatos',
  acc: 'Accesorio',
}

export const CAT_ORDER = ['top', 'bottom', 'outer', 'shoes', 'acc']

// Convierte fila de DB a objeto del frontend
function rowToItem(row) {
  return {
    id: row.id,
    name: row.name,
    cat: row.category,
    color: row.color || '',
    season: row.season || 'todas',
    imageUrl: row.image_path ? getPublicUrl(row.image_path) : null,
    imagePath: row.image_path,
    addedAt: row.added_at,
  }
}

export async function loadWardrobe() {
  const { data, error } = await supabase
    .from('wardrobe_items')
    .select('*')
    .order('added_at', { ascending: false })

  if (error) throw error
  return data.map(rowToItem)
}

export async function addWardrobeItem({ name, cat, color, season, dataUrl }) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const itemId = crypto.randomUUID()

  // Comprime y sube imagen al bucket 'wardrobe' (público)
  const compressed = await compressImage(dataUrl)
  const imagePath = await uploadImage(compressed, 'wardrobe', user.id, itemId)

  const { data, error } = await supabase
    .from('wardrobe_items')
    .insert({
      id: itemId,
      user_id: user.id,
      name,
      category: cat,
      color,
      season,
      image_path: imagePath,
    })
    .select()
    .single()

  if (error) throw error
  return rowToItem(data)
}

export async function removeWardrobeItem(id, imagePath) {
  const { error } = await supabase.from('wardrobe_items').delete().eq('id', id)
  if (error) throw error

  if (imagePath) {
    // Elimina imagen del storage (best-effort, no lanzamos error si falla)
    await supabase.storage.from('wardrobe').remove([imagePath]).catch(() => {})
  }
}

// ── Outfits guardados ────────────────────────────────────────

function outfitRowToObj(row) {
  return {
    id: row.id,
    pieces: row.pieces_snapshot || [],
    analysis: row.analysis || {},
    occasion: row.occasion,
    weather: row.weather,
    generatedImageUrl: row.generated_image_url,
    savedAt: row.saved_at,
  }
}

export async function loadOutfits() {
  const { data, error } = await supabase
    .from('outfits')
    .select('*')
    .order('saved_at', { ascending: false })
    .limit(50)

  if (error) throw error
  return data.map(outfitRowToObj)
}

export async function saveOutfit({ pieces, analysis, occasion, weather }) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  // Guarda snapshot mínimo de las prendas (sin dataUrl para no inflar la DB)
  const piecesSnapshot = pieces.map(p => ({
    id: p.id, name: p.name, cat: p.cat, imageUrl: p.imageUrl,
  }))

  const { data, error } = await supabase
    .from('outfits')
    .insert({ user_id: user.id, pieces_snapshot: piecesSnapshot, analysis, occasion, weather })
    .select()
    .single()

  if (error) throw error
  return outfitRowToObj(data)
}

export async function deleteOutfit(id) {
  const { error } = await supabase.from('outfits').delete().eq('id', id)
  if (error) throw error
}

// ── Links de afiliado ────────────────────────────────────────

const AFFILIATE_PROGRAMS = {
  zara:   { name: 'Zara',         base: 'https://www.zara.com/es/es/search?searchTerm=' },
  hm:     { name: 'H&M',          base: 'https://www2.hm.com/es_es/search-results.html?q=' },
  mango:  { name: 'Mango',        base: 'https://shop.mango.com/es/busqueda?q=' },
  asos:   { name: 'ASOS',         base: 'https://www.asos.com/es/buscar/?q=' },
  amazon: { name: 'Amazon Moda',  base: 'https://www.amazon.es/s?k=', suffix: '&i=fashion' },
}

export function buildAffiliateLinks(query, stores = ['zara', 'hm', 'mango', 'asos', 'amazon']) {
  return stores.map(key => {
    const prog = AFFILIATE_PROGRAMS[key]
    const url = `${prog.base}${encodeURIComponent(query)}${prog.suffix || ''}`
    return { store: prog.name, url, key }
  })
}
