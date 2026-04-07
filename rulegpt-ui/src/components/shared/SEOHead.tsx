import { Helmet } from 'react-helmet-async'

interface SEOHeadProps {
  title: string
  description: string
  path: string
  type?: 'website' | 'article'
  ogImage?: string
  tags?: string[]
}

const BASE_URL = 'https://www.tfrules.com'

export function SEOHead({ title, description, path, type = 'website', ogImage, tags }: SEOHeadProps) {
  const url = `${BASE_URL}${path}`
  const ogParams = new URLSearchParams({ title })
  if (tags?.length) ogParams.set('tags', tags.join(','))
  const image = ogImage || `${BASE_URL}/api/og?${ogParams.toString()}`

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />

      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:site_name" content="TFRules" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
    </Helmet>
  )
}
