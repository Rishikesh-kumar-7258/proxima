import { useRef, useState } from 'react'
import { BoldIcon, ItalicIcon, LinkIcon } from './icons'

export default function MentionInput({ value, onChange, contacts, onSelect, toolbar = false, rows = 3, className = '' }) {
  const ref = useRef(null)
  const [menu, setMenu] = useState(null)

  const handleChange = (e) => {
    const text = e.target.value
    onChange(text)

    const caret = e.target.selectionStart
    const at = text.slice(0, caret).lastIndexOf('@')
    const query = text.slice(at + 1, caret)
    if (at === -1 || /\s/.test(query)) return setMenu(null)

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

  const wrap = (before, after) => {
    const ta = ref.current
    if (!ta) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const selected = value.slice(start, end)
    const replacement = `${before}${selected || 'text'}${after}`
    const next = value.slice(0, start) + replacement + value.slice(end)
    onChange(next)
    requestAnimationFrame(() => {
      ta.focus()
      const cursorStart = start + before.length
      const cursorEnd = cursorStart + (selected ? selected.length : 4)
      ta.setSelectionRange(cursorStart, cursorEnd)
    })
  }

  const insertLink = () => {
    const ta = ref.current
    if (!ta) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const selected = value.slice(start, end)
    const replacement = `[${selected || 'text'}](url)`
    const next = value.slice(0, start) + replacement + value.slice(end)
    onChange(next)
    requestAnimationFrame(() => {
      ta.focus()
      const urlStart = start + (selected ? selected.length : 4) + 2
      ta.setSelectionRange(urlStart, urlStart + 3)
    })
  }

  return (
    <div className="relative">
      {toolbar && (
        <div className="mb-1.5 flex items-center gap-1">
          <button type="button" onClick={() => wrap('**', '**')} className="grid size-8 place-items-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800" title="Bold (**text**)">
            <BoldIcon className="size-4" />
          </button>
          <button type="button" onClick={() => wrap('*', '*')} className="grid size-8 place-items-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800" title="Italic (*text*)">
            <ItalicIcon className="size-4" />
          </button>
          <button type="button" onClick={insertLink} className="grid size-8 place-items-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800" title="Link [text](url)">
            <LinkIcon className="size-4" />
          </button>
          <span className="ml-auto text-[11px] text-gray-400">Markdown supported</span>
        </div>
      )}
      <textarea
        ref={ref}
        value={value}
        onChange={handleChange}
        rows={rows}
        placeholder="What happened today? Type @ to tag someone..."
        className={`input resize-y ${className}`}
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
