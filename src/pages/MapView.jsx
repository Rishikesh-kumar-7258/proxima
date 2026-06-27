import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { MapContainer, TileLayer, Circle, CircleMarker, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useContacts } from '../hooks/useContacts'
import { useLocation } from '../hooks/useLocation'
import { distanceKm } from '../lib/distance'
import { warmthOf } from '../lib/warmth'
import PlaceAutocomplete from '../components/PlaceAutocomplete'

const DEFAULT_CENTER = { lat: 20.5937, lng: 78.9629 }

const WARMTH_COLORS = { hot: '#22c55e', warm: '#f59e0b', cold: '#9ca3af' }

// --- Custom marker that shows the person's photo (or initials) instead of a stale dot ---
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

function initialsOf(name) {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase()
}

function personIcon(contact, color, highlighted) {
  const ring = highlighted ? '0 0 0 4px rgba(170,59,255,.30),' : ''
  const photo = contact.photo_url
  const init = esc(initialsOf(contact.name))
  const img = photo
    ? `<img src="${esc(photo)}" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;" onerror="this.remove()"/>`
    : ''
  return L.divIcon({
    className: 'proxima-pin',
    iconSize: [44, 52],
    iconAnchor: [22, 52],
    popupAnchor: [0, -48],
    html: `
      <div style="position:relative;width:44px;height:52px;">
        <div style="position:relative;width:44px;height:44px;border-radius:9999px;border:3px solid ${color};background:#ede9fe;box-shadow:${ring}0 3px 8px rgba(15,23,42,.35);overflow:hidden;display:flex;align-items:center;justify-content:center;font:700 14px ui-sans-serif,system-ui,sans-serif;color:#5b21b6;">
          <span>${init}</span>${img}
        </div>
        <div style="position:absolute;left:50%;bottom:0;transform:translateX(-50%);width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:9px solid ${color};filter:drop-shadow(0 2px 1px rgba(15,23,42,.25));"></div>
      </div>`,
  })
}

function RecenterMap({ center, zoom }) {
  const map = useMap()
  const lat = center[0]
  const lng = center[1]
  useEffect(() => {
    map.flyTo([lat, lng], zoom, { duration: 1.5 })
  }, [map, lat, lng, zoom])
  return null
}

function FlyToTarget({ target }) {
  const map = useMap()
  useEffect(() => {
    if (target) map.flyTo([target.lat, target.lng], 14, { duration: 1 })
  }, [map, target])
  return null
}

// Leaflet caches the container size; recompute it whenever the layout changes
// (e.g. entering/leaving fullscreen) so tiles fill the new viewport.
function InvalidateOnChange({ dep }) {
  const map = useMap()
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 220)
    return () => clearTimeout(t)
  }, [map, dep])
  return null
}

export default function MapView() {
  const { contacts, fetch } = useContacts()
  const { coords, loading } = useLocation()
  const [radius, setRadius] = useState(10)
  const [flyTarget, setFlyTarget] = useState(null)
  const [activeFilters, setActiveFilters] = useState(new Set())
  const [customOrigin, setCustomOrigin] = useState(null)
  const [controlsOpen, setControlsOpen] = useState(true)
  const [fullscreen, setFullscreen] = useState(false)

  useEffect(() => { fetch() }, [fetch])

  // Origin = a custom place you picked > your live GPS > a neutral default.
  const origin = customOrigin ?? coords ?? DEFAULT_CENTER
  const hasGps = !!coords
  const hasOrigin = !!customOrigin || hasGps

  // Close fullscreen with Escape.
  useEffect(() => {
    if (!fullscreen) return
    const onKey = (e) => e.key === 'Escape' && setFullscreen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [fullscreen])

  const allLocated = useMemo(() =>
    contacts.flatMap((c) => {
      const addrs = c.addresses?.filter((a) => a.lat != null && a.lng != null) ?? []
      if (addrs.length > 0) {
        return addrs.map((a, i) => ({
          ...c,
          lat: a.lat,
          lng: a.lng,
          addressLabel: a.label || 'Other',
          addressCity: a.city,
          addressState: a.state,
          addressCountry: a.country,
          addrIdx: i,
          dist: distanceKm(origin, a),
        }))
      }
      if (c.lat != null && c.lng != null) {
        return [{ ...c, addressLabel: 'Other', addressCity: c.city, addrIdx: 0, dist: distanceKm(origin, c) }]
      }
      return []
    }).sort((a, b) => a.dist - b.dist),
    [contacts, origin],
  )

  // Unique labels (+ counts) for the filter chips.
  const availableLabels = useMemo(() => {
    const labels = new Map()
    for (const item of allLocated) {
      const l = item.addressLabel
      labels.set(l, (labels.get(l) ?? 0) + 1)
    }
    return labels
  }, [allLocated])

  // Markers shown on the map: label filter only (radius is shown via highlight).
  const located = useMemo(() => {
    if (activeFilters.size === 0) return allLocated
    return allLocated.filter((c) => activeFilters.has(c.addressLabel))
  }, [allLocated, activeFilters])

  const inRadius = (d) => hasOrigin && d <= radius

  // Distance list: people inside the radius only (falls back to all when we
  // have no origin to measure from).
  const listItems = useMemo(
    () => (hasOrigin ? located.filter((c) => c.dist <= radius) : located),
    [located, hasOrigin, radius],
  )

  const toggleFilter = (label) => {
    setActiveFilters((prev) => {
      const next = new Set(prev)
      if (next.has(label)) next.delete(label)
      else next.add(label)
      return next
    })
  }

  const noLocation = contacts.filter((c) => {
    const hasAddr = c.addresses?.some((a) => a.lat != null) ?? false
    return !hasAddr && c.lat == null
  }).length

  const originLabel = customOrigin
    ? [customOrigin.city, customOrigin.country].filter(Boolean).join(', ') || 'Custom location'
    : hasGps ? 'Your live location' : 'Default map center'

  if (loading) return <div className="grid min-h-[60svh] place-items-center text-gray-400">Locating you…</div>

  const initialZoom = hasOrigin ? 11 : 4

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-8">
      <div className="mb-5 flex flex-col gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Nearby</h1>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-full bg-gray-100 px-3 py-1.5 font-medium text-gray-700">
            {hasOrigin ? `${listItems.length} within ${radius} km` : `${located.length} mapped`}
            {noLocation > 0 && ` · ${noLocation} without location`}
          </span>
          {customOrigin ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-3 py-1.5 font-medium text-violet-700">
              Viewing from {customOrigin.city || 'custom location'}
              <button onClick={() => setCustomOrigin(null)} className="text-violet-500 hover:text-violet-900" aria-label="Reset location">✕</button>
            </span>
          ) : hasGps ? (
            <span className="rounded-full bg-green-100 px-3 py-1.5 font-medium text-green-700">Live location active</span>
          ) : (
            <span className="rounded-full bg-amber-100 px-3 py-1.5 font-medium text-amber-700">Using default map center</span>
          )}
        </div>
      </div>

      <div className={`grid gap-4 ${fullscreen ? '' : 'lg:grid-cols-[minmax(0,1.7fr)_22rem] xl:grid-cols-[minmax(0,1.9fr)_24rem]'}`}>
        {/* Map */}
        <div
          className={
            fullscreen
              ? 'fixed inset-0 z-[1000] bg-white'
              : 'relative isolate h-[62vh] w-full overflow-hidden rounded-[28px] border border-gray-200 bg-white shadow-sm sm:h-[70vh] lg:h-[78vh]'
          }
        >
          {/* Floating controls (top-left) */}
          <div className="pointer-events-none absolute inset-x-0 top-0 z-[500] flex items-start justify-between gap-2 p-3">
            <div className="pointer-events-auto w-[min(20rem,calc(100vw-5rem))] overflow-hidden rounded-2xl border border-white/30 bg-white/95 shadow-lg shadow-gray-900/10 backdrop-blur">
              <button
                onClick={() => setControlsOpen((o) => !o)}
                className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left"
              >
                <span className="text-sm font-semibold text-gray-900">Map controls</span>
                <span className={`text-gray-400 transition ${controlsOpen ? 'rotate-180' : ''}`}>▾</span>
              </button>

              {controlsOpen && (
                <div className="max-h-[60vh] space-y-4 overflow-y-auto border-t border-gray-100 px-4 pb-4 pt-3">
                  {/* Origin */}
                  <div>
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">Viewing from</p>
                    <PlaceAutocomplete value={customOrigin} onSelect={setCustomOrigin} />
                    <p className="mt-1 truncate text-[11px] text-gray-400">{originLabel}</p>
                  </div>

                  {/* Radius */}
                  <div>
                    <div className="mb-1 flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Radius</p>
                      <span className="text-sm font-semibold tabular-nums text-violet-700">{radius} km</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="200"
                      value={radius}
                      onChange={(e) => setRadius(+e.target.value)}
                      className="w-full accent-violet-600"
                    />
                    <div className="flex justify-between text-[11px] text-gray-400"><span>1 km</span><span>200 km</span></div>
                  </div>

                  {/* Filters */}
                  {availableLabels.size > 1 && (
                    <div>
                      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">Filter by place type</p>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => setActiveFilters(new Set())}
                          className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${activeFilters.size === 0 ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                        >
                          All ({allLocated.length})
                        </button>
                        {[...availableLabels.entries()].map(([label, count]) => (
                          <button
                            key={label}
                            type="button"
                            onClick={() => toggleFilter(label)}
                            className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${activeFilters.has(label) ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                          >
                            {label} ({count})
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Fullscreen toggle (top-right) */}
            <button
              onClick={() => setFullscreen((f) => !f)}
              className="pointer-events-auto grid size-10 shrink-0 place-items-center rounded-full bg-white/95 text-violet-700 shadow-lg backdrop-blur hover:bg-white"
              aria-label={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              title={fullscreen ? 'Exit fullscreen (Esc)' : 'Fullscreen'}
            >
              {fullscreen ? '✕' : '⛶'}
            </button>
          </div>

          <MapContainer center={[origin.lat, origin.lng]} zoom={initialZoom} className="h-full w-full" zoomControl={false}>
            <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <RecenterMap center={[origin.lat, origin.lng]} zoom={initialZoom} />
            <FlyToTarget target={flyTarget} />
            <InvalidateOnChange dep={fullscreen} />

            {hasOrigin && (
              <>
                <Circle center={[origin.lat, origin.lng]} radius={radius * 1000} pathOptions={{ color: '#aa3bff', fillOpacity: 0.06, weight: 1 }} />
                <CircleMarker center={[origin.lat, origin.lng]} radius={7} pathOptions={{ color: '#fff', weight: 2, fillColor: customOrigin ? '#aa3bff' : '#ef4444', fillOpacity: 1 }}>
                  <Popup>{customOrigin ? `Viewing from ${customOrigin.city || 'here'}` : 'You are here'}</Popup>
                </CircleMarker>
              </>
            )}

            {located.map((c) => {
              const w = warmthOf(c.last_interaction)
              return (
                <Marker
                  key={`${c.id}-${c.addrIdx}`}
                  position={[c.lat, c.lng]}
                  icon={personIcon(c, WARMTH_COLORS[w], inRadius(c.dist))}
                >
                  <Popup>
                    <div className="flex items-center gap-2">
                      {c.photo_url && <img src={c.photo_url} alt="" className="size-8 rounded-full object-cover" />}
                      <div>
                        <strong>{c.name}</strong>
                        <span className="ml-1.5 inline-block size-2 rounded-full" style={{ backgroundColor: WARMTH_COLORS[w] }} />
                      </div>
                    </div>
                    {c.addressLabel && (
                      <span className="mt-1 inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{c.addressLabel}</span>
                    )}
                    {(c.role || c.addressCity) && <div>{[c.role, c.addressCity].filter(Boolean).join(' · ')}</div>}
                    {c.addressState && <div className="text-xs text-gray-400">{[c.addressState, c.addressCountry].filter(Boolean).join(', ')}</div>}
                    {c.tags?.length > 0 && <div className="mt-1 text-violet-600">{c.tags.join(', ')}</div>}
                    {hasOrigin && <div className="mt-1 text-gray-500">{c.dist.toFixed(1)} km away</div>}
                    <Link to={`/contact/${c.id}`} className="mt-1 block text-sm font-medium text-violet-600">View profile →</Link>
                  </Popup>
                </Marker>
              )
            })}
          </MapContainer>
        </div>

        {/* Distance-sorted list (hidden in fullscreen) */}
        <div className={fullscreen ? 'hidden' : 'rounded-[28px] border border-gray-200 bg-white p-3 shadow-sm lg:flex lg:h-[78vh] lg:flex-col lg:overflow-hidden'}>
          <div className="mb-3 flex items-center justify-between gap-3 px-1 pt-1">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-gray-500">Distance list</h2>
              <p className="text-sm text-gray-400">{hasOrigin ? `Inside ${radius} km · nearest first` : 'Nearest first'}</p>
            </div>
          </div>
          <ul className="flex max-h-[45vh] flex-col gap-2 overflow-y-auto pr-1 lg:max-h-none lg:flex-1">
            {listItems.map((c) => {
              const w = warmthOf(c.last_interaction)
              return (
                <li key={`${c.id}-${c.addrIdx}`}>
                  <button
                    type="button"
                    onClick={() => setFlyTarget({ lat: c.lat, lng: c.lng })}
                    className="card flex w-full items-center gap-3 p-3 text-left"
                  >
                    <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-full border-2 bg-violet-100 text-xs font-bold text-violet-700" style={{ borderColor: WARMTH_COLORS[w] }}>
                      {c.photo_url
                        ? <img src={c.photo_url} alt="" className="size-full object-cover" />
                        : initialsOf(c.name)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">
                        {c.name}
                        {c.addressLabel && (
                          <span className="ml-1.5 rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-normal text-gray-500">{c.addressLabel}</span>
                        )}
                      </p>
                      <p className="truncate text-sm text-gray-500">{[c.role, c.addressCity].filter(Boolean).join(' · ')}</p>
                    </div>
                    {hasOrigin && <span className="shrink-0 text-sm tabular-nums text-gray-400">{c.dist.toFixed(1)} km</span>}
                  </button>
                </li>
              )
            })}
            {listItems.length === 0 && (
              <p className="rounded-2xl border border-dashed border-gray-200 px-4 py-10 text-center text-gray-400">
                {activeFilters.size > 0
                  ? 'No contacts match the selected filters.'
                  : hasOrigin
                    ? `No contacts within ${radius} km. Widen the radius or change where you're viewing from.`
                    : 'No contacts have a location yet. Add a city to a contact to map them.'}
              </p>
            )}
          </ul>
        </div>
      </div>
    </div>
  )
}
