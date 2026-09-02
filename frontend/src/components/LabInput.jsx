import { useState, useRef } from 'react';

// Synthetic datasets corresponding to test_data/ CSV files
const PRESET_DATASETS = {
  normal: {
    label: 'Normal Panel',
    badge: '✓ Normal',
    desc: 'All values within standard physiological reference ranges',
    activeStyles: {
      bg: '#F0FDF4',
      border: '2px solid #16A34A',
      badgeBg: '#DCFCE7',
      badgeColor: '#15803D',
      titleColor: '#14532D',
    },
    data: [
      { test_name: 'Hemoglobin', value: 14.5, unit: 'g/dL' },
      { test_name: 'Glucose', value: 88, unit: 'mg/dL' },
      { test_name: 'WBC', value: 6.5, unit: 'x10^9/L' },
      { test_name: 'Potassium', value: 4.2, unit: 'mmol/L' },
      { test_name: 'Sodium', value: 140, unit: 'mmol/L' },
      { test_name: 'Creatinine', value: 0.9, unit: 'mg/dL' },
    ],
  },
  mixed: {
    label: 'Mixed Panel',
    badge: '⚠️ Warning',
    desc: 'Blend of normal, borderline warning, and elevated markers',
    activeStyles: {
      bg: '#FFFBEB',
      border: '2px solid #D97706',
      badgeBg: '#FEF3C7',
      badgeColor: '#B45309',
      titleColor: '#78350F',
    },
    data: [
      { test_name: 'Hemoglobin', value: 10.2, unit: 'g/dL' },
      { test_name: 'Glucose', value: 180, unit: 'mg/dL' },
      { test_name: 'WBC', value: 6.8, unit: 'x10^9/L' },
      { test_name: 'Platelets', value: 400, unit: 'x10^9/L' },
      { test_name: 'Creatinine', value: 1.3, unit: 'mg/dL' },
      { test_name: 'Sodium', value: 140, unit: 'mEq/L' },
      { test_name: 'Potassium', value: 3.2, unit: 'mEq/L' },
      { test_name: 'ALT', value: 65, unit: 'U/L' },
    ],
  },
  critical: {
    label: 'Critical Panel',
    badge: '🔴 Critical',
    desc: 'High-acuity life-threatening lab values requiring urgent action',
    activeStyles: {
      bg: '#FEF2F2',
      border: '2px solid #DC2626',
      badgeBg: '#FEE2E2',
      badgeColor: '#B91C1C',
      titleColor: '#7F1D1D',
    },
    data: [
      { test_name: 'Hemoglobin', value: 5.8, unit: 'g/dL' },
      { test_name: 'Glucose', value: 480, unit: 'mg/dL' },
      { test_name: 'Potassium', value: 6.9, unit: 'mmol/L' },
      { test_name: 'Creatinine', value: 4.8, unit: 'mg/dL' },
      { test_name: 'WBC', value: 24.5, unit: 'x10^9/L' },
    ],
  },
};

export default function LabInput({ onAnalyze, loading, backendError }) {
  const [activePreset, setActivePreset] = useState('mixed');
  const [formRows, setFormRows] = useState(PRESET_DATASETS.mixed.data);
  const [validationError, setValidationError] = useState('');
  const [csvInput, setCsvInput] = useState('');
  const [mode, setMode] = useState('form'); // 'form' | 'csv' | 'upload'
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const parseCSVContent = (csvText) => {
    const lines = csvText.trim().split('\n').filter((l) => l.trim());
    if (lines.length === 0) {
      setValidationError('Uploaded CSV file is empty.');
      return false;
    }

    let startIndex = 0;
    const firstLineLower = lines[0].toLowerCase();
    if (firstLineLower.includes('test') || firstLineLower.includes('name') || firstLineLower.includes('value')) {
      startIndex = 1;
    }

    const dataLines = lines.slice(startIndex);
    const parsed = dataLines
      .map((line) => {
        const parts = line.split(',').map((p) => p.trim().replace(/^["']|["']$/g, ''));
        if (parts.length < 2) return null;
        const val = Number(parts[1]);
        if (!parts[0] || Number.isNaN(val)) return null;
        return {
          test_name: parts[0],
          value: val,
          unit: parts[2] || '',
        };
      })
      .filter(Boolean);

    if (parsed.length === 0) {
      setValidationError('Could not extract valid lab test rows from CSV. Expected: test_name,value,unit');
      return false;
    }

    setFormRows(parsed);
    setActivePreset(null);
    setValidationError('');
    return true;
  };

  const handleFileUpload = (file) => {
    if (!file) return;
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      setValidationError('Please upload a valid .csv file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text === 'string') {
        setCsvInput(text);
        const ok = parseCSVContent(text);
        if (ok) {
          setMode('form');
        }
      }
    };
    reader.readAsText(file);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const updateRow = (index, field, value) => {
    setActivePreset(null);
    setValidationError('');
    setFormRows((current) =>
      current.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [field]: field === 'value' ? (value === '' ? '' : Number(value)) : value } : row,
      ),
    );
  };

  const addRow = () => {
    setActivePreset(null);
    setFormRows((current) => [...current, { test_name: '', value: '', unit: '' }]);
  };

  const removeRow = (index) => {
    setActivePreset(null);
    if (formRows.length > 1) {
      setFormRows((current) => current.filter((_, rowIndex) => rowIndex !== index));
    }
  };

  const loadPreset = (key) => {
    setActivePreset(key);
    setValidationError('');
    setFormRows(PRESET_DATASETS[key].data);
    setMode('form');
  };

  const submitAnalysis = () => {
    const validRows = formRows.filter((row) => {
      const testName = String(row.test_name || '').trim();
      const val = Number(row.value);
      return testName.length > 0 && !Number.isNaN(val) && row.value !== '';
    });

    if (validRows.length === 0) {
      setValidationError('Please specify at least 1 valid lab test name and numeric value.');
      return;
    }

    const payload = validRows.map((r) => ({
      test_name: r.test_name.trim(),
      value: Number(r.value),
      unit: (r.unit || '').trim(),
    }));

    setValidationError('');
    onAnalyze({ raw_results: payload });
  };

  return (
    <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '1.5rem', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
      {/* 1-Click Evaluation Presets */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Preset Test Panels (Synthetic Benchmarks)
          </span>
          <span style={{ fontSize: '0.75rem', color: '#64748B' }}>1-Click Select</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
          {Object.entries(PRESET_DATASETS).map(([key, preset]) => {
            const isSelected = activePreset === key;
            const styles = preset.activeStyles;

            return (
              <button
                key={key}
                type="button"
                onClick={() => loadPreset(key)}
                style={{
                  textAlign: 'left',
                  padding: '0.8rem 1rem',
                  borderRadius: '12px',
                  border: isSelected ? styles.border : '1px solid #E2E8F0',
                  background: isSelected ? styles.bg : '#F8FAFC',
                  cursor: 'pointer',
                  position: 'relative',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.borderColor = '#94A3B8';
                    e.currentTarget.style.background = '#F1F5F9';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.borderColor = '#E2E8F0';
                    e.currentTarget.style.background = '#F8FAFC';
                  }
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                  <span
                    style={{
                      fontWeight: 700,
                      fontSize: '0.92rem',
                      color: isSelected ? styles.titleColor : '#0F172A',
                    }}
                  >
                    {preset.label}
                  </span>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      padding: '0.2rem 0.55rem',
                      borderRadius: '9999px',
                      background: isSelected ? styles.badgeBg : '#EDF2F7',
                      color: isSelected ? styles.badgeColor : '#475569',
                      border: isSelected ? `1px solid ${styles.badgeColor}40` : '1px solid transparent',
                    }}
                  >
                    {preset.badge}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: '0.76rem',
                    color: isSelected ? styles.titleColor : '#64748B',
                    opacity: isSelected ? 0.9 : 1,
                    lineHeight: 1.4,
                  }}
                >
                  {preset.desc}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Mode Switch Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid #E2E8F0', paddingBottom: '0.75rem', marginBottom: '1.25rem' }}>
        <button
          type="button"
          onClick={() => setMode('form')}
          style={{
            padding: '0.45rem 1rem',
            borderRadius: '8px',
            border: 'none',
            fontWeight: 600,
            fontSize: '0.88rem',
            cursor: 'pointer',
            backgroundColor: mode === 'form' ? '#0F172A' : '#F1F5F9',
            color: mode === 'form' ? '#FFFFFF' : '#475569',
          }}
        >
          Form Input ({formRows.length} tests)
        </button>
        <button
          type="button"
          onClick={() => setMode('upload')}
          style={{
            padding: '0.45rem 1rem',
            borderRadius: '8px',
            border: 'none',
            fontWeight: 600,
            fontSize: '0.88rem',
            cursor: 'pointer',
            backgroundColor: mode === 'upload' ? '#0F172A' : '#F1F5F9',
            color: mode === 'upload' ? '#FFFFFF' : '#475569',
          }}
        >
          Upload CSV
        </button>
        <button
          type="button"
          onClick={() => setMode('csv')}
          style={{
            padding: '0.45rem 1rem',
            borderRadius: '8px',
            border: 'none',
            fontWeight: 600,
            fontSize: '0.88rem',
            cursor: 'pointer',
            backgroundColor: mode === 'csv' ? '#0F172A' : '#F1F5F9',
            color: mode === 'csv' ? '#FFFFFF' : '#475569',
          }}
        >
          Paste CSV
        </button>
      </div>

      {/* Error Banners */}
      {backendError && (
        <div style={{ padding: '0.75rem 1rem', background: '#FDF2F2', border: '1px solid #F87171', borderRadius: '8px', color: '#991B1B', marginBottom: '1rem', fontSize: '0.9rem' }}>
          <strong>Backend Error:</strong> {backendError}
        </div>
      )}
      {validationError && (
        <div style={{ padding: '0.75rem 1rem', background: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: '8px', color: '#92400E', marginBottom: '1rem', fontSize: '0.9rem' }}>
          {validationError}
        </div>
      )}

      {/* Mode 1: File Upload / Drag & Drop */}
      {mode === 'upload' && (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          style={{
            border: `2px dashed ${dragActive ? '#2563EB' : '#CBD5E1'}`,
            borderRadius: '12px',
            padding: '2.5rem 1.5rem',
            textAlign: 'center',
            backgroundColor: dragActive ? '#EFF6FF' : '#F8FAFC',
            marginBottom: '1.25rem',
            cursor: 'pointer',
          }}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            style={{ display: 'none' }}
            onChange={(e) => {
              if (e.target.files?.[0]) handleFileUpload(e.target.files[0]);
            }}
          />
          <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0F172A', marginBottom: '0.25rem' }}>
            Drag and drop your lab test CSV file here
          </div>
          <p style={{ margin: '0 0 1rem', color: '#64748B', fontSize: '0.88rem' }}>
            Supports <code>normal_results.csv</code>, <code>mixed_results.csv</code>, <code>critical_results.csv</code>, or custom files
          </p>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
            style={{
              padding: '0.5rem 1.25rem',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              background: '#FFFFFF',
              color: '#0F172A',
              fontWeight: 600,
              fontSize: '0.88rem',
              cursor: 'pointer',
            }}
          >
            Browse Files
          </button>
        </div>
      )}

      {/* Mode 2: Raw CSV Paste */}
      {mode === 'csv' && (
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.4rem' }}>
            Paste CSV Content (Comma-separated: test_name,value,unit)
          </label>
          <textarea
            value={csvInput}
            onChange={(e) => {
              setCsvInput(e.target.value);
              if (e.target.value.trim()) parseCSVContent(e.target.value);
            }}
            placeholder="test_name,value,unit&#10;Hemoglobin,10.2,g/dL&#10;Glucose,180,mg/dL&#10;Potassium,3.2,mEq/L"
            rows={6}
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.88rem',
              boxSizing: 'border-box',
            }}
          />
        </div>
      )}

      {/* Mode 3: Interactive Table Rows */}
      {mode === 'form' && (
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 1fr auto', gap: '0.5rem', marginBottom: '0.4rem', padding: '0 0.2rem' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Test Name</span>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Value</span>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Unit</span>
            <span style={{ width: '40px' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '340px', overflowY: 'auto', paddingRight: '0.2rem' }}>
            {formRows.map((row, index) => (
              <div
                key={`row-${index}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1.2fr 1fr auto',
                  gap: '0.5rem',
                  alignItems: 'center',
                }}
              >
                <input
                  type="text"
                  value={row.test_name}
                  onChange={(e) => updateRow(index, 'test_name', e.target.value)}
                  placeholder="e.g. Hemoglobin"
                  style={{
                    padding: '0.6rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.9rem',
                  }}
                />
                <input
                  type="number"
                  step="any"
                  value={row.value}
                  onChange={(e) => updateRow(index, 'value', e.target.value)}
                  placeholder="e.g. 14.5"
                  style={{
                    padding: '0.6rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.9rem',
                    fontFamily: 'var(--font-mono)',
                  }}
                />
                <input
                  type="text"
                  value={row.unit}
                  onChange={(e) => updateRow(index, 'unit', e.target.value)}
                  placeholder="e.g. g/dL"
                  style={{
                    padding: '0.6rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.9rem',
                  }}
                />
                <button
                  type="button"
                  title="Remove test"
                  onClick={() => removeRow(index)}
                  disabled={formRows.length <= 1}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                    background: '#F8FAFC',
                    color: '#94A3B8',
                    cursor: formRows.length > 1 ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1rem',
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '0.75rem' }}>
            <button
              type="button"
              onClick={addRow}
              style={{
                padding: '0.45rem 0.9rem',
                borderRadius: '8px',
                border: '1px dashed #94A3B8',
                background: '#F8FAFC',
                color: '#334155',
                fontWeight: 600,
                fontSize: '0.84rem',
                cursor: 'pointer',
              }}
            >
              + Add Another Test
            </button>
          </div>
        </div>
      )}

      {/* Action Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid #F1F5F9' }}>
        <div style={{ fontSize: '0.85rem', color: '#64748B' }}>
          {formRows.length} test{formRows.length === 1 ? '' : 's'} queued for analysis
        </div>
        <button
          type="button"
          onClick={submitAnalysis}
          disabled={loading}
          style={{
            padding: '0.75rem 2rem',
            borderRadius: '10px',
            border: 'none',
            background: loading ? '#94A3B8' : '#2563EB',
            color: '#FFFFFF',
            fontWeight: 700,
            fontSize: '0.95rem',
            cursor: loading ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 10px rgba(37, 99, 235, 0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          {loading ? 'Analyzing Labs...' : 'Analyze Clinical Labs'}
        </button>
      </div>
    </div>
  );
}
