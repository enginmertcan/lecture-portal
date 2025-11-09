import { defineStore } from 'pinia';
import { API_BASE_URL } from '../config';

const STORAGE_KEYS = {
  access: 'lecture_portal_access_token',
  refresh: 'lecture_portal_refresh_token',
};

const readFromStorage = (key) => window.localStorage.getItem(key);
const writeToStorage = (key, value) => {
  if (value) {
    window.localStorage.setItem(key, value);
  } else {
    window.localStorage.removeItem(key);
  }
};

export const useAuthStore = defineStore('auth', {
  state: () => ({
    accessToken: readFromStorage(STORAGE_KEYS.access),
    refreshToken: readFromStorage(STORAGE_KEYS.refresh),
    loading: false,
    error: null,
  }),
  getters: {
    isAuthenticated: (state) => Boolean(state.accessToken),
  },
  actions: {
    async login({ identityNo, password }) {
      this.loading = true;
      this.error = null;
      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identityNo, password }),
        });

        if (!response.ok) {
          throw new Error('Kimlik bilgileri doğrulanamadı');
        }

        const data = await response.json();
        this.setTokens(data);
        return data;
      } catch (err) {
        this.error = err.message || 'Oturum açılırken bir hata oluştu';
        throw err;
      } finally {
        this.loading = false;
      }
    },
    async refreshTokens() {
      if (!this.refreshToken) {
        throw new Error('Yenileme tokeni bulunamadı');
      }

      const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });

      if (!response.ok) {
        this.logout();
        throw new Error('Oturum süresi doldu');
      }

      const data = await response.json();
      this.setTokens(data);
      return data.accessToken;
    },
    setTokens({ accessToken, refreshToken }) {
      this.accessToken = accessToken;
      this.refreshToken = refreshToken;
      writeToStorage(STORAGE_KEYS.access, accessToken);
      writeToStorage(STORAGE_KEYS.refresh, refreshToken);
    },
    logout() {
      this.accessToken = null;
      this.refreshToken = null;
      this.error = null;
      writeToStorage(STORAGE_KEYS.access, null);
      writeToStorage(STORAGE_KEYS.refresh, null);
    },
  },
});
