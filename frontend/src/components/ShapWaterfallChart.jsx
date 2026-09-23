import React from 'react';
import { TrendingUp, TrendingDown, HelpCircle, BarChart3 } from 'lucide-react';

export const ShapWaterfallChart = ({ shapJson }) => {
  let explanation = null;
  try {
    explanation = typeof shapJson === 'string' ? JSON.parse(shapJson) : shapJson;
  } catch (e) {
    explanation = null;
  }

  if (!explanation || !explanation.features) {
    return <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No SHAP explainability model data available.</p>;
  }

  const { base_value, final_score, features } = explanation;

  return (
    <div className="shap-section" style={{ marginTop: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BarChart3 size={17} color="var(--primary)" />
          <h4 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--primary-dark)' }}>
            Score Attribution (SHAP)
          </h4>
        </div>
        <div style={{ fontSize: '12px', color: '#64748b' }}>
          Base Expected Score: <b>{base_value}%</b> → Final Score: <b>{final_score}%</b>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {features.map((feat, idx) => {
          const isPositive = feat.contribution >= 0;
          const absContrib = Math.abs(feat.contribution);
          const barWidth = Math.min(100, Math.max(5, absContrib * 3.5));

          return (
            <div 
              key={idx}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 'var(--radius-sm)',
                padding: '12px 14px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontWeight: '600', fontSize: '13px', color: '#1e293b' }}>
                  {feat.feature}
                </span>
                <span style={{
                  fontSize: '12px',
                  fontWeight: '700',
                  color: isPositive ? '#059669' : '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  {isPositive ? `+${feat.contribution}%` : `${feat.contribution}%`}
                </span>
              </div>

              {/* Visual Contribution Bar */}
              <div style={{ height: '8px', backgroundColor: '#f1f5f9', borderRadius: '4px', overflow: 'hidden', marginBottom: '8px' }}>
                <div 
                  style={{
                    height: '100%',
                    width: `${barWidth}%`,
                    backgroundColor: isPositive ? '#10b981' : '#ef4444',
                    borderRadius: '4px',
                    transition: 'width 0.4s ease'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: '#64748b' }}>
                <span>Observed: <b>{feat.value}</b></span>
                <span style={{ color: '#475569', fontStyle: 'italic' }}>{feat.explanation}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
