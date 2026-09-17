import { readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const yaml = require('js-yaml')
const root = new URL('../', import.meta.url)
const { version } = JSON.parse(await readFile(new URL('package.json', root), 'utf8'))
const metadata = yaml.load(await readFile(new URL('release/latest.yml', root), 'utf8'))
if (metadata.version !== version) throw new Error('Release metadata version does not match package.json')
for (const file of metadata.files) {
  const data = await readFile(new URL(`release/${file.url}`, root))
  if (data.length !== file.size || createHash('sha512').update(data).digest('base64') !== file.sha512) {
    throw new Error(`Release metadata mismatch for ${file.url}`)
  }
}
const names = [
  `MD-Tools-Setup-${version}.exe`,
  `MD-Tools-Portable-${version}.exe`,
  `MD-Tools-Setup-${version}.exe.blockmap`,
  'latest.yml'
]
const lines = []
for (const name of names) {
  const data = await readFile(new URL(`release/${name}`, root))
  lines.push(`${createHash('sha256').update(data).digest('hex')}  ${name}`)
}
await writeFile(new URL('release/SHA256SUMS.txt', root), `${lines.join('\n')}\n`)
console.log(`Verified v${version} metadata and wrote SHA256SUMS.txt for ${names.length} release files.`)
