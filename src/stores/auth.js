import { defineStore } from "pinia";
import { API_BASE_URL } from "../config";

const STORAGE_KEYS = {
  access: "lecture_portal_access_token",
  refresh: "lecture_portal_refresh_token",
  device: "lecture_portal_device_id",
};

const readFromStorage = (key) => {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage.getItem(key);
};

const writeToStorage = (key, value) => {
  if (typeof window === "undefined") {
    return;
  }
  if (value) {
    window.localStorage.setItem(key, value);
  } else {
    window.localStorage.removeItem(key);
  }
};

const generateDeviceId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `device-${Math.random()
    .toString(36)
    .slice(2, 11)}-${Date.now().toString(36)}`;
};

const ensureDeviceId = () => {
  let id = readFromStorage(STORAGE_KEYS.device);
  if (!id) {
    id = generateDeviceId();
    writeToStorage(STORAGE_KEYS.device, id);
  }
  return id;
};

const detectDeviceName = () => {
  if (typeof navigator === "undefined") {
    return "Web Client";
  }
  const ua = navigator.userAgent || "";
  if (/android/i.test(ua)) return "Android Tarayıcı";
  if (/iphone|ipad|ipod/i.test(ua)) return "iOS Tarayıcı";
  if (/win/i.test(ua)) return "Windows Tarayıcı";
  if (/mac/i.test(ua)) return "macOS Tarayıcı";
  if (/linux/i.test(ua)) return "Linux Tarayıcı";
  return "Web Client";
};

const normalizeRoleName = (role) => {
  if (!role) return "";
  return role.startsWith("ROLE_") ? role : `ROLE_${role}`;
};

const decodeJwtPayload = (token) => {
  if (!token) {
    return null;
  }
  try {
    const [, payload] = token.split(".");
    if (!payload) {
      return null;
    }
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const pad = "=".repeat((4 - (normalized.length % 4)) % 4);
    const base64 = normalized + pad;
    const decoder =
      typeof globalThis !== "undefined" && typeof globalThis.atob === "function"
        ? globalThis.atob
        : (value) => Buffer.from(value, "base64").toString("binary");
    const json = decoder(base64);
    return JSON.parse(json);
  } catch (error) {
    console.warn("JWT parse failed", error);
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
  if (typeof raw === "object") {
    return [raw.authority || raw].filter(Boolean);
  }
  if (typeof raw === "string") {
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
const initialDeviceId = ensureDeviceId();

export const useAuthStore = defineStore("auth", {
  state: () => ({
    accessToken: initialAccessToken,
    refreshToken: readFromStorage(STORAGE_KEYS.refresh),
    roles: initialMeta.roles,
    identityNo: initialMeta.subject,
    deviceId: initialDeviceId,
    deviceName: detectDeviceName(),
    loading: false,
    error: null,
    profile: null,
    profileLoading: false,
  }),
  getters: {
    isAuthenticated: (state) => Boolean(state.accessToken),
    hasRole: (state) => (role) => state.roles.includes(normalizeRoleName(role)),
    hasAnyRole:
      (state) =>
      (roles = []) =>
        roles.some((role) => state.roles.includes(normalizeRoleName(role))),
    primaryRole: (state) => {
      if (!state.roles.length) return "";
      return state.roles[0].replace("ROLE_", "");
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
        console.warn("Profil yüklenemedi", error);
        return null;
      }
    },
    authHeaders(extra = {}) {
      const headers = {
        ...extra,
      };
      if (this.accessToken) {
        headers.Authorization = `Bearer ${this.accessToken}`;
      }
      if (this.deviceId) {
        headers["X-Device-Id"] = this.deviceId;
      }
      return headers;
    },
    async fetchProfile() {
      if (!this.isAuthenticated) {
        this.profile = null;
        return null;
      }
      this.profileLoading = true;
      try {
        const response = await fetch(`${API_BASE_URL}/api/users/me`, {
          headers: this.authHeaders(),
        });
        if (!response.ok) {
          throw new Error("Profil bilgileri getirilemedi");
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
    async login({ identityNo, password, mfaCode, challengeId } = {}) {
      this.loading = true;
      this.error = null;
      try {
        const payload = {
          identityNo,
          password,
          deviceId: this.deviceId,
          deviceName: this.deviceName,
        };
        if (mfaCode) {
          payload.mfaCode = mfaCode;
        }
        if (challengeId) {
          payload.challengeId = challengeId;
        }

        const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (response.status === 202) {
          const challenge = await response.json();
          return { requiresMfa: true, ...challenge };
        }

        if (!response.ok) {
          const errorMessage = await response
            .json()
            .catch(() => ({ message: "Kimlik bilgileri doğrulanamadı" }));
          throw new Error(
            errorMessage.message || "Kimlik bilgileri doğrulanamadı"
          );
        }

        const data = await response.json();
        this.setTokens(data);
        await this.ensureProfile();
        return { success: true };
      } catch (err) {
        this.error = err.message || "Oturum açılırken bir hata oluştu";
        throw err;
      } finally {
        this.loading = false;
      }
    },
    async refreshTokens() {
      if (!this.refreshToken) {
        throw new Error("Yenileme tokeni bulunamadı");
      }

      const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          refreshToken: this.refreshToken,
          deviceId: this.deviceId,
          deviceName: this.deviceName,
        }),
      });

      if (!response.ok) {
        this.logout();
        throw new Error("Oturum süresi doldu");
      }

      const data = await response.json();
      this.setTokens(data);
      return data.accessToken;
    },
    setTokens({ accessToken, refreshToken, deviceId }) {
      this.accessToken = accessToken;
      this.refreshToken = refreshToken;
      this.updateFromAccessToken(accessToken);
      this.profile = null;
      writeToStorage(STORAGE_KEYS.access, accessToken);
      writeToStorage(STORAGE_KEYS.refresh, refreshToken);
      if (deviceId) {
        this.deviceId = deviceId;
        writeToStorage(STORAGE_KEYS.device, deviceId);
      }
      this.ensureProfile();
    },
    setDeviceId(deviceId) {
      if (!deviceId) {
        return;
      }
      this.deviceId = deviceId;
      writeToStorage(STORAGE_KEYS.device, deviceId);
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
    async updateMfaPreference(enabled) {
      const response = await fetch(`${API_BASE_URL}/api/users/me/mfa`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...this.authHeaders(),
        },
        body: JSON.stringify({ enabled }),
      });
      if (!response.ok) {
        throw new Error("MFA ayarı güncellenemedi");
      }
      await this.fetchProfile();
    },
    async fetchSessions() {
      const response = await fetch(`${API_BASE_URL}/api/auth/sessions`, {
        headers: this.authHeaders(),
      });
      if (!response.ok) {
        throw new Error("Aktif oturumlar getirilemedi");
      }
      return response.json();
    },
    async revokeSession(deviceId) {
      const response = await fetch(
        `${API_BASE_URL}/api/auth/sessions/${deviceId}`,
        {
          method: "DELETE",
          headers: this.authHeaders(),
        }
      );
      if (!response.ok) {
        throw new Error("Oturum kapatılamadı");
      }
    },
  },
});
