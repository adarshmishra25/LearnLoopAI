import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api` 
  : '/api';

const API = axios.create({
  baseURL: API_BASE,
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const checkHealth = () => API.get('/health');
export const registerUser = (data) => API.post('/auth/register', data);
export const loginUser = (data) => API.post('/auth/login', data);
export const getMe = () => API.get('/auth/me');

export const createLecture = (data) => API.post('/lectures', data);
export const getLectures = () => API.get('/lectures');
export const getLecture = (id) => API.get(`/lectures/${id}`);
export const deleteLecture = (id) => API.delete(`/lectures/${id}`);
export const reprocessLecture = (id) => API.post(`/lectures/${id}/reprocess`);

export const getChunk = (chunkId) => API.get(`/chunks/${chunkId}`);
export const getChunkQuiz = (chunkId) => API.get(`/chunks/${chunkId}/quiz`);
export const submitQuiz = (chunkId, answers) => API.post(`/chunks/${chunkId}/quiz/submit`, { answers });

export default API;
