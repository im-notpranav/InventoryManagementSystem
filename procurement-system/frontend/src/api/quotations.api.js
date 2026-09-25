import API from './axios';

export const submitQuotation = (formData) =>
  API.post('/quotations/submit', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((r) => r.data);

export const sendRFQ = (data) => API.post('/quotations/send-rfq', data).then((r) => r.data);

export const getVendorQuotations = (vendorId) =>
  API.get(`/quotations/vendor/${vendorId}`).then((r) => r.data);

export const getAllQuotations = () => API.get('/quotations').then((r) => r.data);

export const approveQuotation = (id, data) =>
  API.post(`/quotations/${id}/approve`, data).then((r) => r.data);

export const rejectQuotation = (id, data) =>
  API.post(`/quotations/${id}/reject`, data).then((r) => r.data);
