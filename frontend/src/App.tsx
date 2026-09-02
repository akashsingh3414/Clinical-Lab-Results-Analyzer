import { useEffect, useState } from 'react';

type LabResult = {
  test_name: string;
  value: number;
  unit: string;
  ref_low?: number | null;
  ref_high?: number | null;
  status?: string;
  explanation?: string;
  next_step?: string;
};

type ResultsMap = {
  Critical?: LabResult[];
  Warning?: LabResult[];
  Normal?: LabResult[];
  Unknown?: LabResult[];
  [key: string]: LabResult[] | undefined;
};

const STATUS_COLORS: Record<string, { bg: string; text: string; badge: string }> = {
  Critical: { bg: '#fee2e2', text: '#991b1b', badge: '🔴' },
  Warning: { bg: '#fef3c7', text: '#92400e', badge: '⚠️' },
  Normal: { bg: '#dcfce7', text: '#15803d', badge: '✓' },
  Unknown: { bg: '#f3f4f6', text: '#4b5563', badge: '❔' },
};

const defaultResults = JSON.stringify(
  {
    raw_results: [
      { test_name: 'Hemoglobin', value: 8.2, unit: 'g/dL' },
      { test_name: 'Glucose', value: 105, unit: 'mg/dL' },
      { test_name: 'WBC', value: 7.5, unit: 'x10^9/L' },
      { test_name: 'Unknown Test', value: 50, unit: 'mg/dL' },
    ],
  },
  null,
  2,
);

function App() {
  const [health, setHealth] = useState<string>('Checking backend...');
  const [backendError, setBackendError] = useState<string>('');
  const [payload, setPayload] = useState<string>(defaultResults);
  const [results, setResults] = useState<ResultsMap>({});
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    fetch('http://localhost:8000/health')
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const data = await response.json();
        setHealth(data.status ?? 'ok');
      })
      .catch((error) => {
        setBackendError(error instanceof Error ? error.message : 'Unknown error');
        setHealth('unreachable');
      });
  }, []);

  const submitResults = async () => {
    try {
      setLoading(true);
      const parsed = JSON.parse(payload);
      // If user only provided the array, wrap it; otherwise send as-is
      const requestBody = Array.isArray(parsed) ? { raw_results: parsed } : parsed;
      const response = await fetch('http://localhost:8000/analyze_labs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      setResults(data.results ?? {});
      setBackendError('');
    } catch (error) {
      setBackendError(error instanceof Error ? error.message : 'Invalid JSON payload');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ fontFamily: 'sans-serif', padding: '2rem', maxWidth: 900, margin: '0 auto' }}>
      <h1>Clinical Lab Results Analyzer</h1>
      <p>
        Backend status: <strong>{health}</strong>
      </p>
      {backendError ? <p style={{ color: 'crimson' }}>Error: {backendError}</p> : null}

      <div style={{ marginTop: '1rem', marginBottom: '1rem' }}>
        <label htmlFor="lab-input" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
          Lab results JSON
        </label>
        <textarea
          id="lab-input"
          value={payload}
          onChange={(event) => setPayload(event.target.value)}
          rows={12}
          style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.9rem' }}
        />
      </div>

      <button onClick={submitResults} disabled={loading} style={{ padding: '0.6rem 1rem', cursor: 'pointer' }}>
        {loading ? 'Analyzing...' : 'Analyze labs'}
      </button>

      <section style={{ marginTop: '2rem' }}>
        {Object.entries(results).length > 0 ? (
          <>
            <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem', borderBottom: '2px solid #e5e7eb', paddingBottom: '0.75rem' }}>
              Results Summary
            </h2>
            {(['Critical', 'Warning', 'Normal', 'Unknown'] as const).map((group) => {
              const items = results[group];
              if (!Array.isArray(items) || items.length === 0) return null;
              const colors = STATUS_COLORS[group];
              return (
                <div key={group} style={{ marginBottom: '2rem', borderRadius: '0.5rem', overflow: 'hidden' }}>
                  <div
                    style={{
                      background: colors.bg,
                      color: colors.text,
                      padding: '0.75rem 1rem',
                      fontWeight: 600,
                      fontSize: '1.1rem',
                      borderLeft: `4px solid ${colors.text}`,
                    }}
                  >
                    {colors.badge} {group} ({items.length})
                  </div>
                  <div style={{ padding: '1rem' }}>
                    {items.map((item, index) => (
                      <div
                        key={`${group}-${index}`}
                        style={{
                          marginBottom: index < items.length - 1 ? '1rem' : 0,
                          paddingBottom: index < items.length - 1 ? '1rem' : 0,
                          borderBottom: index < items.length - 1 ? '1px solid #e5e7eb' : 'none',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                          <div>
                            <span style={{ fontWeight: 600, fontSize: '1.05rem' }}>{item.test_name}</span>
                            <span style={{ color: '#6b7280', marginLeft: '0.5rem' }}>
                              {item.value} {item.unit || ''}
                              {item.ref_low !== null && item.ref_high !== null && item.ref_low !== undefined && item.ref_high !== undefined
                                ? ` — range ${item.ref_low}–${item.ref_high}`
                                : ''}
                            </span>
                          </div>
                          <span
                            style={{
                              background: colors.bg,
                              color: colors.text,
                              padding: '0.25rem 0.75rem',
                              borderRadius: '0.25rem',
                              fontSize: '0.9rem',
                              fontWeight: 500,
                            }}
                          >
                            {colors.badge} {group}
                          </span>
                        </div>
                        {item.explanation && (
                          <p style={{ color: '#4b5563', margin: '0.5rem 0 0 0', lineHeight: 1.5, fontSize: '0.95rem' }}>
                            {item.explanation}
                          </p>
                        )}
                        {item.next_step && (
                          <p style={{ color: '#7c3aed', margin: '0.5rem 0 0 0', fontStyle: 'italic', fontSize: '0.9rem' }}>
                            💡 {item.next_step}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </>
        ) : loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
            <p style={{ color: '#6b7280', fontSize: '1.1rem' }}>Analyzing lab results with Gemini...</p>
          </div>
        ) : (
          <p style={{ color: '#6b7280', textAlign: 'center', marginTop: '2rem' }}>Submit a payload to see grouped findings.</p>
        )}
      </section>
    </main>
  );
}

export default App;
