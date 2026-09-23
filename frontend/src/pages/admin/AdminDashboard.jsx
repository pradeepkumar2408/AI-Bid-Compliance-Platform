import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Users,
  FileText,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  BarChart3,
  Sliders,
  FolderOpen,
  History,
  Bell,
  Settings,
  PlusCircle,
  RefreshCw,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Lock,
  Unlock,
  Trash2,
  Eye,
  Download,
  Check,
  Building,
  KeyRound,
  FileCode,
  Sparkles,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Cpu,
  Database
} from 'lucide-react';
import { adminService, tenderService } from '../../services/api';

export const AdminDashboard = ({ onOpenAudit }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Overview Data
  const [overviewStats, setOverviewStats] = useState(null);

  // User Management Data
  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('ALL');
  const [userStatusFilter, setUserStatusFilter] = useState('ALL');
  const [selectedUserForPasswordReset, setSelectedUserForPasswordReset] = useState(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [selectedUserActivity, setSelectedUserActivity] = useState(null);

  // Tender & Bid Monitoring Data
  const [tenders, setTenders] = useState([]);
  const [selectedTenderBids, setSelectedTenderBids] = useState(null);
  const [inspectingTender, setInspectingTender] = useState(null);

  // Verification Logs Data
  const [verificationLogs, setVerificationLogs] = useState([]);
  const [verificationFilter, setVerificationFilter] = useState('ALL');

  // Risk & Fraud Alerts Data
  const [fraudAlerts, setFraudAlerts] = useState({ alerts: [], highSeverityCount: 0, mediumSeverityCount: 0, lowSeverityCount: 0 });
  const [fraudCategoryFilter, setFraudCategoryFilter] = useState('ALL');

  // Analytics Data
  const [analytics, setAnalytics] = useState(null);

  // Rule Engine Data
  const [rules, setRules] = useState([]);
  const [ruleWeights, setRuleWeights] = useState({});
  const [showAddRuleModal, setShowAddRuleModal] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [ruleForm, setRuleForm] = useState({
    ruleName: '',
    ruleCategory: 'FINANCIAL',
    conditionExpression: '',
    weight: 1.0,
    isMandatory: true,
    passCriterion: ''
  });
  const [selectedTenderIdForRule, setSelectedTenderIdForRule] = useState('');

  // Document Monitoring Data
  const [documents, setDocuments] = useState([]);
  const [docSearch, setDocSearch] = useState('');
  const [selectedDocForOcr, setSelectedDocForOcr] = useState(null);

  // Audit Logs & Chain Verification Data
  const [auditLogs, setAuditLogs] = useState([]);
  const [chainStatus, setChainStatus] = useState(null);
  const [auditSearch, setAuditSearch] = useState('');

  // Notifications Data
  const [notifications, setNotifications] = useState([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  // System Settings Data
  const [settings, setSettings] = useState({
    nsdlApiMode: 'LIVE_SIMULATION',
    gstnApiMode: 'LIVE_SIMULATION',
    digilockerEnabled: true,
    cvcDebarmentSync: true,
    highRiskThreshold: 50.0,
    lowRiskThreshold: 75.0,
    ocrEngine: 'Tesseract-OCR v5.3',
    elaTamperSensitivity: 'BALANCED',
    droolsExecutionMode: 'STRICT'
  });

  // Tender Creation Modal
  const [showCreateTenderModal, setShowCreateTenderModal] = useState(false);
  const [tenderNumber, setTenderNumber] = useState(`GEM/${new Date().getFullYear()}/B/${Math.floor(100000 + Math.random() * 900000)}`);
  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [category, setCategory] = useState('');
  const [estimatedValue, setEstimatedValue] = useState('');
  const [minTurnover, setMinTurnover] = useState('');
  const [minExperienceYears, setMinExperienceYears] = useState('');
  const [selectedCerts, setSelectedCerts] = useState([]);
  const [creatingTender, setCreatingTender] = useState(false);
  const certOptions = ['ISO-9001', 'ISO-27001', 'ISO-14001', 'CMMI-Level-3/5', 'BIS/ISI', 'MSME/UDYAM'];

  // Initial Load
  useEffect(() => {
    loadAllData();
  }, []);

  const showNotification = (msg, isError = false) => {
    if (isError) {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(''), 5000);
    } else {
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(''), 5000);
    }
  };

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [
        statsData,
        usersData,
        tendersData,
        verifData,
        fraudData,
        analyticsData,
        rulesData,
        weightsData,
        docsData,
        logsData,
        notifsData,
        settingsData
      ] = await Promise.all([
        adminService.getOverviewStats().catch(() => null),
        adminService.getAllUsers().catch(() => []),
        adminService.getTendersSummary().catch(() => []),
        adminService.getVerificationLogs('ALL').catch(() => []),
        adminService.getFraudAlerts().catch(() => ({ alerts: [], highSeverityCount: 0, mediumSeverityCount: 0, lowSeverityCount: 0 })),
        adminService.getAnalytics().catch(() => null),
        adminService.getAllRules().catch(() => []),
        adminService.getRuleWeights().catch(() => ({})),
        adminService.getAllDocuments().catch(() => []),
        adminService.getAuditLogs().catch(() => []),
        adminService.getNotifications().catch(() => []),
        adminService.getSystemSettings().catch(() => ({}))
      ]);

      if (statsData) setOverviewStats(statsData);
      setUsers(usersData);
      setTenders(tendersData);
      setVerificationLogs(verifData);
      setFraudAlerts(fraudData);
      if (analyticsData) setAnalytics(analyticsData);
      setRules(rulesData);
      setRuleWeights(weightsData);
      setDocuments(docsData);
      setAuditLogs(logsData);
      setNotifications(notifsData);
      if (settingsData && Object.keys(settingsData).length > 0) setSettings(settingsData);
    } catch (err) {
      console.error('Error loading admin data:', err);
      showNotification('Failed to load some admin telemetry data.', true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadAllData();
  };

  // --- USER MANAGEMENT HANDLERS ---
  const handleApproveOfficer = async (user) => {
    try {
      await adminService.updateUserStatus(user.id, 'ACTIVE');
      showNotification(`Evaluation Officer "${user.username}" approved successfully! They may now log in.`);
      const updated = await adminService.getAllUsers();
      setUsers(updated);
      const updatedStats = await adminService.getOverviewStats().catch(() => null);
      if (updatedStats) setOverviewStats(updatedStats);
    } catch (err) {
      showNotification('Failed to approve officer: ' + (err.response?.data?.error || err.message), true);
    }
  };

  const handleToggleUserStatus = async (user) => {
    const nextStatus = user.status === 'BLOCKED' ? 'ACTIVE' : 'BLOCKED';
    if (!window.confirm(`Are you sure you want to change user "${user.username}" status to ${nextStatus}?`)) return;
    try {
      await adminService.updateUserStatus(user.id, nextStatus);
      showNotification(`User ${user.username} is now ${nextStatus}`);
      const updated = await adminService.getAllUsers();
      setUsers(updated);
    } catch (err) {
      showNotification('Failed to update user status: ' + (err.response?.data?.error || err.message), true);
    }
  };

  const handleToggleVerifyIdentity = async (user) => {
    const nextVal = !user.isIdentityVerified;
    try {
      await adminService.verifyUserIdentity(user.id, nextVal);
      showNotification(`User ${user.username} identity verification set to ${nextVal ? 'VERIFIED' : 'UNVERIFIED'}`);
      const updated = await adminService.getAllUsers();
      setUsers(updated);
    } catch (err) {
      showNotification('Failed to update verification: ' + (err.response?.data?.error || err.message), true);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!newPasswordInput || !selectedUserForPasswordReset) return;
    try {
      await adminService.resetUserPassword(selectedUserForPasswordReset.id, newPasswordInput);
      showNotification(`Password reset successfully for ${selectedUserForPasswordReset.username}`);
      setSelectedUserForPasswordReset(null);
      setNewPasswordInput('');
    } catch (err) {
      showNotification('Failed to reset password: ' + (err.response?.data?.error || err.message), true);
    }
  };

  const handleDeleteUser = async (user) => {
    if (!window.confirm(`WARNING: Are you sure you want to permanently delete user "${user.username}"?`)) return;
    try {
      await adminService.deleteUser(user.id);
      showNotification(`User ${user.username} deleted.`);
      const updated = await adminService.getAllUsers();
      setUsers(updated);
    } catch (err) {
      showNotification('Failed to delete user: ' + (err.response?.data?.error || err.message), true);
    }
  };

  const handleViewUserActivity = async (username) => {
    try {
      const logs = await adminService.getUserActivity(username);
      setSelectedUserActivity({ username, logs });
    } catch (err) {
      showNotification('Failed to fetch user activity: ' + err.message, true);
    }
  };

  // --- TENDER & BID INSPECTION HANDLERS ---
  const handleInspectTender = async (tender) => {
    setInspectingTender(tender);
    try {
      const bids = await adminService.getTenderBids(tender.id);
      setSelectedTenderBids(bids);
    } catch (err) {
      showNotification('Failed to fetch bids for tender: ' + err.message, true);
    }
  };

  // --- VERIFICATION LOGS HANDLER ---
  const handleVerificationFilterChange = async (filter) => {
    setVerificationFilter(filter);
    try {
      const filtered = await adminService.getVerificationLogs(filter);
      setVerificationLogs(filtered);
    } catch (err) {
      showNotification('Failed to filter verification logs: ' + err.message, true);
    }
  };

  // --- RULE ENGINE HANDLERS ---
  const handleSaveRule = async (e) => {
    e.preventDefault();
    try {
      if (editingRule) {
        await adminService.updateRule(editingRule.id, ruleForm);
        showNotification('Compliance rule updated successfully');
      } else {
        const tenderId = selectedTenderIdForRule || (tenders.length > 0 ? tenders[0].id : 1);
        await adminService.createRule(tenderId, ruleForm);
        showNotification('New compliance rule created');
      }
      setShowAddRuleModal(false);
      setEditingRule(null);
      setRuleForm({ ruleName: '', ruleCategory: 'FINANCIAL', conditionExpression: '', weight: 1.0, isMandatory: true, passCriterion: '' });
      const updatedRules = await adminService.getAllRules();
      setRules(updatedRules);
    } catch (err) {
      showNotification('Failed to save rule: ' + (err.response?.data?.error || err.message), true);
    }
  };

  const handleDeleteRule = async (ruleId) => {
    if (!window.confirm('Delete this compliance rule?')) return;
    try {
      await adminService.deleteRule(ruleId);
      showNotification('Rule deleted.');
      const updated = await adminService.getAllRules();
      setRules(updated);
    } catch (err) {
      showNotification('Failed to delete rule: ' + (err.response?.data?.error || err.message), true);
    }
  };

  const handleUpdateRuleWeights = async (e) => {
    e.preventDefault();
    try {
      await adminService.updateRuleWeights(ruleWeights);
      showNotification('Scoring weights updated successfully!');
    } catch (err) {
      showNotification('Failed to update weights: ' + err.message, true);
    }
  };

  // --- AUDIT CHAIN VERIFICATION ---
  const handleVerifyAuditChain = async () => {
    try {
      const res = await adminService.verifyAuditChain();
      setChainStatus(res);
      showNotification(res.message, !res.isChainValid);
    } catch (err) {
      showNotification('Failed to verify cryptographic audit chain: ' + err.message, true);
    }
  };

  // --- SYSTEM SETTINGS HANDLERS ---
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      const updated = await adminService.updateSystemSettings(settings);
      setSettings(updated);
      showNotification('System integrations & risk configuration saved successfully.');
    } catch (err) {
      showNotification('Failed to save settings: ' + err.message, true);
    }
  };

  // --- PUBLISH TENDER HANDLER ---
  const handleCertToggle = (cert) => {
    if (selectedCerts.includes(cert)) {
      setSelectedCerts(selectedCerts.filter((c) => c !== cert));
    } else {
      setSelectedCerts([...selectedCerts, cert]);
    }
  };

  const handleCreateTender = async (e) => {
    e.preventDefault();
    setCreatingTender(true);
    try {
      await tenderService.create({
        tenderNumber,
        title,
        department,
        category,
        estimatedValue: parseFloat(estimatedValue),
        minTurnover: parseFloat(minTurnover),
        minExperienceYears: parseFloat(minExperienceYears),
        requiredCertifications: selectedCerts,
      });
      showNotification('Tender and Drools eligibility baseline created successfully!');
      setShowCreateTenderModal(false);
      loadAllData();
    } catch (err) {
      showNotification('Failed to publish tender: ' + (err.response?.data || err.message), true);
    } finally {
      setCreatingTender(false);
    }
  };

  // --- REPORT EXPORTERS ---
  const exportToCsv = (filename, rows) => {
    if (!rows || !rows.length) return showNotification('No data available to export.', true);
    const separator = ',';
    const keys = Object.keys(rows[0]);
    const csvContent =
      keys.join(separator) +
      '\n' +
      rows.map(row => {
        return keys.map(k => {
          let cell = row[k] === null || row[k] === undefined ? '' : row[k];
          cell = cell instanceof Date ? cell.toLocaleString() : cell.toString().replace(/"/g, '""');
          if (cell.search(/("|,|\n)/g) >= 0) cell = `"${cell}"`;
          return cell;
        }).join(separator);
      }).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportJsonReport = () => {
    const reportData = {
      generatedAt: new Date().toISOString(),
      overviewStats,
      tendersCount: tenders.length,
      usersCount: users.length,
      fraudAlertsSummary: fraudAlerts,
      analyticsSummary: analytics,
      systemSettings: settings
    };
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `gem-procurement-admin-report-${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered Users
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      (u.username || '').toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.organizationName || '').toLowerCase().includes(userSearch.toLowerCase());
    const matchesRole = userRoleFilter === 'ALL' || u.role === userRoleFilter;
    const matchesStatus = userStatusFilter === 'ALL' || (u.status || 'ACTIVE') === userStatusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  // Filtered Documents
  const filteredDocs = documents.filter((d) => {
    return (
      (d.filename || '').toLowerCase().includes(docSearch.toLowerCase()) ||
      (d.bidderName || '').toLowerCase().includes(docSearch.toLowerCase()) ||
      (d.detectedCategory || '').toLowerCase().includes(docSearch.toLowerCase())
    );
  });

  // Filtered Fraud Alerts
  const filteredAlerts = (fraudAlerts.alerts || []).filter((a) => {
    if (fraudCategoryFilter === 'ALL') return true;
    return a.category === fraudCategoryFilter || a.severity === fraudCategoryFilter;
  });

  // Filtered Audit Logs
  const filteredAuditLogs = auditLogs.filter((a) => {
    return (
      (a.actorUsername || '').toLowerCase().includes(auditSearch.toLowerCase()) ||
      (a.eventType || '').toLowerCase().includes(auditSearch.toLowerCase()) ||
      (a.actionDescription || '').toLowerCase().includes(auditSearch.toLowerCase())
    );
  });

  return (
    <div style={{ paddingBottom: '60px' }}>
      {/* Top Banner & Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        backgroundColor: '#ffffff',
        padding: '18px 22px',
        borderRadius: 'var(--radius-md)',
        border: '1px solid #e2e8f0',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            backgroundColor: 'var(--primary)',
            color: '#ffffff',
            padding: '10px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Cpu size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--primary-dark)', margin: 0 }}>
                Admin Command Center
              </h2>
              <span style={{
                backgroundColor: '#dcfce7',
                color: '#15803d',
                fontSize: '11px',
                fontWeight: '700',
                padding: '2px 8px',
                borderRadius: '12px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                🟢 Live Engine
              </span>
            </div>
            <p style={{ fontSize: '12.5px', color: '#64748b', margin: '3px 0 0 0' }}>
              Platform administration, user clearance, and compliance governance.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Notifications Trigger */}
          <div style={{ position: 'relative' }}>
            <button
              className="btn btn-outline"
              onClick={() => setShowNotifDropdown(!showNotifDropdown)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', position: 'relative' }}
            >
              <Bell size={15} />
              <span>Alerts</span>
              {notifications.length > 0 && (
                <span style={{
                  backgroundColor: '#dc2626',
                  color: '#fff',
                  fontSize: '10px',
                  fontWeight: '700',
                  padding: '1px 6px',
                  borderRadius: '10px',
                  marginLeft: '2px'
                }}>
                  {notifications.length}
                </span>
              )}
            </button>

            {/* Notifications Dropdown Drawer */}
            {showNotifDropdown && (
              <div style={{
                position: 'absolute',
                right: 0,
                top: '44px',
                width: '360px',
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: 'var(--radius-md)',
                boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                zIndex: 1000,
                padding: '14px',
                maxHeight: '400px',
                overflowY: 'auto'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
                  <b style={{ fontSize: '13px', color: '#1e293b' }}>Active Alerts ({notifications.length})</b>
                  <button className="btn btn-sm btn-outline" style={{ fontSize: '11px', padding: '2px 6px' }} onClick={() => setShowNotifDropdown(false)}>Close</button>
                </div>
                {notifications.length === 0 ? (
                  <p style={{ fontSize: '12px', color: '#64748b' }}>No unacknowledged alerts.</p>
                ) : (
                  notifications.map((n, idx) => (
                    <div key={idx} style={{
                      padding: '8px 10px',
                      borderRadius: '6px',
                      backgroundColor: n.severity === 'HIGH' ? '#fef2f2' : '#f8fafc',
                      borderLeft: `4px solid ${n.severity === 'HIGH' ? '#dc2626' : 'var(--primary)'}`,
                      marginBottom: '8px',
                      fontSize: '11.5px'
                    }}>
                      <div style={{ fontWeight: '700', color: n.severity === 'HIGH' ? '#991b1b' : '#1e293b' }}>{n.title}</div>
                      <div style={{ color: '#475569', marginTop: '2px' }}>{n.message}</div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <button
            className="btn btn-outline"
            onClick={handleRefresh}
            disabled={refreshing}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={14} className={refreshing ? 'spin' : ''} />
            {refreshing ? 'Syncing...' : 'Refresh'}
          </button>

          <button
            className="btn btn-primary"
            onClick={() => setShowCreateTenderModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <PlusCircle size={15} /> Publish Tender
          </button>
        </div>
      </div>

      {/* Global Alerts */}
      {successMsg && (
        <div style={{
          backgroundColor: '#f0fdf4',
          border: '1px solid #bbf7d0',
          color: '#15803d',
          padding: '10px 16px',
          borderRadius: 'var(--radius-sm)',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '13px'
        }}>
          <CheckCircle size={17} /> {successMsg}
        </div>
      )}

      {errorMsg && (
        <div style={{
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          color: '#b91c1c',
          padding: '10px 16px',
          borderRadius: 'var(--radius-sm)',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '13px'
        }}>
          <AlertTriangle size={17} /> {errorMsg}
        </div>
      )}

      {/* Navigation Tab Bar */}
      <div style={{
        display: 'flex',
        gap: '6px',
        overflowX: 'auto',
        borderBottom: '2px solid #e2e8f0',
        paddingBottom: '2px',
        marginBottom: '20px'
      }}>
        {[
          { id: 'overview', label: 'Overview', icon: LayoutDashboard },
          { id: 'users', label: 'Users', icon: Users, badge: users.filter(u => u.status === 'PENDING').length > 0 ? `${users.filter(u => u.status === 'PENDING').length} Pending` : users.length, badgeColor: users.filter(u => u.status === 'PENDING').length > 0 ? '#d97706' : undefined },
          { id: 'tenders', label: 'Tenders & Bids', icon: FileText, badge: tenders.length },
          { id: 'verification', label: 'Verification Logs', icon: ShieldCheck, badge: verificationLogs.length },
          { id: 'fraud', label: 'Fraud Detection', icon: ShieldAlert, badge: fraudAlerts.highSeverityCount > 0 ? fraudAlerts.highSeverityCount : null, badgeColor: '#dc2626' },
          { id: 'analytics', label: 'Analytics', icon: BarChart3 },
          { id: 'rules', label: 'Rules Engine', icon: Sliders, badge: rules.length },
          { id: 'documents', label: 'Documents', icon: FolderOpen, badge: documents.length },
          { id: 'audit', label: 'Audit Trail', icon: History },
          { id: 'settings', label: 'Settings', icon: Settings },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 14px',
                fontSize: '13px',
                fontWeight: isActive ? '700' : '500',
                color: isActive ? 'var(--primary)' : '#64748b',
                backgroundColor: isActive ? '#f0fdfa' : 'transparent',
                border: 'none',
                borderBottom: isActive ? '3px solid var(--primary)' : '3px solid transparent',
                borderRadius: '6px 6px 0 0',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
              {tab.badge !== undefined && tab.badge !== null && (
                <span style={{
                  fontSize: '10.5px',
                  fontWeight: '700',
                  padding: '1px 6px',
                  borderRadius: '10px',
                  backgroundColor: tab.badgeColor || '#e2e8f0',
                  color: tab.badgeColor ? '#ffffff' : '#475569'
                }}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 1. OVERVIEW PANEL                                             */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'overview' && (
        <div>
          {/* Pending Officer Approvals Notification Banner */}
          {users.filter(u => u.status === 'PENDING').length > 0 && (
            <div style={{
              backgroundColor: '#fffbeb',
              border: '1px solid #fde68a',
              borderRadius: 'var(--radius-sm)',
              padding: '14px 18px',
              marginBottom: '20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '24px' }}>👮</span>
                <div>
                  <b style={{ color: '#92400e', fontSize: '13.5px' }}>
                    {users.filter(u => u.status === 'PENDING').length} Evaluation Officer Registration(s) Awaiting Admin Clearance
                  </b>
                  <div style={{ color: '#78350f', fontSize: '12px', marginTop: '2px' }}>
                    Newly registered officers cannot log in until approved by the system administrator.
                  </div>
                </div>
              </div>
              <button
                className="btn btn-sm btn-primary"
                onClick={() => { setActiveTab('users'); setUserStatusFilter('PENDING'); }}
                style={{ fontSize: '12px', backgroundColor: '#d97706', borderColor: '#d97706' }}
              >
                Review & Approve Officers →
              </button>
            </div>
          )}

          {/* KPI Cards Grid */}
          <div className="grid-4" style={{ marginBottom: '22px' }}>
            <div className="gem-card" style={{ padding: '18px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', backgroundColor: 'var(--primary)' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>TOTAL PLATFORM USERS</span>
                <Users size={20} color="var(--primary)" />
              </div>
              <div style={{ fontSize: '26px', fontWeight: '800', color: 'var(--primary-dark)', marginTop: '8px' }}>
                {overviewStats?.totalUsers || users.length}
              </div>
              <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '4px', display: 'flex', gap: '8px' }}>
                <span>Officers: <b>{overviewStats?.officersCount || 0}</b></span> •
                <span>Bidders: <b>{overviewStats?.biddersCount || 0}</b></span> •
                <span>Admins: <b>{overviewStats?.adminCount || 0}</b></span>
              </div>
              {users.filter(u => u.status === 'PENDING').length > 0 && (
                <div style={{ fontSize: '11px', color: '#d97706', fontWeight: '700', marginTop: '4px' }}>
                  ⏳ {users.filter(u => u.status === 'PENDING').length} pending officer clearance
                </div>
              )}
            </div>

            <div className="gem-card" style={{ padding: '18px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', backgroundColor: '#0284c7' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>TENDERS & SUBMISSIONS</span>
                <FileText size={20} color="#0284c7" />
              </div>
              <div style={{ fontSize: '26px', fontWeight: '800', color: '#0369a1', marginTop: '8px' }}>
                {overviewStats?.totalTenders || tenders.length} <span style={{ fontSize: '14px', fontWeight: '500', color: '#64748b' }}>({overviewStats?.totalBids || 0} Bids)</span>
              </div>
              <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '4px', display: 'flex', gap: '8px' }}>
                <span>Accepted: <b style={{ color: '#16a34a' }}>{overviewStats?.acceptedBids || 0}</b></span> •
                <span>Rejected: <b style={{ color: '#dc2626' }}>{overviewStats?.rejectedBids || 0}</b></span> •
                <span>Pending: <b>{overviewStats?.pendingBids || 0}</b></span>
              </div>
            </div>

            <div className="gem-card" style={{ padding: '18px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', backgroundColor: '#16a34a' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>AVG COMPLIANCE SCORE</span>
                <TrendingUp size={20} color="#16a34a" />
              </div>
              <div style={{ fontSize: '26px', fontWeight: '800', color: '#15803d', marginTop: '8px' }}>
                {overviewStats?.avgComplianceScore || 0}%
              </div>
              <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '4px' }}>
                High-Risk Flagged Submissions: <b style={{ color: '#dc2626' }}>{overviewStats?.highRiskBidsCount || 0}</b>
              </div>
            </div>

            <div className="gem-card" style={{ padding: '18px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', backgroundColor: '#dc2626' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>FRAUD & TAMPER FLAGS</span>
                <ShieldAlert size={20} color="#dc2626" />
              </div>
              <div style={{ fontSize: '26px', fontWeight: '800', color: '#991b1b', marginTop: '8px' }}>
                {fraudAlerts.totalAlerts || 0}
              </div>
              <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '4px', display: 'flex', gap: '8px' }}>
                <span>Tampered: <b>{overviewStats?.tamperedDocsCount || 0}</b></span> •
                <span>Duplicates: <b>{overviewStats?.duplicateDocsCount || 0}</b></span>
              </div>
            </div>
          </div>

          {/* Quick Actions & Activity Feed */}
          <div className="grid-2">
            {/* Quick Action Hub */}
            <div className="gem-card">
              <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--primary-dark)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={18} color="var(--primary)" /> Administrator Quick Actions
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                <button
                  className="btn btn-outline"
                  onClick={() => setActiveTab('users')}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '10px', padding: '12px' }}
                >
                  <Users size={18} color="var(--primary)" />
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: '700', fontSize: '12.5px' }}>Manage Users</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>Approve, block, reset pwd</div>
                  </div>
                </button>

                <button
                  className="btn btn-outline"
                  onClick={() => setShowCreateTenderModal(true)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '10px', padding: '12px' }}
                >
                  <PlusCircle size={18} color="#0284c7" />
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: '700', fontSize: '12.5px' }}>Create GeM Tender</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>Configure Drools baseline</div>
                  </div>
                </button>

                <button
                  className="btn btn-outline"
                  onClick={() => setActiveTab('fraud')}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '10px', padding: '12px' }}
                >
                  <ShieldAlert size={18} color="#dc2626" />
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: '700', fontSize: '12.5px' }}>Fraud Intelligence</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>ELA tamper & duplicate scans</div>
                  </div>
                </button>

                <button
                  className="btn btn-outline"
                  onClick={() => setActiveTab('rules')}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '10px', padding: '12px' }}
                >
                  <Sliders size={18} color="#d97706" />
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: '700', fontSize: '12.5px' }}>Rule Engine Weights</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>Adjust scoring percentages</div>
                  </div>
                </button>
              </div>

              {/* System Architecture Summary */}
              <div style={{ marginTop: '18px', padding: '14px', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-sm)', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '12.5px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  Platform Integrity Architecture
                </div>
                <div style={{ fontSize: '11.5px', color: '#64748b', lineHeight: 1.6 }}>
                  • <b>AI Microservice (FastAPI)</b>: Tesseract OCR, NLP entity extraction, ELA forensic forgery detector.<br />
                  • <b>Compliance Engine (Drools)</b>: Real-time multi-gate qualification & SHAP explainability attribution.<br />
                  • <b>Audit Trail</b>: Cryptographically sealed SHA-256 blockchain hash linking.
                </div>
              </div>
            </div>

            {/* Live System Activity Feed */}
            <div className="gem-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--primary-dark)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <History size={18} color="var(--primary)" /> Real-Time System Activity Feed
                </h3>
                <button className="btn btn-sm btn-outline" onClick={() => setActiveTab('audit')}>
                  View All ({auditLogs.length})
                </button>
              </div>

              <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                {auditLogs.slice(0, 8).map((log) => (
                  <div key={log.id} style={{
                    padding: '8px 10px',
                    borderBottom: '1px solid #f1f5f9',
                    fontSize: '12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start'
                  }}>
                    <div>
                      <div style={{ fontWeight: '600', color: '#1e293b' }}>
                        <span style={{ color: 'var(--primary)', fontWeight: '700' }}>{log.actorUsername}</span> ({log.actorRole}): {log.actionDescription}
                      </div>
                      <div style={{ fontSize: '10.5px', color: '#94a3b8', marginTop: '2px' }}>
                        Event: <b>{log.eventType}</b> | Hash: <code>{log.integrityHash?.substring(0, 10)}...</code>
                      </div>
                    </div>
                    <span style={{ fontSize: '11px', color: '#64748b', whiteSpace: 'nowrap', marginLeft: '10px' }}>
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 2. USER MANAGEMENT PANEL                                      */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'users' && (
        <div className="gem-card">
          {/* Pending Officer Approvals Banner */}
          {users.filter(u => u.status === 'PENDING').length > 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#fffbeb',
              border: '1px solid #fde68a',
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '20px' }}>👮</span>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#92400e' }}>
                    {users.filter(u => u.status === 'PENDING').length} Evaluation Officer(s) Awaiting Clearance
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#b45309' }}>
                    Newly registered Government Evaluation Officers cannot log in until approved by a GeM Administrator.
                  </div>
                </div>
              </div>
              <button
                className="btn btn-sm"
                style={{ backgroundColor: '#d97706', color: '#fff', fontSize: '11.5px', fontWeight: '700', cursor: 'pointer' }}
                onClick={() => { setUserStatusFilter('PENDING'); setUserRoleFilter('ALL'); }}
              >
                View Pending ({users.filter(u => u.status === 'PENDING').length})
              </button>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--primary-dark)', margin: 0 }}>
                User Accounts & Access Control ({filteredUsers.length} Users)
              </h3>
              <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>
                Manage Evaluation Officers, Bidders, and System Administrators
              </p>
            </div>

            {/* Search & Filters */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Search user, email, org..."
                  className="form-input"
                  style={{ paddingLeft: '30px', fontSize: '12px', width: '220px', height: '34px' }}
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                />
              </div>

              <select
                className="form-select"
                style={{ fontSize: '12px', height: '34px' }}
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value)}
              >
                <option value="ALL">All Roles</option>
                <option value="ROLE_ADMIN">Admin</option>
                <option value="ROLE_OFFICER">Evaluation Officer</option>
                <option value="ROLE_BIDDER">Vendor / Bidder</option>
              </select>

              <select
                className="form-select"
                style={{ fontSize: '12px', height: '34px' }}
                value={userStatusFilter}
                onChange={(e) => setUserStatusFilter(e.target.value)}
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="PENDING">⏳ Pending Approval</option>
                <option value="BLOCKED">Blocked / Suspended</option>
              </select>
            </div>
          </div>

          <div className="gem-table-container">
            <table className="gem-table">
              <thead>
                <tr>
                  <th>User & Organization</th>
                  <th>Role</th>
                  <th>PAN & GSTIN</th>
                  <th>Identity Status</th>
                  <th>Account Status</th>
                  <th>Registered</th>
                  <th style={{ textAlign: 'right' }}>Administrative Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <b style={{ color: 'var(--primary-dark)', fontSize: '13px' }}>{u.username}</b>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>{u.email}</div>
                      {u.organizationName && (
                        <div style={{ fontSize: '11px', color: '#0369a1', fontWeight: '600' }}>
                          🏢 {u.organizationName}
                        </div>
                      )}
                    </td>
                    <td>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: '700',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        backgroundColor: u.role === 'ROLE_ADMIN' ? '#fef3c7' : u.role === 'ROLE_OFFICER' ? '#e0e7ff' : '#dcfce7',
                        color: u.role === 'ROLE_ADMIN' ? '#92400e' : u.role === 'ROLE_OFFICER' ? '#3730a3' : '#166534'
                      }}>
                        {u.role ? u.role.replace('ROLE_', '') : 'USER'}
                      </span>
                    </td>
                    <td>
                      {u.pan || u.gstin ? (
                        <div style={{ fontSize: '11.5px' }}>
                          <div>PAN: <code>{u.pan || 'N/A'}</code></div>
                          <div>GSTIN: <code>{u.gstin || 'N/A'}</code></div>
                        </div>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: '11px' }}>Govt / Admin</span>
                      )}
                    </td>
                    <td>
                      <button
                        onClick={() => handleToggleVerifyIdentity(u)}
                        style={{
                          border: 'none',
                          background: 'none',
                          cursor: 'pointer',
                          padding: 0,
                          fontSize: '11.5px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          color: u.isIdentityVerified ? '#16a34a' : '#d97706',
                          fontWeight: '700'
                        }}
                      >
                        {u.isIdentityVerified ? <CheckCircle size={14} /> : <XCircle size={14} />}
                        {u.isIdentityVerified ? 'VERIFIED' : 'UNVERIFIED'}
                      </button>
                    </td>
                    <td>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: '700',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        backgroundColor: u.status === 'BLOCKED' ? '#fee2e2' : u.status === 'PENDING' ? '#fef3c7' : '#dcfce7',
                        color: u.status === 'BLOCKED' ? '#991b1b' : u.status === 'PENDING' ? '#92400e' : '#15803d',
                        border: u.status === 'PENDING' ? '1px solid #fde68a' : 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        {u.status === 'PENDING' ? '⏳ PENDING APPROVAL' : (u.status || 'ACTIVE')}
                      </span>
                    </td>
                    <td style={{ fontSize: '11.5px', color: '#64748b' }}>
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                        {u.status === 'PENDING' && (
                          <button
                            className="btn btn-sm"
                            title="Approve Evaluation Officer Account"
                            onClick={() => handleApproveOfficer(u)}
                            style={{
                              backgroundColor: '#16a34a',
                              color: '#fff',
                              fontSize: '11px',
                              fontWeight: '700',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '4px 10px',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer'
                            }}
                          >
                            <CheckCircle size={13} /> Approve
                          </button>
                        )}

                        <button
                          className="btn btn-sm btn-outline"
                          title={u.status === 'BLOCKED' ? 'Unblock User' : 'Block / Suspend User'}
                          onClick={() => handleToggleUserStatus(u)}
                          style={{ color: u.status === 'BLOCKED' ? '#16a34a' : '#dc2626' }}
                        >
                          {u.status === 'BLOCKED' ? <Unlock size={13} /> : <Lock size={13} />}
                        </button>

                        <button
                          className="btn btn-sm btn-outline"
                          title="Reset Password"
                          onClick={() => setSelectedUserForPasswordReset(u)}
                        >
                          <KeyRound size={13} />
                        </button>

                        <button
                          className="btn btn-sm btn-outline"
                          title="View User Audit Activity"
                          onClick={() => handleViewUserActivity(u.username)}
                        >
                          <History size={13} />
                        </button>

                        <button
                          className="btn btn-sm btn-outline"
                          title="Delete User"
                          onClick={() => handleDeleteUser(u)}
                          disabled={u.role === 'ROLE_ADMIN' && u.username === 'admin'}
                          style={{ color: '#dc2626' }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Password Reset Modal */}
          {selectedUserForPasswordReset && (
            <div className="modal-backdrop" onClick={() => setSelectedUserForPasswordReset(null)}>
              <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--primary-dark)', marginBottom: '12px' }}>
                  Admin Reset Password for "{selectedUserForPasswordReset.username}"
                </h3>
                <form onSubmit={handleResetPassword}>
                  <div className="form-group">
                    <label className="form-label">Enter New Secure Password</label>
                    <input
                      type="password"
                      className="form-input"
                      placeholder="Minimum 6 characters"
                      value={newPasswordInput}
                      onChange={(e) => setNewPasswordInput(e.target.value)}
                      required
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
                    <button type="button" className="btn btn-outline" onClick={() => setSelectedUserForPasswordReset(null)}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary">
                      Set New Password
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* User Activity Trail Drawer / Modal */}
          {selectedUserActivity && (
            <div className="modal-backdrop" onClick={() => setSelectedUserActivity(null)}>
              <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--primary-dark)', margin: 0 }}>
                    Audit History for User: "{selectedUserActivity.username}"
                  </h3>
                  <button className="btn btn-sm btn-outline" onClick={() => setSelectedUserActivity(null)}>Close</button>
                </div>
                <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
                  {selectedUserActivity.logs.length === 0 ? (
                    <p style={{ fontSize: '12px', color: '#64748b' }}>No recorded audit events for this user.</p>
                  ) : (
                    selectedUserActivity.logs.map((log) => (
                      <div key={log.id} style={{
                        padding: '10px',
                        borderRadius: '6px',
                        backgroundColor: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        marginBottom: '8px',
                        fontSize: '12px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <b style={{ color: 'var(--primary)' }}>{log.eventType}</b>
                          <span style={{ fontSize: '11px', color: '#64748b' }}>{new Date(log.timestamp).toLocaleString()}</span>
                        </div>
                        <div style={{ color: '#334155', marginTop: '4px' }}>{log.actionDescription}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 3. TENDER & BID MONITORING                                    */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'tenders' && (
        <div>
          <div className="gem-card" style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--primary-dark)', margin: 0 }}>
                  Active GeM Tenders & Submissions Overview ({tenders.length})
                </h3>
                <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>
                  Click "Inspect Bids" on any tender to view submitted vendor dossiers & compliance scores
                </p>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-outline" onClick={() => exportToCsv('gem-tenders-summary.csv', tenders)}>
                  <Download size={14} /> Export Tenders CSV
                </button>
                <button className="btn btn-primary" onClick={() => setShowCreateTenderModal(true)}>
                  <PlusCircle size={15} /> Publish Tender
                </button>
              </div>
            </div>

            <div className="gem-table-container">
              <table className="gem-table">
                <thead>
                  <tr>
                    <th>Tender Reference & Department</th>
                    <th>Category</th>
                    <th>Est. Value</th>
                    <th>Min Turnover / Exp</th>
                    <th>Total Bids</th>
                    <th>Accepted / Rejected</th>
                    <th>Avg Score</th>
                    <th style={{ textAlign: 'right' }}>Inspect</th>
                  </tr>
                </thead>
                <tbody>
                  {tenders.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                        No procurement tenders stored in the database. Click <b>+ Create GeM Tender</b> to add one.
                      </td>
                    </tr>
                  ) : (
                    tenders.map((t) => (
                    <tr key={t.id} style={{ backgroundColor: inspectingTender?.id === t.id ? '#f0fdf4' : 'transparent' }}>
                      <td>
                        <b style={{ color: 'var(--primary-dark)', fontSize: '13px' }}>{t.tenderNumber}</b>
                        <div style={{ fontWeight: '600', color: '#1e293b' }}>{t.title}</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>{t.department}</div>
                      </td>
                      <td>
                        <span style={{ fontSize: '11px', backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                          {t.category || 'General'}
                        </span>
                      </td>
                      <td><b>₹{(t.estimatedValue / 10000000).toFixed(2)} Cr</b></td>
                      <td style={{ fontSize: '11.5px' }}>
                        <div>Turnover: ₹{(t.minTurnover / 10000000).toFixed(2)} Cr</div>
                        <div>Exp: {t.minExperienceYears} Yrs</div>
                      </td>
                      <td>
                        <b style={{ fontSize: '14px', color: 'var(--primary)' }}>{t.totalBids || 0}</b>
                      </td>
                      <td>
                        <span style={{ color: '#16a34a', fontWeight: '700' }}>✓ {t.acceptedBids || 0}</span> /{' '}
                        <span style={{ color: '#dc2626', fontWeight: '700' }}>✗ {t.rejectedBids || 0}</span>
                      </td>
                      <td>
                        <b style={{ color: t.avgScore >= 70 ? '#16a34a' : t.avgScore >= 50 ? '#d97706' : '#dc2626' }}>
                          {t.avgScore || 0}%
                        </b>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => handleInspectTender(t)}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Eye size={13} /> Inspect Bids ({t.totalBids || 0})
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              </table>
            </div>
          </div>

          {/* Drill-down: Bids submitted to selected tender */}
          {inspectingTender && selectedTenderBids && (
            <div className="gem-card" style={{ border: '2px solid var(--primary-light)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--primary-dark)', margin: 0 }}>
                    Submitted Bids for Tender: {inspectingTender.tenderNumber}
                  </h3>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>{inspectingTender.title}</div>
                </div>
                <button className="btn btn-sm btn-outline" onClick={() => { setInspectingTender(null); setSelectedTenderBids(null); }}>
                  Close Inspection
                </button>
              </div>

              {selectedTenderBids.length === 0 ? (
                <p style={{ fontSize: '13px', color: '#64748b' }}>No bids submitted yet for this tender.</p>
              ) : (
                <div className="gem-table-container">
                  <table className="gem-table">
                    <thead>
                      <tr>
                        <th>Bid Number & Bidder</th>
                        <th>Declared Turnover / Exp</th>
                        <th>AI Score & Risk</th>
                        <th>Identity Status</th>
                        <th>Officer Decision</th>
                        <th>Evidence Scans</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedTenderBids.map((b) => (
                        <tr key={b.id}>
                          <td>
                            <b style={{ color: 'var(--primary-dark)' }}>{b.bidNumber}</b>
                            <div style={{ fontWeight: '600' }}>{b.bidderName}</div>
                            <div style={{ fontSize: '11px', color: '#64748b' }}>PAN: <code>{b.pan}</code></div>
                          </td>
                          <td style={{ fontSize: '11.5px' }}>
                            <div>₹{(b.declaredTurnover / 10000000).toFixed(2)} Cr</div>
                            <div>{b.declaredExperience} Years</div>
                          </td>
                          <td>
                            <div style={{ fontSize: '14px', fontWeight: '800', color: b.complianceScore >= 70 ? '#16a34a' : '#dc2626' }}>
                              {b.complianceScore}%
                            </div>
                            <span style={{
                              fontSize: '10.5px',
                              fontWeight: '700',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              backgroundColor: b.riskLevel === 'HIGH' ? '#fee2e2' : b.riskLevel === 'MODERATE' ? '#fef3c7' : '#dcfce7',
                              color: b.riskLevel === 'HIGH' ? '#991b1b' : b.riskLevel === 'MODERATE' ? '#92400e' : '#166534'
                            }}>
                              {b.riskLevel} RISK
                            </span>
                          </td>
                          <td>
                            <span style={{ fontSize: '11px', fontWeight: '700', color: b.isDebarred ? '#dc2626' : '#16a34a' }}>
                              {b.isDebarred ? '🚨 DEBARRED' : '✓ ' + (b.identityStatus || 'ACTIVE')}
                            </span>
                          </td>
                          <td>
                            <span style={{
                              fontSize: '11px',
                              fontWeight: '700',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              backgroundColor: b.officerDecision === 'ACCEPTED' ? '#dcfce7' : b.officerDecision === 'REJECTED' ? '#fee2e2' : '#f1f5f9',
                              color: b.officerDecision === 'ACCEPTED' ? '#166534' : b.officerDecision === 'REJECTED' ? '#991b1b' : '#475569'
                            }}>
                              {b.officerDecision}
                            </span>
                          </td>
                          <td>
                            <div style={{ fontSize: '11.5px' }}>
                              <span>{b.documentCount} Uploaded Files</span>
                              {b.hasTamperedDocs && <div style={{ color: '#dc2626', fontWeight: '700' }}>[ELA TAMPERED]</div>}
                              {b.hasDuplicateDocs && <div style={{ color: '#d97706', fontWeight: '700' }}>[DUPLICATE REUSED]</div>}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 4. VERIFICATION LOGS                                          */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'verification' && (
        <div className="gem-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--primary-dark)', margin: 0 }}>
                NSDL & GSTN Portal Verification Telemetry ({verificationLogs.length} Records)
              </h3>
              <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>
                Cross-database validation logs between Income Tax Department, GSTN, and Central Vigilance Commission
              </p>
            </div>

            <div style={{ display: 'flex', gap: '6px' }}>
              {['ALL', 'FAILED', 'MISMATCH', 'DEBARRED', 'VERIFIED'].map((f) => (
                <button
                  key={f}
                  className={`btn btn-sm ${verificationFilter === f ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => handleVerificationFilterChange(f)}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="gem-table-container">
            <table className="gem-table">
              <thead>
                <tr>
                  <th>Bid & Entity</th>
                  <th>PAN Status (NSDL)</th>
                  <th>GSTIN Status (GSTN)</th>
                  <th>Name Cross-Verification</th>
                  <th>CVC Debarment List</th>
                  <th>Overall Verification</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {verificationLogs.map((v) => (
                  <tr key={v.id}>
                    <td>
                      <b style={{ color: 'var(--primary-dark)' }}>{v.bidNumber || `Bid #${v.bidId}`}</b>
                      <div style={{ fontWeight: '600' }}>{v.bidderName || 'Registered Bidder'}</div>
                    </td>
                    <td>
                      <div><b>{v.panStatus}</b></div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>PAN: <code>{v.pan}</code></div>
                      {v.panHolderName && <div style={{ fontSize: '11px', color: '#0369a1' }}>Name: {v.panHolderName}</div>}
                    </td>
                    <td>
                      <div><b>{v.gstStatus}</b></div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>GSTIN: <code>{v.gstin}</code></div>
                      {v.gstLegalName && <div style={{ fontSize: '11px', color: '#0369a1' }}>Trade: {v.gstLegalName}</div>}
                    </td>
                    <td>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: '700',
                        color: v.nameMismatchFlag ? '#dc2626' : '#16a34a'
                      }}>
                        {v.nameMismatchFlag ? '⚠️ MISMATCH DETECTED' : '✓ FULLY MATCHED'}
                      </span>
                    </td>
                    <td>
                      {v.isDebarred ? (
                        <div style={{ color: '#dc2626', fontSize: '11.5px', fontWeight: '700' }}>
                          🚨 DEBARRED
                          <div style={{ fontSize: '10.5px', fontWeight: '400', color: '#991b1b' }}>{v.debarmentAgency}</div>
                        </div>
                      ) : (
                        <span style={{ color: '#16a34a', fontWeight: '700', fontSize: '11.5px' }}>✓ CLEAR</span>
                      )}
                    </td>
                    <td>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: '700',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        backgroundColor: v.overallIdentityStatus === 'REAL_AND_VERIFIED' ? '#dcfce7' : '#fee2e2',
                        color: v.overallIdentityStatus === 'REAL_AND_VERIFIED' ? '#166534' : '#991b1b'
                      }}>
                        {v.overallIdentityStatus}
                      </span>
                    </td>
                    <td style={{ fontSize: '11px', color: '#64748b' }}>
                      {v.panVerificationDate ? new Date(v.panVerificationDate).toLocaleDateString() : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 5. RISK & FRAUD DETECTION                                     */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'fraud' && (
        <div>
          {/* Summary Banner */}
          <div className="grid-3" style={{ marginBottom: '18px' }}>
            <div className="gem-card" style={{ borderLeft: '4px solid #dc2626', padding: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: '#991b1b' }}>HIGH SEVERITY ALERTS</div>
              <div style={{ fontSize: '24px', fontWeight: '800', color: '#dc2626', marginTop: '4px' }}>
                {fraudAlerts.highSeverityCount || 0}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>Immediate disqualification & forensic review required</div>
            </div>

            <div className="gem-card" style={{ borderLeft: '4px solid #d97706', padding: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: '#92400e' }}>MEDIUM SEVERITY ALERTS</div>
              <div style={{ fontSize: '24px', fontWeight: '800', color: '#d97706', marginTop: '4px' }}>
                {fraudAlerts.mediumSeverityCount || 0}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>Identity mismatch or irrelevant document classification</div>
            </div>

            <div className="gem-card" style={{ borderLeft: '4px solid #16a34a', padding: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: '#166534' }}>LOW SEVERITY / WARNINGS</div>
              <div style={{ fontSize: '24px', fontWeight: '800', color: '#16a34a', marginTop: '4px' }}>
                {fraudAlerts.lowSeverityCount || 0}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>Minor turnover or certification discrepancy</div>
            </div>
          </div>

          {/* Filter Bar & Alert Cards */}
          <div className="gem-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--primary-dark)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldAlert size={18} color="#dc2626" /> Comprehensive Fraud & Tampering Intelligence ({filteredAlerts.length})
              </h3>

              <div style={{ display: 'flex', gap: '6px' }}>
                {['ALL', 'HIGH', 'MEDIUM', 'DOCUMENT_TAMPERING', 'DOCUMENT_DUPLICATION', 'BLACKLISTED_VENDOR'].map((cat) => (
                  <button
                    key={cat}
                    className={`btn btn-sm ${fraudCategoryFilter === cat ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setFraudCategoryFilter(cat)}
                  >
                    {cat.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {filteredAlerts.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', color: '#16a34a' }}>
                <CheckCircle size={36} style={{ marginBottom: '8px' }} />
                <div style={{ fontWeight: '700', fontSize: '14px' }}>No Active Fraud Alerts Detected</div>
                <p style={{ fontSize: '12px', color: '#64748b' }}>All documents and vendor tax records have passed forensic and integrity validation.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '10px' }}>
                {filteredAlerts.map((alert, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '14px 18px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: alert.severity === 'HIGH' ? '#fef2f2' : '#fffbeb',
                      border: `1px solid ${alert.severity === 'HIGH' ? '#fecaca' : '#fde68a'}`,
                      borderLeft: `5px solid ${alert.severity === 'HIGH' ? '#dc2626' : '#d97706'}`
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          fontSize: '10.5px',
                          fontWeight: '800',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          backgroundColor: alert.severity === 'HIGH' ? '#dc2626' : '#d97706',
                          color: '#ffffff'
                        }}>
                          {alert.severity} SEVERITY
                        </span>
                        <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b' }}>
                          CATEGORY: {alert.category}
                        </span>
                      </div>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>Alert ID: <code>{alert.id}</code></span>
                    </div>

                    <div style={{ fontWeight: '700', fontSize: '14px', color: '#1e293b', marginTop: '6px' }}>
                      {alert.title}
                    </div>

                    <div style={{ fontSize: '12.5px', color: '#475569', marginTop: '4px' }}>
                      {alert.description}
                    </div>

                    {alert.filename && (
                      <div style={{ fontSize: '11.5px', color: '#0369a1', marginTop: '6px' }}>
                        Associated File: <code>{alert.filename}</code>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 6. ANALYTICS & REPORTS                                        */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'analytics' && (
        <div>
          {/* Download Reports Actions */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#f8fafc',
            padding: '14px 18px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid #e2e8f0',
            marginBottom: '18px'
          }}>
            <div>
              <b style={{ fontSize: '14px', color: 'var(--primary-dark)' }}>Official GeM Audit & Compliance Telemetry Exports</b>
              <div style={{ fontSize: '12px', color: '#64748b' }}>Generate downloadable CSV / JSON compliance reports for CAG and Government Audits</div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-outline" onClick={() => exportToCsv('tenders-compliance-summary.csv', tenders)}>
                <Download size={14} /> Tenders CSV
              </button>
              <button className="btn btn-outline" onClick={() => exportToCsv('verification-logs.csv', verificationLogs)}>
                <Download size={14} /> Verification CSV
              </button>
              <button className="btn btn-primary" onClick={exportJsonReport}>
                <Download size={14} /> Full System JSON Report
              </button>
            </div>
          </div>

          <div className="grid-2" style={{ marginBottom: '18px' }}>
            {/* Score Distribution Chart */}
            <div className="gem-card">
              <h3 style={{ fontSize: '14.5px', fontWeight: '700', color: 'var(--primary-dark)', marginBottom: '14px' }}>
                Compliance Score Distribution (AI & Drools Baseline)
              </h3>
              <div style={{ display: 'grid', gap: '12px' }}>
                {analytics?.scoreDistribution && Object.entries(analytics.scoreDistribution).map(([label, count]) => {
                  const total = Object.values(analytics.scoreDistribution).reduce((a, b) => a + b, 0) || 1;
                  const pct = Math.round((count / total) * 100);
                  const barColor = label.includes('High Compliance') ? '#16a34a' : label.includes('Compliant') ? '#0284c7' : label.includes('Moderate') ? '#d97706' : '#dc2626';

                  return (
                    <div key={label}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                        <span style={{ fontWeight: '600', color: '#334155' }}>{label}</span>
                        <span><b>{count} Bids</b> ({pct}%)</span>
                      </div>
                      <div style={{ width: '100%', height: '10px', backgroundColor: '#e2e8f0', borderRadius: '5px', overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', backgroundColor: barColor, borderRadius: '5px' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Officer Decisions Distribution */}
            <div className="gem-card">
              <h3 style={{ fontSize: '14.5px', fontWeight: '700', color: 'var(--primary-dark)', marginBottom: '14px' }}>
                Evaluation Officer Decision Breakdown
              </h3>
              <div style={{ display: 'grid', gap: '12px' }}>
                {analytics?.decisionDistribution && Object.entries(analytics.decisionDistribution).map(([decision, count]) => {
                  const total = Object.values(analytics.decisionDistribution).reduce((a, b) => a + b, 0) || 1;
                  const pct = Math.round((count / total) * 100);
                  const barColor = decision === 'Accepted' ? '#16a34a' : decision === 'Rejected' ? '#dc2626' : decision.includes('Clarification') ? '#d97706' : '#64748b';

                  return (
                    <div key={decision}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                        <span style={{ fontWeight: '600', color: '#334155' }}>{decision}</span>
                        <span><b>{count}</b> ({pct}%)</span>
                      </div>
                      <div style={{ width: '100%', height: '10px', backgroundColor: '#e2e8f0', borderRadius: '5px', overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', backgroundColor: barColor, borderRadius: '5px' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 7. RULE ENGINE MANAGEMENT                                     */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'rules' && (
        <div>
          {/* Dynamic Scoring Weights Sliders */}
          <div className="gem-card" style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--primary-dark)', margin: 0 }}>
                  Dynamic AI Scoring Criteria Weights (%)
                </h3>
                <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>
                  Adjust how Drools and the AI Compliance Engine allocate scoring weights across criteria without code deployments
                </p>
              </div>
              <button className="btn btn-primary" onClick={handleUpdateRuleWeights}>
                <Check size={14} /> Save Scoring Weights
              </button>
            </div>

            <div className="grid-5">
              {Object.entries(ruleWeights).map(([key, val]) => (
                <div key={key} style={{ padding: '10px', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-sm)', border: '1px solid #e2e8f0' }}>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', textTransform: 'capitalize' }}>
                    {key.replace('Weight', '')} Weight
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                    <input
                      type="range"
                      min="0"
                      max="50"
                      step="1"
                      value={val}
                      onChange={(e) => setRuleWeights({ ...ruleWeights, [key]: parseFloat(e.target.value) })}
                      style={{ flex: 1 }}
                    />
                    <b style={{ fontSize: '13px', color: 'var(--primary)', width: '36px' }}>{val}%</b>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Configured Compliance Rules Table */}
          <div className="gem-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--primary-dark)', margin: 0 }}>
                  Drools Eligibility & Compliance Rules ({rules.length})
                </h3>
                <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>
                  Manage dynamic DRL rule expressions, weight factors, and mandatory gates
                </p>
              </div>

              <button
                className="btn btn-primary"
                onClick={() => {
                  setEditingRule(null);
                  setRuleForm({ ruleName: '', ruleCategory: 'FINANCIAL', conditionExpression: '', weight: 1.0, isMandatory: true, passCriterion: '' });
                  setShowAddRuleModal(true);
                }}
              >
                <PlusCircle size={15} /> Add Custom Compliance Rule
              </button>
            </div>

            <div className="gem-table-container">
              <table className="gem-table">
                <thead>
                  <tr>
                    <th>Rule Name</th>
                    <th>Category</th>
                    <th>DRL Condition Expression</th>
                    <th>Weight</th>
                    <th>Mandatory Gate</th>
                    <th>Pass Criterion</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rules.map((r) => (
                    <tr key={r.id}>
                      <td><b style={{ color: 'var(--primary-dark)' }}>{r.ruleName}</b></td>
                      <td>
                        <span style={{ fontSize: '11px', backgroundColor: '#e2e8f0', padding: '2px 6px', borderRadius: '4px', fontWeight: '600' }}>
                          {r.ruleCategory}
                        </span>
                      </td>
                      <td><code>{r.conditionExpression}</code></td>
                      <td><b>{r.weight}x</b></td>
                      <td>
                        <span style={{ color: r.isMandatory ? '#dc2626' : '#64748b', fontWeight: '700', fontSize: '11.5px' }}>
                          {r.isMandatory ? 'YES (STRICT)' : 'NO (OPTIONAL)'}
                        </span>
                      </td>
                      <td style={{ fontSize: '11.5px' }}>{r.passCriterion || 'Condition must evaluate TRUE'}</td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                          <button
                            className="btn btn-sm btn-outline"
                            onClick={() => {
                              setEditingRule(r);
                              setRuleForm({
                                ruleName: r.ruleName,
                                ruleCategory: r.ruleCategory,
                                conditionExpression: r.conditionExpression,
                                weight: r.weight,
                                isMandatory: r.isMandatory,
                                passCriterion: r.passCriterion || ''
                              });
                              setShowAddRuleModal(true);
                            }}
                          >
                            Edit
                          </button>
                          <button
                            className="btn btn-sm btn-outline"
                            style={{ color: '#dc2626' }}
                            onClick={() => handleDeleteRule(r.id)}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Add / Edit Rule Modal */}
          {showAddRuleModal && (
            <div className="modal-backdrop" onClick={() => setShowAddRuleModal(false)}>
              <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--primary-dark)', marginBottom: '14px' }}>
                  {editingRule ? `Edit Rule: ${editingRule.ruleName}` : 'Add New Dynamic Compliance Rule'}
                </h3>

                <form onSubmit={handleSaveRule}>
                  {!editingRule && tenders.length > 0 && (
                    <div className="form-group">
                      <label className="form-label">Associate with Tender</label>
                      <select
                        className="form-select"
                        value={selectedTenderIdForRule}
                        onChange={(e) => setSelectedTenderIdForRule(e.target.value)}
                      >
                        {tenders.map((t) => (
                          <option key={t.id} value={t.id}>{t.tenderNumber} - {t.title}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="form-group">
                    <label className="form-label">Rule Name</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Mandatory MSME UDYAM Registration Check"
                      value={ruleForm.ruleName}
                      onChange={(e) => setRuleForm({ ...ruleForm, ruleName: e.target.value })}
                      required
                    />
                  </div>

                  <div className="grid-2">
                    <div className="form-group">
                      <label className="form-label">Rule Category</label>
                      <select
                        className="form-select"
                        value={ruleForm.ruleCategory}
                        onChange={(e) => setRuleForm({ ...ruleForm, ruleCategory: e.target.value })}
                      >
                        <option value="FINANCIAL">Financial Turnover</option>
                        <option value="EXPERIENCE">Technical Experience</option>
                        <option value="CERTIFICATION">Quality Certification</option>
                        <option value="TAX_INTEGRITY">Tax & Debarment</option>
                        <option value="INTEGRITY">Fraud & ELA Tamper</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Rule Weight (Multiplier)</label>
                      <input
                        type="number"
                        step="0.1"
                        className="form-input"
                        value={ruleForm.weight}
                        onChange={(e) => setRuleForm({ ...ruleForm, weight: parseFloat(e.target.value) })}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">DRL Expression / Condition</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. declaredTurnover >= minTurnover"
                      value={ruleForm.conditionExpression}
                      onChange={(e) => setRuleForm({ ...ruleForm, conditionExpression: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                      <input
                        type="checkbox"
                        checked={ruleForm.isMandatory}
                        onChange={(e) => setRuleForm({ ...ruleForm, isMandatory: e.target.checked })}
                      />
                      <span><b>Strict Mandatory Eligibility Gate (Failing this rule triggers bid rejection)</b></span>
                    </label>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '18px' }}>
                    <button type="button" className="btn btn-outline" onClick={() => setShowAddRuleModal(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary">
                      {editingRule ? 'Save Rule Modifications' : 'Create & Register Rule'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 8. DOCUMENT MONITORING                                        */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'documents' && (
        <div className="gem-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--primary-dark)', margin: 0 }}>
                Platform Uploaded Evidence Repository ({filteredDocs.length} Documents)
              </h3>
              <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>
                AI Classification, OCR text extracts, Error Level Analysis (ELA) scores, and duplicate SHA-256 hashes
              </p>
            </div>

            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Search file, bidder, category..."
                className="form-input"
                style={{ paddingLeft: '30px', fontSize: '12px', width: '260px', height: '34px' }}
                value={docSearch}
                onChange={(e) => setDocSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="gem-table-container">
            <table className="gem-table">
              <thead>
                <tr>
                  <th>Filename & Bidder</th>
                  <th>Declared Type</th>
                  <th>AI Detected Category</th>
                  <th>Classification Gate</th>
                  <th>Extracted Values</th>
                  <th>Forensic Integrity</th>
                  <th style={{ textAlign: 'right' }}>Inspect OCR</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocs.map((doc) => (
                  <tr key={doc.id}>
                    <td>
                      <b style={{ color: 'var(--primary-dark)' }}>{doc.filename}</b>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>
                        Bid: <b>{doc.bidNumber}</b> ({doc.bidderName})
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: '11px', backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                        {doc.documentType}
                      </span>
                    </td>
                    <td>
                      <b style={{ color: '#0369a1', fontSize: '12px' }}>{doc.detectedCategory || 'Standard Procurement'}</b>
                      {doc.confidenceScore > 0 && (
                        <div style={{ fontSize: '10.5px', color: '#64748b' }}>Conf: {Math.round(doc.confidenceScore * 100)}%</div>
                      )}
                    </td>
                    <td>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: '700',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        backgroundColor: doc.validationStatus === 'VALID' ? '#dcfce7' : '#fee2e2',
                        color: doc.validationStatus === 'VALID' ? '#166534' : '#991b1b'
                      }}>
                        {doc.validationStatus || 'VALID'}
                      </span>
                      {doc.rejectionReason && (
                        <div style={{ fontSize: '10.5px', color: '#dc2626', marginTop: '2px' }}>{doc.rejectionReason}</div>
                      )}
                    </td>
                    <td style={{ fontSize: '11.5px' }}>
                      {doc.extractedTurnover && <div>Turnover: ₹{(doc.extractedTurnover / 10000000).toFixed(2)} Cr</div>}
                      {doc.extractedExperience && <div>Exp: {doc.extractedExperience} Yrs</div>}
                    </td>
                    <td>
                      {doc.isTampered ? (
                        <span style={{ color: '#dc2626', fontWeight: '700', fontSize: '11px' }}>
                          🚨 ELA TAMPER ({Math.round(doc.tamperScore * 100)}%)
                        </span>
                      ) : doc.isDuplicate ? (
                        <span style={{ color: '#d97706', fontWeight: '700', fontSize: '11px' }}>
                          ⚠️ DUPLICATE COLLISION
                        </span>
                      ) : (
                        <span style={{ color: '#16a34a', fontWeight: '700', fontSize: '11px' }}>
                          ✓ CLEAN PASS
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn btn-sm btn-outline"
                        onClick={() => setSelectedDocForOcr(doc)}
                      >
                        <Eye size={13} /> OCR Data
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* OCR Extracted Data Modal */}
          {selectedDocForOcr && (
            <div className="modal-backdrop" onClick={() => setSelectedDocForOcr(null)}>
              <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--primary-dark)', margin: 0 }}>
                    Extracted OCR & NLP Metadata: {selectedDocForOcr.filename}
                  </h3>
                  <button className="btn btn-sm btn-outline" onClick={() => setSelectedDocForOcr(null)}>Close</button>
                </div>

                <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: 'var(--radius-sm)', marginBottom: '12px', fontSize: '12px' }}>
                  <div><b>Classification:</b> {selectedDocForOcr.detectedCategory} ({selectedDocForOcr.validationStatus})</div>
                  <div><b>SHA-256 Hash:</b> <code>{selectedDocForOcr.fileHash}</code></div>
                </div>

                <div className="form-group">
                  <label className="form-label">Tesseract Raw OCR Stream Extract</label>
                  <textarea
                    className="form-textarea"
                    rows={8}
                    readOnly
                    value={selectedDocForOcr.ocrSnippet || 'No OCR text extracted.'}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 9. AUDIT LOGS & INTEGRITY                                     */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'audit' && (
        <div className="gem-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--primary-dark)', margin: 0 }}>
                Cryptographically Sealed Immutable Audit Trail ({filteredAuditLogs.length} Records)
              </h3>
              <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>
                Every procurement event is hashed using SHA-256 chained to prior blocks to guarantee non-repudiation
              </p>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                className="btn btn-primary"
                onClick={handleVerifyAuditChain}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <ShieldCheck size={16} /> Verify SHA-256 Hash Chain
              </button>

              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Filter logs by actor, event..."
                  className="form-input"
                  style={{ paddingLeft: '30px', fontSize: '12px', width: '220px', height: '34px' }}
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Hash Chain Verification Result Banner */}
          {chainStatus && (
            <div style={{
              padding: '12px 16px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: chainStatus.isChainValid ? '#f0fdf4' : '#fef2f2',
              border: `1px solid ${chainStatus.isChainValid ? '#bbf7d0' : '#fecaca'}`,
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {chainStatus.isChainValid ? <CheckCircle size={22} color="#16a34a" /> : <AlertTriangle size={22} color="#dc2626" />}
                <div>
                  <b style={{ color: chainStatus.isChainValid ? '#15803d' : '#991b1b', fontSize: '13.5px' }}>
                    {chainStatus.message}
                  </b>
                  <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                    Total Audit Blocks Verified: <b>{chainStatus.totalLogsChecked}</b> | Cryptographic Proof: <b>SHA-256</b>
                  </div>
                </div>
              </div>
              <span style={{
                fontSize: '11.5px',
                fontWeight: '700',
                padding: '4px 10px',
                borderRadius: '6px',
                backgroundColor: chainStatus.isChainValid ? '#dcfce7' : '#fee2e2',
                color: chainStatus.isChainValid ? '#166534' : '#991b1b'
              }}>
                {chainStatus.status}
              </span>
            </div>
          )}

          <div className="gem-table-container">
            <table className="gem-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Actor & Role</th>
                  <th>Event Type</th>
                  <th>Target Entity</th>
                  <th>Action Summary</th>
                  <th>Cryptographic SHA-256 Hash</th>
                </tr>
              </thead>
              <tbody>
                {filteredAuditLogs.map((log) => (
                  <tr key={log.id}>
                    <td style={{ fontSize: '11.5px', color: '#64748b', whiteSpace: 'nowrap' }}>
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td>
                      <b style={{ color: 'var(--primary)' }}>{log.actorUsername}</b>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>{log.actorRole}</div>
                    </td>
                    <td>
                      <span style={{ fontSize: '11px', backgroundColor: '#e2e8f0', padding: '2px 6px', borderRadius: '4px', fontWeight: '700' }}>
                        {log.eventType}
                      </span>
                    </td>
                    <td>
                      <b>{log.entityType}</b>: {log.entityId}
                    </td>
                    <td style={{ fontSize: '12px', color: '#334155' }}>
                      {log.actionDescription}
                    </td>
                    <td>
                      <code style={{ fontSize: '10.5px' }}>{log.integrityHash?.substring(0, 16)}...</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 10. SYSTEM SETTINGS                                           */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'settings' && (
        <div className="gem-card" style={{ maxWidth: '800px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--primary-dark)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Settings size={18} color="var(--primary)" /> Global API Integrations & Risk Thresholds
          </h3>

          <form onSubmit={handleSaveSettings}>
            {/* Government API Integrations */}
            <div style={{ marginBottom: '20px', padding: '14px', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-sm)', border: '1px solid #e2e8f0' }}>
              <h4 style={{ fontSize: '13.5px', fontWeight: '700', color: '#334155', marginBottom: '10px' }}>
                🏛️ Government Verification Gateways
              </h4>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">NSDL Income Tax Department (PAN API)</label>
                  <select
                    className="form-select"
                    value={settings.nsdlApiMode}
                    onChange={(e) => setSettings({ ...settings, nsdlApiMode: e.target.value })}
                  >
                    <option value="LIVE_SIMULATION">Live Portal Simulation (Sandbox DB)</option>
                    <option value="LIVE_PRODUCTION">Live Production NSDL Gateway</option>
                    <option value="OFFLINE_MOCK">Offline Mock Validation</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">GSTN Verification Portal API</label>
                  <select
                    className="form-select"
                    value={settings.gstnApiMode}
                    onChange={(e) => setSettings({ ...settings, gstnApiMode: e.target.value })}
                  >
                    <option value="LIVE_SIMULATION">Live Portal Simulation (Sandbox DB)</option>
                    <option value="LIVE_PRODUCTION">Live Production GSTN API</option>
                    <option value="OFFLINE_MOCK">Offline Mock Validation</option>
                  </select>
                </div>
              </div>

              <div className="grid-2" style={{ marginTop: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                  <input
                    type="checkbox"
                    checked={settings.digilockerEnabled}
                    onChange={(e) => setSettings({ ...settings, digilockerEnabled: e.target.checked })}
                  />
                  <span><b>Enable DigiLocker Document Verification</b></span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                  <input
                    type="checkbox"
                    checked={settings.cvcDebarmentSync}
                    onChange={(e) => setSettings({ ...settings, cvcDebarmentSync: e.target.checked })}
                  />
                  <span><b>Auto-Sync CVC & GFR 151 Blacklists</b></span>
                </label>
              </div>
            </div>

            {/* AI Microservice & Risk Thresholds */}
            <div style={{ marginBottom: '20px', padding: '14px', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-sm)', border: '1px solid #e2e8f0' }}>
              <h4 style={{ fontSize: '13.5px', fontWeight: '700', color: '#334155', marginBottom: '10px' }}>
                🤖 AI Microservice & Risk Score Thresholds
              </h4>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">High Risk Cutoff Threshold (%)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={settings.highRiskThreshold}
                    onChange={(e) => setSettings({ ...settings, highRiskThreshold: parseFloat(e.target.value) })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Low Risk / Preferred Cutoff Threshold (%)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={settings.lowRiskThreshold}
                    onChange={(e) => setSettings({ ...settings, lowRiskThreshold: parseFloat(e.target.value) })}
                  />
                </div>
              </div>

              <div className="grid-3">
                <div className="form-group">
                  <label className="form-label">OCR Engine</label>
                  <select
                    className="form-select"
                    value={settings.ocrEngine}
                    onChange={(e) => setSettings({ ...settings, ocrEngine: e.target.value })}
                  >
                    <option value="Tesseract-OCR v5.3">Tesseract-OCR v5.3</option>
                    <option value="EasyOCR">EasyOCR PyTorch</option>
                    <option value="PaddleOCR">PaddleOCR</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">ELA Tamper Sensitivity</label>
                  <select
                    className="form-select"
                    value={settings.elaTamperSensitivity}
                    onChange={(e) => setSettings({ ...settings, elaTamperSensitivity: e.target.value })}
                  >
                    <option value="HIGH">High (Forensic Mode)</option>
                    <option value="BALANCED">Balanced (Standard)</option>
                    <option value="LOW">Low (Permissive)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Drools Rule Engine Mode</label>
                  <select
                    className="form-select"
                    value={settings.droolsExecutionMode}
                    onChange={(e) => setSettings({ ...settings, droolsExecutionMode: e.target.value })}
                  >
                    <option value="STRICT">Strict (Zero-Tolerance)</option>
                    <option value="ADAPTIVE">Adaptive (Scored)</option>
                  </select>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="submit" className="btn btn-primary" style={{ padding: '10px 24px' }}>
                Save System Configuration
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* PUBLISH TENDER MODAL                                          */}
      {/* ------------------------------------------------------------- */}
      {showCreateTenderModal && (
        <div className="modal-backdrop" onClick={() => setShowCreateTenderModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '720px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--primary-dark)', marginBottom: '16px' }}>
              Publish New GeM Tender & Configure Drools Eligibility Baseline
            </h3>

            <form onSubmit={handleCreateTender}>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Tender Reference ID</label>
                  <input
                    type="text"
                    className="form-input"
                    value={tenderNumber}
                    onChange={(e) => setTenderNumber(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Procurement Category</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. IT Cloud & Hardware"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Tender Title</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Supply and Installation of Server Infrastructure"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Procuring Ministry / Department</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Ministry of Electronics and Information Technology"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  required
                />
              </div>

              <div className="grid-3">
                <div className="form-group">
                  <label className="form-label">Est. Value (₹ INR)</label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="e.g. 150000000"
                    value={estimatedValue}
                    onChange={(e) => setEstimatedValue(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Min Turnover (₹ INR)</label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="e.g. 100000000"
                    value={minTurnover}
                    onChange={(e) => setMinTurnover(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Min Experience (Yrs)</label>
                  <input
                    type="number"
                    step="0.5"
                    className="form-input"
                    placeholder="e.g. 5.0"
                    value={minExperienceYears}
                    onChange={(e) => setMinExperienceYears(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Mandatory Quality / Industry Certifications (Drools Gate)</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px' }}>
                  {certOptions.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => handleCertToggle(c)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        border: selectedCerts.includes(c) ? '2px solid var(--primary)' : '1px solid #cbd5e1',
                        backgroundColor: selectedCerts.includes(c) ? '#e0f2fe' : '#ffffff',
                        color: selectedCerts.includes(c) ? 'var(--primary-dark)' : '#475569'
                      }}
                    >
                      {selectedCerts.includes(c) ? '✓ ' : '+ '} {c}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowCreateTenderModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={creatingTender}>
                  {creatingTender ? 'Publishing & Generating Drools Rules...' : 'Confirm & Publish Tender'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
