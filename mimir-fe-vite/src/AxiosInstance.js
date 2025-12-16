import axios from 'axios';

const instance = axios.create();

// Attach the token to every request
instance.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Capture refreshed tokens sent in response
instance.interceptors.response.use(response => {
  const newToken = response.data?.access_token;
  if (newToken) {
    localStorage.setItem('token', newToken);
  }
  return response;
}, error => {
  // Optional: handle expired/invalid token
  if (error.response?.status === 401) {
    localStorage.removeItem('token');
    window.location.href = '/login'; // Or use navigate() in context
  }
  return Promise.reject(error);
});

export default instance;