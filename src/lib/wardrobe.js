const KEY = 'wearai_wardrobe'
const OUTFITS_KEY = 'wearai_outfits'

export const CAT_LABELS = {
  top: 'Top / Camisa',
  bottom: 'Pantalón / Falda',
  outer: 'Abrigo / Chaqueta',
  shoes: 'Zapatos',
  acc: 'Accesorio',
}

export const CAT_ORDER = ['top', 'bottom', 'outer', 'shoes', 'acc']

export function loadWardrobe() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]')
  } catch {
    return []
  }
}

export function saveWardrobe(items) {
  localStorage.setItem(KEY, JSON.stringify(items))
}

export function addItem(item) {
  const wardrobe = loadWardrobe()
  wardrobe.push(item)
  saveWardrobe(wardrobe)
  return wardrobe
}

export function removeItem(id) {
  const wardrobe = loadWardrobe().filter(i => i.id !== id)
  saveWardrobe(wardrobe)
  return wardrobe
}

export function loadOutfits() {
  try {
    return JSON.parse(localStorage.getItem(OUTFITS_KEY) || '[]')
  } catch {
    return []
  }
}

export function saveOutfit(outfit) {
  const outfits = loadOutfits()
  outfits.unshift(outfit)
  localStorage.setItem(OUTFITS_KEY, JSON.stringify(outfits.slice(0, 50)))
  return outfits
}

export function deleteOutfit(id) {
  const outfits = loadOutfits().filter(o => o.id !== id)
  localStorage.setItem(OUTFITS_KEY, JSON.stringify(outfits))
  return outfits
}

const AFFILIATE_PROGRAMS = {
  zara: { name: 'Zara', tag: 'wearai-21', base: 'https://www.zara.com/es/es/search?searchTerm=' },
  hm: { name: 'H&M', tag: 'wearai', base: 'https://www2.hm.com/es_es/search-results.html?q=' },
  mango: { name: 'Mango', tag: 'wearai', base: 'https://shop.mango.com/es/busqueda?q=' },
  asos: { name: 'ASOS', tag: 'wearai', base: 'https://www.asos.com/es/buscar/?q=' },
  amazon: { name: 'Amazon Moda', tag: 'wearai-21', base: 'https://www.amazon.es/s?k=' },
}

export function buildAffiliateLinks(query, stores = ['zara', 'hm', 'mango', 'asos', 'amazon']) {
  return stores.map(key => {
    const prog = AFFILIATE_PROGRAMS[key]
    const url = `${prog.base}${encodeURIComponent(query)}&tag=${prog.tag}`
    return { store: prog.name, url, key }
  })
}
