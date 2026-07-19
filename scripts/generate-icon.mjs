import sharp from 'sharp'
import pngToIco from 'png-to-ico'
import { mkdir, writeFile } from 'fs/promises'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const buildDir = join(__dirname, '..', 'build')

const svg = `
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#818cf8" />
      <stop offset="1" stop-color="#4f46e5" />
    </linearGradient>
  </defs>
  <rect width="1024" height="1024" rx="224" fill="url(#bg)" />
  <rect x="176" y="176" width="672" height="672" rx="48" fill="none" stroke="#ffffff" stroke-opacity="0.9" stroke-width="34" />
  <path d="M262 686 V338 H322 L420 466 L518 338 H578 V686 H508 V462 L420 578 L332 462 V686 Z" fill="#ffffff" />
  <path d="M700 338 V560 H772 L664 686 L556 560 H628 V338 Z" fill="#ffffff" />
</svg>
`

async function main() {
  await mkdir(buildDir, { recursive: true })

  const png1024 = await sharp(Buffer.from(svg)).resize(1024, 1024).png().toBuffer()
  await writeFile(join(buildDir, 'icon.png'), png1024)

  const sizes = [16, 24, 32, 48, 64, 128, 256]
  const pngBuffers = await Promise.all(
    sizes.map((size) => sharp(Buffer.from(svg)).resize(size, size).png().toBuffer())
  )

  const icoBuffer = await pngToIco(pngBuffers)
  await writeFile(join(buildDir, 'icon.ico'), icoBuffer)

  console.log('Generated build/icon.png and build/icon.ico')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
