import { useMemo, useState } from 'react'
import { generateScript } from '../lib/codeGenerator.js'

function highlight(code) {
  return code
    .split('\n')
    .map(line => {
      const esc = line
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')

      // Full-line comment
      if (/^\s*#/.test(line)) {
        return `<span class="text-gray-500">${esc}</span>`
      }
      // Import lines
      if (/^import /.test(line)) {
        return `<span class="text-cyan-400">${esc}</span>`
      }
      // def keyword
      if (/^def /.test(line)) {
        return esc
          .replace(/^(def )/, '<span class="text-purple-400">$1</span>')
          .replace(/(\w+)(\()/, '<span class="text-yellow-300">$1</span>$2')
      }

      // Inline: keywords, strings, booleans
      let out = esc
      out = out.replace(
        /\b(if|elif|else|return|and|or|not|in|pass)\b/g,
        '<span class="text-purple-300">$1</span>'
      )
      out = out.replace(
        /\b(True|False|None)\b/g,
        '<span class="text-orange-400">$1</span>'
      )
      out = out.replace(
        /(&quot;[^&]*&quot;|&#039;[^&]*&#039;)/g,
        '<span class="text-green-400">$1</span>'
      )
      // Inline comments after code
      out = out.replace(
        /(#.*)$/,
        '<span class="text-gray-500">$1</span>'
      )
      return `<span class="text-gray-200">${out}</span>`
    })
    .join('\n')
}

export default function ScriptPreview({ config }) {
  const [copied, setCopied] = useState(false)
  const script = useMemo(() => generateScript(config), [config])

  function handleCopy() {
    navigator.clipboard.writeText(script).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700 bg-gray-800">
        <span className="text-gray-400 text-xs font-mono uppercase tracking-wider">
          Generated Script — device_{(config.deviceName || 'MPK_Mini_3').replace(/\s+/g, '_')}.py
        </span>
        <button
          onClick={handleCopy}
          className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs font-mono rounded border border-gray-600 transition-colors"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <div className="overflow-auto max-h-80 p-4 bg-gray-950">
        <pre
          className="text-xs font-mono leading-relaxed whitespace-pre"
          dangerouslySetInnerHTML={{ __html: highlight(script) }}
        />
      </div>
    </div>
  )
}
