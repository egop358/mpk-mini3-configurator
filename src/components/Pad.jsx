import { actionMap } from '../data/actionCatalog.js'

// Statically defined so Tailwind JIT includes these classes at build time
const CATEGORY_STYLES = {
  transport: 'border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.55)]',
  mixer:     'border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.55)]',
  channel:   'border-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.55)]',
  window:    'border-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.55)]',
  none:      'border-gray-700',
}

function getCategory(actionId) {
  if (!actionId || actionId === 'none') return 'none'
  return actionId.split('.')[0]
}

export default function Pad({ pad, onClick, isSelected }) {
  const cat = getCategory(pad.action)
  const glowClass = CATEGORY_STYLES[cat] ?? CATEGORY_STYLES.none
  const label = actionMap[pad.action]?.label ?? 'Unassigned'
  const isAssigned = pad.action !== 'none'
  const selectedRing = isSelected
    ? 'ring-2 ring-white ring-offset-1 ring-offset-gray-950'
    : ''

  return (
    <button
      onClick={() => onClick(pad)}
      className={`w-20 h-20 bg-gray-800 border-2 ${glowClass} ${selectedRing} rounded flex flex-col items-center justify-between p-1.5 hover:bg-gray-700 transition-colors cursor-pointer`}
    >
      <span className="text-gray-500 text-xs self-start font-mono leading-none">{pad.id}</span>
      <span className={`text-xs text-center font-mono leading-tight px-0.5 ${isAssigned ? 'text-white' : 'text-gray-600'}`}>
        {label}
      </span>
      <span className="text-gray-700 text-xs font-mono leading-none">N{pad.note}</span>
    </button>
  )
}
