import { warmthOf } from '../lib/warmth'

const style = {
  hot: 'bg-green-100 text-green-700',
  warm: 'bg-amber-100 text-amber-700',
  cold: 'bg-gray-100 text-gray-500',
}
const label = { hot: 'Hot', warm: 'Warm', cold: 'Cold' }

export default function WarmthBadge({ lastInteraction, className = '' }) {
  const s = warmthOf(lastInteraction)
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${style[s]} ${className}`}>
      {label[s]}
    </span>
  )
}
