import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Pad from './components/Pad.jsx'
import Knob from './components/Knob.jsx'
import AssignmentPanel from './components/AssignmentPanel.jsx'
import ScriptPreview from './components/ScriptPreview.jsx'
import { downloadZip } from './lib/codeGenerator.js'

// ---------------------------------------------------------------------------
// Default configuration — deviceName is hardcoded in codeGenerator.js
// ---------------------------------------------------------------------------

const DEFAULT_CONFIG = {
  pads: {
    bankA: [
      { id: 'A1', note: 16, action: 'transport.play',   label: 'Play / Pause' },
      { id: 'A2', note: 17, action: 'transport.stop',   label: 'Stop'         },
      { id: 'A3', note: 18, action: 'transport.record', label: 'Record'       },
      { id: 'A4', note: 19, action: 'transport.loop',   label: 'Toggle Loop'  },
      { id: 'A5', note: 20, action: 'none',             label: 'Unassigned'   },
      { id: 'A6', note: 21, action: 'none',             label: 'Unassigned'   },
      { id: 'A7', note: 22, action: 'none',             label: 'Unassigned'   },
      { id: 'A8', note: 23, action: 'none',             label: 'Unassigned'   },
    ],
    bankB: [
      { id: 'B1', note: 32, action: 'none', label: 'Unassigned' },
      { id: 'B2', note: 33, action: 'none', label: 'Unassigned' },
      { id: 'B3', note: 34, action: 'none', label: 'Unassigned' },
      { id: 'B4', note: 35, action: 'none', label: 'Unassigned' },
      { id: 'B5', note: 36, action: 'none', label: 'Unassigned' },
      { id: 'B6', note: 37, action: 'none', label: 'Unassigned' },
      { id: 'B7', note: 38, action: 'none', label: 'Unassigned' },
      { id: 'B8', note: 39, action: 'none', label: 'Unassigned' },
    ],
  },
  knobs: [
    { id: 'K1', cc: 16, action: 'mixer.volume.0', label: 'Master Vol'  },
    { id: 'K2', cc: 17, action: 'mixer.volume.1', label: 'Track 1 Vol' },
    { id: 'K3', cc: 18, action: 'mixer.volume.2', label: 'Track 2 Vol' },
    { id: 'K4', cc: 19, action: 'mixer.volume.3', label: 'Track 3 Vol' },
    { id: 'K5', cc: 20, action: 'none',           label: 'Unassigned'  },
    { id: 'K6', cc: 21, action: 'none',           label: 'Unassigned'  },
    { id: 'K7', cc: 22, action: 'none',           label: 'Unassigned'  },
    { id: 'K8', cc: 23, action: 'none',           label: 'Unassigned'  },
  ],
  joystick: {
    x: { cc: 80, action: 'pitch'      },
    y: { cc: 81, action: 'modulation' },
  },
}

// ---------------------------------------------------------------------------
// 25-key visual keyboard (C2–C4, SVG)
// ---------------------------------------------------------------------------

function Keyboard() {
  const WHITE_NOTES      = [0, 2, 4, 5, 7, 9, 11]
  const HAS_BLACK_AFTER  = new Set([0, 2, 5, 7, 9])
  const keyW = 28, keyH = 80, blackW = 17, blackH = 52

  const whiteKeys = [], blackKeys = []

  for (let octave = 0; octave < 2; octave++) {
    WHITE_NOTES.forEach((note, wi) => {
      const x = (octave * 7 + wi) * keyW
      whiteKeys.push({ x })
      if (HAS_BLACK_AFTER.has(note)) {
        blackKeys.push({ x: x + keyW - blackW / 2 })
      }
    })
  }
  whiteKeys.push({ x: 14 * keyW })

  const totalW = 15 * keyW

  return (
    <div className="overflow-x-auto">
      <svg width={totalW} height={keyH + 4} className="mx-auto block" style={{ minWidth: totalW }}>
        {whiteKeys.map((k, i) => (
          <rect key={`w${i}`} x={k.x + 1} y={2} width={keyW - 2} height={keyH} rx={2}
            fill="#d8d8d8" stroke="#555" strokeWidth={1} />
        ))}
        {blackKeys.map((k, i) => (
          <rect key={`b${i}`} x={k.x} y={2} width={blackW} height={blackH} rx={2}
            fill="#1a1a1a" stroke="#000" strokeWidth={1} />
        ))}
      </svg>
    </div>
  )
}

// ---------------------------------------------------------------------------
// PadGrid
// Physical layout: top row = pads[4..7], bottom row = pads[0..3]
// ---------------------------------------------------------------------------

function PadGrid({ pads, bank, selectedId, onPadClick }) {
  const borderColor = bank === 'A' ? 'border-red-900'   : 'border-green-900'
  const labelColor  = bank === 'A' ? 'text-red-600'     : 'text-green-600'

  return (
    <div className={`border ${borderColor} rounded p-2`}>
      <div className={`text-xs font-mono ${labelColor} mb-2 text-center uppercase tracking-widest select-none`}>
        Bank {bank}
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          {pads.slice(4, 8).map(p => (
            <Pad key={p.id} pad={p} onClick={onPadClick} isSelected={selectedId === p.id} />
          ))}
        </div>
        <div className="flex gap-2">
          {pads.slice(0, 4).map(p => (
            <Pad key={p.id} pad={p} onClick={onPadClick} isSelected={selectedId === p.id} />
          ))}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Install instructions modal
// ---------------------------------------------------------------------------

function InstallModal({ onClose }) {
  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 border border-gray-700 rounded-xl max-w-lg w-full p-6 flex flex-col gap-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-white font-mono font-bold text-sm uppercase tracking-wider">
            Install Instructions
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-lg leading-none">✕</button>
        </div>

        <ol className="flex flex-col gap-4 text-xs font-mono text-gray-300 leading-relaxed">
          <li>
            <span className="text-white font-bold">Step 1 —</span> Download the zip file.
            Inside you'll find two files: <span className="text-gray-100">device_MPKMini3.py</span> and{' '}
            <span className="text-gray-100">AkaiTemplate.mpkmini3</span>. Do NOT rename them.
          </li>
          <li>
            <span className="text-white font-bold">Step 2 —</span> Place the entire folder
            (containing both files) into:
            <div className="mt-1 bg-gray-800 rounded px-3 py-2 text-gray-200 break-all">
              Documents\Image-Line\FL Studio\Settings\Hardware\
            </div>
          </li>
          <li>
            <span className="text-white font-bold">Step 3 —</span> Load the template into the MPK Mini Editor:
            <ul className="mt-1.5 flex flex-col gap-1 pl-3 text-gray-400">
              <li>— Download the Akai MPK Mini III Editor from akaipro.com if you haven't already</li>
              <li>— Open the editor, click <span className="text-gray-200">File &gt; Open Program</span></li>
              <li>— Select <span className="text-gray-200">AkaiTemplate.mpkmini3</span></li>
              <li>— Click <span className="text-gray-200">"Send to Program"</span> to send it to one of the 4 program slots on your keyboard</li>
              <li>— On the keyboard, press the <span className="text-gray-200">PROG SELECT</span> button and choose that program slot</li>
            </ul>
          </li>
          <li>
            <span className="text-white font-bold">Step 4 —</span> In FL Studio:
            <div className="mt-1 text-gray-400">
              Go to <span className="text-gray-200">Options &gt; MIDI Settings</span>, find your MPK Mini 3,
              and set the controller script to <span className="text-gray-200">"MPK_Mini_3"</span>.
            </div>
          </li>
        </ol>

        <button
          onClick={onClose}
          className="mt-2 w-full py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-mono rounded border border-gray-700 transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

export default function App() {
  const navigate = useNavigate()

  const [config, setConfig]             = useState(DEFAULT_CONFIG)
  const [activeBank, setActiveBank]     = useState('A')
  const [selected, setSelected]         = useState(null)   // { control, type } | null
  const [showInstall, setShowInstall]   = useState(false)
  const [downloading, setDownloading]   = useState(false)

  // --- Selection ---

  function handlePadClick(pad) {
    setSelected(prev =>
      prev?.control.id === pad.id && prev?.type === 'pad' ? null : { control: pad, type: 'pad' }
    )
  }

  function handleKnobClick(knob) {
    setSelected(prev =>
      prev?.control.id === knob.id && prev?.type === 'knob' ? null : { control: knob, type: 'knob' }
    )
  }

  // --- Assignment from sidebar ---

  function handleAssign(controlId, type, actionId) {
    if (type === 'pad') {
      const bank = controlId.startsWith('A') ? 'bankA' : 'bankB'
      setConfig(prev => {
        const updated = prev.pads[bank].map(p =>
          p.id === controlId ? { ...p, action: actionId, label: actionId } : p
        )
        // Keep selected control in sync with updated state
        if (selected?.control.id === controlId) {
          setSelected({ control: updated.find(p => p.id === controlId), type: 'pad' })
        }
        return { ...prev, pads: { ...prev.pads, [bank]: updated } }
      })
    } else {
      setConfig(prev => {
        const updated = prev.knobs.map(k =>
          k.id === controlId ? { ...k, action: actionId, label: actionId } : k
        )
        if (selected?.control.id === controlId) {
          setSelected({ control: updated.find(k => k.id === controlId), type: 'knob' })
        }
        return { ...prev, knobs: updated }
      })
    }
  }

  // --- Download ---

  async function handleDownload() {
    setDownloading(true)
    try {
      await downloadZip(config)
      setShowInstall(true)
    } catch (err) {
      alert(`Download failed: ${err.message}`)
    } finally {
      setDownloading(false)
    }
  }

  const selectedId = selected?.control.id ?? null

  return (
    <div className="min-h-screen bg-gray-950 text-white font-mono flex flex-col">

      {/* ------------------------------------------------------------------ */}
      {/* Header                                                              */}
      {/* ------------------------------------------------------------------ */}
      <header className="border-b border-gray-800 bg-gray-900 px-6 py-3 flex items-center gap-4">
        <button
          onClick={() => navigate('/')}
          className="text-gray-600 hover:text-gray-300 text-xs transition-colors"
        >
          ← Home
        </button>
        <h1 className="text-red-500 font-bold text-sm uppercase tracking-widest">
          MPK Mini 3 Configurator
        </h1>
      </header>

      {/* ------------------------------------------------------------------ */}
      {/* Body: hardware panel + sidebar                                      */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left / main column */}
        <div className="flex-1 overflow-y-auto flex flex-col gap-5 p-6">

          {/* Hardware panel */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex flex-col gap-4">

            {/* Pads + Knobs row */}
            <div className="flex gap-6 items-start flex-wrap">

              {/* Pad section */}
              <div className="flex flex-col gap-3">
                {/* Bank toggle */}
                <div className="flex gap-1">
                  {['A', 'B', 'both'].map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveBank(tab)}
                      className={`px-3 py-1 text-xs rounded uppercase tracking-wider transition-colors ${
                        activeBank === tab
                          ? 'bg-red-600 text-white'
                          : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                      }`}
                    >
                      {tab === 'both' ? 'A + B' : `Bank ${tab}`}
                    </button>
                  ))}
                </div>

                {(activeBank === 'A' || activeBank === 'both') && (
                  <PadGrid
                    pads={config.pads.bankA}
                    bank="A"
                    selectedId={selectedId}
                    onPadClick={handlePadClick}
                  />
                )}
                {(activeBank === 'B' || activeBank === 'both') && (
                  <PadGrid
                    pads={config.pads.bankB}
                    bank="B"
                    selectedId={selectedId}
                    onPadClick={handlePadClick}
                  />
                )}
              </div>

              {/* Divider */}
              <div className="w-px bg-gray-800 self-stretch hidden sm:block" />

              {/* Knobs section */}
              <div className="flex flex-col gap-2">
                <div className="text-gray-600 text-xs uppercase tracking-widest mb-1 text-center">Knobs</div>
                <div className="flex gap-4">
                  {config.knobs.slice(0, 4).map(k => (
                    <Knob key={k.id} knob={k} onClick={handleKnobClick} isSelected={selectedId === k.id} />
                  ))}
                </div>
                <div className="flex gap-4">
                  {config.knobs.slice(4, 8).map(k => (
                    <Knob key={k.id} knob={k} onClick={handleKnobClick} isSelected={selectedId === k.id} />
                  ))}
                </div>
              </div>

              {/* Joystick indicator */}
              <div className="flex flex-col items-center gap-1 self-center">
                <div className="text-gray-600 text-xs uppercase tracking-widest">Joy</div>
                <div className="w-10 h-10 rounded border border-gray-700 bg-gray-800 flex items-center justify-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-gray-600" />
                </div>
                <div className="text-gray-700 text-xs text-center">Pitch<br/>/ Mod</div>
              </div>
            </div>

            {/* Keyboard — integrated into hardware panel */}
            <div className="border-t border-gray-800 pt-4">
              <div className="text-gray-600 text-xs uppercase tracking-widest mb-3 text-center select-none">
                25-Key Keyboard — Channel 1 (Pass-through)
              </div>
              <Keyboard />
            </div>
          </div>

          {/* Script preview */}
          <ScriptPreview config={config} />

          {/* Download button */}
          <button
            onClick={handleDownload}
            disabled={downloading}
            className={`w-full py-4 text-sm font-bold uppercase tracking-widest rounded-xl transition-colors ${
              downloading
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-red-600 hover:bg-red-500 text-white shadow-[0_0_24px_rgba(239,68,68,0.3)] hover:shadow-[0_0_32px_rgba(239,68,68,0.5)]'
            }`}
          >
            {downloading ? 'Preparing Download...' : 'Download Script (ZIP)'}
          </button>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Right sidebar — Assignment panel                                 */}
        {/* ---------------------------------------------------------------- */}
        <aside className="w-64 shrink-0 border-l border-gray-800 bg-gray-900 flex flex-col">
          <div className="px-4 py-3 border-b border-gray-800">
            <span className="text-gray-500 text-xs uppercase tracking-wider">Assignment</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            <AssignmentPanel selected={selected} onAssign={handleAssign} />
          </div>
        </aside>
      </div>

      {/* Install instructions modal */}
      {showInstall && <InstallModal onClose={() => setShowInstall(false)} />}
    </div>
  )
}
