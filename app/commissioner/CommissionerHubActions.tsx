'use client'

const options = [
  ['Scoring Alerts', '/notifications'],
  ['League Setup', '/commissioner/setup'],
  ['Lines & Results', '/commissioner/results'],
  ['Closing Line Audit', '/commissioner/closing-line-audit'],
  ['Live Feed', '/commissioner/live-feed'],
  ['Playoff Control', '/commissioner/playoffs'],
  ['Audit Log', '/audit-log'],
  ['Login Log', '/commissioner/login-log'],
] as const

export default function CommissionerHubActions() {
  return (
    <div style={{ width: '100%', maxWidth: 720, margin: '24px auto 0' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))',
          gap: 10,
        }}
      >
        {options.map(([label, href]) => (
          <a
            key={href}
            href={href}
            style={{
              display: 'block',
              padding: '12px 14px',
              borderRadius: 10,
              background: '#111',
              color: '#fff',
              textDecoration: 'none',
              textAlign: 'center',
              fontWeight: 800,
            }}
          >
            {label}
          </a>
        ))}
      </div>
    </div>
  )
}
