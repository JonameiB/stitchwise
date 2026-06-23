import { useState } from 'react'
import { useLocalStorage } from './lib/useLocalStorage.js'
import Converter from './components/Converter.jsx'
import Stash from './components/Stash.jsx'

export default function App() {
  const [tab, setTab] = useState('convert')
  const [yarns, setYarns] = useLocalStorage('stitchwise.yarns', [])

  return (
    <div className="min-h-screen">
      <header className="mx-auto max-w-3xl px-5 pt-8 pb-2">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-baseline gap-2 font-display text-2xl font-bold tracking-tight">
            <span>Stitchwise<span className="text-berry">.</span></span>
            <span className="label">their pattern · your yarn</span>
          </div>
          <nav className="flex gap-1 rounded-full bg-ground-2 p-1" role="tablist" aria-label="Sections">
            <button
              className="tab"
              role="tab"
              aria-selected={tab === 'convert'}
              onClick={() => setTab('convert')}
            >
              Convert a pattern
            </button>
            <button
              className="tab"
              role="tab"
              aria-selected={tab === 'stash'}
              onClick={() => setTab('stash')}
            >
              My Stash
            </button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-6">
        {tab === 'convert' ? (
          <Converter yarns={yarns} onGoToStash={() => setTab('stash')} />
        ) : (
          <Stash yarns={yarns} setYarns={setYarns} />
        )}
      </main>

      <footer className="mx-auto max-w-3xl px-5 py-10 text-center text-[13px] text-ink-soft">
        Stitchwise · a personal project, free for anyone who hooks &amp; loops{' '}
        <span className="text-berry">♥</span>
      </footer>
    </div>
  )
}
