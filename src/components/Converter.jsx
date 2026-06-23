import { useState, useRef } from 'react'
import { useLocalStorage } from '../lib/useLocalStorage.js'
import { analyzePattern, generatePatternFromImage, errorMessage, hasApiKey } from '../lib/gemini.js'

export default function Converter({ yarns, onGoToStash }) {
  const [hooks] = useLocalStorage('stitchwise.hooks', [])
  const [patternText, setPatternText] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [yarnId, setYarnId] = useState(yarns[0]?.id ?? '')
  const [mode, setMode] = useState('size') // 'size' = predict size, 'target' = hit a size
  const [targetCm, setTargetCm] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [generatedPattern, setGeneratedPattern] = useState(null)
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)

  const selectedYarn = yarns.find((y) => y.id === yarnId) ?? yarns[0]
  const hasText = patternText.trim().length > 10
  const hasInput = hasText || imageFile != null
  // Image-only mode: photo uploaded but no text pasted → offer pattern generation
  const imageOnlyMode = imageFile != null && !hasText
  const canConvert = hasInput && selectedYarn && (mode === 'size' || Number(targetCm) > 0)

  function applyFile(file) {
    if (!file || !file.type.startsWith('image/')) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  function clearImage() {
    setImageFile(null)
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    setImagePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function onDrop(e) {
    e.preventDefault()
    setIsDragging(false)
    applyFile(e.dataTransfer.files[0])
  }

  async function onConvert() {
    setLoading(true)
    setError('')
    setResult(null)
    setGeneratedPattern(null)
    try {
      const r = await analyzePattern(
        { patternText: patternText.trim(), yarn: selectedYarn, mode, targetCm: Number(targetCm) },
        imageFile,
      )
      setResult(r)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  async function onGenerateFromPhoto() {
    setLoading(true)
    setError('')
    setResult(null)
    setGeneratedPattern(null)
    try {
      const r = await generatePatternFromImage(imageFile, selectedYarn, hooks)
      setGeneratedPattern(r)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {!hasApiKey && (
        <div className="card border-l-4 border-l-berry p-4 text-sm">
          <b className="text-berry-ink">Almost ready.</b> Paste your free Gemini key into{' '}
          <code className="rounded bg-ground-2 px-1.5 py-0.5 font-mono text-[12px]">.env.local</code>{' '}
          and restart the dev server to switch on the converter.
        </div>
      )}

      {yarns.length === 0 ? (
        <div className="card flex flex-col items-start gap-3 p-6">
          <h2 className="font-display text-xl font-bold">First, add some yarn</h2>
          <p className="text-sm text-ink-soft">
            The converter works from the yarn you own. Add a yarn or two and come back.
          </p>
          <button className="btn btn-primary" onClick={onGoToStash}>
            Go to My Stash
          </button>
        </div>
      ) : (
        <div className="card flex flex-col gap-5 p-5">
          {/* Photo upload zone */}
          <div className="flex flex-col gap-1.5">
            <span className="label">Upload a pattern photo</span>
            <div
              className={[
                'relative flex min-h-[120px] cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed text-sm transition-colors',
                isDragging
                  ? 'border-berry bg-berry/5'
                  : 'border-line bg-ground-2 hover:border-berry/50',
              ].join(' ')}
              onClick={() => !imageFile && fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onDrop}
            >
              {imageFile ? (
                <div className="flex w-full items-center gap-3 px-4 py-3">
                  <img
                    src={imagePreview}
                    alt="pattern preview"
                    className="h-20 w-20 rounded-xl object-cover shadow"
                  />
                  <div className="flex flex-1 flex-col gap-1 text-left">
                    <span className="text-sm font-semibold text-ink">{imageFile.name}</span>
                    <span className="text-xs text-ink-soft">
                      {(imageFile.size / 1024).toFixed(0)} KB
                    </span>
                    <button
                      className="btn mt-1 self-start px-3 py-1 text-xs"
                      onClick={(e) => { e.stopPropagation(); clearImage() }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <svg className="h-8 w-8 text-ink-soft" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M4.5 19.5h15a.75.75 0 00.75-.75v-12a.75.75 0 00-.75-.75h-15a.75.75 0 00-.75.75v12c0 .414.336.75.75.75z" />
                  </svg>
                  <span className="text-ink-soft">
                    Drag & drop a photo, or{' '}
                    <span className="font-semibold text-berry">browse</span>
                  </span>
                  <span className="text-xs text-ink-soft">JPG, PNG, WEBP · max ~10 MB</span>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => applyFile(e.target.files[0])}
              />
            </div>
            {imageFile && (
              <p className="text-xs text-ink-soft">
                Privacy notice: on Gemini's free tier, Google may use submitted images to improve their models.
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-ink-soft">
            <div className="flex-1 border-t border-line" />
            <span>and / or paste text</span>
            <div className="flex-1 border-t border-line" />
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="label">Paste the pattern you found</span>
            <textarea
              className="field"
              placeholder="Paste the written instructions here — e.g. 'With worsted yarn and a 5mm hook, ch 30. Row 1: sc in 2nd ch…'"
              value={patternText}
              onChange={(e) => setPatternText(e.target.value)}
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="label">Make it with</span>
              <select className="field" value={yarnId} onChange={(e) => setYarnId(e.target.value)}>
                {yarns.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex flex-col gap-1.5">
              <span className="label">What do you want?</span>
              <div className="flex gap-1 rounded-full bg-ground-2 p-1">
                <ModeBtn active={mode === 'size'} onClick={() => setMode('size')}>
                  Show me the size
                </ModeBtn>
                <ModeBtn active={mode === 'target'} onClick={() => setMode('target')}>
                  Hit a target size
                </ModeBtn>
              </div>
            </div>
          </div>

          {mode === 'target' && (
            <label className="flex flex-col gap-1.5">
              <span className="label">Target size (cm) — its main dimension</span>
              <input
                className="field max-w-48"
                type="number"
                min="0"
                placeholder="e.g. 56 for a hat"
                value={targetCm}
                onChange={(e) => setTargetCm(e.target.value)}
              />
            </label>
          )}

          <div className="flex flex-wrap items-center gap-3">
            {imageOnlyMode ? (
              <button className="btn btn-primary" onClick={onGenerateFromPhoto} disabled={!selectedYarn || loading}>
                {loading ? 'Working…' : 'Generate pattern from photo'}
              </button>
            ) : (
              <button className="btn btn-primary" onClick={onConvert} disabled={!canConvert || loading}>
                {loading ? 'Working…' : 'Convert for my yarn'}
              </button>
            )}
            {imageFile && !imageOnlyMode && (
              <button className="btn" onClick={onGenerateFromPhoto} disabled={!selectedYarn || loading}>
                Generate pattern from photo
              </button>
            )}
            {loading && <div className="yarn-spinner" aria-hidden="true" />}
          </div>
        </div>
      )}

      {error && (
        <div className="card border-l-4 border-l-berry p-4 text-sm text-ink">{error}</div>
      )}

      {result && <ResultCard result={result} mode={mode} />}

      {generatedPattern && <PatternDisplay pattern={generatedPattern} />}
    </div>
  )
}

function ModeBtn({ active, onClick, children }) {
  return (
    <button className="tab flex-1 text-sm" aria-selected={active} onClick={onClick}>
      {children}
    </button>
  )
}

function ResultCard({ result, mode }) {
  const rec = result.recommendation ?? {}
  const det = result.detected ?? {}

  const headline =
    mode === 'target' && rec.adjustedStitchCount != null
      ? { big: `${rec.adjustedStitchCount}`, unit: 'stitches' }
      : rec.predictedSizeCm != null
        ? { big: `≈ ${round(rec.predictedSizeCm)}`, unit: 'cm wide' }
        : rec.adjustedStitchCount != null
          ? { big: `${rec.adjustedStitchCount}`, unit: 'stitches' }
          : null

  const facts = [
    det.originalYarnWeight && ['Pattern was for', det.originalYarnWeight],
    det.originalGaugePer10cm != null && ['Their gauge', `${det.originalGaugePer10cm} / 10cm`],
    result.yourGaugePer10cm != null && ['Your gauge', `${result.yourGaugePer10cm} / 10cm`],
    det.keyStitchCount != null && ['Pattern count', `${det.keyStitchCount} sts`],
    det.keyDimension && ['Across', det.keyDimension],
  ].filter(Boolean)

  return (
    <div className="card flex flex-col gap-5 p-6">
      <div className="flex flex-wrap items-center gap-2">
        {result.shapeType && (
          <span className="chip">
            {result.shapeType === 'fixed-count'
              ? 'fixed-count shape'
              : result.shapeType === 'sized'
                ? 'sized to fit'
                : 'shape unclear'}
          </span>
        )}
        {result.shapeExplanation && (
          <span className="text-sm text-ink-soft">{result.shapeExplanation}</span>
        )}
      </div>

      {headline && (
        <div className="rounded-2xl bg-ground-2 px-5 py-6 text-center">
          <div className="font-display text-5xl font-bold text-berry">{headline.big}</div>
          <div className="label mt-1">{headline.unit}</div>
        </div>
      )}

      {result.summary && (
        <p className="font-display text-lg font-bold leading-snug">{result.summary}</p>
      )}

      {facts.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {facts.map(([k, v]) => (
            <div key={k} className="rounded-xl border border-line px-3 py-2">
              <div className="label">{k}</div>
              <div className="mt-0.5 text-sm font-semibold">{v}</div>
            </div>
          ))}
        </div>
      )}

      {Array.isArray(result.steps) && result.steps.length > 0 && (
        <div>
          <div className="label mb-2">How to do it</div>
          <ol className="flex flex-col gap-2">
            {result.steps.map((s, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-berry text-[11px] font-bold text-white">
                  {i + 1}
                </span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {Array.isArray(result.warnings) && result.warnings.length > 0 && (
        <div className="rounded-xl border border-line border-l-4 border-l-sage bg-card p-4">
          <div className="label mb-1.5" style={{ color: 'var(--color-sage-ink)' }}>
            Good to know
          </div>
          <ul className="flex flex-col gap-1.5 text-sm text-ink-soft">
            {result.warnings.map((w, i) => (
              <li key={i}>• {w}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function PatternDisplay({ pattern: p }) {
  return (
    <div className="card flex flex-col gap-4 p-5">
      <div>
        <div className="font-display text-xl font-bold">{p.title}</div>
        <div className="mt-1 flex flex-wrap gap-1">
          {p.difficulty && <span className="chip">{p.difficulty}</span>}
          {p.hookSize && <span className="chip">{p.hookSize}</span>}
          {p.finishedSize && <span className="text-xs text-ink-soft">{p.finishedSize}</span>}
        </div>
      </div>

      {p.gauge && (
        <div className="rounded-xl bg-ground-2 px-4 py-3 text-sm">
          <span className="label">Gauge: </span>{p.gauge}
        </div>
      )}

      {Array.isArray(p.materialsNeeded) && p.materialsNeeded.length > 0 && (
        <div>
          <div className="label mb-1.5">Materials</div>
          <ul className="flex flex-col gap-1 text-sm">
            {p.materialsNeeded.map((m, i) => (
              <li key={i} className="flex gap-2"><span className="text-berry">·</span><span>{m}</span></li>
            ))}
          </ul>
        </div>
      )}

      {Array.isArray(p.abbreviations) && p.abbreviations.length > 0 && (
        <div>
          <div className="label mb-1.5">Abbreviations</div>
          <div className="flex flex-wrap gap-2">
            {p.abbreviations.map((a, i) => (
              <span key={i} className="rounded-lg bg-ground-2 px-2 py-1 font-mono text-[12px]">{a}</span>
            ))}
          </div>
        </div>
      )}

      {Array.isArray(p.instructions) && p.instructions.length > 0 && (
        <div className="flex flex-col gap-4">
          {p.instructions.map((section, si) => (
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

      {Array.isArray(p.tips) && p.tips.length > 0 && (
        <div className="rounded-xl border border-line border-l-4 border-l-sage bg-card p-4">
          <div className="label mb-1.5" style={{ color: 'var(--color-sage-ink)' }}>Tips</div>
          <ul className="flex flex-col gap-1.5 text-sm text-ink-soft">
            {p.tips.map((t, i) => <li key={i}>• {t}</li>)}
          </ul>
        </div>
      )}
    </div>
  )
}

const round = (n) => Math.round(n * 10) / 10
