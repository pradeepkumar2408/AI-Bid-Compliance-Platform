import React from 'react';
import { X, FileText, AlertTriangle, ShieldCheck, Copy, Eye } from 'lucide-react';

export const DocumentViewerModal = ({ document, onClose }) => {
  if (!document) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '850px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileText size={22} color="var(--primary)" />
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--primary-dark)' }}>
                {document.filename}
              </h3>
              <span style={{ fontSize: '12px', color: '#64748b' }}>Type: {document.documentType}</span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
            <X size={20} />
          </button>
        </div>

        {/* Document Classification & Relevance Gate */}
        <div style={{
          padding: '12px 14px',
          borderRadius: 'var(--radius-sm)',
          backgroundColor: document.validationStatus === 'INVALID' ? '#fef2f2' : '#f0fdf4',
          border: `1px solid ${document.validationStatus === 'INVALID' ? '#fecaca' : '#bbf7d0'}`,
          marginBottom: '14px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {document.validationStatus === 'INVALID' ? <AlertTriangle size={16} color="#dc2626" /> : <ShieldCheck size={16} color="#16a34a" />}
              <b style={{ fontSize: '13px', color: document.validationStatus === 'INVALID' ? '#991b1b' : '#166534' }}>
                Document Classification: {document.detectedCategory || document.documentType}
              </b>
            </div>
            {document.confidenceScore > 0 && (
              <span style={{ fontSize: '11px', background: 'rgba(0,0,0,0.06)', padding: '2px 6px', borderRadius: '4px', fontWeight: '700' }}>
                {(document.confidenceScore * 100).toFixed(0)}% Confidence
              </span>
            )}
          </div>
          <p style={{ fontSize: '12px', color: '#334155', margin: 0 }}>
            {document.validationStatus === 'INVALID'
              ? (document.rejectionReason || 'Invalid or irrelevant document uploaded. Please upload procurement-related documents such as GST certificate, PAN, or company registration.')
              : 'Verified as valid procurement-related document.'}
          </p>
        </div>

        {/* Security / Fraud Flags Bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '18px' }}>
          {/* Tamper / Forgery Analysis */}
          <div style={{
            padding: '12px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: document.isTampered ? '#fef2f2' : '#f0fdf4',
            border: `1px solid ${document.isTampered ? '#fecaca' : '#bbf7d0'}`
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              {document.isTampered ? <AlertTriangle size={16} color="#dc2626" /> : <ShieldCheck size={16} color="#16a34a" />}
              <b style={{ fontSize: '13px', color: document.isTampered ? '#991b1b' : '#166534' }}>
                Error Level Analysis (ELA)
              </b>
            </div>
            <p style={{ fontSize: '12px', color: '#334155' }}>
              Tamper Score: <b>{(document.tamperScore * 100).toFixed(1)}%</b> — {document.tamperReason || 'No tampering detected.'}
            </p>
          </div>

          {/* Cross-Bidder Duplicate Check */}
          <div style={{
            padding: '12px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: document.isDuplicate ? '#fffbeb' : '#f0fdf4',
            border: `1px solid ${document.isDuplicate ? '#fde68a' : '#bbf7d0'}`
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              {document.isDuplicate ? <AlertTriangle size={16} color="#d97706" /> : <ShieldCheck size={16} color="#16a34a" />}
              <b style={{ fontSize: '13px', color: document.isDuplicate ? '#92400e' : '#166534' }}>
                Duplicate / Fingerprint Check
              </b>
            </div>
            <p style={{ fontSize: '12px', color: '#334155' }}>
              {document.isDuplicate ? `Cross-bidder collusion alert: Matches bidder ${document.duplicateMatchedBidder}` : 'Unique certificate hash verified.'}
            </p>
          </div>
        </div>

        {/* ELA Heatmap View if available */}
        {document.elaImageBase64 && (
          <div style={{ marginBottom: '18px' }}>
            <h4 style={{ fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
              ELA Heatmap (Compression Variance Analysis)
            </h4>
            <div style={{ textAlign: 'center', backgroundColor: '#000', padding: '10px', borderRadius: 'var(--radius-sm)' }}>
              <img src={document.elaImageBase64} alt="ELA Analysis" style={{ maxHeight: '220px', maxWidth: '100%' }} />
            </div>
          </div>
        )}

        {/* OCR Extracted Text */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <h4 style={{ fontSize: '13px', fontWeight: '700', color: '#334155' }}>
              OCR Raw Extracted Content
            </h4>
            <span style={{ fontSize: '11px', color: '#64748b' }}>SHA-256: <code>{document.fileHash?.substring(0, 16)}...</code></span>
          </div>
          <div style={{
            maxHeight: '220px',
            overflowY: 'auto',
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 'var(--radius-sm)',
            padding: '12px',
            fontSize: '12.5px',
            lineHeight: '1.5',
            whiteSpace: 'pre-wrap',
            fontFamily: 'monospace'
          }}>
            {document.ocrText || 'No OCR text extracted from this document.'}
          </div>
        </div>

        <div style={{ marginTop: '20px', textAlign: 'right' }}>
          <button className="btn btn-outline" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};
