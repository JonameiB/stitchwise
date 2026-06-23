import { useState } from 'react'
import { suggestProjects, errorMessage, hasApiKey } from '../lib/gemini.js'

export default function Suggester({ yarns, onGoToStash }) {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState(null)
  const [error, setError] = useState('')

  async function onSuggest() {
    setLoading(true)
    setError('')
    setResults(null)
    try {
      const r = await suggestProjects(yarns)
      setResults(r)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  if (!hasApiKey) {
    return (
      <div className="card border-l-4 border-l-berry p-4 text-sm">
        <b className="text-berry-ink">Almost ready.</b> Paste your free Gemini key into{' '}
        <code className="rounded bg-ground-2 px-1.5 py-0.5 font-mono text-[12px]">.env.local</code>{' '}
        and restart the dev server.
      </div>
    )
  }

  if (yarns.length === 0) {
    return (
      <div className="card flex flex-col items-start gap-3 p-6">
        <h2 className="font-display text-xl font-bold">First, add some yarn</h2>
        <p className="text-sm text-ink-soft">
          The suggester looks at what you own and finds projects that actually match. Add a yarn or two first.
        </p>
        <button className="btn btn-primary" onClick={onGoToStash}>
          Go to My Stash
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="card flex flex-col gap-4 p-5">
        <div>
          <h2 className="font-display text-xl font-bold">What can I make?</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Based on the {yarns.length} yarn{yarns.length !== 1 ? 's' : ''} in your stash, Stitchwise will suggest projects you can actually start today.
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {yarns.map((y) => (
            <span key={y.id} className="chip">
              {y.name}{y.balls ? ` · ${y.balls}×` : ''}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button
            className="btn btn-primary"
            onClick={onSuggest}
            disabled={loading}
          >
            {loading ? 'Finding ideas…' : 'Suggest projects'}
          </button>
          {loading && <div className="yarn-spinner" aria-hidden="true" />}
        </div>
      </div>

      {error && (
        <div className="card border-l-4 border-l-berry p-4 text-sm text-ink">{error}</div>
      )}

      {results && (
        <div className="flex flex-col gap-4">
          <div className="label">
            {results.length} project{results.length !== 1 ? 's' : ''} matched to your stash
          </div>
          {results.map((p, i) => (
            <ProjectCard key={i} project={p} />
          ))}
        </div>
      )}
    </div>
  )
}

function ProjectCard({ project: p }) {
  return (
    <div className="card flex flex-col gap-3 p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-display text-lg font-bold leading-tight">{p.name}</h3>
          {p.type && <span className="chip mt-1">{p.type}</span>}
        </div>
        <div className="flex flex-col items-end gap-1 text-right">
          {p.approxTime && (
            <span className="text-sm text-ink-soft">{p.approxTime}</span>
          )}
          {p.ballsNeeded && (
            <span className="chip">{p.ballsNeeded}</span>
          )}
        </div>
      </div>

      <div className="grid gap-2 text-sm sm:grid-cols-2">
        {p.yarn && (
          <div className="rounded-xl border border-line px-3 py-2">
            <div className="label">Use</div>
            <div className="mt-0.5 font-semibold">{p.yarn}</div>
          </div>
        )}
        {p.whyItWorks && (
          <div className="rounded-xl border border-line px-3 py-2">
            <div className="label">Why it works</div>
            <div className="mt-0.5">{p.whyItWorks}</div>
          </div>
        )}
      </div>

      {p.searchTip && (
        <div className="flex items-start gap-2 rounded-xl bg-ground-2 px-3 py-2 text-sm">
          <span className="mt-0.5 text-sage-ink">→</span>
          <div>
            <span className="label">Find a free pattern: </span>
            <span className="font-mono text-[12px] text-ink-soft">{p.searchTip}</span>
          </div>
        </div>
      )}
    </div>
  )
}
