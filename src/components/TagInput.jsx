import { useState } from 'react'

// Minimal expertise-tag picker: type a skill, press Enter or comma to add a chip,
// click a chip (or Backspace on an empty field) to remove. No external dependency.
export default function TagInput({ value, onChange }) {
  const [draft, setDraft] = useState('')

  const add = (raw) => {
    const tag = raw.trim()
    if (tag && !value.includes(tag)) onChange([...value, tag])
    setDraft('')
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      add(draft)
    } else if (e.key === 'Backspace' && !draft) {
      onChange(value.slice(0, -1))
    }
  }

  return (
    <div className="flex min-h-12 flex-wrap items-center gap-2 rounded-xl border border-gray-200 bg-white p-2 transition focus-within:border-violet-500 focus-within:ring-2 focus-within:ring-violet-200">
      {value.map((tag) => (
        <button
          key={tag}
          type="button"
          onClick={() => onChange(value.filter((t) => t !== tag))}
          className="flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-1 text-sm leading-none text-violet-700 transition hover:bg-violet-200"
        >
          {tag}<span className="text-violet-400">×</span>
        </button>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => add(draft)} // don't lose a half-typed tag on blur
        placeholder={value.length ? 'Add another…' : 'e.g. Machine learning, Legal, Fundraising'}
        className="min-w-[8rem] flex-1 bg-transparent px-1.5 py-1.5 leading-6 outline-none"
      />
    </div>
  )
}
