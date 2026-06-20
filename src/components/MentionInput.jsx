import { useRef, useState } from 'react'

// Notion/Twitter-style @mention textarea. Detects the @token under the caret, shows a
// contact dropdown, and on pick rewrites the text + reports the chosen contact upward.
// Deterministic, offline, zero AI (spec §6.4).
export default function MentionInput({ value, onChange, contacts, onSelect }) {
  const ref = useRef(null)
  const [menu, setMenu] = useState(null) // { matches, at } | null

  const handleChange = (e) => {
    const text = e.target.value
    onChange(text)

    // Look at the word being typed right before the caret.
    const caret = e.target.selectionStart
    const at = text.slice(0, caret).lastIndexOf('@')
    const query = text.slice(at + 1, caret)
    if (at === -1 || /\s/.test(query)) return setMenu(null) // not in a mention token

    const matches = contacts
      .filter((c) => c.name.toLowerCase().startsWith(query.toLowerCase()))
      .slice(0, 6)
    setMenu(matches.length ? { matches, at } : null)
  }

  const pick = (c) => {
    const caret = ref.current.selectionStart
    const next = `${value.slice(0, menu.at)}@${c.name} ${value.slice(caret)}`
    onChange(next)
    onSelect(c)
    setMenu(null)
    ref.current.focus()
  }

  return (
    <div className="relative">
      <textarea
        ref={ref}
        value={value}
        onChange={handleChange}
        rows={3}
        placeholder="What happened today? Type @ to tag someone…"
        className="input resize-none"
      />
      {menu && (
        <ul className="absolute z-10 mt-1 w-56 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
          {menu.matches.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => pick(c)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-violet-50"
              >
                <span className="grid size-6 place-items-center rounded-full bg-violet-100 text-xs font-medium text-violet-700">
                  {c.name[0]?.toUpperCase()}
                </span>
                {c.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
