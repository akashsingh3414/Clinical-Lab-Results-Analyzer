import SeverityBadge from './SeverityBadge';

const STATUS_STYLES = {
  Critical: { bg: '#FBEAE9', border: '#B3261E' },
  Warning: { bg: '#FCF3E3', border: '#92600A' },
  Normal: { bg: '#E9F5EF', border: '#1E6B45' },
  Unknown: { bg: '#EEF0F2', border: '#5B6472' },
};

export default function ResultsDisplay({ results, loading }) {
  if (!Object.keys(results || {}).length && !loading) {
    return <p style={{ color: '#6b7280', textAlign: 'center', marginTop: '2rem' }}>Submit a payload to see grouped findings.</p>;
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem 0' }}>
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>…</div>
        <p style={{ margin: 0, color: '#58616b' }}>Analyzing lab results with Gemini...</p>
      </div>
    );
  }

  return (
    <section style={{ marginTop: '2rem' }}>
      <h2 style={{ marginBottom: '1.25rem', paddingBottom: '0.5rem', borderBottom: '1px solid #e5e7eb', fontSize: '1.3rem', letterSpacing: '-0.02em' }}>
        Results Summary
      </h2>
      {(['Critical', 'Warning', 'Normal', 'Unknown']).map((group) => {
        const items = results[group] || [];
        if (!items.length) return null;
        const style = STATUS_STYLES[group];

        return (
          <div key={group} style={{ marginBottom: '1.5rem', borderRadius: 12, background: '#fff', border: '1px solid #edf0f3' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.8rem 1rem', background: style.bg, color: '#1f2937', borderLeft: `3px solid ${style.border}` }}>
              <span style={{ fontWeight: 700, fontSize: '0.85rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{group}</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>({items.length})</span>
            </div>

            <div style={{ padding: '1rem' }}>
              {items.map((item, index) => (
                <div key={`${group}-${index}`} style={{ marginBottom: index < items.length - 1 ? '1rem' : 0, padding: '0.9rem', borderLeft: `3px solid ${style.border}`, background: '#fafbfc', borderRadius: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    <strong style={{ fontSize: '1rem', color: '#1f2937' }}>{item.test_name}</strong>
                    <SeverityBadge status={group} />
                  </div>

                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: '#525d68', marginBottom: '0.5rem' }}>
                    {item.value} {item.unit || ''}
                    {item.ref_low != null && item.ref_high != null ? ` · range ${item.ref_low}–${item.ref_high}` : ''}
                  </div>

                  {item.explanation && (
                    <p style={{ margin: '0.5rem 0 0.35rem', color: '#374151', lineHeight: 1.6, fontSize: '0.96rem' }}>{item.explanation}</p>
                  )}

                  {item.next_step && (
                    <p style={{ margin: 0, color: '#4b5563', fontSize: '0.92rem' }}><strong>Next step:</strong> {item.next_step}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </section>
  );
}
