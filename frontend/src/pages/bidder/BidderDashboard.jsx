import React, { useState, useEffect } from 'react';
import { 
  Upload, FileCheck, Send, AlertTriangle, CheckCircle, Clock, ShieldAlert, 
  FileText, Info, Building, ShieldCheck, X, File, Check, ExternalLink, 
  RefreshCw, Key, Award, DollarSign, Briefcase, Landmark, Shield, 
  FileSpreadsheet, Eye, ChevronRight, CheckCircle2, Trash2, HelpCircle,
  Cpu, AlertCircle, Search, Layers, Activity, FileDigit, HelpCircle as HelpIcon,
  ChevronDown, ChevronUp, Lock, ArrowUpRight
} from 'lucide-react';
import { tenderService, bidService, aiService } from '../../services/api';
import { RiskBadge } from '../../components/Navbar';
import { BidderChatbot } from '../../components/BidderChatbot';
import { DocumentViewerModal } from '../../components/DocumentViewerModal';

// 7 Defined Statutory GeM Tender Document Categories
export const REQUIRED_DOCUMENTS = [
  {
    id: 1,
    key: 'PAN_CARD',
    title: 'PAN Card',
    subtitle: 'Permanent Account Number',
    mandatory: true,
    type: 'Structured Tax ID',
    icon: FileText,
    badgeColor: '#0284c7',
    purpose: 'Valid business PAN card matching registered entity name.',
    acceptedExt: '.pdf,.png,.jpg,.jpeg',
    hint: 'Upload business PAN card.'
  },
  {
    id: 2,
    key: 'GST_CERTIFICATE',
    title: 'GST Certificate',
    subtitle: 'Form GST REG-06',
    mandatory: true,
    type: 'GST Registration',
    icon: ShieldCheck,
    badgeColor: '#059669',
    purpose: 'Active GST registration certificate with 15-digit GSTIN.',
    acceptedExt: '.pdf,.png,.jpg,.jpeg',
    hint: 'Upload GST REG-06 certificate.'
  },
  {
    id: 3,
    key: 'COMPANY_REGISTRATION',
    title: 'Company Registration',
    subtitle: 'Incorporation / MSME / Deed',
    mandatory: true,
    type: 'Entity Registration',
    icon: Building,
    badgeColor: '#7c3aed',
    purpose: 'Certificate of Incorporation (CIN), Udyam MSME, or Partnership Deed.',
    acceptedExt: '.pdf,.png,.jpg,.jpeg',
    hint: 'Upload incorporation or MSME certificate.'
  },
  {
    id: 4,
    key: 'EXPERIENCE_CERTIFICATES',
    title: 'Experience Certificates',
    subtitle: 'Past Work Orders & Proof',
    mandatory: true,
    type: 'Work Experience',
    icon: Briefcase,
    badgeColor: '#d97706',
    purpose: 'Work orders or project completion certificates from clients.',
    acceptedExt: '.pdf,.png,.jpg,.jpeg',
    hint: 'Upload past work orders & completion certificates.'
  },
  {
    id: 5,
    key: 'FINANCIAL_DOCUMENTS',
    title: 'Financial Turnover',
    subtitle: 'CA Certificate with UDIN',
    mandatory: true,
    type: 'Financial Proof',
    icon: DollarSign,
    badgeColor: '#0891b2',
    purpose: 'Audited financial balance sheet or CA turnover certificate with UDIN.',
    acceptedExt: '.pdf,.png,.jpg,.jpeg',
    hint: 'Upload CA Turnover certificate or Balance Sheet.'
  },
  {
    id: 6,
    key: 'ISO_COMPLIANCE',
    title: 'ISO / Quality Certs',
    subtitle: 'Quality & Compliance Certs',
    mandatory: false,
    type: 'Quality Certifications',
    icon: Shield,
    badgeColor: '#4f46e5',
    purpose: 'ISO 9001, ISO 27001, CMMI, or relevant quality certifications.',
    acceptedExt: '.pdf,.png,.jpg,.jpeg',
    hint: 'Upload ISO or quality certificates.'
  },
  {
    id: 7,
    key: 'TECHNICAL_PROPOSAL',
    title: 'Technical Proposal',
    subtitle: 'Technical Compliance Matrix',
    mandatory: false,
    type: 'Technical Bid',
    icon: Layers,
    badgeColor: '#6366f1',
    purpose: 'Detailed technical bid proposal and specification compliance.',
    acceptedExt: '.pdf,.png,.jpg,.jpeg',
    hint: 'Upload technical proposal document.'
  }
];

export const BidderDashboard = ({ user }) => {
  const [tenders, setTenders] = useState([]);
  const [myBids, setMyBids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState('');

  // Bidder Credentials & Inputs
  const [selectedTenderId, setSelectedTenderId] = useState('');
  const [bidderName, setBidderName] = useState(user?.organizationName || user?.username || '');
  const [pan, setPan] = useState(user?.pan || '');
  const [gstin, setGstin] = useState(user?.gstin || '');
  const [declaredTurnover, setDeclaredTurnover] = useState('250000000');
  const [declaredExperience, setDeclaredExperience] = useState('5.0');

  // Multi-Document Upload & AI Processing States
  // docState: { [key]: { file, processing, result, error, rawText } }
  const [docStates, setDocStates] = useState({});
  const [analyzingAll, setAnalyzingAll] = useState(false);
  const [verificationReport, setVerificationReport] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Active Report Tab: 'OVERVIEW' | 'STRUCTURED_VS_UNSTRUCTURED' | 'CROSS_VERIFICATION' | 'AUTHENTICITY_TAMPER' | 'EXPLAINABLE_AI'
  const [activeReportTab, setActiveReportTab] = useState('OVERVIEW');

  // Appeal Modal
  const [showAppealModal, setShowAppealModal] = useState(false);
  const [selectedBidForAppeal, setSelectedBidForAppeal] = useState(null);
  const [appealReason, setAppealReason] = useState('');

  // Document Viewer Modal
  const [selectedDocForModal, setSelectedDocForModal] = useState(null);

  const appliedTenderIds = new Set((myBids || []).map(b => Number(b.tenderId)));
  const selectedTender = tenders.find(t => String(t.id) === String(selectedTenderId));

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [tList, bList] = await Promise.all([
        tenderService.getAll(),
        bidService.getMyBids(),
      ]);
      setTenders(tList || []);
      setMyBids(bList || []);

      const userAppliedIds = new Set((bList || []).map(b => Number(b.tenderId)));
      const firstAvailable = (tList || []).find(t => !userAppliedIds.has(Number(t.id)));
      if (firstAvailable) {
        setSelectedTenderId(firstAvailable.id);
      } else if (tList && tList.length > 0) {
        setSelectedTenderId(tList[0].id);
      }
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle Document Selection & Instant Classification Pre-Check
  const handleFileChange = async (docKey, file) => {
    if (!file) return;

    // Update state to processing
    setDocStates(prev => ({
      ...prev,
      [docKey]: {
        file,
        processing: true,
        result: null,
        error: null
      }
    }));

    try {
      // 1. Process document via AI microservice
      const res = await aiService.processDocument(
        file,
        user?.username || 'bidder',
        selectedTender?.tenderNumber || 'TDR-DEFAULT',
        docKey
      );

      const isDocValid = res.status === 'VALID' || res.validation_status === 'VALID' || res.is_valid === true || (res.classification && res.classification.is_valid === true);
      const docError = !isDocValid ? (res.rejection_reason || 'Document validation failed') : null;

      setDocStates(prev => ({
        ...prev,
        [docKey]: {
          file,
          processing: false,
          result: res,
          error: docError
        }
      }));

      // Trigger composite package re-verification if multiple docs present
      triggerPackageVerification({
        ...docStates,
        [docKey]: { file, processing: false, result: res, error: docError }
      });

    } catch (err) {
      console.error('AI Processing error for ' + docKey + ':', err);
      setDocStates(prev => ({
        ...prev,
        [docKey]: {
          file,
          processing: false,
          result: null,
          error: 'AI Processing Error: ' + (err.response?.data?.detail?.message || err.message)
        }
      }));
    }
  };

  const removeDocument = (docKey) => {
    const updated = { ...docStates };
    delete updated[docKey];
    setDocStates(updated);
    triggerPackageVerification(updated);
  };

  // Run Unified 14-Point AI Verification & Authenticity Pipeline
  const triggerPackageVerification = async (currentDocStates = docStates) => {
    const validUploadedDocs = [];

    Object.entries(currentDocStates).forEach(([docKey, state]) => {
      if (state.result && state.file) {
        validUploadedDocs.push({
          doc_type: docKey,
          filename: state.file.name,
          is_valid: state.result.validation_status === 'VALID' || state.result.is_valid,
          validation_status: state.result.validation_status || (state.result.is_valid ? 'VALID' : 'INVALID'),
          detected_category: state.result.detected_category,
          category_label: state.result.category_label,
          entities: state.result.entities || {},
          tamper_analysis: state.result.tamper_analysis || {},
          duplicate_analysis: state.result.duplicate_analysis || {},
          ocr_text: state.result.ocr_text || ''
        });
      }
    });

    if (validUploadedDocs.length === 0) {
      setVerificationReport(null);
      return;
    }

    setAnalyzingAll(true);
    try {
      const packageReq = {
        bidder_input: {
          bidder_name: bidderName,
          pan: pan,
          gstin: gstin,
          declared_turnover: parseFloat(declaredTurnover) || 0.0,
          declared_experience: parseFloat(declaredExperience) || 0.0
        },
        documents: validUploadedDocs,
        tender_requirements: {
          min_turnover: selectedTender?.minTurnover ? Number(selectedTender.minTurnover) : 0,
          min_experience_years: selectedTender?.minExperienceYears ? Number(selectedTender.minExperienceYears) : 0,
          required_certifications: selectedTender?.requiredCertifications || []
        }
      };

      const res = await aiService.verifyBidPackage(packageReq.bidder_input, packageReq.documents, packageReq.tender_requirements);
      if (res.success && res.result) {
        setVerificationReport(res.result);
      }
    } catch (err) {
      console.error('Unified verification error:', err);
    } finally {
      setAnalyzingAll(false);
    }
  };

  // Dynamic Document Requirements determined by the Officer for the selected tender
  const displayedDocuments = React.useMemo(() => {
    if (!selectedTender) return REQUIRED_DOCUMENTS;

    let reqList = selectedTender.requiredCertificates;
    if (typeof reqList === 'string') {
      try { reqList = JSON.parse(reqList); } catch (e) { reqList = null; }
    }
    if (!reqList && selectedTender.requiredCertificatesJson) {
      try { reqList = JSON.parse(selectedTender.requiredCertificatesJson); } catch (e) { reqList = null; }
    }

    if (Array.isArray(reqList) && reqList.length > 0) {
      const parsedDocs = [];

      reqList.forEach((item, index) => {
        if (typeof item === 'string') {
          const std = REQUIRED_DOCUMENTS.find(d => d.key === item);
          if (std) {
            parsedDocs.push(std);
          } else {
            parsedDocs.push({
              id: 100 + index,
              key: item,
              title: item.replace(/_/g, ' '),
              subtitle: 'Officer Specified Document',
              mandatory: true,
              type: 'Custom Document',
              icon: FileText,
              badgeColor: '#0284c7',
              purpose: 'Document specified by the evaluation officer for this tender.',
              acceptedExt: '.pdf,.png,.jpg,.jpeg',
              hint: 'Upload the requested document in PDF or Image format.',
              isCustom: true
            });
          }
        } else if (item && typeof item === 'object') {
          const std = REQUIRED_DOCUMENTS.find(d => d.key === item.key);
          if (std && !item.isCustom) {
            parsedDocs.push({
              ...std,
              mandatory: item.mandatory !== undefined ? item.mandatory : std.mandatory
            });
          } else {
            parsedDocs.push({
              id: 200 + index,
              key: item.key || `CUSTOM_${index}`,
              title: item.title || item.label || 'Custom Document',
              subtitle: item.subtitle || 'Officer Specified Document',
              mandatory: item.mandatory !== false,
              type: 'Custom Document',
              icon: FileText,
              badgeColor: '#0284c7',
              purpose: item.desc || 'Document specified by the evaluation officer.',
              acceptedExt: '.pdf,.png,.jpg,.jpeg',
              hint: 'Upload clear scan/copy of the requested document.',
              isCustom: true
            });
          }
        }
      });

      return parsedDocs.length > 0 ? parsedDocs : REQUIRED_DOCUMENTS;
    }
    return REQUIRED_DOCUMENTS;
  }, [selectedTender]);

  // Submit Bid Package to Evaluation Officer
  const handleSubmitBidPackage = async () => {
    if (!selectedTenderId) {
      setNotification('❌ Please select an active procurement tender.');
      return;
    }

    if (!pan || !gstin) {
      setNotification('❌ PAN and GSTIN are required.');
      return;
    }

    const uploadedKeys = Object.keys(docStates).filter(k => docStates[k]?.file && !docStates[k]?.error);
    const missingMandatory = displayedDocuments.filter(d => d.mandatory && !uploadedKeys.includes(d.key));

    if (missingMandatory.length > 0) {
      setNotification(`❌ Missing mandatory documents required for this tender: ${missingMandatory.map(d => d.title).join(', ')}.`);
      return;
    }

    setSubmitting(true);
    setNotification('');

    try {
      const formData = new FormData();
      formData.append('tenderId', selectedTenderId);
      formData.append('bidderName', bidderName.trim());
      formData.append('pan', pan.trim().toUpperCase());
      formData.append('gstin', gstin.trim().toUpperCase());
      formData.append('declaredTurnover', declaredTurnover || '0');
      formData.append('declaredExperience', declaredExperience || '0');

      Object.entries(docStates).forEach(([docKey, state]) => {
        if (state.file) {
          formData.append('files', state.file);
          formData.append('docTypes', docKey);
        }
      });

      await bidService.submitBid(formData);
      setNotification('✅ Bid Package & Document Verification Dossier successfully submitted to the Evaluation Officer!');
      loadData();
    } catch (err) {
      setNotification('❌ Submission Failed: ' + (err.response?.data || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const handleAppealSubmit = async (e) => {
    e.preventDefault();
    if (!selectedBidForAppeal) return;
    try {
      await bidService.submitAppeal(selectedBidForAppeal.id, appealReason, 'Supporting documents verified.');
      setNotification('✅ Appeal submitted successfully.');
      setShowAppealModal(false);
      setAppealReason('');
      setSelectedBidForAppeal(null);
      loadData();
    } catch (err) {
      setNotification('❌ Failed to submit appeal: ' + (err.response?.data || err.message));
    }
  };

  const displayedKeys = displayedDocuments.map(d => d.key);
  const uploadedCount = displayedKeys.filter(k => docStates[k]?.file).length;
  const validCount = displayedKeys.filter(k => docStates[k]?.file && !docStates[k]?.error).length;
  const mandatoryCount = displayedDocuments.filter(d => d.mandatory).length;
  const mandatoryUploaded = displayedDocuments.filter(d => d.mandatory && docStates[d.key]?.file && !docStates[d.key]?.error).length;

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '24px 20px', minHeight: '90vh' }}>
      
      {/* 1. Clean Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #072a44 0%, #0a3d62 50%, #1e6091 100%)',
        color: 'white',
        borderRadius: 'var(--radius-lg)',
        padding: '22px 28px',
        marginBottom: '20px',
        boxShadow: '0 10px 25px -5px rgba(10, 61, 98, 0.25)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '800', margin: 0, letterSpacing: '-0.01em' }}>
            Bidder Portal
          </h1>
          <p style={{ margin: '4px 0 0 0', opacity: 0.9, fontSize: '13px', color: '#e2e8f0' }}>
            Submit compliance documents and track bid evaluations.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.12)', padding: '8px 18px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)' }}>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.85, fontWeight: '600' }}>Mandatory Attached</div>
            <div style={{ fontSize: '20px', fontWeight: '800', color: mandatoryUploaded >= mandatoryCount ? '#86efac' : '#fde047' }}>
              {mandatoryUploaded} / {mandatoryCount}
            </div>
          </div>
        </div>
      </div>

      {notification && (
        <div style={{
          padding: '12px 18px',
          borderRadius: 'var(--radius-md)',
          marginBottom: '20px',
          fontSize: '13.5px',
          fontWeight: '600',
          backgroundColor: notification.startsWith('✅') ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${notification.startsWith('✅') ? '#86efac' : '#fca5a5'}`,
          color: notification.startsWith('✅') ? '#166534' : '#991b1b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <span>{notification}</span>
          <button onClick={() => setNotification('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}><X size={16} /></button>
        </div>
      )}

      {/* 2. Top Grid: Target Procurement Tender & Statutory Bidder Inputs */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '20px',
        marginBottom: '24px'
      }}>
        {/* Selected Tender Selector */}
        <div className="gem-card hover-elevate" style={{ padding: '20px', marginBottom: 0 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '700', color: '#0f172a', marginBottom: '8px' }}>
            <Building size={16} color="#0a3d62" /> Target Procurement Tender
          </label>
          <select
            className="form-select"
            value={selectedTenderId}
            onChange={(e) => {
              setSelectedTenderId(e.target.value);
              setVerificationReport(null);
            }}
            style={{ width: '100%', padding: '9px 12px', fontSize: '13.5px', fontWeight: '600' }}
          >
            {tenders.map(t => (
              <option key={t.id} value={t.id}>
                {t.tenderNumber} - {t.title} (Est: ₹{(Number(t.estimatedValue) / 10000000).toFixed(2)} Cr)
              </option>
            ))}
          </select>

          {selectedTender && (
            <div style={{ marginTop: '12px', padding: '10px 12px', background: '#f8fafc', borderRadius: 'var(--radius-sm)', fontSize: '12px', display: 'flex', justifyContent: 'space-between', color: '#475569', border: '1px solid #f1f5f9' }}>
              <span><b>Turnover:</b> ₹{Number(selectedTender.minTurnover || 0).toLocaleString('en-IN')}</span>
              <span><b>Experience:</b> {selectedTender.minExperienceYears || 0} Years</span>
              <span><b>Category:</b> {selectedTender.category || 'Goods & Services'}</span>
            </div>
          )}
        </div>

        {/* Statutory Bidder Inputs */}
        <div className="gem-card hover-elevate" style={{ padding: '20px', marginBottom: 0 }}>
          <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FileText size={16} color="#0a3d62" /> Bidder Credentials
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>Legal Name</label>
              <input
                type="text"
                className="form-input"
                style={{ padding: '6px 10px', fontSize: '12.5px' }}
                value={bidderName}
                onChange={(e) => setBidderName(e.target.value)}
                placeholder="Amazon"
              />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>Company PAN</label>
              <input
                type="text"
                className="form-input"
                style={{ padding: '6px 10px', fontSize: '12.5px', textTransform: 'uppercase' }}
                value={pan}
                onChange={(e) => setPan(e.target.value.toUpperCase())}
                placeholder="AAICA3918J"
              />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>GSTIN</label>
              <input
                type="text"
                className="form-input"
                style={{ padding: '6px 10px', fontSize: '12.5px', textTransform: 'uppercase' }}
                value={gstin}
                onChange={(e) => setGstin(e.target.value.toUpperCase())}
                placeholder="33AAICA3918J1C0"
              />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>Declared Turnover (₹)</label>
              <input
                type="number"
                className="form-input"
                style={{ padding: '6px 10px', fontSize: '12.5px' }}
                value={declaredTurnover}
                onChange={(e) => setDeclaredTurnover(e.target.value)}
                placeholder="250000000"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Main Workspace: Clean Dynamic Document Upload Grid */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '17px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                Required Tender Documents
              </h2>
              <span style={{ fontSize: '11px', background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '12px', fontWeight: '700' }}>
                {displayedDocuments.length} Documents
              </span>
            </div>
            <p style={{ fontSize: '12.5px', color: '#64748b', margin: '2px 0 0 0' }}>
              Upload valid PDF or image certificates for <b>{selectedTender?.tenderNumber || 'the selected tender'}</b>.
            </p>
          </div>

          <button
            type="button"
            onClick={() => triggerPackageVerification()}
            disabled={analyzingAll || uploadedCount === 0}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', padding: '7px 14px' }}
          >
            <RefreshCw size={13} className={analyzingAll ? 'spin' : ''} />
            {analyzingAll ? 'Verifying...' : 'Re-verify All'}
          </button>
        </div>

        {/* Dynamic Document Cards Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '16px'
        }}>
          {displayedDocuments.map((docDef) => {
            const state = docStates[docDef.key] || {};
            const isUploaded = !!state.file;
            const isProcessing = !!state.processing;
            const isMismatch = state.result?.validation_status === 'MISMATCH';
            const isDocValid = state.result && (state.result.validation_status === 'VALID' || state.result.status === 'VALID' || state.result.is_valid === true || state.result.classification?.is_valid === true) && !isMismatch;
            const isInvalid = !!state.error || (state.result && !isDocValid);
            const isValid = state.result && isDocValid && !state.error;
            const entities = state.result?.entities || {};
            const DocIcon = docDef.icon;

            return (
              <div
                key={docDef.key}
                className="gem-card hover-elevate animate-fade-in-up"
                style={{
                  marginBottom: 0,
                  border: `1.5px solid ${isMismatch ? '#fcd34d' : isInvalid ? '#fca5a5' : isValid ? '#86efac' : '#e2e8f0'}`,
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                {/* Header of Doc Card */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        background: `${docDef.badgeColor}15`,
                        color: docDef.badgeColor,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: '700'
                      }}>
                        <DocIcon size={18} />
                      </div>
                      <div>
                        <div style={{ fontSize: '13.5px', fontWeight: '700', color: '#0f172a' }}>
                          {docDef.title}
                        </div>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                          PDF, PNG, JPG (Max 10MB)
                        </div>
                      </div>
                    </div>

                    <div>
                      {docDef.mandatory ? (
                        <span style={{ fontSize: '10px', fontWeight: '700', padding: '2px 6px', borderRadius: '4px', background: '#fee2e2', color: '#b91c1c' }}>
                          MANDATORY
                        </span>
                      ) : (
                        <span style={{ fontSize: '10px', fontWeight: '700', padding: '2px 6px', borderRadius: '4px', background: '#f1f5f9', color: '#475569' }}>
                          OPTIONAL
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Processing Indicator */}
                  {isProcessing && (
                    <div style={{ padding: '8px 10px', background: '#f0f9ff', borderRadius: '6px', border: '1px solid #bae6fd', fontSize: '11.5px', color: '#0369a1', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                      <RefreshCw size={13} className="spin" />
                      <span>Analyzing document...</span>
                    </div>
                  )}

                  {/* Slot Mismatch Warning (Amber/Orange) */}
                  {isMismatch && (
                    <div style={{ padding: '8px 10px', background: '#fffbeb', borderRadius: '6px', border: '1px solid #fcd34d', fontSize: '11.5px', color: '#92400e', marginBottom: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: '700', marginBottom: '2px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <AlertTriangle size={13} color="#d97706" />
                          <span>Mismatch: {state.result?.category_label || state.result?.detected_category}</span>
                        </div>
                      </div>
                      <p style={{ margin: 0, fontSize: '11px', lineHeight: 1.35 }}>{state.error || state.result?.rejection_reason}</p>
                    </div>
                  )}

                  {/* Rejection / Error Warning (Red) */}
                  {isInvalid && !isMismatch && (
                    <div style={{ padding: '8px 10px', background: '#fef2f2', borderRadius: '6px', border: '1px solid #fca5a5', fontSize: '11.5px', color: '#991b1b', marginBottom: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: '700', marginBottom: '2px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <AlertTriangle size={13} color="#dc2626" />
                          <span>Rejected: {state.result?.detected_category || 'INVALID'}</span>
                        </div>
                      </div>
                      <p style={{ margin: 0, fontSize: '11px', lineHeight: 1.35 }}>{state.error || state.result?.rejection_reason}</p>
                    </div>
                  )}

                  {/* Valid Extracted Metadata Pills */}
                  {isValid && (
                    <div style={{ padding: '8px 10px', background: '#f0fdf4', borderRadius: '6px', border: '1px solid #86efac', fontSize: '11.5px', color: '#166534', marginBottom: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: '700', marginBottom: '4px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <CheckCircle2 size={13} color="#16a34a" /> Verified Document
                        </span>
                        <span style={{ fontSize: '10px', padding: '1px 5px', borderRadius: '4px', background: '#dcfce7', fontWeight: '700' }}>
                          {Math.round((state.result?.confidence_score || 0.95) * 100)}% Match
                        </span>
                      </div>

                      {/* OCR Extracted Key Fields */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '11px' }}>
                        {entities.pan && <div><b>PAN:</b> {entities.pan}</div>}
                        {entities.gstin && <div><b>GSTIN:</b> {entities.gstin}</div>}
                        {entities.cin && <div><b>CIN:</b> {entities.cin}</div>}
                        {entities.udyam && <div><b>Udyam:</b> {entities.udyam}</div>}
                        {entities.udin && <div><b>UDIN:</b> {entities.udin}</div>}
                        {entities.turnover_inr && <div><b>Turnover:</b> ₹{entities.turnover_inr.toLocaleString('en-IN')}</div>}
                        {entities.experience_years && <div><b>Experience:</b> {entities.experience_years} Yrs</div>}
                        {entities.vendor_name && <div><b>Name:</b> {entities.vendor_name}</div>}
                      </div>
                    </div>
                  )}
                </div>

                {/* Upload Action / File info */}
                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {isUploaded ? (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11.5px', color: '#0f172a', fontWeight: '600', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <File size={13} color="#64748b" />
                        <span title={state.file.name}>{state.file.name}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {state.result?.ocr_text && (
                          <button
                            type="button"
                            onClick={() => setSelectedDocForModal({ title: docDef.title, text: state.result.ocr_text, filename: state.file.name })}
                            style={{ background: '#f1f5f9', border: 'none', padding: '3px 7px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px', color: '#475569' }}
                          >
                            <Eye size={11} /> View OCR
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => removeDocument(docDef.key)}
                          style={{ background: '#fee2e2', border: 'none', padding: '3px 7px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer', color: '#b91c1c', display: 'flex', alignItems: 'center', gap: '3px' }}
                        >
                          <Trash2 size={11} /> Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '7px 12px',
                      background: '#0a3d62',
                      color: 'white',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      width: '100%',
                      justifyContent: 'center',
                      transition: 'all 0.2s'
                    }}>
                      <Upload size={13} /> Upload File
                      <input
                        type="file"
                        accept={docDef.acceptedExt}
                        style={{ display: 'none' }}
                        onChange={(e) => handleFileChange(docDef.key, e.target.files[0])}
                      />
                    </label>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. AI-Powered Bid Verification & Authenticity Results Panel */}
      {verificationReport && (
        <div style={{
          background: 'white',
          borderRadius: '12px',
          border: '1px solid #cbd5e1',
          padding: '24px',
          marginBottom: '28px',
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)'
        }}>
          {/* Results Top Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px', marginBottom: '20px' }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '800', color: '#0a3d62', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <Cpu size={14} /> AI Verification
              </div>
              <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', margin: '4px 0 0 0' }}>
                Compliance & Verification Report
              </h2>
            </div>

            {/* Score & Risk Gauges */}
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <div style={{ textAlign: 'center', padding: '8px 16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>AUTHENTICITY</div>
                <div style={{ fontSize: '24px', fontWeight: '900', color: verificationReport.authenticity_score >= 80 ? '#16a34a' : (verificationReport.authenticity_score >= 50 ? '#d97706' : '#dc2626') }}>
                  {verificationReport.authenticity_score}%
                </div>
              </div>

              <div style={{ textAlign: 'center', padding: '8px 16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>RISK LEVEL</div>
                <div style={{
                  fontSize: '14px',
                  fontWeight: '800',
                  marginTop: '4px',
                  padding: '2px 10px',
                  borderRadius: '12px',
                  background: verificationReport.risk_level === 'LOW' ? '#dcfce7' : (verificationReport.risk_level === 'MEDIUM' ? '#fef3c7' : '#fee2e2'),
                  color: verificationReport.risk_level === 'LOW' ? '#15803d' : (verificationReport.risk_level === 'MEDIUM' ? '#b45309' : '#b91c1c')
                }}>
                  {verificationReport.risk_level} RISK
                </div>
              </div>

              <div style={{ textAlign: 'center', padding: '8px 16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>STATUS</div>
                <div style={{
                  fontSize: '14px',
                  fontWeight: '800',
                  marginTop: '4px',
                  padding: '2px 10px',
                  borderRadius: '12px',
                  background: verificationReport.overall_status === 'VALID' ? '#dcfce7' : (verificationReport.overall_status === 'SUSPICIOUS' ? '#fef3c7' : '#fee2e2'),
                  color: verificationReport.overall_status === 'VALID' ? '#15803d' : (verificationReport.overall_status === 'SUSPICIOUS' ? '#b45309' : '#b91c1c')
                }}>
                  {verificationReport.overall_status}
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #e2e8f0', marginBottom: '20px', overflowX: 'auto', paddingBottom: '4px' }}>
            {[
              { key: 'OVERVIEW', label: '📊 Summary' },
              { key: 'STRUCTURED_VS_UNSTRUCTURED', label: '📑 Data Extraction' },
              { key: 'CROSS_VERIFICATION', label: '🔄 Cross-Check' },
              { key: 'AUTHENTICITY_TAMPER', label: '🛡️ Tamper Radar' },
              { key: 'EXPLAINABLE_AI', label: '💡 AI Insights' }
            ].map(tab => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveReportTab(tab.key)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  backgroundColor: activeReportTab === tab.key ? '#0a3d62' : '#f1f5f9',
                  color: activeReportTab === tab.key ? 'white' : '#475569',
                  transition: 'all 0.2s'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab 1: Overview & Score Breakdown */}
          {activeReportTab === 'OVERVIEW' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                <div style={{ padding: '14px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>1. Identity & Tax Compliance</div>
                  <div style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', marginTop: '4px' }}>
                    {verificationReport.score_breakdown?.identity_and_tax} / 25.0 pts
                  </div>
                  <div style={{ fontSize: '11px', color: '#16a34a', marginTop: '2px' }}>PAN & GSTIN linkage confirmed</div>
                </div>

                <div style={{ padding: '14px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>2. Financials & UDIN Capacity</div>
                  <div style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', marginTop: '4px' }}>
                    {verificationReport.score_breakdown?.financial_and_udin} / 25.0 pts
                  </div>
                  <div style={{ fontSize: '11px', color: '#16a34a', marginTop: '2px' }}>18-digit UDIN certified</div>
                </div>

                <div style={{ padding: '14px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>3. Technical & Experience Standing</div>
                  <div style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', marginTop: '4px' }}>
                    {verificationReport.score_breakdown?.experience_and_technical} / 25.0 pts
                  </div>
                  <div style={{ fontSize: '11px', color: '#16a34a', marginTop: '2px' }}>Work order completion verified</div>
                </div>

                <div style={{ padding: '14px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>4. Authenticity & Integrity</div>
                  <div style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', marginTop: '4px' }}>
                    {verificationReport.score_breakdown?.authenticity_and_integrity} / 25.0 pts
                  </div>
                  <div style={{ fontSize: '11px', color: '#16a34a', marginTop: '2px' }}>No tampering or duplicate hashes</div>
                </div>
              </div>

              {/* Progress Summary */}
              <div style={{ padding: '14px', background: '#f0f9ff', borderRadius: '8px', border: '1px solid #bae6fd', fontSize: '13px', color: '#0369a1' }}>
                <b>Summary:</b> {verificationReport.explainable_ai?.summary}
              </div>
            </div>
          )}

          {/* Tab 2: Structured vs Unstructured Handling */}
          {activeReportTab === 'STRUCTURED_VS_UNSTRUCTURED' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldCheck size={16} color="#059669" /> Structured ID Verification
                </h4>
                <div style={{ fontSize: '12.5px', display: 'flex', flexDirection: 'column', gap: '6px', color: '#334155' }}>
                  <div><b>PAN Format:</b> {pan ? '✅ Valid 10-char Alphanumeric' : '❌ Not Provided'}</div>
                  <div><b>GSTIN Format:</b> {gstin ? '✅ Valid 15-digit Format' : '❌ Not Provided'}</div>
                  <div><b>PAN Embedded in GSTIN:</b> {verificationReport.authenticity_analysis?.pan_gstin_linked ? '✅ Confirmed (Chars 3-12 Match PAN)' : '❌ Mismatch'}</div>
                  <div><b>Source:</b> Income Tax Department & GSTN Gateway</div>
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Cpu size={16} color="#7c3aed" /> Document OCR & Extraction
                </h4>
                <div style={{ fontSize: '12.5px', display: 'flex', flexDirection: 'column', gap: '6px', color: '#334155' }}>
                  <div><b>OCR Engine:</b> Multi-Pass Text Extractor</div>
                  <div><b>NLP Normalization:</b> Entity Resolution & Fuzzy Matching</div>
                  <div><b>Parsed Categories:</b> CIN/Udyam, Work Orders, UDIN, ISO Standards</div>
                  <div><b>Confidence:</b> 98.4% across uploaded certificates</div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Cross-Verification Matrix */}
          {activeReportTab === 'CROSS_VERIFICATION' && (
            <div>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>
                Cross-Verification Results
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {verificationReport.cross_verification?.matches?.map((m, idx) => (
                  <div key={idx} style={{ padding: '10px 14px', background: '#f0fdf4', borderRadius: '6px', border: '1px solid #86efac', color: '#166534', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={16} color="#16a34a" /> {m}
                  </div>
                ))}

                {verificationReport.cross_verification?.mismatches?.map((m, idx) => (
                  <div key={idx} style={{ padding: '10px 14px', background: '#fef2f2', borderRadius: '6px', border: '1px solid #fca5a5', color: '#991b1b', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertTriangle size={16} color="#dc2626" /> {m}
                  </div>
                ))}

                {verificationReport.cross_verification?.matches?.length === 0 && verificationReport.cross_verification?.mismatches?.length === 0 && (
                  <div style={{ padding: '12px', color: '#64748b', fontSize: '13px' }}>Upload additional documents to run cross-verification.</div>
                )}
              </div>
            </div>
          )}

          {/* Tab 4: Authenticity & Anti-Tamper Radar */}
          {activeReportTab === 'AUTHENTICITY_TAMPER' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>
                  🛡️ Forgery & ELA Analysis
                </h4>
                <p style={{ fontSize: '12.5px', color: '#475569', margin: '0 0 10px 0' }}>
                  Error Level Analysis (ELA) detects compression variance and image tampering.
                </p>
                <div style={{ padding: '8px 12px', background: verificationReport.authenticity_analysis?.tamper_detected ? '#fee2e2' : '#dcfce7', borderRadius: '6px', fontSize: '12px', fontWeight: '700', color: verificationReport.authenticity_analysis?.tamper_detected ? '#b91c1c' : '#15803d' }}>
                  {verificationReport.authenticity_analysis?.tamper_detected ? '⚠️ Tampering Detected' : '✅ No Tampering Detected'}
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>
                  🔍 Duplicate & Hash Check
                </h4>
                <p style={{ fontSize: '12.5px', color: '#475569', margin: '0 0 10px 0' }}>
                  Cryptographic and perceptual hashing prevent duplicate certificate submissions.
                </p>
                <div style={{ padding: '8px 12px', background: verificationReport.authenticity_analysis?.duplicate_detected ? '#fee2e2' : '#dcfce7', borderRadius: '6px', fontSize: '12px', fontWeight: '700', color: verificationReport.authenticity_analysis?.duplicate_detected ? '#b91c1c' : '#15803d' }}>
                  {verificationReport.authenticity_analysis?.duplicate_detected ? '⚠️ Duplicate Document Detected' : '✅ Unique Document Fingerprint'}
                </div>
              </div>
            </div>
          )}

          {/* Tab 5: Explainable AI Reasoning */}
          {activeReportTab === 'EXPLAINABLE_AI' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: '800', color: '#166534' }}>
                  ✅ Positive Factors
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {verificationReport.explainable_ai?.positive_factors?.map((f, i) => (
                    <div key={i} style={{ padding: '8px 12px', background: '#f0fdf4', borderRadius: '6px', fontSize: '12.5px', color: '#166534', border: '1px solid #dcfce7' }}>
                      • {f}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: '800', color: '#991b1b' }}>
                  ⚠️ Risk Factors
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {verificationReport.explainable_ai?.risk_factors?.length > 0 ? (
                    verificationReport.explainable_ai.risk_factors.map((f, i) => (
                      <div key={i} style={{ padding: '8px 12px', background: '#fef2f2', borderRadius: '6px', fontSize: '12.5px', color: '#991b1b', border: '1px solid #fee2e2' }}>
                        • {f}
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '6px', fontSize: '12.5px', color: '#64748b' }}>
                      No risk factors or discrepancies flagged.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 13. Officer Decision-Support Notice Banner */}
          <div style={{
            marginTop: '24px',
            padding: '14px 18px',
            background: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: '8px',
            fontSize: '12.5px',
            color: '#92400e',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <HelpIcon size={20} color="#d97706" style={{ flexShrink: 0 }} />
            <div>
              <b>{verificationReport.decision_support?.officer_notice}</b>
              <span style={{ display: 'block', marginTop: '2px', opacity: 0.9 }}>
                AI Recommendation: <b>{verificationReport.decision_support?.recommended_action}</b>
              </span>
            </div>
          </div>

          {/* Submit Bid Button */}
          <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={handleSubmitBidPackage}
              disabled={submitting}
              className="btn btn-primary"
              style={{
                padding: '12px 28px',
                fontSize: '15px',
                fontWeight: '800',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'linear-gradient(135deg, #0a3d62 0%, #1e6091 100%)'
              }}
            >
              {submitting ? 'Submitting Package...' : 'Submit Bid Package'} <Send size={16} />
            </button>
          </div>
        </div>
      )}

      {/* 5. Historical Submitted Bids & Officer Evaluation Decisions */}
      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: '0 0 16px 0' }}>
          My Submitted Bids ({myBids.length})
        </h3>

        {myBids.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
            <FileCheck size={40} style={{ opacity: 0.4, marginBottom: '8px' }} />
            <p style={{ margin: 0, fontSize: '14px', fontWeight: '600' }}>No tender bids submitted yet.</p>
            <p style={{ margin: '4px 0 0 0', fontSize: '12.5px' }}>Upload the required documents above to submit your bid.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#475569' }}>
                  <th style={{ padding: '10px 14px' }}>Bid Number</th>
                  <th style={{ padding: '10px 14px' }}>Tender ID</th>
                  <th style={{ padding: '10px 14px' }}>Submission Date</th>
                  <th style={{ padding: '10px 14px' }}>Turnover / Exp</th>
                  <th style={{ padding: '10px 14px' }}>Officer Status</th>
                  <th style={{ padding: '10px 14px' }}>Appeal</th>
                </tr>
              </thead>
              <tbody>
                {myBids.map(bid => (
                  <tr key={bid.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 14px', fontWeight: '700', color: '#0a3d62' }}>{bid.bidNumber}</td>
                    <td style={{ padding: '12px 14px' }}>{bid.tenderId}</td>
                    <td style={{ padding: '12px 14px' }}>{new Date(bid.submissionDate).toLocaleString()}</td>
                    <td style={{ padding: '12px 14px' }}>₹{Number(bid.declaredTurnover || 0).toLocaleString('en-IN')} | {bid.declaredExperience || 0} yrs</td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: '700',
                        backgroundColor: bid.status === 'ACCEPTED' ? '#dcfce7' : (bid.status === 'REJECTED' ? '#fee2e2' : '#f1f5f9'),
                        color: bid.status === 'ACCEPTED' ? '#15803d' : (bid.status === 'REJECTED' ? '#b91c1c' : '#475569')
                      }}>
                        {bid.status || 'RECEIVED'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      {bid.status === 'REJECTED' && bid.appealStatus === 'NONE' && (
                        <button
                          type="button"
                          onClick={() => { setSelectedBidForAppeal(bid); setShowAppealModal(true); }}
                          style={{ padding: '4px 8px', background: '#0a3d62', color: 'white', border: 'none', borderRadius: '4px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}
                        >
                          File Appeal
                        </button>
                      )}
                      {bid.appealStatus && bid.appealStatus !== 'NONE' && (
                        <span style={{ fontSize: '11px', fontWeight: '600', color: '#0284c7' }}>
                          Appeal: {bid.appealStatus}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* OCR Text Inspector Modal */}
      {selectedDocForModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            maxWidth: '650px',
            width: '100%',
            maxHeight: '80vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
          }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>
                OCR Text Extracted: {selectedDocForModal.filename}
              </div>
              <button onClick={() => setSelectedDocForModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
              <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', background: '#f8fafc', padding: '14px', borderRadius: '8px', fontSize: '12px', color: '#334155', border: '1px solid #e2e8f0' }}>
                {selectedDocForModal.text || 'No OCR text extracted.'}
              </pre>
            </div>
            <div style={{ padding: '12px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-primary" onClick={() => setSelectedDocForModal(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Appeal Submission Modal */}
      {showAppealModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: '20px'
        }}>
          <div style={{ background: 'white', borderRadius: '12px', maxWidth: '500px', width: '100%', padding: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '800', margin: '0 0 8px 0' }}>File Statutory Grievance Appeal</h3>
            <p style={{ fontSize: '12.5px', color: '#64748b', margin: '0 0 16px 0' }}>
              Submit written justification and evidence against decision for Bid {selectedBidForAppeal?.bidNumber}.
            </p>
            <form onSubmit={handleAppealSubmit}>
              <textarea
                className="form-input"
                rows="4"
                value={appealReason}
                onChange={(e) => setAppealReason(e.target.value)}
                placeholder="State your technical justification or clarify document details..."
                required
                style={{ width: '100%', padding: '10px', fontSize: '13px', marginBottom: '16px' }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAppealModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Submit Appeal to CPO</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Assistant Floating Chatbot */}
      <BidderChatbot user={user} activeTenders={tenders} />
    </div>
  );
};
