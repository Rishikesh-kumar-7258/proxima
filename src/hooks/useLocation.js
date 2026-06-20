import { useEffect, useState } from 'react'

// One-shot browser GPS read. Returns { coords: {lat,lng} | null, error, loading }.
export function useLocation() {
  // Seed the unsupported case at init so the effect only ever sets state asynchronously.
  const [state, setState] = useState(() =>
    'geolocation' in navigator
      ? { coords: null, error: null, loading: true }
      : { coords: null, error: 'Geolocation not supported', loading: false },
  )

  useEffect(() => {
    if (!('geolocation' in navigator)) return
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => setState({ coords: { lat: coords.latitude, lng: coords.longitude }, error: null, loading: false }),
      (err) => setState({ coords: null, error: err.message, loading: false }),
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }, [])

  return state
}
