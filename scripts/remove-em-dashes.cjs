const fs = require('fs')
const path = require('path')

const root = path.resolve(process.cwd(), 'dist')
const extensions = new Set(['.html', '.htm', '.js', '.mjs', '.css', '.json', '.xml', '.txt', '.svg', '.webmanifest'])
const patterns = [
  /\u2014/g,
  /\u2013/g,
  /&mdash;/gi,
  /&ndash;/gi,
  /&#8212;/g,
  /&#8211;/g,
  /&#x2014;/gi,
  /&#x2013;/gi,
  /\\u2014/gi,
  /\\u2013/gi,
]

let filesChanged = 0
let replacements = 0

function cleanFile(filePath) {
  const original = fs.readFileSync(filePath, 'utf8')
  let cleaned = original

  for (const pattern of patterns) {
    pattern.lastIndex = 0
    const matches = cleaned.match(pattern) || []
    if (!matches.length) continue
    replacements += matches.length
    pattern.lastIndex = 0
    cleaned = cleaned.replace(pattern, '-')
  }

  if (cleaned !== original) {
    fs.writeFileSync(filePath, cleaned, 'utf8')
    filesChanged += 1
  }

  for (const pattern of patterns) {
    pattern.lastIndex = 0
    if (pattern.test(cleaned)) {
      throw new Error('Em dash verification failed for ' + path.relative(root, filePath))
    }
  }
}

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const filePath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      walk(filePath)
      continue
    }
    if (entry.isFile() && extensions.has(path.extname(entry.name).toLowerCase())) {
      cleanFile(filePath)
    }
  }
}

if (!fs.existsSync(root)) {
  console.error('dist directory not found. Run the build first.')
  process.exit(1)
}

walk(root)
console.log('Replaced ' + replacements + ' long dash' + (replacements === 1 ? '' : 'es') + ' across ' + filesChanged + ' built file' + (filesChanged === 1 ? '' : 's') + '.')
console.log('Verified: no long dashes remain in built Sancity text assets.')
