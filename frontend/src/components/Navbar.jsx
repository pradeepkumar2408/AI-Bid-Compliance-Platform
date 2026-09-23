import React from 'react';
import { ShieldCheck, LogOut, User, Building, FileText, Activity } from 'lucide-react';
import { authService } from '../services/api';

export const Navbar = ({ user, onLogout, activeTab, setActiveTab }) => {
  return (
    <header className="gem-navbar">
      <div className="nav-header">
        <div className="nav-brand">
          <div className="gov-emblem">GeM</div>
          <div>
            <h1 className="brand-title">AI Bid Compliance Verification Platform</h1>
            <p className="brand-sub">Government e-Marketplace | Ministry of Commerce & Industry</p>
          </div>
        </div>

        {user && (
          <div className="nav-user">
            {user.role === 'ROLE_OFFICER' && (
              <button 
                className={`nav-btn ${activeTab === 'audit' ? 'active' : ''}`}
                onClick={() => setActiveTab('audit')}
                style={{ cursor: 'pointer' }}
              >
                <Activity size={15} /> Audit Trail
              </button>
            )}

            <div className="user-badge" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {user.role === 'ROLE_BIDDER' ? <Building size={16} color="#38bdf8" /> : <User size={16} color="#38bdf8" />}
              <span style={{ fontWeight: '700', fontSize: '13px', color: '#ffffff' }}>
                {user.role === 'ROLE_BIDDER' ? (user.organizationName || user.username) : user.username}
              </span>
              <span className="role-pill">
                {user.role === 'ROLE_OFFICER' ? 'Evaluation Officer' : user.role === 'ROLE_BIDDER' ? 'Verified Bidder' : 'Admin'}
              </span>
            </div>

            <button className="nav-btn" onClick={onLogout} title="Logout" style={{ cursor: 'pointer' }}>
              <LogOut size={15} /> Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export const RiskBadge = ({ level }) => {
  const normalized = (level || 'UNKNOWN').toUpperCase();
  if (normalized === 'LOW') {
    return <span className="badge badge-low">🛡️ LOW RISK</span>;
  }
  if (normalized === 'MEDIUM') {
    return <span className="badge badge-medium">⚠️ MEDIUM RISK</span>;
  }
  if (normalized === 'HIGH') {
    return <span className="badge badge-high">🚨 HIGH RISK</span>;
  }
  return <span className="badge">{normalized}</span>;
};
