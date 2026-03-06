// Device name is fixed — FL Studio script names are sensitive
const DEVICE_NAME = 'MPK_Mini_3'

// ---------------------------------------------------------------------------
// Module dependency analysis
// ---------------------------------------------------------------------------

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
    if (id.startsWith('window.'))  { mods.add('midi'); mods.add('ui') }
  }

  const needsMidi = allActions.some(id =>
    ['transport.undo', 'transport.redo', 'transport.tapTempo', 'transport.metronome']
      .includes(id)
  )
  if (needsMidi) mods.add('midi')

  const order = ['transport', 'mixer', 'channels', 'ui', 'midi']
  return order.filter(m => mods.has(m))
}

// ---------------------------------------------------------------------------
// Track index helper
// ---------------------------------------------------------------------------

function parseTrackIndex(actionId) {
  const parts = actionId.split('.')
  const n = parseInt(parts[parts.length - 1], 10)
  return isNaN(n) ? null : n
}

// ---------------------------------------------------------------------------
// Per-action Python code snippets
// ---------------------------------------------------------------------------

function padActionCode(actionId) {
  if (!actionId || actionId === 'none') return null

  if (actionId.startsWith('mixer.mute.')) {
    const t = parseTrackIndex(actionId)
    return t !== null ? [`mixer.muteTrack(${t})`] : null
  }
  if (actionId.startsWith('mixer.solo.')) {
    const t = parseTrackIndex(actionId)
    return t !== null ? [`mixer.soloTrack(${t})`] : null
  }
  if (actionId.startsWith('mixer.arm.')) {
    const t = parseTrackIndex(actionId)
    return t !== null ? [`mixer.armTrack(${t})`] : null
  }

  switch (actionId) {
    case 'transport.play':      return ['transport.start()']
    case 'transport.stop':      return ['transport.stop()']
    case 'transport.record':    return ['transport.record()']
    case 'transport.loop':      return ['transport.setLoopMode()']
    case 'transport.undo':      return ['transport.globalTransport(midi.FPT_Undo, 1, midi.PME_System)']
    case 'transport.redo':      return ['transport.globalTransport(midi.FPT_Undo, -1, midi.PME_System)']
    case 'transport.tapTempo':  return ['transport.globalTransport(midi.FPT_TapTempo, 1, midi.PME_System)']
    case 'transport.metronome': return ['transport.globalTransport(midi.FPT_Metronome, 1, midi.PME_System)']
    case 'channel.mute':        return ['channels.muteChannel(channels.selectedChannel())']
    case 'channel.solo':        return ['channels.soloChannel(channels.selectedChannel())']
    case 'window.mixer':        return ['ui.showWindow(midi.widMixer)']
    case 'window.playlist':     return ['ui.showWindow(midi.widPlaylist)']
    case 'window.pianoRoll':    return ['ui.showWindow(midi.widPianoRoll)']
    case 'window.channelRack':  return ['ui.showWindow(midi.widChannelRack)']
    default:                    return null
  }
}

function knobActionCode(actionId, ccVar = 'val') {
  if (!actionId || actionId === 'none') return null

  if (actionId.startsWith('mixer.volume.')) {
    const t = parseTrackIndex(actionId)
    return t !== null ? [`mixer.setTrackVolume(${t}, ${ccVar} / 127.0)`] : null
  }
  if (actionId.startsWith('mixer.pan.')) {
    const t = parseTrackIndex(actionId)
    return t !== null ? [`mixer.setTrackPan(${t}, (${ccVar} / 127.0) * 2.0 - 1.0)`] : null
  }
  switch (actionId) {
    case 'channel.volume':
      return [`channels.setChannelVolume(channels.selectedChannel(), ${ccVar} / 127.0)`]
    case 'channel.pan':
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

function buildOnInit() {
  return [
    'def OnInit():',
    `    ui.setHintMsg("${DEVICE_NAME} loaded")`,
  ].join('\n')
}

function buildOnNoteOn(config) {
  const lines = ['def OnNoteOn(event):']
  lines.push('    # Pads transmit on MIDI channel 10 (index 9) — ignore keybed')
  lines.push('    if event.midiChan != 9:')
  lines.push('        return')
  lines.push('    note = event.note')
  lines.push('')

  const allPads = [
    ...config.pads.bankA.map(p => ({ ...p, bank: 'A' })),
    ...config.pads.bankB.map(p => ({ ...p, bank: 'B' })),
  ]

  let first = true
  for (const pad of allPads) {
    const kw = first ? 'if' : 'elif'
    first = false
    const codeLines = padActionCode(pad.action)

    if (!codeLines) {
      lines.push(`    ${kw} note == ${pad.note}:  # ${pad.id} — Unassigned`)
      lines.push('        pass')
    } else {
      lines.push(`    ${kw} note == ${pad.note}:  # ${pad.id} — ${pad.label}`)
      for (const cl of codeLines) lines.push(`        ${cl}`)
      lines.push('        event.handled = True')
    }
  }

  return lines.join('\n')
}

function buildOnNoteOff() {
  return [
    'def OnNoteOff(event):',
    '    # Consume pad NoteOff to prevent FL Studio double-firing',
    '    if event.midiChan == 9:',
    '        event.handled = True',
  ].join('\n')
}

function buildOnControlChange(config) {
  const lines = ['def OnControlChange(event):']
  lines.push('    cc  = event.controlNum')
  lines.push('    val = event.controlVal')
  lines.push('')
  lines.push('    # Joystick X (CC 80) — Pitch on selected channel')
  lines.push('    if cc == 80:')
  lines.push('        channels.setChannelPitch(channels.selectedChannel(), (val / 127.0) * 2.0 - 1.0)')
  lines.push('        event.handled = True')
  lines.push('')
  lines.push('    # Joystick Y (CC 81) — Modulation pass-through (FL Studio handles this natively)')
  lines.push('')

  for (const knob of config.knobs) {
    const codeLines = knobActionCode(knob.action)
    lines.push(`    elif cc == ${knob.cc}:  # ${knob.id} — ${knob.label}`)
    if (!codeLines) {
      lines.push('        pass')
    } else {
      for (const cl of codeLines) lines.push(`        ${cl}`)
      lines.push('        event.handled = True')
    }
    lines.push('')
  }

  return lines.join('\n')
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generates the FL Studio MIDI script string.
 * Device name is hardcoded as MPK_Mini_3.
 */
export function generateScript(config) {
  const modules = collectModules(config)

  const sections = [
    `# name=${DEVICE_NAME}`,
    '# Generated by MPK Mini 3 Configurator',
    '# https://github.com/egop358/mpk-mini3-configurator',
    '# Hand-edit freely — the structure is intentionally readable.',
    '',
    buildImports(modules),
    '',
    '',
    buildOnInit(),
    '',
    '',
    buildOnNoteOn(config),
    '',
    '',
    buildOnNoteOff(),
    '',
    '',
    buildOnControlChange(config),
  ]

  return sections.join('\n')
}

/**
 * Creates and downloads MPKMini3_Script.zip containing:
 *   - device_MPKMini3.py  (generated script)
 *   - AkaiTemplate.mpkmini3  (fetched from public/)
 *
 * @param {object} config  App state config
 * @returns {Promise<void>}
 */
export async function downloadZip(config) {
  const JSZip = (await import('jszip')).default
  const script = generateScript(config)

  // Fetch the hardware template file from the public folder
  const templateUrl = `${import.meta.env.BASE_URL}AkaiTemplate.mpkmini3`
  const templateRes = await fetch(templateUrl)
  if (!templateRes.ok) {
    throw new Error(`Could not load AkaiTemplate.mpkmini3 (${templateRes.status})`)
  }
  const templateData = await templateRes.arrayBuffer()

  const zip = new JSZip()
  const folder = zip.folder('MPK_Mini_3')
  folder.file('device_MPKMini3.py', script)
  folder.file('AkaiTemplate.mpkmini3', templateData)

  const blob = await zip.generateAsync({ type: 'blob' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = 'MPKMini3_Script.zip'
  a.click()
  URL.revokeObjectURL(url)
}
