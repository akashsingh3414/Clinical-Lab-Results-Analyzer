import { useEffect, useState } from 'react';
import LabInput from './components/LabInput';
import ResultsDisplay from './components/ResultsDisplay';

type LabResult = {
  test_name: string;
  value: number;
  unit?: string;
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
};

type Payload = {
  raw_results: Array<{ test_name: string; value: number; unit?: string }>;
};

function App() {
  const [health, setHealth] = useState('Checking backend...');
  const [backendError, setBackendError] = useState('');
  const [results, setResults] = useState<ResultsMap>({});
  const [loading, setLoading] = useState(false);

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

  const submitResults = async (payload: Payload | Array<{ test_name: string; value: number; unit?: string }>) => {
    if (loading || !payload) {
      if (!payload) {
        setBackendError('Invalid JSON payload');
      }
      return;
    }

    try {
      setLoading(true);
      setBackendError('');

      const requestBody = Array.isArray(payload) ? { raw_results: payload } : payload;
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
    } catch (error) {
      setBackendError(error instanceof Error ? error.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ maxWidth: 920, margin: '0 auto', padding: '2rem 1.25rem 3rem' }}>
      <header style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ margin: '0 0 0.5rem', fontSize: '2rem', letterSpacing: '-0.04em' }}>Clinical Lab Results Analyzer</h1>
        <p style={{ margin: 0, color: '#58616b', fontSize: '0.95rem' }}>
          Backend status: <strong style={{ color: '#1f2937' }}>{health}</strong>
        </p>
      </header>

      <LabInput onAnalyze={submitResults} loading={loading} backendError={backendError} />
      <ResultsDisplay results={results} loading={loading} />
    </main>
  );
}

export default App;
