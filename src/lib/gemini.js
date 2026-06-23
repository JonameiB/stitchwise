import { YARN_WEIGHTS, weightById } from './yarnData.js'

const MODEL = 'gemini-2.5-flash'
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY?.trim()

// In production the key lives on the server (api/analyze.js).
// In dev we call Gemini directly using the local .env.local key.
const IS_PROD = import.meta.env.PROD

export const hasApiKey = IS_PROD || Boolean(API_KEY)

const gaugeReference = YARN_WEIGHTS.map(
  (w) => `- ${w.label}: ~${w.scGaugePer10cm} sc per 10cm (${w.sub})`,
).join('\n')

function buildPrompt({ patternText, yarn, mode, targetCm }) {
  const w = weightById(yarn.weight)
  const yourGauge = yarn.gaugePer10cm
    ? `${yarn.gaugePer10cm} stitches per 10cm (measured by the user — trust this)`
    : `not measured — estimate from its weight category (${w ? w.label : 'unknown'}, about ${w ? w.scGaugePer10cm : '?'} sc per 10cm)`

  const goal =
    mode === 'target'
      ? `The user wants the finished piece to measure about ${targetCm} cm in its main dimension. Recalculate the stitch count so it comes out that size in the user's yarn.`
      : `The user wants to KEEP the pattern's stitch counts as written, and find out what size the piece will turn out at with their yarn.`

  return `You are Stitchwise, a warm, practical assistant that adapts crochet and knitting patterns to the materials a maker actually owns. Be friendly and concise.

REFERENCE — standard yarn weights and approximate single-crochet gauge:
${gaugeReference}

KEY IDEA — gauge (stitches per 10cm) is the bridge between any pattern and the user's yarn. Identify the shape type:
- "fixed-count" shapes (flowers, amigurumi, motifs): usually KEEP their stitch count; different yarn just changes the finished SIZE.
- "sized" items (hats, garments, blankets meant to fit): the stitch COUNT must be recalculated to hit a target size.

THE USER'S YARN: ${yarn.name || 'unnamed'} — weight category: ${w ? w.label : yarn.weight}; fiber: ${yarn.fiber || 'n/a'}. Their gauge: ${yourGauge}.

THE USER'S GOAL: ${goal}

THE PATTERN THEY FOUND (verbatim):
"""
${patternText}
"""

Reply with ONLY a JSON object (no markdown, no code fences) in EXACTLY this shape:
{
  "shapeType": "fixed-count" | "sized" | "unknown",
  "shapeExplanation": "one short sentence on why",
  "detected": {
    "originalYarnWeight": "the weight the pattern was written for, or 'not stated'",
    "originalGaugePer10cm": number or null,
    "keyStitchCount": number or null,
    "keyDimension": "what that count spans (e.g. 'foundation chain width', 'brim circumference'), or 'not found'"
  },
  "yourGaugePer10cm": number or null,
  "recommendation": {
    "keepOriginalCount": true or false,
    "adjustedStitchCount": number or null,
    "predictedSizeCm": number or null,
    "targetSizeCm": ${mode === 'target' ? targetCm : 'null'}
  },
  "summary": "1-2 friendly sentences giving the headline answer the user wants",
  "steps": ["short", "actionable steps to apply this — SHOW the arithmetic"],
  "warnings": ["gauge caveats; recommend a swatch when precision matters; note any guesses"]
}

Rules: every number must be a plain number, not a string. If the pattern is missing key info (no gauge, no count), say so in "warnings" and make a reasonable estimate using the reference table. Always suggest a quick gauge swatch when it matters.`
}

function buildRequestBody(input, imageFile, base64) {
  const parts = []
  if (imageFile && base64) {
    parts.push({ inlineData: { mimeType: imageFile.type, data: base64 } })
  }
  parts.push({ text: buildPrompt(input) })
  return {
    contents: [{ role: 'user', parts }],
    generationConfig: { temperature: 0.2, responseMimeType: 'application/json' },
  }
}

function parseGeminiResponse(data) {
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ?? ''
  const cleaned = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()
  try {
    return JSON.parse(cleaned)
  } catch {
    throw new Error('PARSE')
  }
}

// imageFile: a File object from an <input type="file"> or drag-drop, or null
export async function analyzePattern(input, imageFile = null) {
  const base64 = imageFile ? await fileToBase64(imageFile) : null
  const body = buildRequestBody(input, imageFile, base64)

  let res
  if (IS_PROD) {
    // Key stays on the server — route through the Vercel serverless function
    try {
      res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    } catch {
      throw new Error('NETWORK')
    }
  } else {
    // Local dev — call Gemini directly with the key from .env.local
    if (!API_KEY) throw new Error('NO_KEY')
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    } catch {
      throw new Error('NETWORK')
    }
  }

  if (!res.ok) {
    if (res.status === 400 || res.status === 403) throw new Error('BAD_KEY')
    if (res.status === 429) throw new Error('RATE_LIMIT')
    const detail = await res.text().catch(() => '')
    throw new Error('API_' + res.status + (detail ? ': ' + detail.slice(0, 200) : ''))
  }

  return parseGeminiResponse(await res.json())
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export async function suggestProjects(yarns) {
  const stashLines = yarns.map((y) => {
    const w = weightById(y.weight)
    const totalM = y.balls && y.lengthM ? Number(y.balls) * Number(y.lengthM) : null
    return [
      `- ${y.name}`,
      `weight: ${w ? w.label : y.weight}`,
      y.fiber && `fiber: ${y.fiber}`,
      y.color && `color: ${y.color}`,
      y.balls && `${y.balls} ball(s)`,
      y.lengthM && `${y.lengthM} m/ball`,
      totalM && `(${totalM} m total)`,
      y.gaugePer10cm && `gauge: ${y.gaugePer10cm} sts/10cm`,
    ].filter(Boolean).join(', ')
  }).join('\n')

  const prompt = `You are Stitchwise, a helpful crochet and knitting assistant. A maker wants to know what projects they can make with the yarn they already own. Be warm, practical, and specific.

THE USER'S STASH:
${stashLines}

Suggest 4 projects that match what they have. For each project, pick the best yarn(s) from the stash. Prioritise beginner-friendly makes, then intermediate. Include at least one small quick win (like a coaster, scrunchie, or amigurumi) if the yarn supports it.

Reply with ONLY a JSON array (no markdown, no code fences) in EXACTLY this shape:
[
  {
    "name": "project name",
    "type": "e.g. amigurumi · beginner",
    "yarn": "which stash yarn(s) to use",
    "whyItWorks": "one sentence — why this yarn suits this project",
    "approxTime": "e.g. 2–3 hours, a weekend",
    "ballsNeeded": "e.g. 1 ball, 2–3 balls",
    "searchTip": "a short search phrase the user can Google or YouTube to find a free pattern, e.g. 'free beginner crochet flower pattern worsted'"
  }
]

Rules: only suggest projects that are realistic with the yarn weight and quantity shown. Every field must be a non-empty string.`

  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.4, responseMimeType: 'application/json' },
  }

  let res
  if (IS_PROD) {
    try {
      res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    } catch {
      throw new Error('NETWORK')
    }
  } else {
    if (!API_KEY) throw new Error('NO_KEY')
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    } catch {
      throw new Error('NETWORK')
    }
  }

  if (!res.ok) {
    if (res.status === 400 || res.status === 403) throw new Error('BAD_KEY')
    if (res.status === 429) throw new Error('RATE_LIMIT')
    throw new Error('API_' + res.status)
  }

  const data = await res.json()
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ?? ''

  const cleaned = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()
  try {
    return JSON.parse(cleaned)
  } catch {
    throw new Error('PARSE')
  }
}

export function errorMessage(err) {
  const map = {
    NO_KEY: 'Add your free Gemini API key to .env.local, then restart the dev server.',
    BAD_KEY: 'That API key was rejected. Double-check it in .env.local and that the Gemini API is enabled.',
    RATE_LIMIT: 'The free tier hit its rate limit. Wait a minute and try again.',
    NETWORK: 'Could not reach Google. Check your internet connection.',
    PARSE: 'Got an unexpected response. Try again, or trim the pattern text down.',
  }
  const msg = err?.message ?? ''
  if (map[msg]) return map[msg]
  if (msg.includes('503')) return 'Gemini is very busy right now — wait a minute and try again.'
  if (msg.startsWith('API_')) return 'The AI service returned an error. Please try again.'
  return 'Something went wrong. Please try again.'
}
