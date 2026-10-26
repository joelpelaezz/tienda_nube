'use client';

export default function ComingSoon({ title }: { title: string }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      gap: '16px',
      color: 'var(--color-text-muted, #6b7280)',
    }}>
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.3 }}>
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
      <div style={{ textAlign: 'center' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 8px', color: 'var(--color-text, #374151)' }}>Próximamente</h2>
        <p style={{ fontSize: '14px', margin: 0 }}>{title}</p>
      </div>
    </div>
  );
}
