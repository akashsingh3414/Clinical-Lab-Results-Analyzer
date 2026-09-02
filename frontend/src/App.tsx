import { useEffect, useState } from 'react';

function App() {
  const [health, setHealth] = useState<string>('Checking backend...');
  const [backendError, setBackendError] = useState<string>('');

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

  return (
    <main style={{ fontFamily: 'sans-serif', padding: '2rem', maxWidth: 800, margin: '0 auto' }}>
      <h1>Clinical Lab Results Analyzer</h1>
      <p>
        Backend status: <strong>{health}</strong>
      </p>
      {backendError ? <p style={{ color: 'crimson' }}>Error: {backendError}</p> : null}
      <p>
        This is the initial skeleton; the real analysis flow will be added in the agent phase.
      </p>
    </main>
  );
}

export default App;
