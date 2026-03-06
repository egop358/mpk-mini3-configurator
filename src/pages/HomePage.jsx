import { useNavigate } from 'react-router-dom'

export default function HomePage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Buy Me a Coffee — top right */}
      <div className="flex justify-end p-4">
        <a
          href="https://buymeacoffee.com/egop358"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-400 hover:bg-yellow-300 text-gray-900 text-xs font-bold rounded transition-colors"
        >
          ☕ Buy Me a Coffee
        </a>
      </div>

      {/* Centered content */}
      <div className="flex-1 flex flex-col items-center justify-center gap-8 px-6 text-center">
        <div className="flex flex-col items-center gap-3">
          <h1 className="text-white text-4xl font-bold tracking-tight font-mono">
            MPK Mini 3 Transport Customizer
          </h1>
          <p className="text-gray-500 text-sm font-mono">by egop</p>
        </div>

        <button
          onClick={() => navigate('/customize')}
          className="px-10 py-4 bg-red-600 hover:bg-red-500 text-white text-base font-bold font-mono rounded-lg uppercase tracking-widest transition-colors shadow-[0_0_24px_rgba(239,68,68,0.4)]"
        >
          Customize My Keyboard
        </button>
      </div>
    </div>
  )
}
