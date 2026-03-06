import { actionMap } from '../data/actionCatalog.js'

export default function Knob({ knob, onClick, isSelected }) {
  const label = actionMap[knob.action]?.label ?? 'Unassigned'
  const isAssigned = knob.action !== 'none'
  const selectedRing = isSelected
    ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-950'
    : ''

  return (
    <button
      onClick={() => onClick(knob)}
      className={`flex flex-col items-center gap-1 cursor-pointer group w-20 rounded ${selectedRing} transition-all`}
    >
      {/* Rotary knob body */}
      <div
        className={`relative w-14 h-14 rounded-full bg-gray-800 border-2 ${
          isSelected ? 'border-white' : isAssigned ? 'border-gray-500' : 'border-gray-700'
        } group-hover:border-gray-400 transition-colors flex items-center justify-center`}
      >
        {/* Indicator dot at 7 o'clock (~-135deg from top) */}
        <div
          className="absolute w-1.5 h-1.5 rounded-full bg-gray-300"
          style={{
            top: '50%',
            left: '50%',
            transformOrigin: 'center center',
            transform: 'rotate(-135deg) translateY(-20px) translateX(-50%)',
          }}
        />
        {/* Inner cap */}
        <div className="w-8 h-8 rounded-full bg-gray-900 border border-gray-700 flex items-center justify-center">
          <div className="w-3 h-3 rounded-full bg-gray-800" />
        </div>
      </div>

      <span className="text-gray-400 text-xs font-mono">{knob.id}</span>
      <span className="text-gray-600 text-xs font-mono">CC{knob.cc}</span>
      <span
        className={`text-xs font-mono text-center w-full truncate leading-tight ${
          isAssigned ? 'text-gray-200' : 'text-gray-700'
        }`}
      >
        {label}
      </span>
    </button>
  )
}
