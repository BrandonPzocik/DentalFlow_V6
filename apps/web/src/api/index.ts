import axios from 'axios';
import { useAuthStore } from '@/store/auth.store';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// Attach token to every request
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    api.post<{ accessToken: string; user: any }>('/auth/login', { email, password }),
  me: () => api.get('/auth/me'),
};

// ── Patients ──────────────────────────────────────────────────────────────────
export const patientsApi = {
  list: (params?: { search?: string; page?: number; limit?: number; socialWork?: string }) =>
    api.get('/patients', { params }),
  count: () => api.get('/patients/count'),
  get: (id: string) => api.get(`/patients/${id}`),
  search: (q: string) => api.get('/patients/search', { params: { q } }),
  create: (data: any) => api.post('/patients', data),
  update: (id: string, data: any) => api.put(`/patients/${id}`, data),
  remove: (id: string) => api.delete(`/patients/${id}`),
  inactive: (months?: number) => api.get('/patients/inactive', { params: { months } }),
};

// ── Odontogram ────────────────────────────────────────────────────────────────
export const odontogramApi = {
  get: (patientId: string) => api.get(`/patients/${patientId}/odontogram`),
  toothHistory: (patientId: string, toothNumber: number) =>
    api.get(`/patients/${patientId}/odontogram/tooth/${toothNumber}/history`),
  registerTreatment: (patientId: string, data: any) =>
    api.post(`/patients/${patientId}/odontogram/treatment`, data),
  bulkRegister: (patientId: string, treatments: any[]) =>
    api.post(`/patients/${patientId}/odontogram/bulk`, { treatments }),
};

// ── Appointments ──────────────────────────────────────────────────────────────
export const appointmentsApi = {
  day: (date: string, dentistId?: string) =>
    api.get('/appointments/day', { params: { date, dentistId } }),
  range: (from: string, to: string, dentistId?: string) =>
    api.get('/appointments/range', { params: { from, to, dentistId } }),
  byPatient: (patientId: string) => api.get(`/appointments/patient/${patientId}`),
  stats: () => api.get('/appointments/stats'),
  create: (data: any) => api.post('/appointments', data),
  update: (id: string, data: any) => api.put(`/appointments/${id}`, data),
  updateStatus: (id: string, status: string, reason?: string) =>
    api.patch(`/appointments/${id}/status`, { status, reason }),
  remove: (id: string) => api.delete(`/appointments/${id}`),
  cancel: (id: string, reason?: string) =>
    api.patch(`/appointments/${id}/cancel`, { reason }),
  sendReminder: (id: string) => api.post(`/appointments/${id}/reminder`),
};

// ── Users ─────────────────────────────────────────────────────────────────────
export const usersApi = {
  list: () => api.get('/users'),
  get: (id: string) => api.get(`/users/${id}`),
  create: (data: any) => api.post('/users', data),
  update: (id: string, data: any) => api.put(`/users/${id}`, data),
};

// ── Billing ───────────────────────────────────────────────────────────────────
export const billingApi = {
  list: (params?: any) => api.get('/billing', { params }),
  get: (id: string) => api.get(`/billing/${id}`),
  byPatient: (patientId: string) => api.get(`/billing/patient/${patientId}`),
  summary: (from: string, to: string) => api.get('/billing/summary', { params: { from, to } }),
  liquidation: (socialWorkId: string, from: string, to: string) =>
    api.get(`/billing/liquidation/${socialWorkId}`, { params: { from, to } }),
  create: (data: any) => api.post('/billing', data),
  update: (id: string, data: any) => api.put(`/billing/${id}`, data),
  updateStatus: (id: string, status: string, reason?: string) =>
    api.patch(`/billing/${id}/status`, { status, reason }),
  registerPayment: (id: string, amount: number) =>
    api.patch(`/billing/${id}/payment`, { amount }),
};

// ── Social Works ──────────────────────────────────────────────────────────────
export const socialWorksApi = {
  list: () => api.get('/social-works'),
  get: (id: string) => api.get(`/social-works/${id}`),
  create: (data: any) => api.post('/social-works', data),
  update: (id: string, data: any) => api.put(`/social-works/${id}`, data),
  remove: (id: string) => api.delete(`/social-works/${id}`),
  addNomenclatorItem: (id: string, data: any) => api.post(`/social-works/${id}/nomenclator`, data),
  updateNomenclatorItem: (id: string, itemId: string, data: any) =>
    api.put(`/social-works/${id}/nomenclator/${itemId}`, data),
  removeNomenclatorItem: (id: string, itemId: string) =>
    api.delete(`/social-works/${id}/nomenclator/${itemId}`),
  seedNomenclator: (id: string) => api.post(`/social-works/${id}/nomenclator/seed`),
};

// ── Notifications ─────────────────────────────────────────────────────────────
export const notificationsApi = {
  logs: (params?: any) => api.get('/notifications/logs', { params }),
  sendCustom: (data: {
    patientId: string;
    email?: string;
    subject: string;
    emailBody: string;
  }) => api.post('/notifications/send', data),
  sendDocument: (data: {
    patientId: string;
    subject: string;
    html: string;
    type: string;
  }) => api.post('/notifications/send-document', data),
  sendReminder: (data: any) => api.post('/notifications/reminder', data),
};

// ── WhatsApp ──────────────────────────────────────────────────────────────────
export const whatsappApi = {
  status: () => api.get('/whatsapp/status'),
  messages: (params?: {
    direction?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) => api.get('/whatsapp/messages', { params }),
  internal: (params?: { limit?: number; unreadOnly?: boolean }) =>
    api.get('/whatsapp/internal', { params }),
  unreadCount: () => api.get('/whatsapp/internal/unread-count'),
  markRead: (id: string) => api.patch(`/whatsapp/internal/${id}/read`),
  markAllRead: () => api.post('/whatsapp/internal/read-all'),
};

// ── Settings ──────────────────────────────────────────────────────────────────
export const settingsApi = {
  getAll: () => api.get('/settings/flat'),   // returns { key: value } flat map
  getAllGrouped: () => api.get('/settings'),  // returns { grouped, flat }
  bulkSet: (data: Record<string, string>) => api.post('/settings', data),
  seed: () => api.post('/settings/seed'),
};

// ── Studies ───────────────────────────────────────────────────────────────────
export const studiesApi = {
  list: (patientId: string) => api.get(`/patients/${patientId}/studies`),
  get: (patientId: string, id: string) => api.get(`/patients/${patientId}/studies/${id}`),
  upload: (patientId: string, data: {
    type: string;
    originalName: string;
    mimeType: string;
    fileSize: number;
    fileData: string;
    toothNumber?: number;
    notes?: string;
  }) => api.post(`/patients/${patientId}/studies`, data),
  remove: (patientId: string, id: string) => api.delete(`/patients/${patientId}/studies/${id}`),
};

// ── Prescriptions ─────────────────────────────────────────────────────────────
export const prescriptionsApi = {
  list: (patientId: string) => api.get(`/patients/${patientId}/prescriptions`),
  get: (patientId: string, id: string) => api.get(`/patients/${patientId}/prescriptions/${id}`),
  create: (patientId: string, data: any) => api.post(`/patients/${patientId}/prescriptions`, data),
  update: (patientId: string, id: string, data: any) => api.put(`/patients/${patientId}/prescriptions/${id}`, data),
  accept: (patientId: string, id: string) => api.patch(`/patients/${patientId}/prescriptions/${id}/accept`),
  remove: (patientId: string, id: string) => api.delete(`/patients/${patientId}/prescriptions/${id}`),
};
