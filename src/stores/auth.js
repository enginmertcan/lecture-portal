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

const normalizeRoleName = (role) => {
  if (!role) return '';
  return role.startsWith('ROLE_') ? role : `ROLE_${role}`;
};

const decodeJwtPayload = (token) => {
  if (!token) {
    return null;
  }
  try {
    const [, payload] = token.split('.');
    if (!payload) {
      return null;
    }
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const pad = '='.repeat((4 - (normalized.length % 4)) % 4);
    const base64 = normalized + pad;
    const decoder =
      typeof globalThis !== 'undefined' && typeof globalThis.atob === 'function'
        ? globalThis.atob
        : (value) => Buffer.from(value, 'base64').toString('binary');
    const json = decoder(base64);
    return JSON.parse(json);
  } catch (error) {
    console.warn('JWT parse failed', error);
    return null;
  }
};

const extractRoles = (payload) => {
  const raw = payload?.role;
  if (!raw) {
    return [];
  }
  if (Array.isArray(raw)) {
    return raw.map((entry) => entry?.authority || entry).filter(Boolean);
  }
  if (typeof raw === 'object') {
    return [raw.authority || raw].filter(Boolean);
  }
  if (typeof raw === 'string') {
    return [raw];
  }
  return [];
};

const getTokenMeta = (token) => {
  const payload = decodeJwtPayload(token);
  return {
    roles: extractRoles(payload),
    subject: payload?.sub || null,
  };
};

const initialAccessToken = readFromStorage(STORAGE_KEYS.access);
const initialMeta = getTokenMeta(initialAccessToken);

export const useAuthStore = defineStore('auth', {
  state: () => ({
    accessToken: initialAccessToken,
    refreshToken: readFromStorage(STORAGE_KEYS.refresh),
    roles: initialMeta.roles,
    identityNo: initialMeta.subject,
    loading: false,
    error: null,
    profile: null,
    profileLoading: false,
  }),
  getters: {
    isAuthenticated: (state) => Boolean(state.accessToken),
    hasRole: (state) => (role) => state.roles.includes(normalizeRoleName(role)),
    hasAnyRole: (state) => (roles = []) =>
      roles.some((role) => state.roles.includes(normalizeRoleName(role))),
    primaryRole: (state) => {
      if (!state.roles.length) return '';
      return state.roles[0].replace('ROLE_', '');
    },
  },
  actions: {
    updateFromAccessToken(token) {
      const meta = getTokenMeta(token);
      this.roles = meta.roles;
      this.identityNo = meta.subject;
    },
    async ensureProfile() {
      if (!this.isAuthenticated || this.profile || this.profileLoading) {
        return this.profile;
      }
      try {
        return await this.fetchProfile();
      } catch (error) {
        console.warn('Profil yüklenemedi', error);
        return null;
      }
    },
    async fetchProfile() {
      if (!this.isAuthenticated) {
        this.profile = null;
        return null;
      }
      this.profileLoading = true;
      try {
        const response = await fetch(`${API_BASE_URL}/api/users/me`, {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        });
        if (!response.ok) {
          throw new Error('Profil bilgileri getirilemedi');
        }
        const data = await response.json();
        this.profile = data;
        return data;
      } catch (error) {
        this.profile = null;
        throw error;
      } finally {
        this.profileLoading = false;
      }
    },
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
        await this.ensureProfile();
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
      this.updateFromAccessToken(accessToken);
      this.profile = null;
      writeToStorage(STORAGE_KEYS.access, accessToken);
      writeToStorage(STORAGE_KEYS.refresh, refreshToken);
      this.ensureProfile();
    },
    logout() {
      this.accessToken = null;
      this.refreshToken = null;
      this.roles = [];
      this.identityNo = null;
      this.error = null;
      this.profile = null;
      writeToStorage(STORAGE_KEYS.access, null);
      writeToStorage(STORAGE_KEYS.refresh, null);
    },
  },
});
