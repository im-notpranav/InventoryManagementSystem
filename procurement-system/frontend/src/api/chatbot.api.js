import API from './axios';

export const sendMessage = (data) =>
  API.post('/chatbot/message', data).then((r) => r.data);
