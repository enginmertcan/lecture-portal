import axios from 'axios';
import { API_BASE_URL } from '../config';
import { pinia } from '../stores';
import { useAuthStore } from '../stores/auth';

const httpClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

httpClient.interceptors.request.use((config) => {
  const authStore = useAuthStore(pinia);
  if (authStore.accessToken) {
    config.headers.Authorization = `Bearer ${authStore.accessToken}`;
  }
  return config;
});

let refreshPromise = null;

httpClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const authStore = useAuthStore(pinia);
    const originalRequest = error.config;

    const shouldAttemptRefresh =
      error.response?.status === 401 &&
      authStore.refreshToken &&
      !originalRequest.__isRetryRequest;

    if (shouldAttemptRefresh) {
      try {
        if (!refreshPromise) {
          refreshPromise = authStore.refreshTokens();
        }
        const newAccessToken = await refreshPromise;
        refreshPromise = null;
        originalRequest.__isRetryRequest = true;
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return httpClient(originalRequest);
      } catch (refreshError) {
        refreshPromise = null;
        authStore.logout();
      }
    }

    return Promise.reject(error);
  }
);

export default httpClient;
