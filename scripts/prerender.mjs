import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const root = process.cwd()
const clientIndex = resolve(root, 'dist/index.html')
const serverEntry = resolve(root, 'dist-ssr/entry-server.js')

const shell = await readFile(clientIndex, 'utf8')
const { render } = await import(pathToFileURL(serverEntry).href)
const storefrontHtml = render()

if (!shell.includes('<div id="root"></div>')) {
  throw new Error('Prerender failed: root placeholder not found in built index.html')
}

if (!storefrontHtml.includes('SANCITY') || !storefrontHtml.includes('Everything for a Better Home')) {
  throw new Error('Prerender failed: storefront HTML is missing expected content')
}

const storefrontDocument = shell.replace(
  '<div id="root"></div>',
  `<div id="root">${storefrontHtml}</div>`,
)

await writeFile(clientIndex, storefrontDocument, 'utf8')

// Admin stays client-rendered so auth/session state is never emitted into static HTML.
const adminDirectory = resolve(root, 'dist/admin')
await mkdir(adminDirectory, { recursive: true })
await writeFile(resolve(adminDirectory, 'index.html'), shell, 'utf8')

await rm(resolve(root, 'dist-ssr'), { recursive: true, force: true })

console.log(`Prerendered storefront HTML: ${storefrontHtml.length.toLocaleString()} characters`)
console.log('Kept /admin as a client-rendered shell')
