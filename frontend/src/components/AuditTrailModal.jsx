import React, { useEffect, useState } from 'react';
import { X, Activity, ShieldCheck, Hash, Clock, User } from 'lucide-react';
import { officerService } from '../services/api';

export const AuditTrailModal = ({ onClose }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const data = await officerService.getAuditTrail();
      setLogs(data);
    } catch (err) {
      console.error('Error loading audit trail:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '1100px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Activity size={24} color="var(--primary)" />
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--primary-dark)' }}>
                Immutable Audit Trail (SHA-256 Chained Integrity Log)
              </h3>
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                Full Government Procurement Accountability & Tamper-Evident Trail
              </span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <p>Loading audit trail...</p>
        ) : (
          <div className="gem-table-container" style={{ maxHeight: '60vh' }}>
            <table className="gem-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Event Type</th>
                  <th>Actor</th>
                  <th>Description</th>
                  <th>Integrity Hash (SHA-256)</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td style={{ whiteSpace: 'nowrap', fontSize: '12px', color: '#64748b' }}>
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: '700',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        backgroundColor: log.eventType.includes('OVERRIDE') ? '#fef2f2' : '#f1f5f9',
                        color: log.eventType.includes('OVERRIDE') ? '#dc2626' : 'var(--primary-dark)'
                      }}>
                        {log.eventType}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontSize: '12px', fontWeight: '600' }}>{log.actorUsername}</div>
                      <div style={{ fontSize: '10.5px', color: '#64748b' }}>{log.actorRole}</div>
                    </td>
                    <td style={{ fontSize: '12.5px', maxWidth: '380px', lineHeight: '1.4' }}>
                      {log.actionDescription}
                    </td>
                    <td>
                      <code style={{ fontSize: '10.5px', color: '#0369a1', background: '#f0f9ff', padding: '2px 6px', borderRadius: '4px' }}>
                        {log.integrityHash?.substring(0, 14)}...
                      </code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ marginTop: '20px', textAlign: 'right' }}>
          <button className="btn btn-outline" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};
