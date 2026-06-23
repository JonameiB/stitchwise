import { useState } from 'react'
import { useLocalStorage } from '../lib/useLocalStorage.js'
import { YARN_WEIGHTS, weightById } from '../lib/yarnData.js'

const newId = () =>
  globalThis.crypto?.randomUUID?.() ?? String(Date.now() + Math.random())

const blankYarn = {
  name: '',
  weight: '4',
  fiber: '',
  color: '',
  balls: '',
  lengthM: '',
  weightG: '',
  gaugePer10cm: '',
}

export default function Stash({ yarns, setYarns }) {
  const [hooks, setHooks] = useLocalStorage('stitchwise.hooks', [])
  const [draft, setDraft] = useState(blankYarn)
  const [editingId, setEditingId] = useState(null)
  const [hook, setHook] = useState({ sizeMm: '', type: 'crochet', note: '' })

  const setField = (k, v) => setDraft((d) => ({ ...d, [k]: v }))

  function startEdit(yarn) {
    setEditingId(yarn.id)
    setDraft({ ...blankYarn, ...yarn })
  }

  function cancelEdit() {
    setEditingId(null)
    setDraft(blankYarn)
  }

  const saveYarn = (e) => {
    e.preventDefault()
    if (!draft.name.trim()) return
    if (editingId) {
      setYarns(yarns.map((y) => (y.id === editingId ? { ...y, ...draft, name: draft.name.trim() } : y)))
      setEditingId(null)
    } else {
      setYarns([{ id: newId(), ...draft, name: draft.name.trim() }, ...yarns])
    }
    setDraft(blankYarn)
  }

  const removeYarn = (id) => setYarns(yarns.filter((y) => y.id !== id))

  const addHook = (e) => {
    e.preventDefault()
    if (!hook.sizeMm) return
    setHooks([{ id: newId(), ...hook }, ...hooks])
    setHook({ sizeMm: '', type: 'crochet', note: '' })
  }
  const removeHook = (id) => setHooks(hooks.filter((h) => h.id !== id))

  return (
    <div className="flex flex-col gap-8">
      {/* ---- YARN ---- */}
      <section>
        <h2 className="mb-1 font-display text-xl font-bold">Your yarn</h2>
        <p className="mb-4 text-sm text-ink-soft">
          Add what you own. Saved privately in this browser — no account, no upload.
        </p>

        <form onSubmit={saveYarn} className="card mb-5 flex flex-col gap-4 p-5">
          {editingId && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-berry-ink">Editing yarn</span>
              <button type="button" className="btn text-xs" onClick={cancelEdit}>
                Cancel
              </button>
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Labeled label="Name *">
              <input
                className="field"
                placeholder="e.g. Cotton blush, Stylecraft DK"
                value={draft.name}
                onChange={(e) => setField('name', e.target.value)}
              />
            </Labeled>
            <Labeled label="Weight category">
              <select
                className="field"
                value={draft.weight}
                onChange={(e) => setField('weight', e.target.value)}
              >
                {YARN_WEIGHTS.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.label} — {w.sub}
                  </option>
                ))}
              </select>
            </Labeled>
            <Labeled label="Fiber">
              <input
                className="field"
                placeholder="cotton, acrylic, wool…"
                value={draft.fiber}
                onChange={(e) => setField('fiber', e.target.value)}
              />
            </Labeled>
            <Labeled label="Color">
              <input
                className="field"
                placeholder="blush, sage…"
                value={draft.color}
                onChange={(e) => setField('color', e.target.value)}
              />
            </Labeled>
            <Labeled label="Number of balls">
              <input
                className="field"
                type="number"
                min="1"
                step="0.5"
                placeholder="e.g. 3"
                value={draft.balls}
                onChange={(e) => setField('balls', e.target.value)}
              />
            </Labeled>
            <Labeled label="Length per ball (m)">
              <input
                className="field"
                type="number"
                min="0"
                placeholder="e.g. 180"
                value={draft.lengthM}
                onChange={(e) => setField('lengthM', e.target.value)}
              />
            </Labeled>
            <Labeled label="Weight per ball (g)">
              <input
                className="field"
                type="number"
                min="0"
                placeholder="e.g. 100"
                value={draft.weightG}
                onChange={(e) => setField('weightG', e.target.value)}
              />
            </Labeled>
            <Labeled label="Your gauge (sts / 10cm) — optional but best">
              <input
                className="field"
                type="number"
                min="0"
                placeholder="from a swatch, if you have one"
                value={draft.gaugePer10cm}
                onChange={(e) => setField('gaugePer10cm', e.target.value)}
              />
            </Labeled>
          </div>
          <div>
            <button type="submit" className="btn btn-primary" disabled={!draft.name.trim()}>
              {editingId ? 'Save changes' : 'Add yarn'}
            </button>
          </div>
        </form>

        {yarns.length === 0 ? (
          <Empty>No yarn yet — add your first above.</Empty>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {yarns.map((y) => {
              const w = weightById(y.weight)
              const totalM = y.balls && y.lengthM ? Number(y.balls) * Number(y.lengthM) : null
              return (
                <div key={y.id} className={[
                  'card flex items-start justify-between gap-3 p-4 transition-colors',
                  editingId === y.id ? 'ring-2 ring-berry' : '',
                ].join(' ')}>
                  <div className="min-w-0 flex-1">
                    <div className="font-display text-lg font-bold leading-tight">{y.name}</div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {w && <span className="chip">{w.label}</span>}
                      {y.gaugePer10cm && <span className="chip">{y.gaugePer10cm} sts/10cm</span>}
                      {y.balls && <span className="chip">{y.balls} ball{Number(y.balls) !== 1 ? 's' : ''}</span>}
                    </div>
                    <div className="mt-2 text-sm text-ink-soft">
                      {[y.fiber, y.color].filter(Boolean).join(' · ') || '—'}
                      {(y.lengthM || y.weightG) && (
                        <>
                          <br />
                          {[y.lengthM && `${y.lengthM} m`, y.weightG && `${y.weightG} g`]
                            .filter(Boolean)
                            .join(' / ')}{' '}
                          per ball
                          {totalM && <span className="text-ink"> · {totalM} m total</span>}
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <button className="btn text-xs" onClick={() => startEdit(y)}>
                      Edit
                    </button>
                    <button className="btn btn-danger text-xs" onClick={() => removeYarn(y.id)}>
                      Remove
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ---- HOOKS & NEEDLES ---- */}
      <section>
        <h2 className="mb-1 font-display text-xl font-bold">Hooks &amp; needles</h2>
        <p className="mb-4 text-sm text-ink-soft">The sizes you reach for.</p>

        <form onSubmit={addHook} className="card mb-5 flex flex-wrap items-end gap-4 p-5">
          <Labeled label="Size (mm)">
            <input
              className="field"
              type="number"
              step="0.25"
              min="0"
              placeholder="e.g. 4.0"
              value={hook.sizeMm}
              onChange={(e) => setHook((h) => ({ ...h, sizeMm: e.target.value }))}
            />
          </Labeled>
          <Labeled label="Type">
            <select
              className="field"
              value={hook.type}
              onChange={(e) => setHook((h) => ({ ...h, type: e.target.value }))}
            >
              <option value="crochet">Crochet hook</option>
              <option value="knit">Knitting needle</option>
            </select>
          </Labeled>
          <Labeled label="Note (optional)">
            <input
              className="field"
              placeholder="brand, material…"
              value={hook.note}
              onChange={(e) => setHook((h) => ({ ...h, note: e.target.value }))}
            />
          </Labeled>
          <button type="submit" className="btn btn-primary" disabled={!hook.sizeMm}>
            Add
          </button>
        </form>

        {hooks.length === 0 ? (
          <Empty>No hooks or needles yet.</Empty>
        ) : (
          <div className="flex flex-wrap gap-3">
            {hooks.map((h) => (
              <div key={h.id} className="card flex items-center gap-3 px-4 py-3">
                <div>
                  <span className="font-display text-lg font-bold">{h.sizeMm} mm</span>{' '}
                  <span className="text-sm text-ink-soft">
                    {h.type === 'knit' ? 'needle' : 'hook'}
                    {h.note ? ` · ${h.note}` : ''}
                  </span>
                </div>
                <button className="btn btn-danger" onClick={() => removeHook(h.id)}>
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function Labeled({ label, children }) {
  return (
    <label className="flex flex-1 flex-col gap-1.5">
      <span className="label">{label}</span>
      {children}
    </label>
  )
}

function Empty({ children }) {
  return (
    <div className="rounded-2xl border border-dashed border-line px-5 py-8 text-center text-sm text-ink-soft">
      {children}
    </div>
  )
}
