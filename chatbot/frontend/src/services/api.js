import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000',
  timeout: 120000,
  headers: { 'Content-Type': 'application/json' },
});

export const createSession = async () => {
  const response = await api.post('/api/session');
  return response.data;
};

export const sendMessage = async (message, sessionId) => {
  const response = await api.post('/api/chat', { message, sessionId });
  return response.data;
};

export default api;
