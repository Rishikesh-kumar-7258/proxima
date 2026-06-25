import { useEffect, useRef, useState } from 'react'
import { searchPlaces } from '../lib/geocode'

export default function PlaceAutocomplete({ value, onSelect }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const timer = useRef(null)
  const wrapRef = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const search = (q) => {
    setQuery(q)
    setOpen(true)
    clearTimeout(timer.current)
    if (q.trim().length < 2) { setResults([]); return }
    setLoading(true)
    timer.current = setTimeout(async () => {
      const places = await searchPlaces(q)
      setResults(places)
      setLoading(false)
    }, 350)
  }

  const pick = (place) => {
    setQuery('')
    setResults([])
    setOpen(false)
    onSelect(place)
  }

  const display = value
    ? [value.city, value.state, value.country].filter(Boolean).join(', ')
    : ''

  return (
    <div ref={wrapRef} className="relative flex-1">
      {value?.city ? (
        <div className="flex items-center gap-2">
          <span className="input flex flex-1 items-center truncate text-sm">{display}</span>
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="text-xs font-medium text-gray-400 hover:text-red-500"
          >
            Clear
          </button>
        </div>
      ) : (
        <>
          <input
            type="text"
            value={query}
            onChange={(e) => search(e.target.value)}
            onFocus={() => results.length > 0 && setOpen(true)}
            placeholder="Search a place..."
            className="input w-full"
          />
          {open && (results.length > 0 || loading) && (
            <ul className="absolute inset-x-0 top-full z-20 mt-1 max-h-52 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
              {loading && results.length === 0 && (
                <li className="px-3 py-2 text-sm text-gray-400">Searching...</li>
              )}
              {results.map((place, i) => {
                const parts = [place.city, place.state, place.country].filter(Boolean)
                return (
                  <li key={i}>
                    <button
                      type="button"
                      onClick={() => pick(place)}
                      className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-violet-50"
                    >
                      <span className="mt-0.5 shrink-0 text-gray-400">📍</span>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900">{parts[0] || place.displayName.split(',')[0]}</p>
                        {parts.length > 1 && (
                          <p className="truncate text-xs text-gray-500">{parts.slice(1).join(', ')}</p>
                        )}
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
