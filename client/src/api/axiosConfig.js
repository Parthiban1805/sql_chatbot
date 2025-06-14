// src/api/axiosConfig.js

import axios from 'axios';

// Create an instance of axios
const apiClient = axios.create({
  baseURL: 'http://localhost:3001', // Your backend URL
});

// Add a request interceptor to include the token in all requests
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Optional: Add a response interceptor to handle 401 errors globally
// This is useful for automatically logging the user out if their token expires.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // For example, redirect to login page
      localStorage.removeItem('authToken');
      // window.location.href = '/login'; // Or use React Router's navigate
      console.error("Authentication Error: Token expired or invalid. Please log in again.");
    }
    return Promise.reject(error);
  }
);

export default apiClient;