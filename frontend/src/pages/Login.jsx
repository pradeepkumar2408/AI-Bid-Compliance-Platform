import React, { useState } from 'react';
import { ShieldCheck, Lock, Mail, Building, ArrowRight, CheckCircle2, KeyRound, UserPlus, LogIn, Eye, EyeOff } from 'lucide-react';
import { authService } from '../services/api';

export const Login = ({ onLoginSuccess, initialEmail, initialUsername, initialPassword }) => {
  const [mode, setMode] = useState('login'); // 'login' | 'signup' | 'forgot'
  
  // Login State
  const [email, setEmail] = useState(initialEmail || initialUsername || '');
  const [password, setPassword] = useState(initialPassword || '');
  const [showPassword, setShowPassword] = useState(false);
  
  // Sign Up State
  const [regEmail, setRegEmail] = useState('');
  const [regOrgName, setRegOrgName] = useState('');
  const [regRole, setRegRole] = useState('ROLE_BIDDER');
  const [regPan, setRegPan] = useState('');
  const [regGstin, setRegGstin] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);
  const [taxCheckResult, setTaxCheckResult] = useState(null);
  const [verifyingTax, setVerifyingTax] = useState(false);

  // Forgot Password State
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [showForgotNewPassword, setShowForgotNewPassword] = useState(false);
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [showForgotConfirmPassword, setShowForgotConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleVerifyTaxIdentity = async (panToVerify, gstinToVerify) => {
    const pan = panToVerify !== undefined ? panToVerify : regPan;
    const gstin = gstinToVerify !== undefined ? gstinToVerify : regGstin;

    if (!pan && !gstin) {
      setError('Please enter PAN and GSTIN to verify.');
      return;
    }

    setVerifyingTax(true);
    setError('');
    try {
      const res = await authService.verifyIdentity({
        entityName: regOrgName ? regOrgName.trim() : '',
        pan: pan.trim().toUpperCase(),
        gstin: gstin.trim().toUpperCase()
      });
      setTaxCheckResult(res);

      // If user hasn't typed an organization name yet and credentials are real, auto-populate registered name
      if (!regOrgName && (res.isPanReal || res.isGstinReal)) {
        const officialName = res.gstTradeName || res.panTaxpayerName || res.gstLegalName;
        if (officialName && !officialName.includes('NOT FOUND')) {
          setRegOrgName(officialName);
        }
      }
    } catch (err) {
      setError('Could not complete tax verification: ' + (err.response?.data || err.message));
    } finally {
      setVerifyingTax(false);
    }
  };

  const extractError = (err, fallback) => {
    if (!err.response) {
      return 'Cannot connect to backend server at http://localhost:8080. Please ensure the backend is running.';
    }
    const data = err.response.data;
    if (typeof data === 'string' && data.trim()) return data;
    if (data && typeof data === 'object') {
      if (data.message) return data.message;
      if (data.error) return data.error;
    }
    return fallback;
  };

  const handleLogin = async (e) => {
    e?.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      const user = await authService.login(email.trim(), password);
      onLoginSuccess(user);
    } catch (err) {
      setError(extractError(err, 'Invalid email or password.'));
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (regPassword !== regConfirmPassword) {
      setError('Passwords do not match. Please re-enter the password to confirm.');
      return;
    }
    if (regPassword.length < 4) {
      setError('Password must be at least 4 characters long.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMsg('');

    // Strict PAN & GSTIN Verification for Bidder / Vendor
    if (regRole === 'ROLE_BIDDER') {
      if (!regPan || !regGstin) {
        setError('Company PAN and GSTIN are mandatory for Vendor/Bidder registration.');
        setLoading(false);
        return;
      }

      let verification = taxCheckResult;
      // Auto-verify if not verified yet or if inputs changed
      if (!verification || verification.pan !== regPan.trim().toUpperCase() || verification.gstin !== regGstin.trim().toUpperCase()) {
        try {
          verification = await authService.verifyIdentity({
            entityName: regOrgName || 'Registered Bidder Entity',
            pan: regPan.trim().toUpperCase(),
            gstin: regGstin.trim().toUpperCase()
          });
          setTaxCheckResult(verification);
        } catch (verErr) {
          setError('Tax Verification Failed: ' + (verErr.response?.data || verErr.message));
          setLoading(false);
          return;
        }
      }

      const isRealAndActive = verification && (
        (verification.overallStatus === 'REAL_AND_VERIFIED' || verification.overallStatus === 'VERIFIED') ||
        (verification.isPanReal && verification.isGstinReal && verification.panGstMatched && !verification.isDebarred)
      );
      if (!isRealAndActive) {
        setError('Registration Blocked: ' + (verification?.message || 'Your PAN and GSTIN must be verified as REAL & ACTIVE on the Government Tax Registry before you can register.'));
        setLoading(false);
        return;
      }
    }

    try {
      const orgName = regRole === 'ROLE_BIDDER' 
        ? regOrgName.trim() 
        : (regOrgName.trim() || 'GeM Procurement Evaluation Authority');

      await authService.register({
        email: regEmail.trim(),
        password: regPassword,
        role: regRole,
        organizationName: orgName,
        pan: regRole === 'ROLE_BIDDER' ? regPan.trim().toUpperCase() : null,
        gstin: regRole === 'ROLE_BIDDER' ? regGstin.trim().toUpperCase() : null,
      });
      if (regRole === 'ROLE_OFFICER') {
        setSuccessMsg('👮 Evaluation Officer registration submitted! Your account is pending clearance from the GeM Administrator. Once approved, you will be able to log in.');
      } else {
        setSuccessMsg('Account created successfully! Please sign in with your email.');
      }
      setEmail(regEmail.trim());
      setPassword('');
      setRegConfirmPassword('');
      setMode('login');
      setTaxCheckResult(null);
    } catch (err) {
      setError(extractError(err, 'Registration failed. Please check your details.'));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (forgotNewPassword !== forgotConfirmPassword) {
      setError('New passwords do not match.');
      return;
    }
    if (forgotNewPassword.length < 4) {
      setError('Password must be at least 4 characters long.');
      return;
    }
    setLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      await authService.forgotPassword(forgotEmail.trim(), forgotNewPassword);
      setSuccessMsg('Password updated successfully! Please sign in with your new password.');
      setEmail(forgotEmail.trim());
      setPassword('');
      setMode('login');
    } catch (err) {
      setError(extractError(err, 'Failed to reset password.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #072a44 0%, #0a3d62 60%, #1e6091 100%)',
      padding: '20px'
    }}>
      <div className="animate-scale-in" style={{
        background: 'white',
        borderRadius: 'var(--radius-xl)',
        padding: '36px',
        maxWidth: mode === 'signup' ? '540px' : '440px',
        width: '100%',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1)',
        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            display: 'inline-flex',
            padding: '12px',
            borderRadius: '16px',
            backgroundColor: '#e0f2fe',
            color: 'var(--primary)',
            marginBottom: '10px'
          }}>
            <ShieldCheck size={36} />
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--primary-dark)' }}>
            GeM Bid Compliance Platform
          </h2>
          <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
            {mode === 'login' && 'Sign in with your official email to access portal'}
            {mode === 'signup' && 'Create a new GeM procurement account'}
            {mode === 'forgot' && 'Reset and recover your account password'}
          </p>
        </div>

        {/* Mode Switcher Tabs (Sign In / Sign Up) */}
        {mode !== 'forgot' && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            backgroundColor: '#f1f5f9',
            borderRadius: '8px',
            padding: '4px',
            marginBottom: '20px'
          }}>
            <button
              type="button"
              onClick={() => { setMode('login'); setError(''); setSuccessMsg(''); setTaxCheckResult(null); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '8px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: '700',
                fontSize: '13px',
                backgroundColor: mode === 'login' ? 'white' : 'transparent',
                color: mode === 'login' ? 'var(--primary-dark)' : '#64748b',
                boxShadow: mode === 'login' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.2s'
              }}
            >
              <LogIn size={15} /> Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode('signup'); setError(''); setSuccessMsg(''); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '8px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: '700',
                fontSize: '13px',
                backgroundColor: mode === 'signup' ? 'white' : 'transparent',
                color: mode === 'signup' ? 'var(--primary-dark)' : '#64748b',
                boxShadow: mode === 'signup' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.2s'
              }}
            >
              <UserPlus size={15} /> Sign Up
            </button>
          </div>
        )}

        {/* Success Alert */}
        {successMsg && (
          <div style={{
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            color: '#15803d',
            padding: '10px 14px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '13px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <CheckCircle2 size={16} /> {successMsg}
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#dc2626',
            padding: '10px 14px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '13px',
            marginBottom: '16px'
          }}>
            {error}
          </div>
        )}

        {/* 1. SIGN IN FORM */}
        {mode === 'login' && (
          <form onSubmit={handleLogin}>

            <div className="form-group">
              <label className="form-label">Official Email or Username</label>
              <input
                type="text"
                className="form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. bidder1, officer, admin or your email"
                required
              />
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label className="form-label" style={{ margin: 0 }}>Password</label>
                <button
                  type="button"
                  onClick={() => { setMode('forgot'); setForgotEmail(email); setError(''); setSuccessMsg(''); }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--primary-light)',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  Forgot Password?
                </button>
              </div>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  style={{ paddingRight: '40px', width: '100%' }}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#64748b'
                  }}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '8px', padding: '12px' }}
              disabled={loading}
            >
              {loading ? 'Authenticating...' : 'Sign In to GeM Portal'} <ArrowRight size={16} />
            </button>
          </form>
        )}

        {/* 2. SIGN UP / REGISTER FORM */}
        {mode === 'signup' && (
          <form onSubmit={handleRegister}>
            <div className="form-group">
              <label className="form-label">Official Email Address</label>
              <input
                type="email"
                className="form-input"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                placeholder="e.g. contact@yourcompany.com"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Account Role</label>
              <select
                className="form-select"
                value={regRole}
                onChange={(e) => {
                  setRegRole(e.target.value);
                  setTaxCheckResult(null);
                  setError('');
                }}
              >
                <option value="ROLE_BIDDER">💼 Vendor / Bidder</option>
                <option value="ROLE_OFFICER">👮 Evaluation Officer</option>
              </select>
            </div>

            {/* Organization field - ONLY for Vendor / Bidder */}
            {regRole === 'ROLE_BIDDER' && (
              <div className="form-group">
                <label className="form-label">Organization / Entity Legal Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={regOrgName}
                  onChange={(e) => setRegOrgName(e.target.value)}
                  placeholder="e.g. Bharat Tech Solutions Private Limited"
                  required
                />
              </div>
            )}

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Password</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    className="form-input"
                    style={{ paddingRight: '40px', width: '100%' }}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Create password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#64748b'
                    }}
                    title={showRegPassword ? 'Hide password' : 'Show password'}
                  >
                    {showRegPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Re-enter Password</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type={showRegConfirmPassword ? 'text' : 'password'}
                    className="form-input"
                    style={{ paddingRight: '40px', width: '100%' }}
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    placeholder="Confirm password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#64748b'
                    }}
                    title={showRegConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showRegConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Vendor / Bidder Income Tax & GSTN API Verification Section */}
            {regRole === 'ROLE_BIDDER' && (
              <div style={{
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '14px',
                marginBottom: '16px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div>
                    <label className="form-label" style={{ margin: 0, fontWeight: '700', color: '#0f172a', fontSize: '13px' }}>
                      🏛️ Income Tax & GSTN API Verification
                    </label>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>Live CBDT & GST Portal database verification</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleVerifyTaxIdentity()}
                    disabled={verifyingTax || (!regPan && !regGstin)}
                    style={{
                      background: '#0a3d62',
                      color: 'white',
                      border: 'none',
                      padding: '5px 12px',
                      borderRadius: '4px',
                      fontSize: '11.5px',
                      fontWeight: '700',
                      cursor: (verifyingTax || (!regPan && !regGstin)) ? 'not-allowed' : 'pointer',
                      opacity: (verifyingTax || (!regPan && !regGstin)) ? 0.6 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    {verifyingTax ? 'Calling ITD API...' : '⚡ Query Tax API'}
                  </button>
                </div>

                <div className="grid-2">
                  <div className="form-group" style={{ marginBottom: '8px' }}>
                    <label className="form-label" style={{ fontSize: '12px' }}>Company PAN</label>
                    <input
                      type="text"
                      className="form-input"
                      value={regPan}
                      onChange={(e) => {
                        const val = e.target.value.toUpperCase();
                        setRegPan(val);
                        setTaxCheckResult(null);
                      }}
                      placeholder="Enter Company PAN"
                      required
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: '8px' }}>
                    <label className="form-label" style={{ fontSize: '12px' }}>GSTIN</label>
                    <input
                      type="text"
                      className="form-input"
                      value={regGstin}
                      onChange={(e) => {
                        const val = e.target.value.toUpperCase();
                        setRegGstin(val);
                        setTaxCheckResult(null);
                      }}
                      placeholder="Enter Company GSTIN"
                      required
                    />
                  </div>
                </div>

                {/* Simplified Live Tax Verification Result */}
                {taxCheckResult && (() => {
                  const isReal = taxCheckResult.isPanReal && taxCheckResult.isGstinReal && taxCheckResult.panGstMatched && !taxCheckResult.isDebarred && taxCheckResult.overallStatus !== 'BLACKLISTED';
                  const isDebarred = taxCheckResult.isDebarred || taxCheckResult.overallStatus === 'BLACKLISTED';

                  return (
                    <div style={{
                      marginTop: '12px',
                      padding: '10px 14px',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: '600',
                      backgroundColor: isReal ? '#f0fdf4' : '#fef2f2',
                      border: `1px solid ${isReal ? '#86efac' : '#fca5a5'}`,
                      color: isReal ? '#166534' : '#991b1b',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>Status:</span>
                        <b style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          backgroundColor: isReal ? '#dcfce7' : '#fee2e2',
                          color: isReal ? '#15803d' : '#dc2626'
                        }}>
                          {isDebarred
                            ? '⛔ DEBARRED / BLACKLISTED'
                            : isReal
                            ? '✅ REAL'
                            : '❌ FAKE'}
                        </b>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>Name Verification:</span>
                        <b style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          backgroundColor: taxCheckResult.isNameMatched ? '#dcfce7' : '#fee2e2',
                          color: taxCheckResult.isNameMatched ? '#15803d' : '#dc2626'
                        }}>
                          {taxCheckResult.isNameMatched ? '✅ MATCHED' : '❌ NOT MATCHED'}
                        </b>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Registration Verification Status Badge for Bidders */}
            {regRole === 'ROLE_BIDDER' && (
              <div style={{
                marginBottom: '10px',
                padding: '8px 12px',
                borderRadius: '6px',
                fontSize: '11.5px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                fontWeight: '600',
                backgroundColor: (taxCheckResult?.overallStatus === 'REAL_AND_VERIFIED' || taxCheckResult?.overallStatus === 'VERIFIED')
                  ? '#f0fdf4'
                  : '#f8fafc',
                border: `1px dashed ${
                  (taxCheckResult?.overallStatus === 'REAL_AND_VERIFIED' || taxCheckResult?.overallStatus === 'VERIFIED')
                    ? '#86efac'
                    : '#cbd5e1'
                }`,
                color: (taxCheckResult?.overallStatus === 'REAL_AND_VERIFIED' || taxCheckResult?.overallStatus === 'VERIFIED')
                  ? '#15803d'
                  : '#64748b'
              }}>
                {(taxCheckResult?.overallStatus === 'REAL_AND_VERIFIED' || taxCheckResult?.overallStatus === 'VERIFIED') ? (
                  <span>✅ Tax Identifiers Verified REAL & ACTIVE — Ready to Register</span>
                ) : (
                  <span>🔒 Tax Verification Required: PAN & GSTIN must be verified REAL & ACTIVE</span>
                )}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '4px', padding: '12px' }}
              disabled={loading}
            >
              {loading ? 'Verifying & Registering...' : 'Register Account'} <UserPlus size={16} />
            </button>
          </form>
        )}

        {/* 3. FORGOT PASSWORD FORM */}
        {mode === 'forgot' && (
          <form onSubmit={handleForgotPassword}>
            <div className="form-group">
              <label className="form-label">Registered Official Email</label>
              <input
                type="email"
                className="form-input"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder="Enter your registered email address"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">New Password</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type={showForgotNewPassword ? 'text' : 'password'}
                  className="form-input"
                  style={{ paddingRight: '40px', width: '100%' }}
                  value={forgotNewPassword}
                  onChange={(e) => setForgotNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowForgotNewPassword(!showForgotNewPassword)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#64748b'
                  }}
                  title={showForgotNewPassword ? 'Hide password' : 'Show password'}
                >
                  {showForgotNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type={showForgotConfirmPassword ? 'text' : 'password'}
                  className="form-input"
                  style={{ paddingRight: '40px', width: '100%' }}
                  value={forgotConfirmPassword}
                  onChange={(e) => setForgotConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowForgotConfirmPassword(!showForgotConfirmPassword)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#64748b'
                  }}
                  title={showForgotConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showForgotConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '8px', padding: '12px' }}
              disabled={loading}
            >
              {loading ? 'Resetting Password...' : 'Reset Password'} <KeyRound size={16} />
            </button>

            <div style={{ textAlign: 'center', marginTop: '16px' }}>
              <button
                type="button"
                onClick={() => { setMode('login'); setError(''); setSuccessMsg(''); }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  fontSize: '13px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                ← Back to Sign In
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
