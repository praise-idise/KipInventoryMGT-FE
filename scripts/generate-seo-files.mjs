import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

function normalizeSiteUrl(value) {
  const fallback = 'https://kipinventory.netlify.app'
    const raw = (value || fallback).trim()

    try {
        const normalized = new URL(raw.startsWith('http') ? raw : `https://${raw}`)
        return normalized.toString().replace(/\/$/, '')
    } catch {
        return fallback
    }
}

const siteUrl = normalizeSiteUrl(
    process.env.SITE_URL ||
        process.env.URL ||
        process.env.DEPLOY_PRIME_URL ||
        process.env.DEPLOY_URL ||
        process.env.VITE_SITE_URL,
)

const indexPath = resolve('index.html')
const canonicalUrl = `${siteUrl}/`
const socialImageUrl = `${siteUrl}/og-image.png`

const indexHtml = readFileSync(indexPath, 'utf8')
const nextIndexHtml = indexHtml
  .replace(/<link rel="canonical" href="[^"]*"\s*\/>/, `<link rel="canonical" href="${canonicalUrl}" />`)
  .replace(/<meta property="og:url" content="[^"]*"\s*\/>/, `<meta property="og:url" content="${canonicalUrl}" />`)
  .replace(/<meta property="og:image" content="[^"]*"\s*\/>/, `<meta property="og:image" content="${socialImageUrl}" />`)
  .replace(/<meta name="twitter:image" content="[^"]*"\s*\/>/, `<meta name="twitter:image" content="${socialImageUrl}" />`)
  .replace(/"logo"\s*:\s*"[^"]*"/, `"logo": "${socialImageUrl}"`)

if (nextIndexHtml !== indexHtml) {
  writeFileSync(indexPath, nextIndexHtml, 'utf8')
}

const today = new Date().toISOString().slice(0, 10)

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${siteUrl}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
`

const robots = `User-agent: *
Allow: /

Sitemap: ${siteUrl}/sitemap.xml
`

writeFileSync(resolve('public', 'sitemap.xml'), sitemap, 'utf8')
writeFileSync(resolve('public', 'robots.txt'), robots, 'utf8')

console.log(`Generated SEO files for ${siteUrl}`)
