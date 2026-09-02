const STATUS_STYLES = {
  Critical: { bg: '#FBEAE9', text: '#B3261E', border: '#B3261E' },
  Warning: { bg: '#FCF3E3', text: '#92600A', border: '#92600A' },
  Normal: { bg: '#E9F5EF', text: '#1E6B45', border: '#1E6B45' },
  Unknown: { bg: '#EEF0F2', text: '#5B6472', border: '#5B6472' },
};

export default function SeverityBadge({ status }) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.Unknown;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '4px 10px',
        borderRadius: 999,
        background: style.bg,
        color: style.text,
        border: `1px solid ${style.border}`,
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: 999,
          background: style.text,
          display: 'inline-block',
        }}
      />
      {status}
    </span>
  );
}
