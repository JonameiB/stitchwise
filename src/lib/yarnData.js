// Craft Yarn Council standard weight categories, with a rough single-crochet
// gauge (stitches per 10cm) used to *estimate* size when no swatch is given.
// These are ballpark midpoints — a real swatch always wins.
export const YARN_WEIGHTS = [
  { id: '0', label: 'Lace (0)', sub: 'lace, fingering, 10-count thread', scGaugePer10cm: 32 },
  { id: '1', label: 'Super Fine (1)', sub: 'sock, fingering, baby', scGaugePer10cm: 26 },
  { id: '2', label: 'Fine (2)', sub: 'sport, baby', scGaugePer10cm: 18 },
  { id: '3', label: 'Light (3)', sub: 'DK, light worsted', scGaugePer10cm: 14 },
  { id: '4', label: 'Medium (4)', sub: 'worsted, afghan, aran', scGaugePer10cm: 12 },
  { id: '5', label: 'Bulky (5)', sub: 'chunky, craft, rug', scGaugePer10cm: 9 },
  { id: '6', label: 'Super Bulky (6)', sub: 'super bulky, roving', scGaugePer10cm: 8 },
  { id: '7', label: 'Jumbo (7)', sub: 'jumbo, roving', scGaugePer10cm: 5 },
]

export const weightById = (id) => YARN_WEIGHTS.find((w) => w.id === id)
