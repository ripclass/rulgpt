import { ImageResponse } from '@vercel/og'

export const config = {
  runtime: 'edge',
}

export function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const title = searchParams.get('title') || 'TFRules'
  const tags = searchParams.get('tags') || ''

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          backgroundColor: '#050B14',
          padding: '60px 80px',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '4px',
              backgroundColor: '#FF4F00',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              fontWeight: 800,
              color: 'white',
            }}
          >
            tf
          </div>
          <span
            style={{
              fontSize: '24px',
              fontWeight: 600,
              color: '#ffffff',
              letterSpacing: '-0.02em',
            }}
          >
            tfrules
          </span>
          <span
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: '#FF4F00',
              letterSpacing: '0.15em',
              textTransform: 'uppercase' as const,
              marginLeft: '12px',
            }}
          >
            Trade Finance Rules — Explained
          </span>
        </div>

        {/* Title */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            maxWidth: '900px',
          }}
        >
          <h1
            style={{
              fontSize: title.length > 60 ? '42px' : '52px',
              fontWeight: 800,
              color: '#ffffff',
              lineHeight: 1.15,
              letterSpacing: '-0.03em',
              margin: 0,
            }}
          >
            {title}
          </h1>

          {tags && (
            <div style={{ display: 'flex', gap: '10px' }}>
              {tags.split(',').map((tag) => (
                <span
                  key={tag}
                  style={{
                    fontSize: '13px',
                    fontWeight: 700,
                    color: '#FF4F00',
                    backgroundColor: 'rgba(255, 79, 0, 0.15)',
                    padding: '4px 12px',
                    borderRadius: '2px',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase' as const,
                  }}
                >
                  {tag.trim()}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Bottom bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span
            style={{
              fontSize: '16px',
              color: '#737373',
              fontWeight: 500,
            }}
          >
            tfrules.com — Cited answers. Not opinion.
          </span>
          <span
            style={{
              fontSize: '13px',
              color: '#525252',
              fontWeight: 600,
              letterSpacing: '0.1em',
              textTransform: 'uppercase' as const,
            }}
          >
            By Enso Intelligence
          </span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  )
}
