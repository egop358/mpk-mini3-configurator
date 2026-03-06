/**
 * Action catalog for the MPK Mini 3 Configurator.
 *
 * Each entry has:
 *   id         — unique key used in app state and code generator
 *   label      — human-readable name shown in the UI
 *   type       — 'pad' | 'knob' | 'both' (what kind of control can use it)
 *   trackIndex — (optional) mixer track index embedded in the action
 *
 * Categories is the structured list used for building dropdowns in the UI.
 */

// ---------------------------------------------------------------------------
// Helpers to generate repetitive mixer entries
// ---------------------------------------------------------------------------

function mixerVolumeEntries() {
  const entries = [
    { id: 'mixer.volume.0', label: 'Master Volume', type: 'knob', trackIndex: 0 },
  ]
  for (let i = 1; i <= 8; i++) {
    entries.push({ id: `mixer.volume.${i}`, label: `Track ${i} Volume`, type: 'knob', trackIndex: i })
  }
  return entries
}

function mixerPanEntries() {
  const entries = [
    { id: 'mixer.pan.0', label: 'Master Pan', type: 'knob', trackIndex: 0 },
  ]
  for (let i = 1; i <= 8; i++) {
    entries.push({ id: `mixer.pan.${i}`, label: `Track ${i} Pan`, type: 'knob', trackIndex: i })
  }
  return entries
}

function mixerMuteEntries() {
  return Array.from({ length: 8 }, (_, i) => ({
    id: `mixer.mute.${i + 1}`,
    label: `Mute Track ${i + 1}`,
    type: 'pad',
    trackIndex: i + 1,
  }))
}

function mixerSoloEntries() {
  return Array.from({ length: 8 }, (_, i) => ({
    id: `mixer.solo.${i + 1}`,
    label: `Solo Track ${i + 1}`,
    type: 'pad',
    trackIndex: i + 1,
  }))
}

function mixerArmEntries() {
  return Array.from({ length: 8 }, (_, i) => ({
    id: `mixer.arm.${i + 1}`,
    label: `Arm Track ${i + 1}`,
    type: 'pad',
    trackIndex: i + 1,
  }))
}

// ---------------------------------------------------------------------------
// Categorized catalog (used for building dropdowns)
// ---------------------------------------------------------------------------

export const actionCategories = [
  {
    category: 'None',
    actions: [
      { id: 'none', label: 'Unassigned', type: 'both' },
    ],
  },
  {
    category: 'Transport',
    actions: [
      { id: 'transport.play',       label: 'Play / Pause',      type: 'pad' },
      { id: 'transport.stop',       label: 'Stop',              type: 'pad' },
      { id: 'transport.record',     label: 'Record',            type: 'pad' },
      { id: 'transport.loop',       label: 'Toggle Loop',       type: 'pad' },
      { id: 'transport.undo',       label: 'Undo',              type: 'pad' },
      { id: 'transport.redo',       label: 'Redo',              type: 'pad' },
      { id: 'transport.tapTempo',   label: 'Tap Tempo',         type: 'pad' },
      { id: 'transport.metronome',  label: 'Toggle Metronome',  type: 'pad' },
    ],
  },
  {
    category: 'Mixer — Volume',
    actions: mixerVolumeEntries(),
  },
  {
    category: 'Mixer — Pan',
    actions: mixerPanEntries(),
  },
  {
    category: 'Mixer — Mute',
    actions: mixerMuteEntries(),
  },
  {
    category: 'Mixer — Solo',
    actions: mixerSoloEntries(),
  },
  {
    category: 'Mixer — Arm',
    actions: mixerArmEntries(),
  },
  {
    category: 'Channel Rack',
    actions: [
      { id: 'channel.volume',  label: 'Selected Channel Volume', type: 'knob' },
      { id: 'channel.pan',     label: 'Selected Channel Pan',    type: 'knob' },
      { id: 'channel.mute',    label: 'Mute Selected Channel',   type: 'pad'  },
      { id: 'channel.solo',    label: 'Solo Selected Channel',   type: 'pad'  },
    ],
  },
  {
    category: 'Windows',
    actions: [
      { id: 'window.mixer',       label: 'Toggle Mixer',        type: 'pad' },
      { id: 'window.playlist',    label: 'Toggle Playlist',     type: 'pad' },
      { id: 'window.pianoRoll',   label: 'Toggle Piano Roll',   type: 'pad' },
      { id: 'window.channelRack', label: 'Toggle Channel Rack', type: 'pad' },
    ],
  },
]

// ---------------------------------------------------------------------------
// Flat map: id → entry  (used by code generator for O(1) lookup)
// ---------------------------------------------------------------------------

export const actionMap = Object.fromEntries(
  actionCategories.flatMap(cat => cat.actions).map(a => [a.id, a])
)

// ---------------------------------------------------------------------------
// Filtered helpers for the UI
// ---------------------------------------------------------------------------

/** Returns categories/actions valid for pad controls. */
export function getPadActions() {
  return actionCategories
    .map(cat => ({
      ...cat,
      actions: cat.actions.filter(a => a.type === 'pad' || a.type === 'both'),
    }))
    .filter(cat => cat.actions.length > 0)
}

/** Returns categories/actions valid for knob controls. */
export function getKnobActions() {
  return actionCategories
    .map(cat => ({
      ...cat,
      actions: cat.actions.filter(a => a.type === 'knob' || a.type === 'both'),
    }))
    .filter(cat => cat.actions.length > 0)
}
