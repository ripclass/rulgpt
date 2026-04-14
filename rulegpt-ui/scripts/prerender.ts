import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { blogPosts } from '../src/data/blogPosts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const distDir = join(__dirname, '..', 'dist')
const BASE_URL = 'https://www.tfrules.com'
const DEFAULT_OG_IMAGE = `${BASE_URL}/og-image.png`

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

interface MetaOverrides {
  title: string
  description: string
  canonicalPath: string
  ogType?: 'website' | 'article'
  ogImage?: string
}

function injectMeta(template: string, overrides: MetaOverrides): string {
  const title = escapeHtml(overrides.title)
  const description = escapeHtml(overrides.description)
  const canonical = `${BASE_URL}${overrides.canonicalPath}`
  const ogType = overrides.ogType ?? 'website'
  const ogImage = overrides.ogImage ?? DEFAULT_OG_IMAGE

  let html = template

  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${title}</title>`)

  html = html.replace(
    /<meta\s+name="description"\s+content="[^"]*"\s*\/?\s*>/,
    `<meta name="description" content="${description}" />`
  )

  const canonicalTag = `<link rel="canonical" href="${canonical}" />`
  if (/<link\s+rel="canonical"/.test(html)) {
    html = html.replace(/<link\s+rel="canonical"\s+href="[^"]*"\s*\/?\s*>/, canonicalTag)
  } else {
    html = html.replace('</head>', `    ${canonicalTag}\n  </head>`)
  }

  html = html.replace(
    /<meta\s+property="og:type"\s+content="[^"]*"\s*\/?\s*>/,
    `<meta property="og:type" content="${ogType}" />`
  )
  html = html.replace(
    /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?\s*>/,
    `<meta property="og:url" content="${canonical}" />`
  )
  html = html.replace(
    /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?\s*>/,
    `<meta property="og:title" content="${title}" />`
  )
  html = html.replace(
    /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?\s*>/,
    `<meta property="og:description" content="${description}" />`
  )
  html = html.replace(
    /<meta\s+property="og:image"\s+content="[^"]*"\s*\/?\s*>/,
    `<meta property="og:image" content="${ogImage}" />`
  )

  html = html.replace(
    /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?\s*>/,
    `<meta name="twitter:title" content="${title}" />`
  )
  html = html.replace(
    /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?\s*>/,
    `<meta name="twitter:description" content="${description}" />`
  )
  html = html.replace(
    /<meta\s+name="twitter:image"\s+content="[^"]*"\s*\/?\s*>/,
    `<meta name="twitter:image" content="${ogImage}" />`
  )

  return html
}

function articleJsonLd(post: (typeof blogPosts)[number], canonical: string): string {
  const payload = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.description,
    url: canonical,
    mainEntityOfPage: canonical,
    image: DEFAULT_OG_IMAGE,
    author: {
      '@type': 'Organization',
      name: 'Enso Intelligence',
      url: BASE_URL,
    },
    publisher: {
      '@type': 'Organization',
      name: 'TFRules',
      url: BASE_URL,
      logo: {
        '@type': 'ImageObject',
        url: `${BASE_URL}/og-image.png`,
      },
    },
    keywords: post.tags.join(', '),
    articleSection: 'Trade Finance Rules',
    inLanguage: 'en',
  }
  return `<script type="application/ld+json">\n${JSON.stringify(payload, null, 2)}\n</script>`
}

function injectArticleJsonLd(html: string, jsonLd: string): string {
  return html.replace('</head>', `${jsonLd}\n  </head>`)
}

const template = readFileSync(join(distDir, 'index.html'), 'utf8')
let count = 0

for (const post of blogPosts) {
  const slug = post.slug
  const canonicalPath = `/blog/${slug}`
  const title = `${post.title} | TFRules`
  let html = injectMeta(template, {
    title,
    description: post.description,
    canonicalPath,
    ogType: 'article',
  })
  html = injectArticleJsonLd(html, articleJsonLd(post, `${BASE_URL}${canonicalPath}`))

  const outDir = join(distDir, 'blog', slug)
  mkdirSync(outDir, { recursive: true })
  writeFileSync(join(outDir, 'index.html'), html, 'utf8')
  count += 1
}

const blogLanding = injectMeta(template, {
  title: 'Trade Finance Rules Blog | TFRules',
  description:
    'Expert explanations of UCP600, ISBP745, sanctions, FTAs, and trade compliance rules — with exact citations. No opinion, just rules.',
  canonicalPath: '/blog',
  ogType: 'website',
})
mkdirSync(join(distDir, 'blog'), { recursive: true })
writeFileSync(join(distDir, 'blog', 'index.html'), blogLanding, 'utf8')

const staticRoutes: Array<{ path: string; title: string; description: string }> = [
  {
    path: '/pricing',
    title: 'Pricing — TFRules',
    description:
      'Free, Professional, and Enterprise plans for cited trade finance rule answers. From $0 to $199 per month.',
  },
  {
    path: '/faq',
    title: 'FAQ — TFRules',
    description:
      'Frequently asked questions about tfrules.com. How it works, what it covers, accuracy, pricing, and data handling.',
  },
  {
    path: '/contact',
    title: 'Contact — TFRules',
    description:
      'Get in touch with the TFRules team. General enquiries, support, and billing for trade finance compliance Q&A.',
  },
  {
    path: '/privacy',
    title: 'Privacy Policy — TFRules',
    description:
      'How tfrules.com collects, uses, and protects your data. No tracking beyond what is needed to serve cited trade finance answers.',
  },
  {
    path: '/terms',
    title: 'Terms of Use — TFRules',
    description:
      'Terms and conditions for using tfrules.com. Rules explanation only — not legal advice, not document validation.',
  },
]

for (const route of staticRoutes) {
  const html = injectMeta(template, {
    title: route.title,
    description: route.description,
    canonicalPath: route.path,
    ogType: 'website',
  })
  const outDir = join(distDir, route.path.slice(1))
  mkdirSync(outDir, { recursive: true })
  writeFileSync(join(outDir, 'index.html'), html, 'utf8')
}

console.log(
  `[prerender] wrote ${count} blog posts + blog landing + ${staticRoutes.length} static routes`
)
