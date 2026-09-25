import API from './axios';

export const createWorkOrder = (data) =>
  API.post('/work-orders/create', data).then((r) => r.data);

export const issueWorkOrder = (id, formData) =>
  API.post(`/work-orders/${id}/issue`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((r) => r.data);

export const acknowledgeWorkOrder = (id) =>
  API.post(`/work-orders/${id}/acknowledge`).then((r) => r.data);

export const dispatchWorkOrder = (id, formData) =>
  API.post(`/work-orders/${id}/dispatch`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((r) => r.data);

export const getWorkOrder = (id) => API.get(`/work-orders/${id}`).then((r) => r.data);

export const getAllWorkOrders = () => API.get('/work-orders').then((r) => r.data);

export const getVendorWorkOrders = (vendorId) =>
  API.get(`/work-orders/vendor/${vendorId}`).then((r) => r.data);
