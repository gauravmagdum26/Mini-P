import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true, // Crucial for sending/receiving cookies
});

export default api;

