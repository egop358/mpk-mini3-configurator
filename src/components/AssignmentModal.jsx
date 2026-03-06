import { useState } from 'react'
import { getPadActions, getKnobActions, actionMap } from '../data/actionCatalog.js'

// Action ID prefixes that require a numeric track index
const TRACK_INDEX_PREFIXES = [
  'mixer.volume', 'mixer.pan', 'mixer.mute', 'mixer.solo', 'mixer.arm',
]

function parseBase(actionId) {
  if (!actionId) return actionId
  const parts = actionId.split('.')
  // mixer.volume.3 → mixer.volume
  if (parts.length >= 3) return `${parts[0]}.${parts[1]}`
  return actionId
}

function parseTrackIdx(actionId) {
  if (!actionId) return null
  const parts = actionId.split('.')
  const n = parseInt(parts[parts.length - 1], 10)
  return isNaN(n) ? null : n
}

export default function AssignmentModal({ control, type, onAssign, onClose }) {
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState(control.action ?? 'none')
  const [trackIndex, setTrackIndex] = useState(() => parseTrackIdx(control.action) ?? 1)

  const categories = type === 'pad' ? getPadActions() : getKnobActions()

  const base = parseBase(selectedId)
  const needsTrackIndex = TRACK_INDEX_PREFIXES.includes(base)
  const resolvedId = needsTrackIndex ? `${base}.${trackIndex}` : selectedId

  const filtered = search.trim()
    ? categories
        .map(cat => ({
          ...cat,
          actions: cat.actions.filter(a =>
            a.label.toLowerCase().includes(search.toLowerCase())
          ),
        }))
        .filter(cat => cat.actions.length > 0)
    : categories

  function handleActionClick(actionId) {
    const n = parseTrackIdx(actionId)
    if (n !== null) setTrackIndex(n)
    setSelectedId(actionId)
  }

  function handleTrackIndexChange(raw) {
    const n = Math.max(0, Math.min(99, parseInt(raw, 10) || 0))
    setTrackIndex(n)
    setSelectedId(`${base}.${n}`)
  }

  function handleAssign() {
    const label = actionMap[resolvedId]?.label ?? resolvedId
    onAssign(resolvedId, label)
  }

  // Determine if an entry in the list is the active selection
  function isActive(actionId) {
    if (needsTrackIndex) {
      return parseBase(actionId) === base && parseTrackIdx(actionId) === trackIndex
    }
    return actionId === selectedId
  }

  const controlLabel = type === 'pad' ? `Pad ${control.id}` : `Knob ${control.id}`

  return (
    <div
      className="fixed inset-0 bg-black/75 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 border border-gray-700 rounded-lg w-96 max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-700 shrink-0">
          <h2 className="text-white font-mono text-sm font-bold mb-2">
            Assign {controlLabel}
          </h2>
          <input
            type="text"
            placeholder="Search actions..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-1.5 text-white text-xs font-mono focus:outline-none focus:border-gray-400 placeholder-gray-600"
            autoFocus
          />
        </div>

        {/* Scrollable action list */}
        <div className="overflow-y-auto flex-1 p-2">
          {filtered.map(cat => (
            <div key={cat.category} className="mb-3">
              <div className="text-gray-500 text-xs font-mono uppercase tracking-widest px-2 py-1 select-none">
                {cat.category}
              </div>
              {cat.actions.map(action => (
                <button
                  key={action.id}
                  onClick={() => handleActionClick(action.id)}
                  className={`w-full text-left px-3 py-1.5 rounded text-xs font-mono flex items-center justify-between transition-colors ${
                    isActive(action.id)
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-800'
                  }`}
                >
                  <span>{action.label}</span>
                  {action.trackIndex !== undefined && (
                    <span className={`text-xs ${isActive(action.id) ? 'text-blue-200' : 'text-gray-600'}`}>
                      T{action.trackIndex}
                    </span>
                  )}
                </button>
              ))}
            </div>
          ))}
        </div>

        {/* Track index input — only shown for mixer actions */}
        {needsTrackIndex && (
          <div className="px-4 py-3 border-t border-gray-700 shrink-0 flex items-center gap-3">
            <span className="text-gray-400 text-xs font-mono">Track Index:</span>
            <input
              type="number"
              min={0}
              max={99}
              value={trackIndex}
              onChange={e => handleTrackIndexChange(e.target.value)}
              className="w-16 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-xs font-mono text-center focus:outline-none focus:border-gray-400"
            />
            <span className="text-gray-600 text-xs font-mono">0 = Master</span>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 border-t border-gray-700 shrink-0 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-mono rounded border border-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleAssign}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono rounded transition-colors"
          >
            Assign
          </button>
        </div>
      </div>
    </div>
  )
}
