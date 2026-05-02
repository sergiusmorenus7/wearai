const PROFILE_KEY = 'wearai_profile'

export const DEFAULT_PROFILE = {
  name: '',
  height: '',
  weight: '',
  bodyType: '',
  fitPreference: 'regular',
  sizes: {
    top: '',
    bottom: '',
    shoes: '',
  },
  styleNotes: '',
  photos: {
    front: null,
    side: null,
    full: null,
  },
}

export function loadProfile() {
  try {
    return { ...DEFAULT_PROFILE, ...JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}') }
  } catch {
    return DEFAULT_PROFILE
  }
}

export function saveProfile(profile) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile))
  return profile
}

export function getProfileCompleteness(profile) {
  const checks = [
    profile.name,
    profile.height,
    profile.bodyType,
    profile.fitPreference,
    profile.photos.front,
    profile.photos.full,
  ]
  return Math.round((checks.filter(Boolean).length / checks.length) * 100)
}

export function getPrimaryPhoto(profile) {
  return profile.photos.full || profile.photos.front || profile.photos.side
}
