import API from './axios';

export const sendRFQ = (data) => API.post('/rfq/send', data).then((r) => r.data);

export const compareQuotes = (requestId) =>
  API.get(`/rfq/compare/${requestId}`).then((r) => r.data);

export const selectQuote = (quoteId) =>
  API.post(`/rfq/${quoteId}/select`).then((r) => r.data);

export const resendRFQ = (quoteId) =>
  API.post(`/rfq/${quoteId}/resend`).then((r) => r.data);
