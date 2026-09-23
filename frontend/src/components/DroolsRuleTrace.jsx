import React from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Scale } from 'lucide-react';

export const DroolsRuleTrace = ({ traceJson }) => {
  let rules = [];
  try {
    rules = typeof traceJson === 'string' ? JSON.parse(traceJson) : (traceJson || []);
  } catch (e) {
    rules = [];
  }

  if (!rules || rules.length === 0) {
    return <p className="text-muted" style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No rule execution trace available.</p>;
  }

  return (
    <div className="drools-trace-section" style={{ marginTop: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <Scale size={17} color="var(--primary)" />
        <h4 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--primary-dark)' }}>
          Eligibility Rules Trace ({rules.length})
        </h4>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {rules.map((r, idx) => (
          <div 
            key={idx}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              padding: '12px 14px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: r.passed ? '#f0fdf4' : '#fef2f2',
              border: `1px solid ${r.passed ? '#bbf7d0' : '#fecaca'}`,
            }}
          >
            {r.passed ? (
              <CheckCircle2 size={20} color="#16a34a" style={{ flexShrink: 0, marginTop: '2px' }} />
            ) : (
              <XCircle size={20} color="#dc2626" style={{ flexShrink: 0, marginTop: '2px' }} />
            )}

            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ fontWeight: '700', fontSize: '13.5px', color: r.passed ? '#15803d' : '#b91c1c' }}>
                  {r.ruleName}
                </span>
                <span style={{ 
                  fontSize: '11px', 
                  fontWeight: '700', 
                  padding: '2px 8px', 
                  borderRadius: '12px',
                  backgroundColor: r.passed ? '#dcfce7' : '#fee2e2',
                  color: r.passed ? '#166534' : '#991b1b'
                }}>
                  {r.scoreImpact > 0 ? `+${r.scoreImpact}` : r.scoreImpact} pts
                </span>
              </div>
              <p style={{ fontSize: '12.5px', color: '#334155', lineHeight: '1.4' }}>
                {r.message}
              </p>
              <div style={{ display: 'flex', gap: '12px', marginTop: '6px', fontSize: '11px', color: '#64748b' }}>
                <span>Category: <b>{r.category}</b></span>
                <span>Type: <b>{r.isMandatory ? 'Mandatory Gate' : 'Weighted Criterion'}</b></span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
