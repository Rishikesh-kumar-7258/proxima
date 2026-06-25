// Free city → { lat, lng } lookup via OpenStreetMap Nominatim (no API key).
// Best-effort: returns null if the city is blank or nothing matches.
export async function geocodeCity(city) {
  const q = city?.trim()
  if (!q) return null
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`
    const res = await fetch(url, { headers: { 'Accept-Language': 'en' } })
    const [hit] = await res.json()
    return hit ? { lat: +hit.lat, lng: +hit.lon } : null
  } catch {
    return null
  }
}

export async function searchPlaces(query) {
  const q = query?.trim()
  if (!q || q.length < 2) return []
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&addressdetails=1&q=${encodeURIComponent(q)}`
    const res = await fetch(url, { headers: { 'Accept-Language': 'en' } })
    const hits = await res.json()
    return hits.map((h) => ({
      lat: +h.lat,
      lng: +h.lon,
      city: h.address.city || h.address.town || h.address.village || h.address.county || '',
      state: h.address.state || '',
      country: h.address.country || '',
      displayName: h.display_name,
    }))
  } catch {
    return []
  }
}
