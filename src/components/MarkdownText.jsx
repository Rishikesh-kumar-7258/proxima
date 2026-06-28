import { useMemo } from 'react'

const LINK = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g
const BOLD = /\*\*(.+?)\*\*/g
const ITALIC = /(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g
const ITALIC_U = /_(.+?)_/g

function renderInline(text, key) {
  const tokens = []
  let src = text

  // Extract links first
  const parts = []
  let last = 0
  for (const m of src.matchAll(LINK)) {
    if (m.index > last) parts.push({ type: 'text', value: src.slice(last, m.index) })
    parts.push({ type: 'link', text: m[1], href: m[2] })
    last = m.index + m[0].length
  }
  if (last < src.length) parts.push({ type: 'text', value: src.slice(last) })

  for (let i = 0; i < parts.length; i++) {
    const p = parts[i]
    if (p.type === 'link') {
      tokens.push(
        <a key={`${key}-l${i}`} href={p.href} target="_blank" rel="noopener noreferrer"
          className="text-violet-600 underline decoration-violet-300 hover:text-violet-800">
          {p.text}
        </a>
      )
    } else {
      tokens.push(...renderFormatting(p.value, `${key}-t${i}`))
    }
  }
  return tokens
}

function renderFormatting(text, key) {
  // Bold then italic passes
  const result = []
  let src = text
  let last = 0
  const boldParts = []

  for (const m of src.matchAll(BOLD)) {
    if (m.index > last) boldParts.push({ type: 'text', value: src.slice(last, m.index) })
    boldParts.push({ type: 'bold', value: m[1] })
    last = m.index + m[0].length
  }
  if (last < src.length) boldParts.push({ type: 'text', value: src.slice(last) })

  for (let i = 0; i < boldParts.length; i++) {
    const p = boldParts[i]
    if (p.type === 'bold') {
      result.push(<strong key={`${key}-b${i}`}>{renderItalic(p.value, `${key}-b${i}`)}</strong>)
    } else {
      result.push(...renderItalic(p.value, `${key}-p${i}`))
    }
  }
  return result
}

function renderItalic(text, key) {
  const result = []
  let src = text
  let last = 0

  const combined = new RegExp(`${ITALIC.source}|${ITALIC_U.source}`, 'g')
  for (const m of src.matchAll(combined)) {
    if (m.index > last) result.push(src.slice(last, m.index))
    const content = m[1] ?? m[2]
    result.push(<em key={`${key}-i${m.index}`}>{content}</em>)
    last = m.index + m[0].length
  }
  if (last < src.length) result.push(src.slice(last))
  if (result.length === 0) result.push(text)
  return result
}

export default function MarkdownText({ children }) {
  const rendered = useMemo(() => {
    if (!children) return null
    const lines = String(children).split('\n')
    return lines.map((line, i) => (
      <span key={i}>
        {renderInline(line, i)}
        {i < lines.length - 1 && <br />}
      </span>
    ))
  }, [children])

  return <>{rendered}</>
}
