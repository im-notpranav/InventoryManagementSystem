import API from './axios';

export const recordGateEntry = (data) =>
  API.post('/gate-entry/record', data).then((r) => r.data);

export const getGateEntry = (entryId) =>
  API.get(`/gate-entry/${entryId}`).then((r) => r.data);

export const getAllGateEntries = () =>
  API.get('/gate-entry').then((r) => r.data);

export const getTodayEntries = () =>
  API.get('/gate-entry/today').then((r) => r.data);
