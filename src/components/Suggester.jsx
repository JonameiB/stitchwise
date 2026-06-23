import { useState } from 'react'
import { useLocalStorage } from '../lib/useLocalStorage.js'
import { suggestProjects, generatePattern, errorMessage, hasApiKey } from '../lib/gemini.js'
import { weightById } from '../lib/yarnData.js'

export default function Suggester({ yarns, onGoToStash }) {
  const [hooks] = useLocalStorage('stitchwise.hooks', [])
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState(null)
  const [error, setError] = useState('')

  async function onSuggest() {
    setLoading(true)
    setError('')
    setResults(null)
    try {
      const r = await suggestProjects(yarns, hooks)
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
          The suggester looks at what you own and finds projects you can actually start today. Add a yarn or two first.
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
            Based on your stash and tools, Stitchwise suggests projects you can start today — and can write the full pattern for any one you pick.
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {yarns.map((y) => (
            <span key={y.id} className="chip">{y.name}{y.balls ? ` · ${y.balls}×` : ''}</span>
          ))}
          {hooks.map((h) => (
            <span key={h.id} className="chip">{h.sizeMm} mm {h.type === 'knit' ? 'needle' : 'hook'}</span>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button className="btn btn-primary" onClick={onSuggest} disabled={loading}>
            {loading ? 'Finding ideas…' : results ? 'Suggest again' : 'Suggest projects'}
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
          {results.map((p, i) => {
            const matchedYarn = yarns.find((y) => p.yarn && p.yarn.toLowerCase().includes(y.name.toLowerCase())) ?? yarns[0]
            return (
              <ProjectCard
                key={i}
                project={p}
                yarn={matchedYarn}
                hooks={hooks}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

function ProjectCard({ project: p, yarn, hooks }) {
  const [patternLoading, setPatternLoading] = useState(false)
  const [pattern, setPattern] = useState(null)
  const [patternError, setPatternError] = useState('')
  const [expanded, setExpanded] = useState(false)

  async function onGetPattern() {
    setPatternLoading(true)
    setPatternError('')
    try {
      const r = await generatePattern({ project: p, yarn, hooks })
      setPattern(r)
      setExpanded(true)
    } catch (err) {
      setPatternError(errorMessage(err))
    } finally {
      setPatternLoading(false)
    }
  }

  return (
    <div className="card flex flex-col gap-3 p-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-display text-lg font-bold leading-tight">{p.name}</h3>
          <div className="mt-1 flex flex-wrap gap-1">
            {p.type && <span className="chip">{p.type}</span>}
            {p.hookSize && <span className="chip">{p.hookSize}</span>}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 text-right">
          {p.approxTime && <span className="text-sm text-ink-soft">{p.approxTime}</span>}
          {p.ballsNeeded && <span className="chip">{p.ballsNeeded}</span>}
        </div>
      </div>

      {/* Details */}
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

      {/* Get pattern button */}
      {!pattern && (
        <div className="flex items-center gap-3">
          <button
            className="btn btn-primary"
            onClick={onGetPattern}
            disabled={patternLoading}
          >
            {patternLoading ? 'Writing pattern…' : 'Get pattern for this'}
          </button>
          {patternLoading && <div className="yarn-spinner" aria-hidden="true" />}
        </div>
      )}

      {patternError && (
        <div className="rounded-xl border border-l-4 border-l-berry bg-card p-3 text-sm text-ink">
          {patternError}
        </div>
      )}

      {/* Pattern */}
      {pattern && (
        <div className="flex flex-col gap-4 border-t border-line pt-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-display text-base font-bold">{pattern.title}</div>
              <div className="mt-0.5 flex flex-wrap gap-1">
                {pattern.difficulty && <span className="chip">{pattern.difficulty}</span>}
                {pattern.hookSize && <span className="chip">{pattern.hookSize}</span>}
                {pattern.finishedSize && <span className="text-xs text-ink-soft">{pattern.finishedSize}</span>}
              </div>
            </div>
            <button
              className="btn text-xs"
              onClick={() => setExpanded((x) => !x)}
            >
              {expanded ? 'Collapse' : 'Expand'}
            </button>
          </div>

          {expanded && (
            <>
              {/* Gauge */}
              {pattern.gauge && (
                <div className="rounded-xl bg-ground-2 px-4 py-3 text-sm">
                  <span className="label">Gauge: </span>{pattern.gauge}
                </div>
              )}

              {/* Materials */}
              {Array.isArray(pattern.materialsNeeded) && pattern.materialsNeeded.length > 0 && (
                <div>
                  <div className="label mb-1.5">Materials</div>
                  <ul className="flex flex-col gap-1 text-sm">
                    {pattern.materialsNeeded.map((m, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-berry">·</span>
                        <span>{m}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Abbreviations */}
              {Array.isArray(pattern.abbreviations) && pattern.abbreviations.length > 0 && (
                <div>
                  <div className="label mb-1.5">Abbreviations</div>
                  <div className="flex flex-wrap gap-2">
                    {pattern.abbreviations.map((a, i) => (
                      <span key={i} className="rounded-lg bg-ground-2 px-2 py-1 font-mono text-[12px]">{a}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Instructions */}
              {Array.isArray(pattern.instructions) && pattern.instructions.length > 0 && (
                <div className="flex flex-col gap-4">
                  {pattern.instructions.map((section, si) => (
                    <div key={si}>
                      <div className="label mb-2">{section.section}</div>
                      <ol className="flex flex-col gap-2">
                        {section.steps.map((step, i) => (
                          <li key={i} className="flex gap-3 text-sm">
                            <span className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-berry text-[11px] font-bold text-white">
                              {i + 1}
                            </span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  ))}
                </div>
              )}

              {/* Tips */}
              {Array.isArray(pattern.tips) && pattern.tips.length > 0 && (
                <div className="rounded-xl border border-line border-l-4 border-l-sage bg-card p-4">
                  <div className="label mb-1.5" style={{ color: 'var(--color-sage-ink)' }}>Tips</div>
                  <ul className="flex flex-col gap-1.5 text-sm text-ink-soft">
                    {pattern.tips.map((t, i) => <li key={i}>• {t}</li>)}
                  </ul>
                </div>
              )}

              {/* Re-generate */}
              <button className="btn self-start text-xs" onClick={onGetPattern} disabled={patternLoading}>
                {patternLoading ? 'Rewriting…' : 'Regenerate pattern'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
