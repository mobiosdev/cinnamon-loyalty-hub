import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

// Load base URL from Vite environment variables.
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:7050/api';

const axiosInstance: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for unified error handling
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';
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
