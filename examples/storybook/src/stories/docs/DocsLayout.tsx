import React from 'react'

type ReactChild = React.ReactNode

export function DocsPage({
  children,
  eyebrow,
  lead,
  title,
}: {
  children: ReactChild
  eyebrow: string
  lead: string
  title: string
}) {
  return (
    <div style={{ display: 'grid', gap: 24 }}>
      <div
        style={{
          background:
            'linear-gradient(135deg, rgba(15,23,42,0.98) 0%, rgba(30,64,175,0.98) 48%, rgba(8,47,73,0.98) 100%)',
          border: '1px solid rgba(59,130,246,0.28)',
          borderRadius: 20,
          color: '#f8fafc',
          padding: '28px 28px 24px',
          boxShadow: '0 20px 60px rgba(15, 23, 42, 0.24)',
        }}
      >
        <div
          style={{
            color: 'rgba(191,219,254,0.92)',
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '0.18em',
            marginBottom: 10,
            textTransform: 'uppercase',
          }}
        >
          {eyebrow}
        </div>
        <h1
          style={{
            color: '#f8fafc',
            fontSize: 36,
            fontWeight: 800,
            letterSpacing: '-0.03em',
            lineHeight: 1.05,
            margin: '0 0 12px',
          }}
        >
          {title}
        </h1>
        <p
          style={{
            color: 'rgba(226,232,240,0.96)',
            fontSize: 17,
            lineHeight: 1.6,
            margin: 0,
            maxWidth: 760,
          }}
        >
          {lead}
        </p>
      </div>
      {children}
    </div>
  )
}

export function DocsSection({
  children,
  description,
  title,
}: {
  children: ReactChild
  description?: string
  title: string
}) {
  return (
    <section style={{ display: 'grid', gap: 14 }}>
      <div style={{ display: 'grid', gap: 6 }}>
        <h2
          style={{
            fontSize: 24,
            fontWeight: 800,
            letterSpacing: '-0.02em',
            lineHeight: 1.2,
            margin: 0,
          }}
        >
          {title}
        </h2>
        {description ? (
          <p
            style={{
              color: '#475569',
              fontSize: 15,
              lineHeight: 1.6,
              margin: 0,
              maxWidth: 760,
            }}
          >
            {description}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  )
}

export function DocsCard({
  children,
  href,
  title,
}: {
  children: ReactChild
  href?: string
  title: string
}) {
  const navigate = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (!href) return
    if (event.defaultPrevented) return
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    const root = window.top ?? window
    root.history.pushState({}, '', href)
    root.dispatchEvent(new PopStateEvent('popstate'))
  }

  const content = (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid rgba(148, 163, 184, 0.25)',
        borderRadius: 16,
        boxShadow: '0 10px 30px rgba(15, 23, 42, 0.06)',
        padding: 20,
      }}
    >
      <div
        style={{
          fontSize: 16,
          fontWeight: 700,
          letterSpacing: '-0.01em',
          marginBottom: 10,
        }}
      >
        {title}
      </div>
      <div style={{ color: '#334155', fontSize: 14, lineHeight: 1.6 }}>{children}</div>
    </div>
  )

  if (!href) return content

  return (
    <a
      href={href}
      onClick={navigate}
      style={{
        color: 'inherit',
        display: 'block',
        textDecoration: 'none',
      }}
    >
      {content}
    </a>
  )
}

export function DocsGrid({ children }: { children: ReactChild }) {
  return (
    <div
      style={{
        display: 'grid',
        gap: 16,
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
      }}
    >
      {children}
    </div>
  )
}

export function DocsCallout({
  children,
  tone = 'info',
  title,
}: {
  children: ReactChild
  tone?: 'info' | 'warning' | 'success'
  title: string
}) {
  const tones = {
    info: {
      background: 'rgba(219, 234, 254, 0.72)',
      border: 'rgba(59, 130, 246, 0.32)',
      color: '#1d4ed8',
    },
    success: {
      background: 'rgba(220, 252, 231, 0.82)',
      border: 'rgba(34, 197, 94, 0.28)',
      color: '#166534',
    },
    warning: {
      background: 'rgba(254, 249, 195, 0.88)',
      border: 'rgba(234, 179, 8, 0.28)',
      color: '#854d0e',
    },
  } as const

  const palette = tones[tone]

  return (
    <div
      style={{
        background: palette.background,
        border: `1px solid ${palette.border}`,
        borderRadius: 16,
        padding: 18,
      }}
    >
      <div
        style={{
          color: palette.color,
          fontSize: 13,
          fontWeight: 800,
          letterSpacing: '0.08em',
          marginBottom: 8,
          textTransform: 'uppercase',
        }}
      >
        {title}
      </div>
      <div style={{ color: '#334155', fontSize: 14, lineHeight: 1.6 }}>{children}</div>
    </div>
  )
}

export function DocsList({ children }: { children: ReactChild }) {
  return (
    <ul
      style={{
        color: '#334155',
        display: 'grid',
        gap: 8,
        lineHeight: 1.6,
        margin: 0,
        paddingLeft: 18,
      }}
    >
      {children}
    </ul>
  )
}
