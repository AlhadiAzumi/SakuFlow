import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'

function crc32(buffer) {
  let crc = 0xffffffff
  for (const byte of buffer) {
    crc ^= byte
    for (let k = 0; k < 8; k += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1))
    }
  }
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length, 0)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body), 0)
  return Buffer.concat([length, body, crc])
}

function roundedRect(x, y, w, h, r) {
  return (px, py) => {
    if (px < x || px > x + w || py < y || py > y + h) return false
    const dx = Math.max(x + r - px, 0, px - (x + w - r))
    const dy = Math.max(y + r - py, 0, py - (y + h - r))
    return dx * dx + dy * dy <= r * r
  }
}

function render(size) {
  const pixels = Buffer.alloc(size * size * 4)
  const base = roundedRect(0, 0, size - 1, size - 1, size * 0.22)
  const bars = [
    roundedRect(size * 0.25, size * 0.53, size * 0.1, size * 0.23, size * 0.035),
    roundedRect(size * 0.45, size * 0.41, size * 0.1, size * 0.35, size * 0.035),
    roundedRect(size * 0.65, size * 0.25, size * 0.1, size * 0.51, size * 0.035),
  ]

  const near = (px, py, ax, ay, bx, by, width) => {
    const vx = bx - ax
    const vy = by - ay
    const wx = px - ax
    const wy = py - ay
    const len2 = vx * vx + vy * vy
    const t = Math.max(0, Math.min(1, (wx * vx + wy * vy) / len2))
    const dx = px - (ax + t * vx)
    const dy = py - (ay + t * vy)
    return dx * dx + dy * dy <= width * width
  }

  const stroke = size * 0.043
  const segments = [
    [0.27, 0.38, 0.48, 0.28],
    [0.48, 0.28, 0.65, 0.32],
    [0.65, 0.32, 0.76, 0.2],
    [0.76, 0.2, 0.69, 0.2],
    [0.76, 0.2, 0.76, 0.27],
  ]

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const px = x + 0.5
      const py = y + 0.5
      const offset = (y * size + x) * 4
      if (!base(px, py)) {
        pixels[offset + 3] = 0
        continue
      }
      const mix = (x / size + y / size) / 2
      pixels[offset] = Math.round(13 + mix * 4)
      pixels[offset + 1] = Math.round(148 - mix * 54)
      pixels[offset + 2] = Math.round(136 - mix * 43)
      pixels[offset + 3] = 255

      if (bars.some((bar) => bar(px, py))) {
        pixels[offset] = 255
        pixels[offset + 1] = 255
        pixels[offset + 2] = 255
      }
      if (segments.some(([ax, ay, bx, by]) => near(px, py, ax * size, ay * size, bx * size, by * size, stroke))) {
        pixels[offset] = 153
        pixels[offset + 1] = 246
        pixels[offset + 2] = 228
      }
    }
  }

  const raw = Buffer.alloc(size * (size * 4 + 1))
  for (let y = 0; y < size; y += 1) {
    raw[y * (size * 4 + 1)] = 0
    pixels.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4)
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

mkdirSync('public', { recursive: true })
for (const size of [192, 512]) {
  writeFileSync(`public/icon-${size}.png`, render(size))
  console.log(`public/icon-${size}.png dibuat`)
}
