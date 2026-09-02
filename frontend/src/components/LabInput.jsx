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
  const [validationError, setValidationError] = useState('');
  const [csvInput, setCsvInput] = useState('');
  const [mode, setMode] = useState('form'); // 'form' or 'csv'

  const parseCSV = (csvText) => {
    const lines = csvText.trim().split('\n').filter((line) => line.trim());
    if (lines.length <= 1) return; // Skip if only header or empty

    // Skip header row (line 0)
    const dataLines = lines.slice(1);

    const parsed = dataLines
      .map((line) => {
        const parts = line.split(',').map((p) => p.trim());
        if (parts.length < 2) return null;
        return {
          test_name: parts[0],
          value: parts[1] ? Number(parts[1]) : '',
          unit: parts[2] || '',
        };
      })
      .filter((row) => row !== null && row.test_name);

    if (parsed.length > 0) {
      setFormRows(parsed);
    }
  };

  const updateRow = (index, field, value) => {
    setValidationError('');
    setFormRows((current) =>
      current.map((row, rowIndex) => (rowIndex === index ? { ...row, [field]: field === 'value' ? Number(value) : value } : row)),
    );
  };

  const addRow = () => {
    setFormRows((current) => [...current, { test_name: '', value: '', unit: '' }]);
  };

  const removeRow = (index) => {
    if (formRows.length > 1) {
      setFormRows((current) => current.filter((_, rowIndex) => rowIndex !== index));
    }
  };

  const getValidRowsCount = () => {
    return formRows.filter((row) => row.test_name?.trim() && !Number.isNaN(Number(row.value)) && Number(row.value) !== '').length;
  };

  const submitForm = () => {
    const validRows = formRows.filter((row) => {
      const testName = row.test_name?.trim();
      const value = Number(row.value);
      return testName && !Number.isNaN(value);
    });

    if (validRows.length === 0) {
      setValidationError('Please enter at least one test result with a valid name and numeric value.');
      return;
    }

    const cleaned = validRows.map((row) => ({
      test_name: row.test_name.trim(),
      value: Number(row.value),
      unit: row.unit?.trim() || '',
    }));

    setValidationError('');
    onAnalyze({ raw_results: cleaned });
  };

  const canSubmit = getValidRowsCount() > 0 && !loading;

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      {backendError ? <p style={{ color: '#B3261E', marginBottom: '1rem' }}>Error: {backendError}</p> : null}
      {validationError ? <p style={{ color: '#B3261E', marginBottom: '1rem' }}>⚠️ {validationError}</p> : null}

      {/* Mode Toggle Buttons */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.75rem' }}>
        <button
          type="button"
          onClick={() => {
            setMode('form');
            setCsvInput('');
          }}
          style={{
            background: mode === 'form' ? '#1f2937' : '#fff',
            color: mode === 'form' ? '#fff' : '#1f2937',
            border: `1px solid ${mode === 'form' ? '#1f2937' : '#dfe4ea'}`,
            borderRadius: 6,
            padding: '0.5rem 1rem',
            cursor: 'pointer',
            fontSize: '0.9rem',
            fontWeight: mode === 'form' ? '500' : '400',
          }}
        >
          Form Input
        </button>
        <button
          type="button"
          onClick={() => setMode('csv')}
          style={{
            background: mode === 'csv' ? '#1f2937' : '#fff',
            color: mode === 'csv' ? '#fff' : '#1f2937',
            border: `1px solid ${mode === 'csv' ? '#1f2937' : '#dfe4ea'}`,
            borderRadius: 6,
            padding: '0.5rem 1rem',
            cursor: 'pointer',
            fontSize: '0.9rem',
            fontWeight: mode === 'csv' ? '500' : '400',
          }}
        >
          CSV Input
        </button>
      </div>

      {/* CSV Mode */}
      {mode === 'csv' && (
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', alignItems: 'start' }}>
            {/* Left Column - Input */}
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '500', marginBottom: '0.5rem', color: '#374151' }}>
                Paste CSV Data (header row will be skipped)
              </label>
              <textarea
                value={csvInput}
                onChange={(e) => {
                  setCsvInput(e.target.value);
                  if (e.target.value.trim()) {
                    parseCSV(e.target.value);
                  }
                }}
                placeholder="Paste CSV data here..."
                style={{
                  width: '100%',
                  minHeight: '180px',
                  border: '1px solid #dfe4ea',
                  borderRadius: 8,
                  padding: '0.75rem',
                  fontFamily: 'monospace',
                  fontSize: '0.9rem',
                }}
              />
              {csvInput && (
                <button
                  type="button"
                  onClick={() => setCsvInput('')}
                  style={{
                    marginTop: '0.5rem',
                    background: '#eef2f6',
                    color: '#1f2937',
                    border: '1px solid #dfe4ea',
                    borderRadius: 6,
                    padding: '0.4rem 0.8rem',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                  }}
                >
                  Clear CSV
                </button>
              )}
            </div>

            {/* Right Column - Sample */}
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '500', marginBottom: '0.5rem', color: '#374151' }}>
                Sample Format:
              </label>
              <pre
                style={{
                  background: '#f3f4f6',
                  border: '1px solid #dfe4ea',
                  borderRadius: 8,
                  padding: '0.75rem',
                  fontFamily: 'monospace',
                  fontSize: '0.85rem',
                  overflow: 'auto',
                  maxHeight: '180px',
                  color: '#374151',
                  margin: 0,
                }}
              >
{`test_name,value,unit
Hemoglobin,8.2,g/dL
Glucose,450,mg/dL
WBC,2.1,x10^9/L
Potassium,6.8,mEq/L
Creatinine,4.2,mg/dL
Troponin,2.5,ng/mL`}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Form Mode */}
      {mode === 'form' && (
        <>
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {formRows.map((row, index) => (
                <div key={`${row.test_name || 'new'}-${index}`} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '0.75rem', alignItems: 'center' }}>
                  <input
                    value={row.test_name}
                    onChange={(event) => updateRow(index, 'test_name', event.target.value)}
                    placeholder="Test name (required)"
                    style={{ border: '1px solid #dfe4ea', borderRadius: 8, padding: '0.7rem 0.8rem' }}
                  />
                  <input
                    type="number"
                    value={row.value}
                    onChange={(event) => updateRow(index, 'value', event.target.value)}
                    placeholder="Value (required)"
                    style={{ border: '1px solid #dfe4ea', borderRadius: 8, padding: '0.7rem 0.8rem' }}
                  />
                  <input
                    value={row.unit}
                    onChange={(event) => updateRow(index, 'unit', event.target.value)}
                    placeholder="Unit (optional)"
                    style={{ border: '1px solid #dfe4ea', borderRadius: 8, padding: '0.7rem 0.8rem' }}
                  />
                  <button type="button" onClick={() => removeRow(index)} disabled={formRows.length === 1} style={{ border: '1px solid #dfe4ea', borderRadius: 8, padding: '0.65rem 0.8rem', background: '#fff', cursor: formRows.length === 1 ? 'not-allowed' : 'pointer', opacity: formRows.length === 1 ? 0.5 : 1 }}>
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <button type="button" onClick={addRow} style={{ background: '#eef2f6', color: '#1f2937', border: '1px solid #dfe4ea', borderRadius: 8, padding: '0.7rem 1rem' }}>
              + Add Test Result
            </button>
          </div>
        </>
      )}

      {/* Analyze Button */}
      <button type="button" onClick={submitForm} disabled={!canSubmit} style={{ background: canSubmit ? '#1f2937' : '#ccc', color: '#fff', border: 'none', borderRadius: 8, padding: '0.7rem 1.5rem', cursor: canSubmit ? 'pointer' : 'not-allowed', fontWeight: '500' }}>
        {loading ? 'Analyzing...' : 'Analyze'}
      </button>
    </div>
  );
}
