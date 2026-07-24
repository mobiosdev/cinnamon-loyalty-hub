import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { APP_MESSAGES } from '@/constants/appMessages';

// Load base URL from Vite environment variables.
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:7050/api';

const axiosInstance: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add JWT token
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Response interceptor for unified error handling and token refresh
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 && 
      !originalRequest._retry && 
      originalRequest.url &&
      !originalRequest.url.includes('/users/refresh')
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers['Authorization'] = `Bearer ${token}`;
            return axiosInstance(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const response = await axios.post(`${BASE_URL}/users/refresh`, {
            refresh_token: refreshToken,
          });
          const { access_token, refresh_token: new_refresh_token } = response.data;

          localStorage.setItem('token', access_token);
          localStorage.setItem('refresh_token', new_refresh_token);

          axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
          originalRequest.headers['Authorization'] = `Bearer ${access_token}`;

          processQueue(null, access_token);
          isRefreshing = false;

          return axiosInstance(originalRequest);
        } catch (refreshError) {
          processQueue(refreshError, null);
          isRefreshing = false;

          localStorage.removeItem('token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user');
          window.location.href = '/login';

          return Promise.reject(refreshError);
        }
      } else {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }

    const rawMessage = error.response?.data?.message || error.message || APP_MESSAGES.common.unexpectedError;
    const errorMessage = normalizeApiErrorMessage(rawMessage, error.response?.status);
    console.error('[API Error]:', errorMessage);
    
    const customError = new Error(errorMessage) as any;
    customError.status = error.response?.status;
    customError.response = error.response;
    
    return Promise.reject(customError);
  }
);

export const apiManager = {
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await axiosInstance.get<T>(url, config);
    return response.data;
  },

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await axiosInstance.post<T>(url, data, config);
    return response.data;
  },

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await axiosInstance.put<T>(url, data, config);
    return response.data;
  },

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await axiosInstance.delete<T>(url, config);
    return response.data;
  },
};

const normalizeApiErrorMessage = (message: string | string[], status?: number): string => {
  const text = Array.isArray(message) ? message.join(', ') : message;
  const normalized = text?.trim() || '';

  if (
    status === 500 ||
    normalized.toLowerCase() === 'internal server error' ||
    normalized.toLowerCase().includes('internal server error')
  ) {
    return APP_MESSAGES.common.unableToComplete;
  }

  if (normalized.toLowerCase().includes('network error')) {
    return APP_MESSAGES.common.networkError;
  }

  return normalized || APP_MESSAGES.common.unexpectedError;
};
