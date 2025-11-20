<script setup>
import { computed, onMounted, ref } from 'vue';
import { useAuthStore } from '../stores/auth';

const authStore = useAuthStore();

const sessions = ref([]);
const sessionsLoading = ref(false);
const sessionsError = ref('');

const mfaUpdating = ref(false);
const mfaError = ref('');

const currentDeviceId = computed(() => authStore.deviceId);
const isMfaEnabled = computed(() => authStore.profile?.mfaEnabled ?? false);

const loadSessions = async () => {
  sessionsLoading.value = true;
  sessionsError.value = '';
  try {
    sessions.value = await authStore.fetchSessions();
  } catch (error) {
    sessionsError.value = error.message || 'Oturumlar yüklenemedi';
  } finally {
    sessionsLoading.value = false;
  }
};

const toggleMfa = async (event) => {
  mfaError.value = '';
  mfaUpdating.value = true;
  try {
    await authStore.updateMfaPreference(event.target.checked);
  } catch (error) {
    mfaError.value = error.message || 'MFA ayarı güncellenemedi';
  } finally {
    mfaUpdating.value = false;
  }
};

const revokeSession = async (deviceId) => {
  try {
    await authStore.revokeSession(deviceId);
    await loadSessions();
  } catch (error) {
    sessionsError.value = error.message || 'Oturum kapatılamadı';
  }
};

const formatDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' });
};

onMounted(async () => {
  await authStore.ensureProfile();
  await loadSessions();
});
</script>

<template>
  <section class="security-view">
    <header>
      <p class="eyebrow">Hesap Güvenliği</p>
      <h1>Oturumlar & MFA</h1>
      <p>Kendi cihazlarını yönet ve çok faktörlü doğrulamayı etkinleştir.</p>
    </header>

    <div class="cards">
      <article class="card">
        <header>
          <div>
            <h2>Çok Faktörlü Doğrulama</h2>
            <p>E-posta kodu ile girişlerini güçlendir.</p>
          </div>
          <label class="switch">
            <input
              type="checkbox"
              :checked="isMfaEnabled"
              :disabled="mfaUpdating"
              @change="toggleMfa"
            />
            <span></span>
          </label>
        </header>
        <p v-if="mfaError" class="error">{{ mfaError }}</p>
        <ul>
          <li>Giriş sırasında ikinci bir doğrulama kodu istenir.</li>
          <li>Kodlar kayıtlı e-posta adresine gönderilir.</li>
          <li>Güvenilmeyen cihazlardan erişimi engeller.</li>
        </ul>
      </article>

      <article class="card">
        <header>
          <div>
            <h2>Aktif Oturumlar</h2>
            <p>Hangi cihazların hesabına eriştiğini kontrol et.</p>
          </div>
          <button type="button" class="ghost" :disabled="sessionsLoading" @click="loadSessions">
            Yenile
          </button>
        </header>
        <p v-if="sessionsError" class="error">{{ sessionsError }}</p>
        <div v-if="sessionsLoading" class="placeholder">Oturumlar yükleniyor...</div>
        <ul v-else class="session-list">
          <li v-for="session in sessions" :key="session.deviceId">
            <div>
              <strong>{{ session.deviceName }}</strong>
              <p>
                {{ session.userAgent || 'Tarayıcı bilgisi yok' }} · {{ session.ipAddress || 'IP bilinmiyor' }}
              </p>
              <small>
                Açılış: {{ formatDateTime(session.issuedAt) }} · Bitiş: {{ formatDateTime(session.expiresAt) }}
              </small>
            </div>
            <div class="session-actions">
              <span v-if="session.current" class="badge">Bu Cihaz</span>
              <button
                type="button"
                :disabled="session.current"
                @click="revokeSession(session.deviceId)"
              >
                Çıkış
              </button>
            </div>
          </li>
          <li v-if="!sessions.length" class="placeholder">Herhangi bir aktif oturum yok.</li>
        </ul>
      </article>
    </div>
  </section>
</template>

<style scoped>
.security-view {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 1.5rem;
}

.card {
  border: 1px solid #e6e8ff;
  background: #fff;
  border-radius: 1rem;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.card header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;
}

.card header h2 {
  margin: 0;
  font-size: 1.2rem;
}

.card header p {
  margin: 0;
  color: #4a4f6b;
  font-size: 0.9rem;
}

ul {
  padding: 0;
  margin: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.session-list li {
  border: 1px solid #eef0ff;
  border-radius: 0.75rem;
  padding: 0.75rem 1rem;
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.session-list strong {
  display: block;
}

.session-list p,
.session-list small {
  margin: 0;
  color: #4d527a;
}

.session-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.badge {
  background: #e9f5ef;
  color: #0c6a3b;
  border-radius: 999px;
  padding: 0.2rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 600;
}

.placeholder {
  color: #6a6f92;
  font-style: italic;
}

.error {
  color: #b42318;
  font-weight: 600;
}

.switch {
  position: relative;
  display: inline-flex;
  width: 46px;
  height: 26px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.switch span {
  position: absolute;
  cursor: pointer;
  inset: 0;
  background-color: #c6c9de;
  border-radius: 999px;
  transition: 0.2s;
}

.switch span::before {
  position: absolute;
  content: '';
  height: 20px;
  width: 20px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  border-radius: 50%;
  transition: 0.2s;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.15);
}

.switch input:checked + span {
  background-color: #4f46e5;
}

.switch input:checked + span::before {
  transform: translateX(20px);
}
</style>

