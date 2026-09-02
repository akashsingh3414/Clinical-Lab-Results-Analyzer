const STATUS_CONFIG = {
  Critical: {
    icon: '🔴',
    text: 'Critical',
    bg: '#FBEAE9',
    color: '#B3261E',
    border: '#F1A5A1',
  },
  Warning: {
    icon: '⚠️',
    text: 'Warning',
    bg: '#FCF3E3',
    color: '#92600A',
    border: '#F7D69E',
  },
  Normal: {
    icon: '✓',
    text: 'Normal',
    bg: '#E9F5EF',
    color: '#1E6B45',
    border: '#A7E1C4',
  },
  Unknown: {
    icon: '❓',
    text: 'Unknown',
    bg: '#EEF0F2',
    color: '#5B6472',
    border: '#CBD1D7',
  },
};

export default function SeverityBadge({ status }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.Unknown;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4rem',
        padding: '0.3rem 0.75rem',
        borderRadius: '9999px',
        backgroundColor: config.bg,
        color: config.color,
        border: `1px solid ${config.border}`,
        fontSize: '0.8rem',
        fontWeight: 700,
        letterSpacing: '0.03em',
        textTransform: 'uppercase',
        boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
      }}
    >
      <span style={{ fontSize: '0.85rem', lineHeight: 1 }}>{config.icon}</span>
      <span>{status || 'Unknown'}</span>
    </span>
  );
}
