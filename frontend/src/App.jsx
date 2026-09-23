import React, { useState, useEffect } from 'react';
import { authService } from './services/api';
import { Navbar } from './components/Navbar';
import { LandingPage } from './pages/LandingPage';
import { Login } from './pages/Login';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { BidderDashboard } from './pages/bidder/BidderDashboard';
import { OfficerDashboard } from './pages/officer/OfficerDashboard';
import { AuditTrailModal } from './components/AuditTrailModal';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[React Error Boundary]', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f8fafc',
          padding: '24px',
          fontFamily: 'Inter, sans-serif'
        }}>
          <div style={{
            background: 'white',
            padding: '36px',
            borderRadius: '12px',
            maxWidth: '500px',
            width: '100%',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            textAlign: 'center'
          }}>
            <h2 style={{ color: '#0a3d62', fontSize: '20px', fontWeight: '800', marginBottom: '10px' }}>
              GeM Procurement Platform
            </h2>
            <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '20px' }}>
              The application encountered a display refresh. Click below to reload the landing page.
            </p>
            <button
              onClick={() => {
                localStorage.clear();
                window.location.href = '/';
              }}
              style={{
                backgroundColor: '#0a3d62',
                color: 'white',
                border: 'none',
                padding: '10px 24px',
                borderRadius: '6px',
                fontWeight: '700',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              Return to Landing Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export function AppContent() {
  const [user, setUser] = useState(null);
  const [viewState, setViewState] = useState('landing'); // 'landing' | 'login' | 'dashboard'
  const [prefilledRole, setPrefilledRole] = useState(null);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [activeNavTab, setActiveNavTab] = useState('dashboard');

  useEffect(() => {
    // Check if valid user is in session
    try {
      const currentUser = authService.getCurrentUser();
      if (currentUser && currentUser.token && currentUser.role) {
        setUser(currentUser);
      }
    } catch (e) {
      console.warn('Could not read user session:', e);
    }
  }, []);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    setViewState('dashboard');
  };

  const handleLogout = () => {
    authService.logout();
    setUser(null);
    setViewState('landing');
  };

  const handleRoleSelectFromLanding = (username, password) => {
    setPrefilledRole({ username, password });
    setViewState('login');
  };

  // 1. Initial Landing Page State (Default on project load)
  if (viewState === 'landing' || !user) {
    if (viewState === 'login') {
      return (
        <div>
          <div style={{ position: 'absolute', top: '16px', left: '20px', zIndex: 10 }}>
            <button
              onClick={() => setViewState('landing')}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.4)',
                padding: '6px 14px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '600'
              }}
            >
              ← Back to Home
            </button>
          </div>
          <Login
            initialUsername={prefilledRole?.username}
            initialPassword={prefilledRole?.password}
            onLoginSuccess={handleLoginSuccess}
          />
        </div>
      );
    }

    return (
      <LandingPage
        onGetStarted={() => {
          setPrefilledRole(null);
          setViewState('login');
        }}
        onSelectRole={handleRoleSelectFromLanding}
      />
    );
  }

  // 2. Authenticated Dashboard State
  return (
    <div className="app-container">
      <Navbar
        user={user}
        onLogout={handleLogout}
        activeTab={activeNavTab}
        setActiveTab={(tab) => {
          if (tab === 'audit') {
            setShowAuditModal(true);
          } else {
            setActiveNavTab(tab);
          }
        }}
      />

      <main className="main-content">
        {user.role === 'ROLE_ADMIN' && (
          <AdminDashboard user={user} onOpenAudit={() => setShowAuditModal(true)} />
        )}
        {user.role === 'ROLE_BIDDER' && (
          <BidderDashboard user={user} />
        )}
        {user.role === 'ROLE_OFFICER' && (
          <OfficerDashboard user={user} onOpenAudit={() => setShowAuditModal(true)} />
        )}
      </main>

      {showAuditModal && (
        <AuditTrailModal onClose={() => setShowAuditModal(false)} />
      )}
    </div>
  );
}

export function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

export default App;
