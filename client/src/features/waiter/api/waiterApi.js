import axios from 'axios';
import { useWaiterAuth } from '../store/useWaiterAuth';

const waiterApi = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

waiterApi.interceptors.request.use(
  (config) => {
    const { token } = useWaiterAuth.getState();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

waiterApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // If unauthorized, log the waiter out
      useWaiterAuth.getState().logout();
    }
    return Promise.reject(error);
  }
);

export default waiterApi;
