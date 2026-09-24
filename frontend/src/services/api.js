import axios from 'axios';

const API_BASE = '/api';

const api = axios.create({
  baseURL: API_BASE,
});

// Attach JWT token automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('gem_jwt_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Automatically handle token expiry or unauthorized
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      if (error.config && !error.config.url?.includes('/auth/')) {
        localStorage.removeItem('gem_jwt_token');
        localStorage.removeItem('gem_user');
      }
    }
    return Promise.reject(error);
  }
);

export const authService = {
  login: async (email, password) => {
    const res = await api.post('/auth/login', { email, username: email, password });
    if (res.data.token) {
      localStorage.setItem('gem_jwt_token', res.data.token);
      localStorage.setItem('gem_user', JSON.stringify(res.data));
    }
    return res.data;
  },
  register: async (userData) => {
    const res = await api.post('/auth/register', userData);
    return res.data;
  },
  forgotPassword: async (email, newPassword) => {
    const res = await api.post('/auth/forgot-password', { email, username: email, password: newPassword });
    return res.data;
  },
  verifyIdentity: async (taxData) => {
    const res = await api.post('/auth/verify-identity', taxData);
    return res.data;
  },
  logout: () => {
    localStorage.removeItem('gem_jwt_token');
    localStorage.removeItem('gem_user');
  },
  getCurrentUser: () => {
    const user = localStorage.getItem('gem_user');
    return user ? JSON.parse(user) : null;
  },
};

export const tenderService = {
  getAll: async () => {
    const res = await api.get('/public/tenders');
    return res.data;
  },
  getById: async (id) => {
    const res = await api.get(`/public/tenders/${id}`);
    return res.data;
  },
  create: async (tenderData) => {
    const res = await api.post('/admin/tenders', tenderData);
    return res.data;
  },
};

export const bidService = {
  submitBid: async (formData) => {
    const res = await api.post('/bidder/bids/submit', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
  getMyBids: async () => {
    const res = await api.get('/bidder/bids/my-bids');
    return res.data;
  },
  getBidById: async (id) => {
    const res = await api.get(`/bidder/bids/${id}`);
    return res.data;
  },
  getBidDocuments: async (id) => {
    const res = await api.get(`/bidder/bids/${id}/documents`);
    return res.data;
  },
  submitAppeal: async (bidId, appealReason, additionalEvidence) => {
    const res = await api.post(`/bidder/bids/${bidId}/appeal`, {
      appealReason,
      additionalEvidence,
    });
    return res.data;
  },
};

export const officerService = {
  getRanking: async (tenderId) => {
    const res = await api.get(`/officer/tenders/${tenderId}/ranking`);
    return res.data;
  },
  getEvaluationDossier: async (bidId) => {
    const res = await api.get(`/officer/bids/${bidId}/evaluation`);
    return res.data;
  },
  recordDecision: async (bidId, decision, officerOverride, writtenJustification) => {
    const res = await api.post(`/officer/bids/${bidId}/decision`, {
      decision,
      officerOverride,
      writtenJustification,
    });
    return res.data;
  },
  reEvaluateBid: async (bidId) => {
    const res = await api.post(`/officer/bids/${bidId}/re-evaluate`);
    return res.data;
  },
  getAuditTrail: async () => {
    const res = await api.get('/officer/audit-trail');
    return res.data;
  },
  getPendingAppeals: async () => {
    const res = await api.get('/officer/appeals/pending');
    return res.data;
  },
  resolveAppeal: async (appealId, status, officerResponse) => {
    const res = await api.post(`/officer/appeals/${appealId}/resolve`, {
      status,
      officerResponse,
    });
    return res.data;
  },
};

export const adminService = {
  getOverviewStats: async () => {
    const res = await api.get('/admin/overview-stats');
    return res.data;
  },
  getAllUsers: async () => {
    const res = await api.get('/admin/users');
    return res.data;
  },
  updateUserStatus: async (id, status) => {
    const res = await api.put(`/admin/users/${id}/status`, { status });
    return res.data;
  },
  verifyUserIdentity: async (id, isIdentityVerified) => {
    const res = await api.put(`/admin/users/${id}/verify-identity`, { isIdentityVerified });
    return res.data;
  },
  resetUserPassword: async (id, newPassword) => {
    const res = await api.post(`/admin/users/${id}/reset-password`, { newPassword });
    return res.data;
  },
  deleteUser: async (id) => {
    const res = await api.delete(`/admin/users/${id}`);
    return res.data;
  },
  getUserActivity: async (username) => {
    const res = await api.get(`/admin/users/${username}/activity`);
    return res.data;
  },
  getTendersSummary: async () => {
    const res = await api.get('/admin/tenders-summary');
    return res.data;
  },
  getTenderBids: async (tenderId) => {
    const res = await api.get(`/admin/tenders/${tenderId}/bids`);
    return res.data;
  },
  getVerificationLogs: async (filter = 'ALL') => {
    const res = await api.get(`/admin/verification-logs?filter=${filter}`);
    return res.data;
  },
  getFraudAlerts: async () => {
    const res = await api.get('/admin/fraud-alerts');
    return res.data;
  },
  getAnalytics: async () => {
    const res = await api.get('/admin/analytics');
    return res.data;
  },
  getAllRules: async () => {
    const res = await api.get('/admin/rules');
    return res.data;
  },
  createRule: async (tenderId, ruleData) => {
    const res = await api.post(`/admin/rules?tenderId=${tenderId}`, ruleData);
    return res.data;
  },
  updateRule: async (id, ruleData) => {
    const res = await api.put(`/admin/rules/${id}`, ruleData);
    return res.data;
  },
  deleteRule: async (id) => {
    const res = await api.delete(`/admin/rules/${id}`);
    return res.data;
  },
  getRuleWeights: async () => {
    const res = await api.get('/admin/rules/weights');
    return res.data;
  },
  updateRuleWeights: async (weights) => {
    const res = await api.post('/admin/rules/weights', weights);
    return res.data;
  },
  getAllDocuments: async () => {
    const res = await api.get('/admin/documents');
    return res.data;
  },
  getAuditLogs: async () => {
    const res = await api.get('/admin/audit-logs');
    return res.data;
  },
  verifyAuditChain: async () => {
    const res = await api.get('/admin/audit-logs/verify-chain');
    return res.data;
  },
  getNotifications: async () => {
    const res = await api.get('/admin/notifications');
    return res.data;
  },
  getSystemSettings: async () => {
    const res = await api.get('/admin/settings');
    return res.data;
  },
  updateSystemSettings: async (settings) => {
    const res = await api.post('/admin/settings', settings);
    return res.data;
  },
};

export const aiService = {
  health: async () => {
    const res = await axios.get('http://localhost:8000/api/ai/health');
    return res.data;
  },
  classifyDocument: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await axios.post('http://localhost:8000/api/ai/classify-document', formData);
    return res.data;
  },
  processDocument: async (file, bidderId, tenderId, docType) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('bidder_id', bidderId || 'bidder');
    formData.append('tender_id', tenderId || 'TDR-DEFAULT');
    formData.append('doc_type', docType || 'GENERAL');
    const res = await axios.post('http://localhost:8000/api/ai/process-document', formData);
    return res.data;
  },
  verifyBidPackage: async (bidderInput, documents, tenderRequirements) => {
    const res = await axios.post('http://localhost:8000/api/ai/verify-bid-package', {
      bidder_input: bidderInput,
      documents: documents,
      tender_requirements: tenderRequirements
    });
    return res.data;
  },
  chatQuery: async (query, userInfo, activeTenders, history) => {
    const res = await axios.post('http://localhost:8000/api/ai/chat/query', {
      query,
      user_info: userInfo,
      active_tenders: activeTenders,
      history: history
    });
    return res.data;
  }
};

export default api;

