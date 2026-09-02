import { useState } from 'react';

const defaultPayload = {
  raw_results: [
    { test_name: 'Hemoglobin', value: 8.2, unit: 'g/dL' },
    { test_name: 'Glucose', value: 105, unit: 'mg/dL' },
    { test_name: 'WBC', value: 7.5, unit: 'x10^9/L' },
    { test_name: 'Unknown Test', value: 50, unit: 'mg/dL' },
  ],
};

export default function LabInput({ onAnalyze, loading, backendError }) {
  const [formRows, setFormRows] = useState(defaultPayload.raw_results);

  const updateRow = (index, field, value) => {
    setFormRows((current) =>
      current.map((row, rowIndex) => (rowIndex === index ? { ...row, [field]: field === 'value' ? Number(value) : value } : row)),
    );
  };

  const addRow = () => {
    setFormRows((current) => [...current, { test_name: '', value: 0, unit: '' }]);
  };

  const removeRow = (index) => {
    setFormRows((current) => current.filter((_, rowIndex) => rowIndex !== index));
  };

  const submitForm = () => {
    const cleaned = formRows
      .filter((row) => row.test_name?.trim())
      .map((row) => ({
        test_name: row.test_name.trim(),
        value: Number(row.value),
        unit: row.unit?.trim() || '',
      }));

    onAnalyze({ raw_results: cleaned });
    setPayload(JSON.stringify({ raw_results: cleaned }, null, 2));
  };

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      {backendError ? <p style={{ color: '#B3261E', marginBottom: '1rem' }}>Error: {backendError}</p> : null}

      <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '1rem' }}>
        {formRows.map((row, index) => (
          <div key={`${row.test_name || 'new'}-${index}`} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '0.75rem', alignItems: 'center' }}>
            <input
              value={row.test_name}
              onChange={(event) => updateRow(index, 'test_name', event.target.value)}
              placeholder="Test name"
              style={{ border: '1px solid #dfe4ea', borderRadius: 8, padding: '0.7rem 0.8rem' }}
            />
            <input
              type="number"
              value={row.value}
              onChange={(event) => updateRow(index, 'value', event.target.value)}
              placeholder="Value"
              style={{ border: '1px solid #dfe4ea', borderRadius: 8, padding: '0.7rem 0.8rem' }}
            />
            <input
              value={row.unit}
              onChange={(event) => updateRow(index, 'unit', event.target.value)}
              placeholder="Unit"
              style={{ border: '1px solid #dfe4ea', borderRadius: 8, padding: '0.7rem 0.8rem' }}
            />
            <button type="button" onClick={() => removeRow(index)} disabled={formRows.length === 1} style={{ border: '1px solid #dfe4ea', borderRadius: 8, padding: '0.65rem 0.8rem', background: '#fff' }}>
              Remove
            </button>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <button type="button" onClick={addRow} style={{ background: '#eef2f6', color: '#1f2937', border: '1px solid #dfe4ea', borderRadius: 8, padding: '0.7rem 1rem' }}>
          + Add Test Result
        </button>
        <button type="button" onClick={submitForm} disabled={loading} style={{ background: '#1f2937', color: '#fff', border: 'none', borderRadius: 8, padding: '0.7rem 1rem', cursor: loading ? 'wait' : 'pointer' }}>
          {loading ? 'Analyzing...' : 'Analyze Form'}
        </button>
      </div>

    </div>
  );
}
