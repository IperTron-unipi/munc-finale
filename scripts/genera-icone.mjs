// Rigenera le icone PNG: `node scripts/genera-icone.mjs`.
// Senza dipendenze: encoder PNG minimo e M rasterizzata come poligono.
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const DEST = process.argv[2] ?? 'public/icons'
mkdirSync(DEST, { recursive: true })

const CUOIO = [59, 42, 26]
const PERGAMENA = [233, 217, 182]

// Contorno della M in coordinate normalizzate 0..1, y verso il basso.
const M = [
  [0.00, 1.00], [0.00, 0.00], [0.24, 0.00], [0.50, 0.44],
  [0.76, 0.00], [1.00, 0.00], [1.00, 1.00], [0.78, 1.00],
  [0.78, 0.34], [0.50, 0.80], [0.22, 0.34], [0.22, 1.00],
]

function dentroPoligono(x, y, poli) {
  let dentro = false
  for (let i = 0, j = poli.length - 1; i < poli.length; j = i++) {
    const [xi, yi] = poli[i]
    const [xj, yj] = poli[j]
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      dentro = !dentro
    }
  }
  return dentro
}

function dentroQuadratoArrotondato(x, y, lato, raggio) {
  const cx = Math.min(Math.max(x, raggio), lato - raggio)
  const cy = Math.min(Math.max(y, raggio), lato - raggio)
  const dx = x - cx
  const dy = y - cy
  return dx * dx + dy * dy <= raggio * raggio
}

// pieno: sfondo a tutto quadrato (maskable e iOS), altrimenti arrotondato.
function disegna(lato, { pieno, scalaM }) {
  const px = Buffer.alloc(lato * lato * 4)
  const raggio = lato * 0.22
  const dimM = lato * scalaM
  const off = (lato - dimM) / 2
  const N = 4 // campioni per lato

  for (let y = 0; y < lato; y++) {
    for (let x = 0; x < lato; x++) {
      let sfondo = 0
      let lettera = 0

      for (let sy = 0; sy < N; sy++) {
        for (let sx = 0; sx < N; sx++) {
          const px1 = x + (sx + 0.5) / N
          const py1 = y + (sy + 0.5) / N
          if (pieno || dentroQuadratoArrotondato(px1, py1, lato, raggio)) sfondo++
          const mx = (px1 - off) / dimM
          const my = (py1 - off) / dimM
          if (mx >= 0 && mx <= 1 && my >= 0 && my <= 1 && dentroPoligono(mx, my, M)) lettera++
        }
      }

      const tot = N * N
      const aSfondo = sfondo / tot
      const aLettera = (lettera / tot) * aSfondo // la M non deborda dallo sfondo
      const i = (y * lato + x) * 4
      for (let c = 0; c < 3; c++) {
        px[i + c] = Math.round(CUOIO[c] * (1 - aLettera) + PERGAMENA[c] * aLettera)
      }
      px[i + 3] = Math.round(aSfondo * 255)
    }
  }
  return px
}

// ---- encoder PNG ----
const tabellaCrc = (() => {
  const t = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c
  }
  return t
})()

function crc32(buf) {
  let c = 0xffffffff
  for (const b of buf) c = tabellaCrc[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function blocco(tipo, dati) {
  const testa = Buffer.alloc(4)
  testa.writeUInt32BE(dati.length)
  const corpo = Buffer.concat([Buffer.from(tipo, 'latin1'), dati])
  const coda = Buffer.alloc(4)
  coda.writeUInt32BE(crc32(corpo))
  return Buffer.concat([testa, corpo, coda])
}

function png(lato, px) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(lato, 0)
  ihdr.writeUInt32BE(lato, 4)
  ihdr[8] = 8   // bit per canale
  ihdr[9] = 6   // RGBA
  const righe = Buffer.alloc(lato * (lato * 4 + 1))
  for (let y = 0; y < lato; y++) {
    righe[y * (lato * 4 + 1)] = 0 // filtro None
    px.copy(righe, y * (lato * 4 + 1) + 1, y * lato * 4, (y + 1) * lato * 4)
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    blocco('IHDR', ihdr),
    blocco('IDAT', deflateSync(righe, { level: 9 })),
    blocco('IEND', Buffer.alloc(0)),
  ])
}

const icone = [
  ['icon-192.png', 192, { pieno: false, scalaM: 0.56 }],
  ['icon-512.png', 512, { pieno: false, scalaM: 0.56 }],
  // maskable: la M sta nel cerchio sicuro dell'80%
  ['icon-maskable-512.png', 512, { pieno: true, scalaM: 0.42 }],
  ['apple-touch-icon-180.png', 180, { pieno: true, scalaM: 0.56 }],
]

for (const [nome, lato, opzioni] of icone) {
  writeFileSync(join(DEST, nome), png(lato, disegna(lato, opzioni)))
  console.log(nome, lato)
}
