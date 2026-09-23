import React, { useEffect, useState } from 'react';
import { 
  ShieldCheck, 
  Award, 
  FileSearch, 
  Scale, 
  Lock, 
  CheckCircle2, 
  ArrowRight, 
  Building2, 
  FileText, 
  Activity, 
  Search,
  Sparkles,
  Users,
  ChevronRight
} from 'lucide-react';
import { tenderService } from '../services/api';

export const LandingPage = ({ onGetStarted, onSelectRole }) => {
  const [tenders, setTenders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPublicTenders();
  }, []);

  const fetchPublicTenders = async () => {
    try {
      const data = await tenderService.getAll();
      setTenders(data);
    } catch (err) {
      console.error('Error fetching public tenders:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
      {/* Top GeM Banner */}
      <header style={{
        background: 'linear-gradient(135deg, #072a44 0%, #0a3d62 100%)',
        color: 'white',
        padding: '16px 36px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
      }}>
        <div style={{ maxWidth: '1300px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              background: '#ffffff',
              color: '#0a3d62',
              fontWeight: '900',
              fontSize: '16px',
              padding: '6px 12px',
              borderRadius: '6px',
              letterSpacing: '1px'
            }}>
              GeM
            </div>
            <div>
              <h1 style={{ fontSize: '18px', fontWeight: '800', margin: 0, letterSpacing: '0.2px' }}>
                Government e-Marketplace
              </h1>
              <p style={{ fontSize: '11.5px', opacity: 0.85, margin: 0 }}>
                Ministry of Commerce & Industry | National Procurement Portal
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => onGetStarted()}
              style={{
                background: '#e67e22',
                color: 'white',
                border: 'none',
                padding: '9px 20px',
                borderRadius: '6px',
                fontWeight: '700',
                fontSize: '13.5px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                transition: 'all 0.2s'
              }}
            >
              Sign In to Portal <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section style={{
        background: 'linear-gradient(180deg, #0a3d62 0%, #1e6091 60%, #f8fafc 100%)',
        color: 'white',
        padding: '65px 24px 85px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div className="animate-fade-in-up" style={{ maxWidth: '950px', margin: '0 auto', position: 'relative', zIndex: 2 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(255, 255, 255, 0.16)',
            border: '1px solid rgba(255, 255, 255, 0.35)',
            padding: '6px 18px',
            borderRadius: '24px',
            fontSize: '13px',
            fontWeight: '600',
            marginBottom: '22px',
            backdropFilter: 'blur(8px)',
            boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
            transition: 'transform 0.3s ease'
          }}>
            <Sparkles size={16} color="#fde047" className="animate-float" /> Next-Gen AI Procurement Evaluation Architecture
          </div>

          <h1 style={{
            fontSize: '38px',
            fontWeight: '900',
            lineHeight: 1.25,
            marginBottom: '18px',
            textShadow: '0 2px 8px rgba(0,0,0,0.25)',
            letterSpacing: '-0.02em'
          }}>
            AI-Powered Integrated Bid Compliance Verification Platform
          </h1>

          <p style={{
            fontSize: '16px',
            lineHeight: 1.65,
            opacity: 0.95,
            maxWidth: '780px',
            margin: '0 auto 32px',
            color: '#f0f9ff'
          }}>
            An intelligent verification engine combining embedded Drools Rule evaluation, SHAP explainable scoring, Error Level Analysis (ELA) document forgery detection, and government registry validation.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '20px' }}>
            <button
              onClick={() => onGetStarted()}
              className="btn btn-accent"
              style={{
                padding: '12px 32px',
                borderRadius: '8px',
                fontWeight: '700',
                fontSize: '15px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px',
                boxShadow: '0 6px 20px rgba(230, 126, 34, 0.4)'
              }}
            >
              Sign In to GeM Portal <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </section>

      {/* Core Platform Capabilities Grid */}
      <section style={{ maxWidth: '1200px', margin: '30px auto 40px', padding: '0 24px', width: '100%' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '20px'
        }}>
          <div className="gem-card hover-elevate animate-fade-in-up" style={{ marginBottom: 0, borderTop: '3px solid #0a3d62' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div style={{ background: '#f0f7ff', padding: '8px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Scale size={22} color="#0a3d62" />
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#0a3d62' }}>Deterministic Drools Rules</h3>
            </div>
            <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.55 }}>
              Executes rule matrix matching financial turnover, technical experience, and quality certifications against tender baselines with 100% transparent traces.
            </p>
          </div>

          <div className="gem-card hover-elevate animate-fade-in-up" style={{ marginBottom: 0, borderTop: '3px solid #0284c7', animationDelay: '0.1s' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div style={{ background: '#f0f9ff', padding: '8px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Award size={22} color="#0284c7" />
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#0a3d62' }}>Explainable AI (SHAP)</h3>
            </div>
            <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.55 }}>
              Provides feature attribution waterfall charts explaining the positive and negative contribution of every factor to the compliance score.
            </p>
          </div>

          <div className="gem-card hover-elevate animate-fade-in-up" style={{ marginBottom: 0, borderTop: '3px solid #e67e22', animationDelay: '0.2s' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div style={{ background: '#fff9f0', padding: '8px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileSearch size={22} color="#e67e22" />
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#0a3d62' }}>ELA Forgery & Duplicate Check</h3>
            </div>
            <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.55 }}>
              Error Level Analysis detects digitally edited text or altered stamps. Perceptual hashing flags cross-bidder reused certificates.
            </p>
          </div>
        </div>
      </section>

      {/* Active Tenders Public Catalog */}
      <section style={{ maxWidth: '1200px', margin: '0 auto 50px', padding: '0 24px', width: '100%' }}>
        <div className="gem-card animate-fade-in-up">
          <div className="card-header">
            <div className="card-title" style={{ fontSize: '18px' }}>
              <Building2 size={22} color="#0a3d62" /> Currently Open GeM Procurement Tenders ({tenders.length})
            </div>
            <button className="btn btn-primary" onClick={() => onGetStarted()}>
              Participate / Submit Bid <ChevronRight size={16} />
            </button>
          </div>

          {loading ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
              <div className="animate-float" style={{ fontSize: '24px', marginBottom: '8px' }}>⏳</div>
              <p>Loading active tenders...</p>
            </div>
          ) : (
            <div className="gem-table-container">
              <table className="gem-table">
                <thead>
                  <tr>
                    <th>Tender Reference</th>
                    <th>Procurement Title & Ministry</th>
                    <th>Estimated Value</th>
                    <th>Eligibility Criteria</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {tenders.map((t) => {
                    let certs = [];
                    if (Array.isArray(t.requiredCertsJson)) {
                      certs = t.requiredCertsJson;
                    } else if (typeof t.requiredCertsJson === 'string') {
                      try {
                        certs = JSON.parse(t.requiredCertsJson || '[]');
                      } catch (e) {
                        certs = [];
                      }
                    }

                    const estCr = t.estimatedValue ? (Number(t.estimatedValue) / 10000000).toFixed(2) : '0.00';
                    const minTurnCr = t.minTurnover ? (Number(t.minTurnover) / 10000000).toFixed(2) : '0.00';
                    const pubDate = t.createdAt ? new Date(t.createdAt).toLocaleDateString() : 'Active';

                    return (
                      <tr key={t.id || Math.random()}>
                        <td>
                          <b style={{ color: '#0a3d62', fontSize: '13px' }}>{t.tenderNumber || 'GEM/2026'}</b>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>
                            Published: {pubDate}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: '600', color: '#1e293b' }}>{t.title || 'Procurement Tender'}</div>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>{t.department || 'Government Ministry'}</div>
                        </td>
                        <td>
                          <b style={{ color: '#0f172a' }}>₹{estCr} Cr</b>
                        </td>
                        <td>
                          <div style={{ fontSize: '12px' }}>
                            Turnover: <b>₹{minTurnCr} Cr</b> | Exp: <b>{t.minExperienceYears || 0} Yrs</b>
                          </div>
                          <div style={{ display: 'flex', gap: '4px', marginTop: '4px', flexWrap: 'wrap' }}>
                            {Array.isArray(certs) && certs.map((c, i) => (
                              <span key={i} style={{ fontSize: '10px', background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px', fontWeight: '600' }}>
                                {c}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td>
                          <span className="badge badge-low">{t.status || 'ACTIVE'}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
      {/* Footer */}
      <footer style={{
        marginTop: 'auto',
        backgroundColor: '#072a44',
        color: '#94a3b8',
        padding: '24px 36px',
        textAlign: 'center',
        fontSize: '12.5px',
        borderTop: '1px solid #1e293b'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            Government e-Marketplace (GeM) | An initiative of Ministry of Commerce and Industry
          </div>
          <div>
            AI Decision Support • Drools Rules • SHA-256 Tamper-Proof Audit Chain
          </div>
        </div>
      </footer>
    </div>
  );
};
