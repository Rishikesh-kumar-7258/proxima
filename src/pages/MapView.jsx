import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { MapContainer, TileLayer, Circle, CircleMarker, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { useContacts } from '../hooks/useContacts'
import { useLocation } from '../hooks/useLocation'
import { distanceKm } from '../lib/distance'
import { warmthOf } from '../lib/warmth'

const DEFAULT_CENTER = { lat: 20.5937, lng: 78.9629 }

const WARMTH_COLORS = { hot: '#22c55e', warm: '#f59e0b', cold: '#9ca3af' }

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

export default function MapView() {
  const { contacts, fetch } = useContacts()
  const { coords, loading } = useLocation()
  const [radius, setRadius] = useState(10)
  const [showRadius, setShowRadius] = useState(false)
  const [flyTarget, setFlyTarget] = useState(null)

  useEffect(() => { fetch() }, [fetch])

  const me = coords ?? DEFAULT_CENTER
  const hasGps = !!coords

  const located = useMemo(() =>
    contacts.flatMap((c) => {
      const addrs = c.addresses?.filter((a) => a.lat != null && a.lng != null) ?? []
      if (addrs.length > 0) {
        return addrs.map((a, i) => ({
          ...c,
          lat: a.lat,
          lng: a.lng,
          addressLabel: a.label,
          addressCity: a.city,
          addrIdx: i,
          dist: distanceKm(me, a),
        }))
      }
      if (c.lat != null && c.lng != null) {
        return [{ ...c, addressLabel: null, addressCity: c.city, addrIdx: 0, dist: distanceKm(me, c) }]
      }
      return []
    }).sort((a, b) => a.dist - b.dist),
    [contacts, me],
  )

  const inRadius = (d) => hasGps && d <= radius
  const noLocation = contacts.filter((c) => {
    const hasAddr = c.addresses?.some((a) => a.lat != null) ?? false
    return !hasAddr && c.lat == null
  }).length

  if (loading) return <div className="grid min-h-[60svh] place-items-center text-gray-400">Locating you…</div>

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-8">
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Nearby</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded-full bg-gray-100 px-3 py-1.5 font-medium text-gray-700">
              {located.length} mapped{noLocation > 0 && ` · ${noLocation} without location`}
            </span>
            {hasGps ? (
              <span className="rounded-full bg-green-100 px-3 py-1.5 font-medium text-green-700">
                Live location active
              </span>
            ) : (
              <span className="rounded-full bg-amber-100 px-3 py-1.5 font-medium text-amber-700">
                Using default map center
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.7fr)_22rem] xl:grid-cols-[minmax(0,1.9fr)_24rem]">
        {/* Map */}
        <div className="relative isolate min-h-[55vh] w-full overflow-hidden rounded-[28px] border border-gray-200 bg-white shadow-sm lg:min-h-[78vh]">
          <div className="pointer-events-none absolute inset-x-0 top-0 z-[500] px-4 pt-4">
            <button
              onClick={() => setShowRadius((s) => !s)}
              className="pointer-events-auto mb-2 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-violet-700 shadow-lg backdrop-blur lg:hidden"
            >
              {showRadius ? 'Hide radius' : `Radius: ${radius} km`}
            </button>
            <div className={`pointer-events-auto w-full max-w-sm rounded-2xl border border-white/20 bg-white/90 p-4 shadow-lg shadow-gray-900/10 backdrop-blur ${showRadius ? '' : 'hidden lg:block'}`}>
              <div className="mb-2 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Radius</p>
                  <p className="text-xs text-gray-500">Slide to tune what stays in view</p>
                </div>
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
              <div className="mt-2 flex justify-between text-[11px] text-gray-400">
                <span>1 km</span>
                <span>200 km</span>
              </div>
            </div>
          </div>
          <MapContainer center={[me.lat, me.lng]} zoom={hasGps ? 11 : 4} className="h-full w-full" zoomControl={false}>
            <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <RecenterMap center={[me.lat, me.lng]} zoom={hasGps ? 11 : 4} />
            <FlyToTarget target={flyTarget} />

            {hasGps && (
              <>
                <Circle center={[me.lat, me.lng]} radius={radius * 1000} pathOptions={{ color: '#aa3bff', fillOpacity: 0.06, weight: 1 }} />
                <CircleMarker center={[me.lat, me.lng]} radius={7} pathOptions={{ color: '#fff', weight: 2, fillColor: '#ef4444', fillOpacity: 1 }}>
                  <Popup>You are here</Popup>
                </CircleMarker>
              </>
            )}

            {located.map((c) => {
              const w = warmthOf(c.last_interaction)
              return (
                <CircleMarker
                  key={`${c.id}-${c.addrIdx}`}
                  center={[c.lat, c.lng]}
                  radius={8}
                  pathOptions={{
                    color: inRadius(c.dist) ? '#aa3bff' : '#fff',
                    weight: 2,
                    fillColor: WARMTH_COLORS[w],
                    fillOpacity: 1,
                  }}
                >
                  <Popup>
                    <div className="flex items-center gap-2">
                      {c.photo_url && <img src={c.photo_url} alt="" className="size-8 rounded-full object-cover" />}
                      <div>
                        <strong>{c.name}</strong>
                        <span className="ml-1.5 inline-block size-2 rounded-full" style={{ backgroundColor: WARMTH_COLORS[w] }} />
                      </div>
                    </div>
                    {c.addressLabel && <div className="text-xs text-gray-400">{c.addressLabel}</div>}
                    {(c.role || c.addressCity) && <div>{[c.role, c.addressCity].filter(Boolean).join(' · ')}</div>}
                    {c.tags?.length > 0 && <div className="mt-1 text-violet-600">{c.tags.join(', ')}</div>}
                    {hasGps && <div className="mt-1 text-gray-500">{c.dist.toFixed(1)} km away</div>}
                    <Link to={`/contact/${c.id}`} className="mt-1 block text-sm font-medium text-violet-600">View profile →</Link>
                  </Popup>
                </CircleMarker>
              )
            })}
          </MapContainer>
        </div>

        {/* Distance-sorted list */}
        <div className="rounded-[28px] border border-gray-200 bg-white p-3 shadow-sm lg:min-h-[78vh] lg:overflow-hidden">
          <div className="mb-3 flex items-center justify-between gap-3 px-1 pt-1">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-gray-500">Distance list</h2>
              <p className="text-sm text-gray-400">Sorted nearest first</p>
            </div>
            {hasGps && <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700">Within radius highlighted</span>}
          </div>
          <ul className="flex max-h-[40vh] flex-col gap-2 overflow-y-auto pr-1 lg:max-h-[calc(76vh-5rem)]">
            {located.map((c) => {
              const w = warmthOf(c.last_interaction)
              return (
                <li key={`${c.id}-${c.addrIdx}`}>
                  <button
                    type="button"
                    onClick={() => setFlyTarget({ lat: c.lat, lng: c.lng })}
                    className="card flex w-full items-center gap-3 p-3 text-left"
                  >
                    <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: WARMTH_COLORS[w] }} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">
                        {c.name}
                        {c.addressLabel && <span className="ml-1.5 text-xs font-normal text-gray-400">({c.addressLabel})</span>}
                      </p>
                      <p className="truncate text-sm text-gray-500">{[c.role, c.addressCity].filter(Boolean).join(' · ')}</p>
                    </div>
                    {hasGps && <span className="shrink-0 text-sm tabular-nums text-gray-400">{c.dist.toFixed(1)} km</span>}
                  </button>
                  <Link to={`/contact/${c.id}`} className="mt-1 block px-3 text-xs font-medium text-violet-600 hover:text-violet-700">
                    View profile →
                  </Link>
                </li>
              )
            })}
            {located.length === 0 && (
              <p className="rounded-2xl border border-dashed border-gray-200 px-4 py-10 text-center text-gray-400">
                No contacts have a location yet. Add a city to a contact to map them.
              </p>
            )}
          </ul>
        </div>
      </div>
    </div>
  )
}
