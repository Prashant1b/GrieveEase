const BASE = import.meta.env.VITE_API_URL;

async function request(path, options = {}) {
  const token = localStorage.getItem('officerToken');
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    ...options
  });
  if (!res.ok) throw await res.json();
  return res.json();
}

export const api = {
  analyzeComplaint: (text) =>
    request('/ai/analyze', { method: 'POST', body: JSON.stringify({ text }) }),

  fileComplaint: (data) =>
    request('/complaints', { method: 'POST', body: JSON.stringify(data) }),

  trackComplaint: (ticketId) =>
    request(`/complaints/${ticketId}`),

  getCitizenComplaints: (phone) =>
    request(`/complaints/citizen/${phone}`),

  getCitizenRewards: (email) =>
    request(`/complaints/rewards/citizen/${encodeURIComponent(email)}`),

  getRewardsLeaderboard: () =>
    request('/complaints/rewards/leaderboard'),

  confirmResolution: (id, resolved) =>
    request(`/complaints/${id}/confirm`, {
      method: 'PATCH',
      body: JSON.stringify({ resolved })
    }),

  getMapData: () => request('/complaints/map/all'),
  getStats: () => request('/complaints/stats/summary'),

  officerSendOTP: (email, password) =>
    request('/auth/officer/send-otp', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    }),

  officerLogin: (email, otp) =>
    request('/auth/officer/login', {
      method: 'POST',
      body: JSON.stringify({ email, otp })
    }),

  getOfficerComplaints: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/officers/complaints?${q}`);
  },

  updateComplaintStatus: (id, data) =>
    request(`/officers/complaints/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    }),

  getOfficerStats: () => request('/officers/stats'),

  // Admin APIs
  adminGetStats: () => request('/admin/stats'),
  adminGetComplaints: (params = {}) => {
    const q = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([,v]) => v !== '' && v !== undefined))).toString()
    return request(`/admin/complaints?${q}`)
  },
  adminUpdateComplaint: (id, data) =>
    request(`/admin/complaints/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  adminGetOfficers: () => request('/admin/officers'),
  adminCreateOfficer: (data) =>
    request('/admin/officers', { method: 'POST', body: JSON.stringify(data) }),
  adminUpdateOfficer: (id, data) =>
    request(`/admin/officers/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  adminGetHierarchy: () => request('/admin/hierarchy'),

  // Citizen auth
  citizenSendOTP: (email) =>
    request('/auth/citizen/send-otp', { method: 'POST', body: JSON.stringify({ email }) }),
  citizenVerifyOTP: (email, otp) =>
    request('/auth/citizen/verify-otp', { method: 'POST', body: JSON.stringify({ email, otp }) }),
  updateCitizenProfile: (data) =>
    request('/auth/citizen/profile', { method: 'PATCH', body: JSON.stringify(data) }),

  // Rating
  rateComplaint: (id, rating, comment) =>
    request(`/complaints/${id}/rate`, { method: 'PATCH', body: JSON.stringify({ rating, comment }) }),

  // Petition / Support
  supportComplaint: (ticketId, data) =>
    request(`/complaints/${ticketId}/support`, { method: 'POST', body: JSON.stringify(data) }),

  // Reports
  getReportPDFUrl: (from, to) => {
    const token = localStorage.getItem('officerToken');
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    return `${BASE}/reports/pdf?${params.toString()}&token=${token}`;
  },
};
