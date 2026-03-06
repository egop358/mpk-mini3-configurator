import { actionMap } from '../data/actionCatalog.js'

// ---------------------------------------------------------------------------
// Module dependency analysis
// ---------------------------------------------------------------------------

/**
 * Determines which FL Studio Python modules the config actually needs.
 * Always includes `channels` (used by joystick pitch) and `ui` (used by OnInit
 * hint message and window actions).
 */
function collectModules(config) {
  const mods = new Set(['channels', 'ui'])

  const allActions = [
    ...config.pads.bankA.map(p => p.action),
    ...config.pads.bankB.map(p => p.action),
    ...config.knobs.map(k => k.action),
  ]

  for (const id of allActions) {
    if (id.startsWith('transport.')) mods.add('transport')
    if (id.startsWith('mixer.'))     mods.add('mixer')
    if (id.startsWith('channel.'))   mods.add('channels') // already there
    if (id.startsWith('window.'))    mods.add('midi')
  }

  // transport.undo / redo / tapTempo / metronome use globalTransport + midi constants
  const needsMidi = allActions.some(id =>
    ['transport.undo', 'transport.redo', 'transport.tapTempo', 'transport.metronome']
      .includes(id)
  )
  if (needsMidi) mods.add('midi')

  // Canonical import order
  const order = ['transport', 'mixer', 'channels', 'ui', 'midi', 'general', 'playlist', 'device']
  return order.filter(m => mods.has(m))
}

// ---------------------------------------------------------------------------
// Per-action Python code snippets (indented 4 spaces for function body)
// ---------------------------------------------------------------------------

function padActionCode(actionId) {
  const entry = actionMap[actionId]
  if (!entry || actionId === 'none') return null

  switch (actionId) {
    case 'transport.play':
      return ['transport.start()']
    case 'transport.stop':
      return ['transport.stop()']
    case 'transport.record':
      return ['transport.record()']
    case 'transport.loop':
      return ['transport.setLoopMode()']
    case 'transport.undo':
      return ['transport.globalTransport(midi.FPT_Undo, 1, midi.PME_System)']
    case 'transport.redo':
      return ['transport.globalTransport(midi.FPT_Undo, -1, midi.PME_System)']
    case 'transport.tapTempo':
      return ['transport.globalTransport(midi.FPT_TapTempo, 1, midi.PME_System)']
    case 'transport.metronome':
      return ['transport.globalTransport(midi.FPT_Metronome, 1, midi.PME_System)']
    case 'channel.mute':
      return ['channels.muteChannel(channels.selectedChannel())']
    case 'channel.solo':
      return ['channels.soloChannel(channels.selectedChannel())']
    case 'window.mixer':
      return ['ui.showWindow(midi.widMixer)']
    case 'window.playlist':
      return ['ui.showWindow(midi.widPlaylist)']
    case 'window.pianoRoll':
      return ['ui.showWindow(midi.widPianoRoll)']
    case 'window.channelRack':
      return ['ui.showWindow(midi.widChannelRack)']
    default:
      if (actionId.startsWith('mixer.mute.')) {
        return [`mixer.muteTrack(${entry.trackIndex})`]
      }
      if (actionId.startsWith('mixer.solo.')) {
        return [`mixer.soloTrack(${entry.trackIndex})`]
      }
      if (actionId.startsWith('mixer.arm.')) {
        return [`mixer.armTrack(${entry.trackIndex})`]
      }
      return null
  }
}

function knobActionCode(actionId, ccVar = 'val') {
  const entry = actionMap[actionId]
  if (!entry || actionId === 'none') return null

  switch (true) {
    case actionId.startsWith('mixer.volume.'):
      return [`mixer.setTrackVolume(${entry.trackIndex}, ${ccVar} / 127.0)`]
    case actionId.startsWith('mixer.pan.'):
      // center (64) → 0.0, full CCW (0) → -1.0, full CW (127) → 1.0
      return [`mixer.setTrackPan(${entry.trackIndex}, (${ccVar} / 127.0) * 2.0 - 1.0)`]
    case actionId === 'channel.volume':
      return [`channels.setChannelVolume(channels.selectedChannel(), ${ccVar} / 127.0)`]
    case actionId === 'channel.pan':
      return [`channels.setChannelPan(channels.selectedChannel(), (${ccVar} / 127.0) * 2.0 - 1.0)`]
    default:
      return null
  }
}

// ---------------------------------------------------------------------------
// Section builders
// ---------------------------------------------------------------------------

function buildImports(modules) {
  return modules.map(m => `import ${m}`).join('\n')
}

function buildOnInit(deviceName) {
  return [
    'def OnInit():',
    `    ui.setHintMsg("${deviceName} loaded")`,
  ].join('\n')
}

function buildOnNoteOn(config) {
  const lines = ['def OnNoteOn(event):']
  lines.push('    # Ignore keybed — pads only transmit on MIDI channel 10 (index 9)')
  lines.push('    if event.midiChan != 9:')
  lines.push('        return')
  lines.push('    note = event.note')
  lines.push('')

  const allPads = [
    ...config.pads.bankA.map(p => ({ ...p, bank: 'A' })),
    ...config.pads.bankB.map(p => ({ ...p, bank: 'B' })),
  ]

  let firstCondition = true

  for (const pad of allPads) {
    const keyword = firstCondition ? 'if' : 'elif'
    const codeLines = padActionCode(pad.action)

    if (!codeLines) {
      // Unassigned — emit a commented-out branch so the script stays readable
      lines.push(`    ${keyword} note == ${pad.note}:  # Pad ${pad.id} — Unassigned`)
      lines.push('        pass')
    } else {
      lines.push(`    ${keyword} note == ${pad.note}:  # Pad ${pad.id} — ${actionMap[pad.action]?.label ?? pad.action}`)
      for (const cl of codeLines) {
        lines.push(`        ${cl}`)
      }
      lines.push('        event.handled = True')
    }

    firstCondition = false
  }

  return lines.join('\n')
}

function buildOnNoteOff(config) {
  // Mark all pad NoteOff events as handled to prevent FL Studio double-firing.
  // We don't need per-pad logic here; just filter by channel.
  return [
    'def OnNoteOff(event):',
    '    if event.midiChan == 9:',
    '        event.handled = True',
  ].join('\n')
}

function buildOnControlChange(config) {
  const lines = ['def OnControlChange(event):']
  lines.push('    cc  = event.controlNum')
  lines.push('    val = event.controlVal')
  lines.push('')

  // Joystick — always present, hardcoded CCs
  lines.push('    # Joystick X (CC 80) — Pitch')
  lines.push('    if cc == 80:')
  lines.push('        # Normalize: center (64) → 0.0, min (0) → -1.0, max (127) → 1.0')
  lines.push('        pitch = (val / 127.0) * 2.0 - 1.0')
  lines.push('        channels.setChannelPitch(channels.selectedChannel(), pitch)')
  lines.push('        event.handled = True')
  lines.push('')
  lines.push('    # Joystick Y (CC 81) — Modulation (re-mapped to CC 1)')
  lines.push('    elif cc == 81:')
  lines.push('        # Re-dispatch as standard CC 1 so FL Studio treats it as modulation')
  lines.push('        import device')
  lines.push('        device.dispatch(0, 0xB0 | (1 << 8) | (val << 16))')
  lines.push('        event.handled = True')
  lines.push('')

  // Knobs
  let firstKnob = true
  for (const knob of config.knobs) {
    const codeLines = knobActionCode(knob.action)
    const keyword = firstKnob ? 'elif' : 'elif'
    const label = actionMap[knob.action]?.label ?? 'Unassigned'

    lines.push(`    ${keyword} cc == ${knob.cc}:  # ${knob.id} — ${label}`)

    if (!codeLines) {
      lines.push('        pass')
    } else {
      for (const cl of codeLines) {
        lines.push(`        ${cl}`)
      }
      lines.push('        event.handled = True')
    }

    firstKnob = false
    lines.push('')
  }

  return lines.join('\n')
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generates a complete FL Studio MIDI script (.py) from a config object.
 *
 * @param {object} config  App state config (see schema in project context)
 * @returns {string}       Full Python script as a string
 */
export function generateScript(config) {
  const modules = collectModules(config)
  const deviceName = config.deviceName || 'MPK Mini 3'

  const sections = [
    `# name=${deviceName}`,
    '# Generated by MPK Mini 3 Configurator',
    '# https://github.com/egop358/mpk-mini3-configurator',
    '# Hand-edit freely — the structure is intentionally readable.',
    '',
    buildImports(modules),
    '',
    '',
    buildOnInit(deviceName),
    '',
    '',
    buildOnNoteOn(config),
    '',
    '',
    buildOnNoteOff(config),
    '',
    '',
    buildOnControlChange(config),
  ]

  return sections.join('\n')
}

/**
 * Triggers a browser download of the generated script.
 *
 * @param {object} config  App state config
 */
export function downloadScript(config) {
  const script = generateScript(config)
  const deviceName = (config.deviceName || 'MPK Mini 3')
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_-]/g, '')

  const blob = new Blob([script], { type: 'text/plain' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `device_${deviceName}.py`
  a.click()
  URL.revokeObjectURL(url)
}
