import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { existsSync, createReadStream } from 'node:fs'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const distDir = join(__dirname, 'dist')
const port = Number(process.env.PORT || 4173)
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
const siteUrl = (process.env.PUBLIC_SITE_URL || process.env.VITE_PUBLIC_SITE_URL || 'https://fandirect.onrender.com').replace(/\/$/, '')

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function absoluteUrl(value) {
  if (!value) return `${siteUrl}/logo-512.png`
  if (/^https?:\/\//i.test(value)) return value
  return `${siteUrl}${value.startsWith('/') ? value : `/${value}`}`
}

function stripTags(value = '') {
  return String(value).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
}

function injectMeta(indexHtml, meta) {
  const title = escapeHtml(meta.title || 'FanDirect — Exclusive Merch, Events & Experiences')
  const description = escapeHtml(stripTags(meta.description || 'Exclusive merch, events, drops, and creator experiences on FanDirect.')).slice(0, 280)
  const image = escapeHtml(absoluteUrl(meta.image))
  const url = escapeHtml(absoluteUrl(meta.url || '/'))
  const type = escapeHtml(meta.type || 'website')

  const tags = `
    <title>${title}</title>
    <meta name="description" content="${description}" />
    <meta property="og:type" content="${type}" />
    <meta property="og:site_name" content="FanDirect" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${image}" />
    <meta property="og:image:secure_url" content="${image}" />
    <meta property="og:url" content="${url}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${image}" />
  `

  let output = indexHtml
    .replace(/<title>[\s\S]*?<\/title>/i, '')
    .replace(/<meta\s+name=["']description["'][^>]*>\s*/gi, '')
    .replace(/<meta\s+(property|name)=["'](og:[^"']+|twitter:[^"']+)["'][^>]*>\s*/gi, '')

  return output.replace('</head>', `${tags}\n  </head>`)
}

async function fetchSupabaseRows(table, query) {
  if (!supabaseUrl || !supabaseKey) return []

  const response = await fetch(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/${table}?${query}`, {
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      Accept: 'application/json',
    },
  })

  if (!response.ok) return []
  return response.json()
}

async function getMetaForPath(pathname) {
  const productMatch = pathname.match(/^\/product\/([^/?#]+)/)
  if (productMatch) {
    const id = decodeURIComponent(productMatch[1])
    const rows = await fetchSupabaseRows('products', `id=eq.${encodeURIComponent(id)}&select=*`)
    const product = Array.isArray(rows) ? rows[0] : null

    if (product) {
      const title = product.title || product.name || 'FanDirect item'
      const price = Number(product.price || product.fan_price || 0)
      return {
        title: `${title} on FanDirect`,
        description: `${price ? `₦${price.toLocaleString()} · ` : ''}${stripTags(product.description || `Shop ${title} on FanDirect.`)}`,
        image: product.image_url || product.cover_url || product.thumbnail_url,
        url: `/product/${id}`,
        type: product.type === 'event' ? 'event' : 'product',
      }
    }
  }

  const creatorMatch = pathname.match(/^\/creator\/([^/?#]+)/)
  if (creatorMatch) {
    const slug = decodeURIComponent(creatorMatch[1]).toLowerCase()
    const rows = await fetchSupabaseRows('creators', `or=(username.eq.${encodeURIComponent(slug)},name.ilike.${encodeURIComponent(slug)},display_name.ilike.${encodeURIComponent(slug)})&select=*`)
    const creator = Array.isArray(rows) ? rows[0] : null

    if (creator) {
      const name = creator.display_name || creator.name || creator.username || 'FanDirect Creator'
      return {
        title: `${name} on FanDirect`,
        description: stripTags(creator.bio || `Follow ${name} for merch, drops, events, and fan rewards.`),
        image: creator.avatar_url || creator.profile_photo_url || creator.cover_url || creator.cover_image_url,
        url: `/creator/${creator.username || slug}`,
        type: 'profile',
      }
    }
  }

  return {
    title: 'FanDirect — Exclusive Merch, Events & Experiences',
    description: 'Get closer to your favorite creators. Exclusive merch, VIP events, drops, and fan rewards.',
    image: '/logo-512.png',
    url: '/',
    type: 'website',
  }
}

function sendFile(res, filepath) {
  const ext = extname(filepath).toLowerCase()
  res.writeHead(200, {
    'Content-Type': mimeTypes[ext] || 'application/octet-stream',
    'Cache-Control': ext === '.html' ? 'no-store' : 'public, max-age=31536000, immutable',
  })
  createReadStream(filepath).pipe(res)
}

createServer(async (req, res) => {
  try {
    const requestUrl = new URL(req.url || '/', siteUrl)
    const pathname = requestUrl.pathname

    const safePath = normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, '')
    const staticPath = join(distDir, safePath === '/' ? '' : safePath)

    if (pathname !== '/' && existsSync(staticPath) && !staticPath.endsWith('/')) {
      sendFile(res, staticPath)
      return
    }

    const indexHtml = await readFile(join(distDir, 'index.html'), 'utf8')
    const meta = await getMetaForPath(pathname)
    const html = injectMeta(indexHtml, meta)

    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=60',
    })
    res.end(html)
  } catch (error) {
    console.error(error)
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('FanDirect server error')
  }
}).listen(port, () => {
  console.log(`FanDirect web server running on port ${port}`)
})
