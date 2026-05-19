import sharp from 'sharp'
import fs from 'fs'

const sizes = [16, 24, 32, 48, 64, 96, 128, 256]
const src = fs.readFileSync('resources/icon.png')

const pngs = []
for (const s of sizes) {
  // For small sizes, boost contrast to make logo visible
  let pipeline = sharp(src)
    .resize(s, s, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })

  if (s <= 64) {
    // Boost saturation and contrast for small icons
    pipeline = pipeline
      .modulate({ saturation: 1.8, brightness: 1.1 })
      .normalise()
  }

  const buf = await pipeline.png().toBuffer()
  pngs.push(buf)
}

const count = pngs.length
const header = Buffer.alloc(6)
header.writeUInt16LE(0, 0)
header.writeUInt16LE(1, 2)
header.writeUInt16LE(count, 4)

let offset = 6 + count * 16
const entries = []

for (let i = 0; i < count; i++) {
  const png = pngs[i]
  const dim = sizes[i] >= 256 ? 0 : sizes[i]
  const entry = Buffer.alloc(16)
  entry.writeUInt8(dim, 0)
  entry.writeUInt8(dim, 1)
  entry.writeUInt8(0, 2)
  entry.writeUInt8(0, 3)
  entry.writeUInt16LE(1, 4)
  entry.writeUInt16LE(32, 6)
  entry.writeUInt32LE(png.length, 8)
  entry.writeUInt32LE(offset, 12)
  entries.push(entry)
  offset += png.length
}

const ico = Buffer.concat([header, ...entries, ...pngs])
fs.writeFileSync('resources/icon.ico', ico)
console.log(`ICO created: ${count} sizes`)
for (let i = 0; i < count; i++) {
  const m = await sharp(pngs[i]).metadata()
  let colored = 0
  if (sizes[i] <= 64) {
    const raw = await sharp(pngs[i]).raw().toBuffer()
    for (let j = 0; j < raw.length; j += 4) {
      const r = raw[j], g = raw[j+1], b = raw[j+2], a = raw[j+3]
      if (a > 0 && !(r > 240 && g > 240 && b > 240)) colored++
    }
  }
  console.log(`  ${sizes[i]}x${sizes[i]} - ${pngs[i].length} bytes${sizes[i] <= 64 ? ` (${colored} colored)` : ''}`)
}
