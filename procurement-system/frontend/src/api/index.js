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

export const purchaseRequestsApi = {
  getAll: (params) => api.get('/purchase-requests', { params }),
  getById: (id) => api.get(`/purchase-requests/${id}`),
  create: (data) => api.post('/purchase-requests', data),
  approve: (id) => api.put(`/purchase-requests/${id}/approve`),
  reject: (id, reason) => api.put(`/purchase-requests/${id}/reject`, { reason }),
};

export const rfqApi = {
  getAll: (params) => api.get('/rfq', { params }),
  getById: (id) => api.get(`/rfq/${id}`),
  create: (data) => api.post('/rfq', data),
  addVendors: (id, vendorIds) => api.post(`/rfq/${id}/add-vendors`, { vendorIds }),
  close: (id) => api.put(`/rfq/${id}/close`),
  getQuotations: (rfqId) => api.get(`/rfq/${rfqId}/quotations`),
  submitQuotation: (data) => api.post('/rfq/quotations', data),
  selectQuotation: (quotationId, data) => api.post(`/rfq/quotations/${quotationId}/select`, data),
};

export const purchaseOrdersApi = {
  getAll: (params) => api.get('/purchase-orders', { params }),
  getById: (id) => api.get(`/purchase-orders/${id}`),
  create: (data) => api.post('/purchase-orders', data),
  update: (id, data) => api.put(`/purchase-orders/${id}`, data),
};

export const goodsReceiptsApi = {
  getAll: () => api.get('/goods-receipts'),
  create: (data) => api.post('/goods-receipts', data),
};

export const invoicesApi = {
  getAll: () => api.get('/invoices'),
  getById: (id) => api.get(`/invoices/${id}`),
  create: (data) => api.post('/invoices', data),
  updateStatus: (id, data) => api.put(`/invoices/${id}/status`, data),
  verifyMatch: (id) => api.post(`/invoices/${id}/verify-match`),
};

export const warrantiesApi = {
  getAll: () => api.get('/warranties'),
  getExpiring: () => api.get('/warranties/expiring'),
  create: (data) => api.post('/warranties', data),
  update: (id, data) => api.put(`/warranties/${id}`, data),
};

export const subscriptionsApi = {
  getAll: () => api.get('/warranties/subscriptions'),
  getExpiring: () => api.get('/warranties/subscriptions/expiring'),
  create: (data) => api.post('/warranties/subscriptions', data),
  update: (id, data) => api.put(`/warranties/subscriptions/${id}`, data),
  remove: (id) => api.delete(`/warranties/subscriptions/${id}`),
};

export const notificationsApi = {
  getAll: () => api.get('/notifications'),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
};

export const usersApi = {
  getAll: () => api.get('/users'),
  getById: (id) => api.get(`/users/${id}`),
  update: (id, data) => api.put(`/users/${id}`, data),
  remove: (id) => api.delete(`/users/${id}`),
  getAuditLogs: (query = '') => api.get(`/users/audit-logs${query ? `?${query}` : ''}`),
  getRoles: () => api.get('/users/roles'),
};

export const chatbotApi = {
  query: (message) => api.post('/chatbot/query', { message }),
  getHistory: () => api.get('/chatbot/history'),
};

export const vendorPortalApi = {
  getProfile: () => api.get('/vendor-portal/profile'),
  getOrders: () => api.get('/vendor-portal/orders'),
  getOrderDetails: (orderId) => api.get(`/vendor-portal/orders/${orderId}`),
  confirmOrder: (orderId, data) => api.post(`/vendor-portal/orders/${orderId}/confirm`, data),
  rejectOrder: (orderId, data) => api.post(`/vendor-portal/orders/${orderId}/reject`, data),
  requestChanges: (orderId, data) => api.post(`/vendor-portal/orders/${orderId}/request-changes`, data),
  getHistory: (orderId) => api.get(`/vendor-portal/orders/${orderId}/history`),
};
