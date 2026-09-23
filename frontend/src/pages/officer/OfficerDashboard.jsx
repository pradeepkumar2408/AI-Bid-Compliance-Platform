import React, { useState, useEffect } from 'react';
import { Award, ShieldAlert, CheckCircle, XCircle, FileText, AlertTriangle, Eye, RefreshCw, Scale, UserCheck, MessageSquare, History, PlusCircle, X, Send, Trash2, Plus } from 'lucide-react';
import { tenderService, officerService } from '../../services/api';
import { RiskBadge } from '../../components/Navbar';
import { DroolsRuleTrace } from '../../components/DroolsRuleTrace';
import { ShapWaterfallChart } from '../../components/ShapWaterfallChart';
import { DocumentViewerModal } from '../../components/DocumentViewerModal';

export const TENDER_DOCUMENT_OPTIONS = [
  {
    key: 'PAN_CARD',
    num: '1',
    label: 'PAN Card',
    desc: 'Valid business PAN card matching entity name',
    defaultChecked: true
  },
  {
    key: 'GST_CERTIFICATE',
    num: '2',
    label: 'GST Certificate (REG-06)',
    desc: 'Active GST registration certificate with 15-digit GSTIN',
    defaultChecked: true
  },
  {
    key: 'COMPANY_REGISTRATION',
    num: '3',
    label: 'Company Registration',
    desc: 'MCA Certificate of Incorporation, Udyam MSME, or Deed',
    defaultChecked: true
  },
  {
    key: 'EXPERIENCE_CERTIFICATES',
    num: '4',
    label: 'Experience Certificates',
    desc: 'Past client work orders and satisfactory completion letters',
    defaultChecked: true
  },
  {
    key: 'FINANCIAL_DOCUMENTS',
    num: '5',
    label: 'Financial Turnover Documents',
    desc: 'Audited Balance Sheet or CA Turnover Certificate with UDIN',
    defaultChecked: true
  },
  {
    key: 'ISO_COMPLIANCE',
    num: '6',
    label: 'ISO / Quality Certifications',
    desc: 'ISO 9001, ISO 27001, or CMMI certifications',
    defaultChecked: false
  },
  {
    key: 'TECHNICAL_PROPOSAL',
    num: '7',
    label: 'Technical Proposal & Matrix',
    desc: 'Technical methodology and clause-by-clause compliance',
    defaultChecked: false
  }
];

export const OfficerDashboard = ({ onOpenAudit, user }) => {
  const [tenders, setTenders] = useState([]);
  const [selectedTenderId, setSelectedTenderId] = useState(null);
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBidDossier, setSelectedBidDossier] = useState(null);
  const [dossierLoading, setDossierLoading] = useState(false);
  const [selectedDocForModal, setSelectedDocForModal] = useState(null);

  // In-App Toast State (Replacing browser alert)
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  // In-App Appeal Resolution Modal State (Replacing browser prompt)
  const [resolvingAppealModal, setResolvingAppealModal] = useState(null); // { appealId, status, notes }

  // Publish Tender Modal State
  const [showCreateTenderModal, setShowCreateTenderModal] = useState(false);
  const [tenderNumber, setTenderNumber] = useState(`GEM/${new Date().getFullYear()}/B/${Math.floor(100000 + Math.random() * 900000)}`);
  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState(user?.organizationName || 'GeM Evaluation Authority');
  const [category, setCategory] = useState('');
  const [estimatedValue, setEstimatedValue] = useState('');
  const [minTurnover, setMinTurnover] = useState('');
  const [minExperienceYears, setMinExperienceYears] = useState('');
  const [selectedRequiredDocs, setSelectedRequiredDocs] = useState([
    'PAN_CARD', 'GST_CERTIFICATE', 'COMPANY_REGISTRATION', 'EXPERIENCE_CERTIFICATES', 'FINANCIAL_DOCUMENTS'
  ]);
  
  // Officer-defined Custom Documents
  const [customDocList, setCustomDocList] = useState([]);
  const [showCustomDocForm, setShowCustomDocForm] = useState(false);
  const [customDocTitle, setCustomDocTitle] = useState('');
  const [customDocDesc, setCustomDocDesc] = useState('');
  const [customDocMandatory, setCustomDocMandatory] = useState(true);

  const [creatingTender, setCreatingTender] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const handleDocToggle = (docKey) => {
    if (selectedRequiredDocs.includes(docKey)) {
      setSelectedRequiredDocs(selectedRequiredDocs.filter(k => k !== docKey));
    } else {
      setSelectedRequiredDocs([...selectedRequiredDocs, docKey]);
    }
  };

  const handleAddCustomDoc = (e) => {
    e.preventDefault();
    if (!customDocTitle.trim()) {
      showToast('Please enter a document title.', 'error');
      return;
    }
    const cleanKey = `CUSTOM_${customDocTitle.trim().toUpperCase().replace(/[^A-Z0-9]/g, '_')}_${Date.now()}`;
    const newDoc = {
      key: cleanKey,
      title: customDocTitle.trim(),
      desc: customDocDesc.trim() || 'Custom statutory requirement specified by procuring officer.',
      mandatory: customDocMandatory,
      isCustom: true
    };
    setCustomDocList(prev => [...prev, newDoc]);
    setCustomDocTitle('');
    setCustomDocDesc('');
    setCustomDocMandatory(true);
    setShowCustomDocForm(false);
    showToast(`Added custom requirement "${newDoc.title}"!`, 'success');
  };

  const handleRemoveCustomDoc = (key) => {
    setCustomDocList(prev => prev.filter(d => d.key !== key));
  };

  // Decision Modal State (Step 10)
  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const [decisionType, setDecisionType] = useState('ACCEPTED');
  const [isOverride, setIsOverride] = useState(false);
  const [writtenJustification, setWrittenJustification] = useState('');
  const [decisionSubmitting, setDecisionSubmitting] = useState(false);

  // Appeals Queue State (Step 11)
  const [pendingAppeals, setPendingAppeals] = useState([]);
  const [activeTab, setActiveTab] = useState('evaluation'); // 'evaluation' | 'appeals'

  useEffect(() => {
    loadTenders();
  }, []);

  useEffect(() => {
    if (selectedTenderId) {
      loadRanking(selectedTenderId);
    }
  }, [selectedTenderId]);

  const loadTenders = async (selectNewId = null) => {
    try {
      const data = await tenderService.getAll();
      setTenders(data);
      if (selectNewId) {
        setSelectedTenderId(selectNewId);
      } else if (data.length > 0 && !selectedTenderId) {
        setSelectedTenderId(data[0].id);
      }
      loadPendingAppeals();
    } catch (err) {
      console.error('Error loading tenders:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadRanking = async (tenderId) => {
    try {
      const data = await officerService.getRanking(tenderId);
      setRanking(data);
      if (data.length > 0) {
        viewDossier(data[0].bidId);
      } else {
        setSelectedBidDossier(null);
      }
    } catch (err) {
      console.error('Error loading ranking:', err);
    }
  };

  const loadPendingAppeals = async () => {
    try {
      const data = await officerService.getPendingAppeals();
      setPendingAppeals(data);
    } catch (err) {
      console.error('Error loading appeals:', err);
    }
  };

  const viewDossier = async (bidId) => {
    setDossierLoading(true);
    try {
      const dossier = await officerService.getEvaluationDossier(bidId);
      setSelectedBidDossier(dossier);
    } catch (err) {
      console.error('Error loading dossier:', err);
    } finally {
      setDossierLoading(false);
    }
  };

  const handleCreateTender = async (e) => {
    e.preventDefault();
    const totalRequiredCount = selectedRequiredDocs.length + customDocList.length;
    if (totalRequiredCount === 0) {
      showToast('Please select or add at least one required document for bidders.', 'error');
      return;
    }
    setCreatingTender(true);
    try {
      const combinedRequirements = [
        ...selectedRequiredDocs.map(k => {
          const std = TENDER_DOCUMENT_OPTIONS.find(d => d.key === k);
          return {
            key: k,
            title: std?.label || k,
            desc: std?.desc || '',
            mandatory: true,
            isCustom: false
          };
        }),
        ...customDocList.map(c => ({
          key: c.key,
          title: c.title,
          desc: c.desc,
          mandatory: c.mandatory,
          isCustom: true
        }))
      ];

      const newTender = await tenderService.create({
        tenderNumber,
        title,
        department,
        category,
        estimatedValue: parseFloat(estimatedValue),
        minTurnover: parseFloat(minTurnover),
        minExperienceYears: parseFloat(minExperienceYears),
        requiredCertifications: [],
        requiredCertificates: combinedRequirements,
      });
      showToast(`Tender ${newTender.tenderNumber} published with ${totalRequiredCount} document requirements!`, 'success');
      setShowCreateTenderModal(false);
      // Reset form
      setTenderNumber(`GEM/${new Date().getFullYear()}/B/${Math.floor(100000 + Math.random() * 900000)}`);
      setTitle('');
      setCategory('');
      setEstimatedValue('');
      setMinTurnover('');
      setMinExperienceYears('');
      setSelectedRequiredDocs(['PAN_CARD', 'GST_CERTIFICATE', 'COMPANY_REGISTRATION', 'EXPERIENCE_CERTIFICATES', 'FINANCIAL_DOCUMENTS']);
      setCustomDocList([]);
      setShowCustomDocForm(false);
      loadTenders(newTender.id);
    } catch (err) {
      showToast('Failed to publish tender: ' + (err.response?.data || err.message), 'error');
    } finally {
      setCreatingTender(false);
    }
  };

  const handleRecordDecision = async (e) => {
    e.preventDefault();
    if (!selectedBidDossier?.bid?.id) return;
    setDecisionSubmitting(true);
    try {
      await officerService.recordDecision(
        selectedBidDossier.bid.id,
        decisionType,
        isOverride,
        writtenJustification
      );
      showToast('Official decision successfully recorded and locked in Immutable Audit Trail.', 'success');
      setShowDecisionModal(false);
      setWrittenJustification('');
      setIsOverride(false);
      loadRanking(selectedTenderId);
      viewDossier(selectedBidDossier.bid.id);
    } catch (err) {
      showToast('Error recording decision: ' + (err.response?.data || err.message), 'error');
    } finally {
      setDecisionSubmitting(false);
    }
  };

  const handleConfirmResolveAppeal = async () => {
    if (!resolvingAppealModal) return;
    const { appealId, status, notes } = resolvingAppealModal;
    try {
      await officerService.resolveAppeal(appealId, status, notes || 'Resolved by Evaluation Officer.');
      showToast(`Appeal #${appealId} marked as ${status}.`, 'success');
      setResolvingAppealModal(null);
      loadPendingAppeals();
      if (selectedTenderId) loadRanking(selectedTenderId);
    } catch (err) {
      showToast('Failed to resolve appeal: ' + err.message, 'error');
    }
  };

  const handleResolveAppeal = (appealId, status) => {
    setResolvingAppealModal({ appealId, status, notes: '' });
  };

  return (
    <div>
      {/* Top Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--primary-dark)' }}>
            Evaluation Officer Decision Support Cockpit
          </h2>
          <p style={{ fontSize: '13px', color: '#64748b' }}>
            Tender Publishing, Drools Rule Matrix, Explainable AI Scoring & Human Decisions
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            className="btn btn-primary"
            onClick={() => setShowCreateTenderModal(true)}
          >
            <PlusCircle size={16} /> Publish New Tender
          </button>
          <button 
            className={`btn ${activeTab === 'evaluation' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveTab('evaluation')}
          >
            <Award size={16} /> Tender Rankings
          </button>
          <button 
            className={`btn ${activeTab === 'appeals' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveTab('appeals')}
          >
            <MessageSquare size={16} /> Grievance Queue ({pendingAppeals.length})
          </button>
          <button className="btn btn-outline" onClick={onOpenAudit}>
            <History size={16} /> Audit Trail
          </button>
        </div>
      </div>

      {successMsg && (
        <div style={{
          backgroundColor: '#f0fdf4',
          border: '1px solid #bbf7d0',
          color: '#15803d',
          padding: '12px 16px',
          borderRadius: 'var(--radius-sm)',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <CheckCircle size={18} /> {successMsg}
        </div>
      )}

      {activeTab === 'appeals' ? (
        /* Grievance Resolution View */
        <div className="gem-card">
          <div className="card-header">
            <div className="card-title">
              <MessageSquare size={20} /> Pending Bidder Grievance & Appeal Queue ({pendingAppeals.length})
            </div>
          </div>

          {pendingAppeals.length === 0 ? (
            <p style={{ color: '#64748b', fontSize: '13px' }}>No pending bidder appeals.</p>
          ) : (
            <div className="gem-table-container">
              <table className="gem-table">
                <thead>
                  <tr>
                    <th>Appeal ID</th>
                    <th>Bid ID</th>
                    <th>Bidder</th>
                    <th>Submitted Time</th>
                    <th>Grounds / Clarification</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingAppeals.map((app) => (
                    <tr key={app.id}>
                      <td><b>#{app.id}</b></td>
                      <td>Bid #{app.bidId}</td>
                      <td>{app.bidderId}</td>
                      <td>{new Date(app.createdAt).toLocaleString()}</td>
                      <td style={{ maxWidth: '400px', fontSize: '12.5px' }}>{app.appealReason}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            className="btn btn-success"
                            style={{ padding: '4px 10px', fontSize: '12px' }}
                            onClick={() => handleResolveAppeal(app.id, 'APPROVED')}
                          >
                            Approve
                          </button>
                          <button
                            className="btn btn-danger"
                            style={{ padding: '4px 10px', fontSize: '12px' }}
                            onClick={() => handleResolveAppeal(app.id, 'REJECTED')}
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Evaluation & Ranking View */
        <div>
          {tenders.length === 0 ? (
            <div className="gem-card" style={{ textAlign: 'center', padding: '48px 24px', backgroundColor: '#f8fafc' }}>
              <FileText size={48} color="#94a3b8" style={{ margin: '0 auto 16px' }} />
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b', marginBottom: '8px' }}>
                No Tenders Found in Database
              </h3>
              <p style={{ color: '#64748b', fontSize: '13.5px', maxWidth: '500px', margin: '0 auto 20px' }}>
                There are currently no procurement tenders stored in the system. Click below to publish your first GeM procurement tender.
              </p>
              <button 
                className="btn btn-primary"
                onClick={() => setShowCreateTenderModal(true)}
                style={{ padding: '10px 24px', fontWeight: '700' }}
              >
                <PlusCircle size={16} /> Publish New Tender
              </button>
            </div>
          ) : (
            <>
              {/* Tender Selector */}
              <div style={{ marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#334155' }}>Select Tender:</span>
                <select
                  className="form-select"
                  style={{ maxWidth: '500px' }}
                  value={selectedTenderId || ''}
                  onChange={(e) => setSelectedTenderId(e.target.value)}
                >
                  {tenders.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.tenderNumber} — {t.title}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '420px 1fr', gap: '20px' }}>
            {/* Left Column: Ranked Bids Table */}
            <div className="gem-card" style={{ padding: '16px' }}>
              <div className="card-header" style={{ marginBottom: '12px', paddingBottom: '8px' }}>
                <div className="card-title" style={{ fontSize: '15px' }}>
                  <Award size={18} /> Ranked Bidders ({ranking.length})
                </div>
              </div>

              {ranking.length === 0 ? (
                <p style={{ color: '#64748b', fontSize: '13px' }}>No bids submitted for this tender yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {ranking.map((b, idx) => {
                    const isSelected = selectedBidDossier?.bid?.id === b.bidId;
                    return (
                      <div
                        key={b.bidId}
                        onClick={() => viewDossier(b.bidId)}
                        style={{
                          padding: '12px',
                          borderRadius: 'var(--radius-sm)',
                          border: isSelected ? '2px solid var(--primary)' : '1px solid #e2e8f0',
                          backgroundColor: isSelected ? '#f0f9ff' : 'white',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b' }}>
                            #{idx + 1} {b.bidNumber}
                          </span>
                          <RiskBadge level={b.riskLevel} />
                        </div>

                        <div style={{ fontWeight: '700', fontSize: '14px', color: '#1e293b', marginBottom: '4px' }}>
                          {b.bidderName}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                          <span>
                            Score: <b style={{ color: 'var(--primary)', fontSize: '14px' }}>{b.complianceScore}%</b>
                          </span>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: '600',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: b.officerDecision === 'ACCEPTED' ? '#dcfce7' : b.officerDecision === 'REJECTED' ? '#fee2e2' : '#f1f5f9',
                            color: b.officerDecision === 'ACCEPTED' ? '#166534' : b.officerDecision === 'REJECTED' ? '#991b1b' : '#475569'
                          }}>
                            {b.officerDecision === 'PENDING' ? 'Decision Pending' : b.officerDecision}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right Column: Deep-Dive Dossier */}
            <div>
              {dossierLoading ? (
                <div className="gem-card"><p>Loading evaluation dossier...</p></div>
              ) : !selectedBidDossier ? (
                <div className="gem-card"><p>Select a bidder from the ranking list on the left to inspect evidence.</p></div>
              ) : (
                <div className="gem-card">
                  {/* Dossier Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px', marginBottom: '18px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--primary-dark)' }}>
                          {selectedBidDossier.bid.bidderName}
                        </h3>
                        <RiskBadge level={selectedBidDossier.complianceScore?.riskLevel} />
                      </div>
                      <p style={{ fontSize: '12.5px', color: '#64748b', marginTop: '2px' }}>
                        Bid Number: <b>{selectedBidDossier.bid.bidNumber}</b> | Submitted: {new Date(selectedBidDossier.bid.submissionDate).toLocaleString()}
                      </p>
                    </div>

                    <button
                      className="btn btn-primary"
                      onClick={() => setShowDecisionModal(true)}
                    >
                      <UserCheck size={16} /> Final Officer Decision
                    </button>
                  </div>

                  {/* Identity Verification Panel */}
                  <div style={{
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: 'var(--radius-sm)',
                    padding: '14px',
                    marginBottom: '18px'
                  }}>
                    <h4 style={{ fontSize: '13.5px', fontWeight: '700', color: '#334155', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <UserCheck size={16} color="var(--primary)" /> Government Identity Verification (NSDL & GSTN Portal Validation)
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', fontSize: '12px' }}>
                      <div>
                        <span style={{ color: '#64748b' }}>PAN Status:</span>
                        <div><b>{selectedBidDossier.identityVerification?.panStatus || 'VALID'}</b></div>
                      </div>
                      <div>
                        <span style={{ color: '#64748b' }}>GSTIN Status:</span>
                        <div><b>{selectedBidDossier.identityVerification?.gstStatus || 'ACTIVE'}</b></div>
                      </div>
                      <div>
                        <span style={{ color: '#64748b' }}>Name Mismatch:</span>
                        <div><b>{selectedBidDossier.identityVerification?.nameMismatchFlag ? '⚠️ MISMATCH' : '✓ MATCHED'}</b></div>
                      </div>
                      <div>
                        <span style={{ color: '#64748b' }}>Debarment Status:</span>
                        <div>
                          <b style={{ color: selectedBidDossier.identityVerification?.isDebarred ? '#dc2626' : '#16a34a' }}>
                            {selectedBidDossier.identityVerification?.isDebarred ? '🚨 DEBARRED / CVC LIST' : '✓ CLEAR'}
                          </b>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Documents & Tamper Checks */}
                  <div style={{ marginBottom: '18px' }}>
                    <h4 style={{ fontSize: '13.5px', fontWeight: '700', color: '#334155', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <FileText size={16} color="var(--primary)" /> Uploaded Evidence & Fraud Scans ({selectedBidDossier.documents?.length || 0} Files)
                    </h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {selectedBidDossier.documents?.map((doc) => (
                        <div
                          key={doc.id}
                          onClick={() => setSelectedDocForModal(doc)}
                          style={{
                            padding: '8px 12px',
                            borderRadius: 'var(--radius-sm)',
                            border: doc.isTampered ? '1px solid #fca5a5' : '1px solid #cbd5e1',
                            backgroundColor: doc.isTampered ? '#fef2f2' : '#ffffff',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '12px'
                          }}
                        >
                          <FileText size={14} color={doc.isTampered ? '#dc2626' : 'var(--primary)'} />
                          <span>{doc.filename}</span>
                          {doc.isTampered && <span style={{ color: '#dc2626', fontWeight: '700' }}>[ELA TAMPER]</span>}
                          {doc.isDuplicate && <span style={{ color: '#d97706', fontWeight: '700' }}>[DUPLICATE]</span>}
                          <Eye size={13} color="#64748b" />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* STEP 5: Drools Rule Trace */}
                  <DroolsRuleTrace traceJson={selectedBidDossier.complianceScore?.droolsTraceJson} />

                  {/* STEP 6 & 8: SHAP Waterfall */}
                  <ShapWaterfallChart shapJson={selectedBidDossier.complianceScore?.shapAttributionJson} />

                  {/* Existing Officer Decision Display */}
                  {selectedBidDossier.officerDecision && (
                    <div style={{
                      marginTop: '20px',
                      padding: '14px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: '#f8fafc',
                      border: '1px solid #cbd5e1'
                    }}>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--primary-dark)', marginBottom: '4px' }}>
                        Recorded Officer Decision: <b>{selectedBidDossier.officerDecision.decision}</b> (By {selectedBidDossier.officerDecision.officerId})
                      </div>
                      {selectedBidDossier.officerDecision.officerOverride && (
                        <div style={{ fontSize: '12px', color: '#b91c1c', fontWeight: '600', marginBottom: '4px' }}>
                          ⚠️ Officer Overrode AI Recommendation
                        </div>
                      )}
                      <div style={{ fontSize: '12.5px', color: '#334155' }}>
                        Justification: {selectedBidDossier.officerDecision.writtenJustification || 'No custom notes.'}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )}

      {/* Publish Tender Modal */}
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
                  placeholder="e.g. Supply and Commissioning of Cloud Servers"
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

              {/* Document Requirements Checkboxes for Bidder */}
              <div className="form-group" style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <label className="form-label" style={{ fontWeight: '800', margin: 0, color: 'var(--primary-dark)', fontSize: '13.5px' }}>
                      Required Documents to be Provided by Bidder ({selectedRequiredDocs.length} Selected)
                    </label>
                    <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                      Only the documents checked below will be prompted and required for upload on the Bidder's portal for this tender.
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => setSelectedRequiredDocs(TENDER_DOCUMENT_OPTIONS.map(d => d.key))}
                      style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer', fontWeight: '600' }}
                    >
                      Select All (7)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedRequiredDocs(['PAN_CARD', 'GST_CERTIFICATE', 'COMPANY_REGISTRATION', 'EXPERIENCE_CERTIFICATES', 'FINANCIAL_DOCUMENTS'])}
                      style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer', fontWeight: '600' }}
                    >
                      Standard (5)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedRequiredDocs([])}
                      style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '4px', border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', cursor: 'pointer', fontWeight: '600' }}
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                  gap: '8px',
                  maxHeight: '260px',
                  overflowY: 'auto',
                  padding: '10px',
                  backgroundColor: '#f8fafc',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0'
                }}>
                  {TENDER_DOCUMENT_OPTIONS.map((doc) => {
                    const isChecked = selectedRequiredDocs.includes(doc.key);
                    return (
                      <div
                        key={doc.key}
                        onClick={() => handleDocToggle(doc.key)}
                        style={{
                          padding: '10px 12px',
                          borderRadius: '6px',
                          border: isChecked ? '1.5px solid #0284c7' : '1px solid #cbd5e1',
                          backgroundColor: isChecked ? '#f0f9ff' : '#ffffff',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '10px',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          style={{ marginTop: '3px', cursor: 'pointer', accentColor: '#0284c7' }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '12.5px', fontWeight: '700', color: isChecked ? '#0369a1' : '#1e293b' }}>
                              {doc.label}
                            </span>
                            {isChecked && (
                              <span style={{ fontSize: '10px', background: '#dcfce7', color: '#166534', padding: '1px 6px', borderRadius: '4px', fontWeight: '700' }}>
                                Required
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', lineHeight: 1.3 }}>
                            {doc.desc}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Custom Documents Added by Officer */}
                {customDocList.length > 0 && (
                  <div style={{ marginTop: '14px' }}>
                    <div style={{ fontSize: '12px', fontWeight: '800', color: '#0f172a', marginBottom: '6px' }}>
                      Additional Officer-Defined Document Requirements ({customDocList.length}):
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {customDocList.map((cd) => (
                        <div
                          key={cd.key}
                          style={{
                            padding: '10px 14px',
                            background: '#f0fdf4',
                            borderRadius: '6px',
                            border: '1px solid #86efac',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '13px', fontWeight: '800', color: '#166534' }}>{cd.title}</span>
                              <span style={{ fontSize: '9.5px', padding: '1px 6px', borderRadius: '4px', background: cd.mandatory ? '#fee2e2' : '#f1f5f9', color: cd.mandatory ? '#b91c1c' : '#475569', fontWeight: '700' }}>
                                {cd.mandatory ? 'MANDATORY' : 'OPTIONAL'}
                              </span>
                              <span style={{ fontSize: '9.5px', padding: '1px 6px', borderRadius: '4px', background: '#dbeafe', color: '#1e40af', fontWeight: '700' }}>
                                CUSTOM
                              </span>
                            </div>
                            {cd.desc && <div style={{ fontSize: '11px', color: '#4b5563', marginTop: '2px' }}>{cd.desc}</div>}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveCustomDoc(cd.key)}
                            style={{ background: '#fee2e2', border: 'none', color: '#b91c1c', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600' }}
                          >
                            <Trash2 size={12} /> Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* + Add Custom Document Button / Inline Form */}
                <div style={{ marginTop: '14px' }}>
                  {!showCustomDocForm ? (
                    <button
                      type="button"
                      onClick={() => setShowCustomDocForm(true)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 16px',
                        borderRadius: '6px',
                        background: '#f8fafc',
                        border: '1.5px dashed #0284c7',
                        color: '#0369a1',
                        fontSize: '12.5px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <PlusCircle size={15} /> + Add Any Custom Document Requirement (e.g. Site Visit Certificate, OEM Authorization, Power of Attorney)
                    </button>
                  ) : (
                    <div style={{
                      padding: '16px',
                      background: '#f8fafc',
                      borderRadius: '8px',
                      border: '1.5px solid #0284c7',
                      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
                    }}>
                      <div style={{ fontSize: '13px', fontWeight: '800', color: '#0369a1', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <FileText size={15} /> Add Custom Document Requirement for Bidders
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowCustomDocForm(false)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
                        >
                          <X size={16} />
                        </button>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                        <div>
                          <label style={{ fontSize: '11.5px', fontWeight: '700', color: '#334155' }}>Document Title *</label>
                          <input
                            type="text"
                            className="form-input"
                            style={{ padding: '7px 10px', fontSize: '12.5px', marginTop: '4px' }}
                            placeholder="e.g. Site Inspection & Feasibility Certificate"
                            value={customDocTitle}
                            onChange={(e) => setCustomDocTitle(e.target.value)}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: '11.5px', fontWeight: '700', color: '#334155' }}>Description / Specific Criteria</label>
                          <input
                            type="text"
                            className="form-input"
                            style={{ padding: '7px 10px', fontSize: '12.5px', marginTop: '4px' }}
                            placeholder="e.g. Signed & stamped by designated site officer"
                            value={customDocDesc}
                            onChange={(e) => setCustomDocDesc(e.target.value)}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: '700', color: '#334155' }}>
                          <input
                            type="checkbox"
                            checked={customDocMandatory}
                            onChange={(e) => setCustomDocMandatory(e.target.checked)}
                            style={{ accentColor: '#0284c7' }}
                          />
                          <span>Mandatory Document (Bidder cannot submit without this)</span>
                        </label>

                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            type="button"
                            onClick={() => setShowCustomDocForm(false)}
                            className="btn btn-outline"
                            style={{ padding: '5px 12px', fontSize: '12px' }}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleAddCustomDoc}
                            className="btn btn-primary"
                            style={{ padding: '5px 14px', fontSize: '12px' }}
                          >
                            Add Requirement to Tender
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
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

      {/* Decision Modal */}
      {showDecisionModal && selectedBidDossier && (
        <div className="modal-backdrop" onClick={() => setShowDecisionModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--primary-dark)', marginBottom: '12px' }}>
              Binding Final Decision (Human Officer Authority)
            </h3>
            <p style={{ fontSize: '13px', color: '#475569', marginBottom: '16px' }}>
              Evaluating Bid: <b>{selectedBidDossier.bid.bidNumber}</b> ({selectedBidDossier.bid.bidderName})
              <br />AI Compliance Score: <b>{selectedBidDossier.complianceScore?.totalScore}%</b> | Risk: <b>{selectedBidDossier.complianceScore?.riskLevel}</b>
            </p>

            <form onSubmit={handleRecordDecision}>
              <div className="form-group">
                <label className="form-label">Select Official Decision</label>
                <select
                  className="form-select"
                  value={decisionType}
                  onChange={(e) => setDecisionType(e.target.value)}
                >
                  <option value="ACCEPTED">ACCEPT BID (Award Compliance Passed)</option>
                  <option value="REJECTED">REJECT BID (Non-Compliant)</option>
                  <option value="REQUEST_CLARIFICATION">REQUEST CLARIFICATION</option>
                </select>
              </div>

              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                  <input
                    type="checkbox"
                    checked={isOverride}
                    onChange={(e) => setIsOverride(e.target.checked)}
                  />
                  <span><b>Override AI Recommendation / Drools Score</b></span>
                </label>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Mandatory Written Justification {isOverride && <span style={{ color: '#dc2626' }}>* (Required for Override)</span>}
                </label>
                <textarea
                  className="form-textarea"
                  rows={4}
                  placeholder="Provide legally binding written justification for government audit records..."
                  value={writtenJustification}
                  onChange={(e) => setWrittenJustification(e.target.value)}
                  required={isOverride}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowDecisionModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={decisionSubmitting}>
                  {decisionSubmitting ? 'Recording...' : 'Lock Decision & Append to Audit Trail'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Document Viewer Modal */}
      {selectedDocForModal && (
        <DocumentViewerModal
          document={selectedDocForModal}
          onClose={() => setSelectedDocForModal(null)}
        />
      )}

      {/* Appeal Resolution In-App Modal */}
      {resolvingAppealModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: '20px'
        }}>
          <div style={{ background: 'white', borderRadius: '12px', maxWidth: '500px', width: '100%', padding: '24px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '800', margin: 0, color: '#0f172a' }}>
                Resolve Statutory Appeal #{resolvingAppealModal.appealId}
              </h3>
              <button onClick={() => setResolvingAppealModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 16px 0' }}>
              Set resolution status to <b style={{ color: resolvingAppealModal.status === 'APPROVED' ? '#16a34a' : '#dc2626' }}>{resolvingAppealModal.status}</b> and provide official officer notes for bidder.
            </p>
            <div className="form-group">
              <label className="form-label">Official Evaluation Notes</label>
              <textarea
                className="form-textarea"
                rows={4}
                value={resolvingAppealModal.notes}
                onChange={(e) => setResolvingAppealModal({ ...resolvingAppealModal, notes: e.target.value })}
                placeholder="Enter official resolution justification..."
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
              <button type="button" className="btn btn-outline" onClick={() => setResolvingAppealModal(null)}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={handleConfirmResolveAppeal}>Confirm & Save Resolution</button>
            </div>
          </div>
        </div>
      )}

      {/* Floating React Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          zIndex: 99999,
          padding: '14px 20px',
          borderRadius: '10px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.25), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
          backgroundColor: toast.type === 'success' ? '#064e3b' : (toast.type === 'error' ? '#7f1d1d' : '#1e3a8a'),
          color: 'white',
          border: `1.5px solid ${toast.type === 'success' ? '#34d399' : (toast.type === 'error' ? '#f87171' : '#60a5fa')}`,
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontSize: '13.5px',
          fontWeight: '600',
          maxWidth: '460px',
          transition: 'all 0.3s ease'
        }}>
          {toast.type === 'success' ? <CheckCircle size={20} color="#34d399" /> : <AlertTriangle size={20} color="#f87171" />}
          <span style={{ flex: 1, lineHeight: 1.4 }}>{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
};
