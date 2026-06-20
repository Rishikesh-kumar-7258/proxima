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
    return null // offline or rate-limited — saving the contact still succeeds
  }
}
