import { useEffect, useState } from 'react';

type LabResult = {
  test_name: string;
  value: number;
  unit: string;
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
            <h2>Results</h2>
            {Object.entries(results).map(([group, items]) => (
              <div key={group} style={{ marginBottom: '1.5rem' }}>
                <h3>{group}</h3>
                {Array.isArray(items) && items.length > 0 ? (
                  <ul>
                    {items.map((item, index) => (
                      <li key={`${group}-${index}`}>
                        <strong>{item.test_name}</strong>: {item.value} {item.unit || ''}
                        {item.explanation ? ` — ${item.explanation}` : ''}
                        {item.next_step ? ` | Next step: ${item.next_step}` : ''}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>No items in this category.</p>
                )}
              </div>
            ))}
          </>
        ) : (
          <p>Submit a payload to see grouped findings.</p>
        )}
      </section>
    </main>
  );
}

export default App;
