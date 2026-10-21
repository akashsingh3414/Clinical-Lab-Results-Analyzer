import { useEffect, useState } from 'react';
import LabInput from './components/LabInput';
import ResultsDisplay from './components/ResultsDisplay';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/+$/, '');

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
  const [health, setHealth] = useState<'checking' | 'ok' | 'unreachable'>('checking');
  const [backendError, setBackendError] = useState('');
  const [results, setResults] = useState<ResultsMap>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE_URL}/health`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const data = await response.json();
        setHealth(data.status === 'ok' ? 'ok' : 'unreachable');
      })
      .catch((error) => {
        setBackendError(error instanceof Error ? error.message : 'Backend unreachable');
        setHealth('unreachable');
      });
  }, []);

  const submitResults = async (payload: Payload | Array<{ test_name: string; value: number; unit?: string }>) => {
    if (loading || !payload) {
      if (!payload) {
        setBackendError('Invalid lab test payload.');
      }
      return;
    }

    try {
      setLoading(true);
      setBackendError('');

      const requestBody = Array.isArray(payload) ? { raw_results: payload } : payload;
      const response = await fetch(`${API_BASE_URL}/analyze_labs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`Backend returned HTTP ${response.status}`);
      }

      const data = await response.json();
      setResults(data.results ?? {});
    } catch (error) {
      setBackendError(error instanceof Error ? error.message : 'Failed to analyze lab results');
    } finally {
      setLoading(false);
    }
  };

  const criticalCount = results.Critical?.length || 0;
  const warningCount = results.Warning?.length || 0;
  const normalCount = results.Normal?.length || 0;
  const totalAnalyzed = criticalCount + warningCount + normalCount + (results.Unknown?.length || 0);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Header Bar */}
      <header
        style={{
          backgroundColor: '#0F172A',
          color: '#FFFFFF',
          padding: '0.9rem 1.5rem',
          borderBottom: '1px solid #1E293B',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        }}
      >
        <div style={{ maxWidth: 1080, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#FFFFFF' }}>
              Clinical Lab Results Analyzer
            </h1>
            <div style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 500 }}>
              Explainable GenAI Clinical Assistant · Reference Data
            </div>
          </div>

          {/* System Status Indicators */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                backgroundColor: health === 'ok' ? 'rgba(16, 185, 129, 0.15)' : health === 'checking' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                color: health === 'ok' ? '#34D399' : health === 'checking' ? '#FBBF24' : '#F87171',
                border: `1px solid ${health === 'ok' ? 'rgba(52, 211, 153, 0.3)' : health === 'checking' ? 'rgba(251, 191, 36, 0.3)' : 'rgba(248, 113, 113, 0.3)'}`,
                padding: '0.35rem 0.8rem',
                borderRadius: '9999px',
                fontSize: '0.78rem',
                fontWeight: 600,
              }}
            >
              <span
                className="pulse-indicator"
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: health === 'ok' ? '#10B981' : health === 'checking' ? '#F59E0B' : '#EF4444',
                  display: 'inline-block',
                }}
              />
              {health === 'ok' ? 'Backend Active' : health === 'checking' ? 'Connecting...' : 'Backend Offline'}
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: 1080, margin: '0 auto', padding: '2rem 1.25rem 3rem', width: '100%', flex: 1 }}>
        {/* Quick Triage Summary Bar (when results exist) */}
        {totalAnalyzed > 0 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: '0.85rem',
              marginBottom: '1.5rem',
            }}
          >
            <div style={{ background: '#FFFFFF', padding: '1rem 1.25rem', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <div style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Total Processed</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0F172A', marginTop: '0.2rem' }}>{totalAnalyzed}</div>
            </div>

            <div style={{ background: '#FDF2F2', padding: '1rem 1.25rem', borderRadius: '12px', border: '1px solid #F87171', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <div style={{ fontSize: '0.78rem', color: '#991B1B', fontWeight: 700, textTransform: 'uppercase' }}>Critical Priority</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#B3261E', marginTop: '0.2rem' }}>{criticalCount}</div>
            </div>

            <div style={{ background: '#FFFBEB', padding: '1rem 1.25rem', borderRadius: '12px', border: '1px solid #FCD34D', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <div style={{ fontSize: '0.78rem', color: '#92400E', fontWeight: 700, textTransform: 'uppercase' }}>Warning Severity</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#92600A', marginTop: '0.2rem' }}>{warningCount}</div>
            </div>

            <div style={{ background: '#F0FDF4', padding: '1rem 1.25rem', borderRadius: '12px', border: '1px solid #86EFAC', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <div style={{ fontSize: '0.78rem', color: '#166534', fontWeight: 700, textTransform: 'uppercase' }}>Normal Status</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1E6B45', marginTop: '0.2rem' }}>{normalCount}</div>
            </div>
          </div>
        )}

        {/* Input Card */}
        <LabInput onAnalyze={submitResults} loading={loading} backendError={backendError} />

        {/* Diagnostic Results Presentation */}
        <ResultsDisplay results={results} loading={loading} />
      </main>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid #E2E8F0', background: '#FFFFFF', padding: '1.25rem', textAlign: 'center', fontSize: '0.8rem', color: '#64748B' }}>
        <div>Clinical Lab Results Analyzer · Built with FastAPI, Model Context Protocol (MCP), LangGraph, and Google Gemini</div>
      </footer>
    </div>
  );
}

export default App;
