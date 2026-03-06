import { useState, useEffect } from 'react'
import { getPadActions, getKnobActions } from '../data/actionCatalog.js'

const TRACK_INDEX_PREFIXES = [
  'mixer.volume', 'mixer.pan', 'mixer.mute', 'mixer.solo', 'mixer.arm',
]

function parseBase(actionId) {
  if (!actionId) return actionId
  const parts = actionId.split('.')
  if (parts.length >= 3) return `${parts[0]}.${parts[1]}`
  return actionId
}

function parseTrackIdx(actionId) {
  if (!actionId) return null
  const parts = actionId.split('.')
  const n = parseInt(parts[parts.length - 1], 10)
  return isNaN(n) ? null : n
}

export default function AssignmentPanel({ selected, onAssign }) {
  const [actionId, setActionId]     = useState('none')
  const [trackIndex, setTrackIndex] = useState(1)

  // Sync local state whenever the selected control changes
  useEffect(() => {
    if (selected) {
      const current = selected.control.action ?? 'none'
      setActionId(current)
      setTrackIndex(parseTrackIdx(current) ?? 1)
    }
  }, [selected?.control.id, selected?.type])

  if (!selected) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <p className="text-gray-600 text-xs font-mono text-center leading-relaxed">
          Select a pad or knob<br />to assign an action
        </p>
      </div>
    )
  }

  const { control, type } = selected
  const categories = type === 'pad' ? getPadActions() : getKnobActions()

  const base           = parseBase(actionId)
  const needsTrackIndex = TRACK_INDEX_PREFIXES.includes(base)
  const resolvedId     = needsTrackIndex ? `${base}.${trackIndex}` : actionId

  function handleActionChange(e) {
    const id = e.target.value
    const n  = parseTrackIdx(id)
    if (n !== null) setTrackIndex(n)
    setActionId(id)
  }

  function handleTrackIndexChange(e) {
    const n = Math.max(0, Math.min(99, parseInt(e.target.value, 10) || 0))
    setTrackIndex(n)
    setActionId(`${base}.${n}`)
  }

  function handleApply() {
    onAssign(control.id, type, resolvedId)
  }

  return (
    <div className="flex flex-col gap-5 p-4 h-full">
      {/* Selected control info */}
      <div className="border-b border-gray-700 pb-4">
        <div className="text-gray-500 text-xs uppercase tracking-wider mb-1">Selected</div>
        <div className="text-white font-mono font-bold text-sm">
          {type === 'pad' ? `Pad ${control.id}` : `Knob ${control.id}`}
        </div>
        {type === 'pad' && (
          <div className="text-gray-600 text-xs font-mono mt-0.5">Note {control.note}</div>
        )}
        {type === 'knob' && (
          <div className="text-gray-600 text-xs font-mono mt-0.5">CC {control.cc}</div>
        )}
      </div>

      {/* Action dropdown */}
      <div className="flex flex-col gap-1.5">
        <label className="text-gray-500 text-xs uppercase tracking-wider">Action</label>
        <select
          value={actionId}
          onChange={handleActionChange}
          className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-2 text-white text-xs font-mono focus:outline-none focus:border-gray-400"
          size={1}
        >
          {categories.map(cat => (
            <optgroup key={cat.category} label={cat.category}>
              {cat.actions.map(a => (
                <option key={a.id} value={a.id}>{a.label}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {/* Track index input — only for mixer actions */}
      {needsTrackIndex && (
        <div className="flex flex-col gap-1.5">
          <label className="text-gray-500 text-xs uppercase tracking-wider">
            Track Index
            <span className="text-gray-700 normal-case ml-1">(0 = Master)</span>
          </label>
          <input
            type="number"
            min={0}
            max={99}
            value={trackIndex}
            onChange={handleTrackIndexChange}
            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-2 text-white text-xs font-mono focus:outline-none focus:border-gray-400"
          />
        </div>
      )}

      {/* Resolved action preview */}
      <div className="text-gray-700 text-xs font-mono break-all">
        → {resolvedId}
      </div>

      {/* Apply button */}
      <button
        onClick={handleApply}
        className="mt-auto w-full py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono rounded transition-colors uppercase tracking-wider"
      >
        Apply
      </button>
    </div>
  )
}
