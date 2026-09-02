import SeverityBadge from './SeverityBadge';

const STATUS_THEMES = {
  Critical: {
    bg: '#FDF2F2',
    border: '#F98080',
    headerBg: '#FDE8E8',
    headerText: '#9B1C1C',
    accent: '#E02424',
    icon: '🔴',
  },
  Warning: {
    bg: '#FDF6B2',
    border: '#FACA15',
    headerBg: '#FEF08A',
    headerText: '#723B13',
    accent: '#D97706',
    icon: '⚠️',
  },
  Normal: {
    bg: '#F3FAF7',
    border: '#84E1BC',
    headerBg: '#DEF7EC',
    headerText: '#03543F',
    accent: '#0E9F6E',
    icon: '✓',
  },
  Unknown: {
    bg: '#F8FAFC',
    border: '#CBD5E1',
    headerBg: '#F1F5F9',
    headerText: '#334155',
    accent: '#64748B',
    icon: '❓',
  },
};

function RangeMeter({ value, refLow, refHigh, unit, status }) {
  if (refLow == null || refHigh == null || Number.isNaN(Number(value))) {
    return null;
  }

  const low = Number(refLow);
  const high = Number(refHigh);
  const val = Number(value);
  const span = Math.max(high - low, 0.001);

  // Extend scale 40% on either side
  const minScale = low - 0.4 * span;
  const maxScale = high + 0.4 * span;
  const totalScaleSpan = maxScale - minScale;

  const normalStartPct = Math.max(0, Math.min(100, ((low - minScale) / totalScaleSpan) * 100));
  const normalWidthPct = Math.max(0, Math.min(100, (span / totalScaleSpan) * 100));
  const valPct = Math.max(3, Math.min(97, ((val - minScale) / totalScaleSpan) * 100));

  const markerColor =
    status === 'Critical' ? '#B3261E' : status === 'Warning' ? '#D97706' : '#0E9F6E';

  return (
    <div style={{ marginTop: '0.75rem', marginBottom: '0.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748B', marginBottom: '0.25rem', fontWeight: 500 }}>
        <span>Low (&lt;{low})</span>
        <span style={{ color: '#0E9F6E', fontWeight: 600 }}>Normal Interval ({low} – {high} {unit})</span>
        <span>High (&gt;{high})</span>
      </div>

      <div style={{ position: 'relative', height: '10px', background: '#E2E8F0', borderRadius: '9999px', overflow: 'visible' }}>
        {/* Normal Zone (Green) */}
        <div
          style={{
            position: 'absolute',
            left: `${normalStartPct}%`,
            width: `${normalWidthPct}%`,
            height: '100%',
            background: '#A7F3D0',
            borderRadius: '4px',
          }}
        />

        {/* Patient Value Marker Pointer */}
        <div
          title={`Patient Value: ${val} ${unit}`}
          style={{
            position: 'absolute',
            left: `${valPct}%`,
            top: '-5px',
            transform: 'translateX(-50%)',
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            backgroundColor: markerColor,
            border: '3px solid #FFFFFF',
            boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2,
            transition: 'left 0.4s ease',
          }}
        />
      </div>
    </div>
  );
}

export default function ResultsDisplay({ results, loading }) {
  if (!Object.keys(results || {}).length && !loading) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem 1.5rem', background: '#ffffff', borderRadius: '16px', border: '1px dashed #CBD5E1', marginTop: '1.5rem' }}>
        <h3 style={{ margin: '0 0 0.5rem', color: '#1E293B', fontSize: '1.15rem', fontWeight: 600 }}>Ready for Clinical Analysis</h3>
        <p style={{ margin: 0, color: '#64748B', fontSize: '0.92rem' }}>
          Select a preset test panel above, upload a CSV file, or enter lab values manually to generate Explainable AI classifications.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '3.5rem 1rem', background: '#ffffff', borderRadius: '16px', border: '1px solid #E2E8F0', marginTop: '1.5rem' }}>
        <div style={{ display: 'inline-block', width: '36px', height: '36px', border: '4px solid #E2E8F0', borderTopColor: '#2563EB', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '1rem' }} />
        <h3 style={{ margin: '0 0 0.25rem', color: '#1E293B', fontSize: '1.1rem' }}>Analyzing Lab Results...</h3>
        <p style={{ margin: 0, color: '#64748B', fontSize: '0.9rem' }}>
          Executing agent pipeline: Classify &rarr; Reference Range MCP Lookup &rarr; Severity Routing &rarr; Gemini Reasoning
        </p>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const groups = ['Critical', 'Warning', 'Normal', 'Unknown'];
  const totalFindings = groups.reduce((acc, g) => acc + (results[g]?.length || 0), 0);

  return (
    <section style={{ marginTop: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 700, color: '#0F172A', letterSpacing: '-0.02em' }}>
            Clinical Findings &amp; AI Explanations
          </h2>
          <p style={{ margin: '0.2rem 0 0', color: '#64748B', fontSize: '0.88rem' }}>
            Triaged by severity according to clinical priority protocols
          </p>
        </div>
        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', background: '#F1F5F9', padding: '0.35rem 0.85rem', borderRadius: '9999px' }}>
          Total Tests: {totalFindings}
        </div>
      </div>

      {groups.map((group) => {
        const items = results[group] || [];
        if (!items.length) return null;
        const theme = STATUS_THEMES[group];

        return (
          <div
            key={group}
            style={{
              marginBottom: '1.75rem',
              borderRadius: '14px',
              background: '#FFFFFF',
              border: `1px solid ${theme.border}`,
              overflow: 'hidden',
              boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
            }}
          >
            {/* Severity Group Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.85rem 1.25rem',
                background: theme.headerBg,
                borderBottom: `1px solid ${theme.border}`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.05rem' }}>{theme.icon}</span>
                <span style={{ fontWeight: 700, fontSize: '0.95rem', color: theme.headerText, letterSpacing: '0.02em', textTransform: 'uppercase' }}>
                  {group} Priority Findings
                </span>
              </div>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: theme.headerText, background: 'rgba(255,255,255,0.6)', padding: '0.2rem 0.6rem', borderRadius: '9999px' }}>
                {items.length} {items.length === 1 ? 'test' : 'tests'}
              </span>
            </div>

            {/* Items List */}
            <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {items.map((item, index) => (
                <div
                  key={`${group}-${item.test_name}-${index}`}
                  style={{
                    padding: '1.1rem 1.25rem',
                    border: '1px solid #E2E8F0',
                    borderLeft: `4px solid ${theme.accent}`,
                    background: '#FAFAFC',
                    borderRadius: '10px',
                  }}
                >
                  {/* Card Top Row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <div>
                      <span style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0F172A', marginRight: '0.5rem' }}>
                        {item.test_name}
                      </span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.05rem', fontWeight: 600, color: theme.accent }}>
                        {item.value} {item.unit || ''}
                      </span>
                    </div>
                    <SeverityBadge status={item.status || group} />
                  </div>

                  {/* Reference Gauge */}
                  <RangeMeter
                    value={item.value}
                    refLow={item.ref_low}
                    refHigh={item.ref_high}
                    unit={item.unit || ''}
                    status={item.status || group}
                  />

                  {/* Clinical Explanation */}
                  {item.explanation && (
                    <div style={{ marginTop: '0.75rem', padding: '0.75rem 0.9rem', background: '#FFFFFF', borderRadius: '8px', border: '1px solid #EDF2F7' }}>
                      <div style={{ marginBottom: '0.25rem', fontSize: '0.8rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Clinical Significance (Explainable AI)
                      </div>
                      <p style={{ margin: 0, color: '#1E293B', fontSize: '0.94rem', lineHeight: 1.55 }}>
                        {item.explanation}
                      </p>
                    </div>
                  )}

                  {/* Recommended Action */}
                  {item.next_step && (
                    <div style={{ marginTop: '0.55rem', display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.9rem', color: '#334155' }}>
                      <span style={{ color: theme.accent, fontWeight: 700 }}>&bull;</span>
                      <div>
                        <strong style={{ color: '#0F172A' }}>Recommended Next Step: </strong>
                        <span>{item.next_step}</span>
                      </div>
                    </div>
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
