import api from './axios.js';

export const authApi = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  refresh: () => api.post('/auth/refresh'),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
};

export const inventoryApi = {
  getAll: () => api.get('/inventory'),
  getLowStock: () => api.get('/inventory/low-stock'),
  getStats: () => api.get('/inventory/stats'),
  getSummary: () => api.get('/inventory/summary'),
  create: (data) => api.post('/inventory', data),
  update: (id, data) => api.put(`/inventory/${id}`, data),
};

export const vendorsApi = {
  getAll: () => api.get('/vendors'),
  getById: (id) => api.get(`/vendors/${id}`),
  create: (data) => api.post('/vendors', data),
  update: (id, data) => api.put(`/vendors/${id}`, data),
  remove: (id) => api.delete(`/vendors/${id}`),
};

export const categoriesApi = {
  getAll: () => api.get('/products/categories'),
  create: (data) => api.post('/products/categories', data),
  update: (id, data) => api.put(`/products/categories/${id}`, data),
  remove: (id) => api.delete(`/products/categories/${id}`),
};

export const productsApi = {
  getAll: (params) => api.get('/products', { params }),
  getById: (id) => api.get(`/products/${id}`),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  remove: (id) => api.delete(`/products/${id}`),
};

// Order-cycle pages (requests, quotations, work orders, shipments, gate, billing)
// call `api` directly; see pages/* and components/order/*.

// data may be a plain object or FormData (when a document is attached).
export const warrantiesApi = {
  getAll: (params) => api.get('/warranties', { params }),
  getExpiring: () => api.get('/warranties/expiring'),
  create: (data) => api.post('/warranties', data),
  update: (id, data) => api.put(`/warranties/${id}`, data),
  renew: (id, data) => api.post(`/warranties/${id}/renew`, data),
  remove: (id) => api.delete(`/warranties/${id}`),
};

export const subscriptionsApi = {
  getAll: (params) => api.get('/subscriptions', { params }),
  create: (data) => api.post('/subscriptions', data),
  update: (id, data) => api.put(`/subscriptions/${id}`, data),
  renew: (id, data) => api.post(`/subscriptions/${id}/renew`, data),
  remove: (id) => api.delete(`/subscriptions/${id}`),
};

export const notificationsApi = {
  getAll: () => api.get('/notifications'),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
};

export const usersApi = {
  getAll: () => api.get('/users'),
  getById: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  resetPassword: (id, new_password) =>
    api.put(`/users/${id}/reset-password`, { new_password }),
  changePassword: (id, new_password) =>
    api.put(`/users/${id}/change-password`, { new_password }),
  changeEmail: (id, new_email) =>
    api.put(`/users/${id}/change-email`, { new_email }),
  changeMyPassword: (current_password, new_password) =>
    api.put('/users/change-my-password', { current_password, new_password }),
  changeMyEmail: (current_password, new_email) =>
    api.put('/users/me/change-email', { current_password, new_email }),
  remove: (id) => api.delete(`/users/${id}`),
  getAuditLogs: (query = '') => api.get(`/users/audit-logs${query ? `?${query}` : ''}`),
};

export const rolesApi = {
  getAll: () => api.get('/roles'),
};

export const chatbotApi = {
  query: (payload) => {
    if (typeof payload === 'string') {
      return api.post('/chatbot/message', { message: payload, conversation_history: [] });
    }
    return api.post('/chatbot/message', payload);
  },
  getHistory: () => Promise.resolve({ success: true, data: [] }),
};

export default api;
