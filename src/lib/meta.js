const DEFAULT_IMAGE = '/logo-512.png'

function absoluteUrl(value) {
  if (!value) return ''
  if (/^https?:\/\//i.test(value)) return value
  if (typeof window === 'undefined') return value
  return `${window.location.origin}${value.startsWith('/') ? value : `/${value}`}`
}

function setMetaAttribute(selector, attrName, attrValue, content) {
  if (typeof document === 'undefined') return
  let tag = document.head.querySelector(selector)
  if (!tag) {
    tag = document.createElement('meta')
    tag.setAttribute(attrName, attrValue)
    document.head.appendChild(tag)
  }
  tag.setAttribute('content', content || '')
}

export function setShareMeta({ title, description, image, url, type = 'website' } = {}) {
  if (typeof document === 'undefined') return

  const nextTitle = title ? `${title} | FanDirect` : 'FanDirect — Exclusive Merch, Events & Experiences'
  const nextDescription = description || 'Exclusive merch, events, drops, and creator experiences on FanDirect.'
  const nextImage = absoluteUrl(image || DEFAULT_IMAGE)
  const nextUrl = absoluteUrl(url || window.location.href)

  document.title = nextTitle

  setMetaAttribute('meta[name="description"]', 'name', 'description', nextDescription)
  setMetaAttribute('meta[property="og:type"]', 'property', 'og:type', type)
  setMetaAttribute('meta[property="og:site_name"]', 'property', 'og:site_name', 'FanDirect')
  setMetaAttribute('meta[property="og:title"]', 'property', 'og:title', nextTitle)
  setMetaAttribute('meta[property="og:description"]', 'property', 'og:description', nextDescription)
  setMetaAttribute('meta[property="og:image"]', 'property', 'og:image', nextImage)
  setMetaAttribute('meta[property="og:image:secure_url"]', 'property', 'og:image:secure_url', nextImage)
  setMetaAttribute('meta[property="og:url"]', 'property', 'og:url', nextUrl)
  setMetaAttribute('meta[name="twitter:card"]', 'name', 'twitter:card', 'summary_large_image')
  setMetaAttribute('meta[name="twitter:title"]', 'name', 'twitter:title', nextTitle)
  setMetaAttribute('meta[name="twitter:description"]', 'name', 'twitter:description', nextDescription)
  setMetaAttribute('meta[name="twitter:image"]', 'name', 'twitter:image', nextImage)
}

export function resetShareMeta() {
  setShareMeta()
}
