import API from './axios';

export const getAllBilling     = ()       => API.get('/billing');
export const getPendingBills   = ()       => API.get('/billing/pending');
export const getReleasedBills  = ()       => API.get('/billing/released');
export const getWatchmanQueue  = ()       => API.get('/billing/watchman-queue');
export const getBillingDoc     = (id)     => API.get(`/billing/${id}`);

export const uploadScannedInvoice = (entryId, formData) =>
  API.post(`/billing/${entryId}/upload-invoice`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const adminSign          = (docId) => API.post(`/billing/${docId}/admin-sign`);
export const watchmanConfirm    = (docId) => API.post(`/billing/${docId}/watchman-confirm`);
export const accountantVerify   = (docId, data) =>
  API.post(`/billing/${docId}/accountant-verify`, data);
