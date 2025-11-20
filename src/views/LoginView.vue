<script setup>
import { computed, ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useAuthStore } from '../stores/auth';

const variants = {
  STUDENT: {
    label: 'Öğrenci Girişi',
    subtitle: 'Ders katılımı, not görüntüleme ve kayıt işlemleri için giriş yap.',
  },
  TEACHER: {
    label: 'Öğretmen Girişi',
    subtitle: 'Ders planlama, sınıf yönetimi ve değerlendirme işlemleri için giriş yap.',
  },
};

const route = useRoute();
const selectedVariant = ref(route.query.type === 'teacher' ? 'TEACHER' : 'STUDENT');

const identityNo = ref('');
const password = ref('');
const mfaCode = ref('');
const mfaChallenge = ref(null);
const authStore = useAuthStore();
const router = useRouter();
const { loading } = storeToRefs(authStore);
const formError = ref('');
const sessionExpired = computed(() => route.query.sessionExpired === '1');

const variantMeta = computed(() => variants[selectedVariant.value]);

const selectVariant = (value) => {
  selectedVariant.value = value;
};

const handleSubmit = async () => {
  formError.value = '';
  try {
    const result = await authStore.login({
      identityNo: identityNo.value,
      password: password.value,
      challengeId: mfaChallenge.value?.challengeId,
      mfaCode: mfaChallenge.value ? mfaCode.value : null,
    });
    if (result?.requiresMfa) {
      mfaChallenge.value = {
        challengeId: result.challengeId,
        expiresAt: result.expiresAt,
        channel: result.channel,
        message: result.message || 'Güvenlik kodu e-posta adresine gönderildi.',
      };
      mfaCode.value = '';
      formError.value = 'E-posta adresine gelen MFA kodunu girin.';
      return;
    }
    mfaChallenge.value = null;
    mfaCode.value = '';
    router.push(route.query.redirect || '/');
  } catch (err) {
    formError.value = err.message || 'Giriş başarısız';
  }
};

const challengeExpiresLabel = computed(() => {
  if (!mfaChallenge.value?.expiresAt) {
    return null;
  }
  const expires = new Date(mfaChallenge.value.expiresAt);
  if (Number.isNaN(expires.getTime())) {
    return null;
  }
  return expires.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
});
</script>

<template>
  <section class="auth-card">
    <header>
      <p v-if="sessionExpired" class="session-expired">
        Oturum süren doldu. Lütfen yeniden giriş yap.
      </p>
      <p class="eyebrow">Trendyol Lecture Portal</p>
      <h1>{{ variantMeta.label }}</h1>
      <p class="subtitle">
        {{ variantMeta.subtitle }}
      </p>
    </header>

    <div class="account-toggle">
      <button
        type="button"
        class="toggle-chip"
        :class="{ active: selectedVariant === 'STUDENT' }"
        @click="selectVariant('STUDENT')"
      >
        <strong>Öğrenci</strong>
        <small>Derslere katıl, notlarını görüntüle.</small>
      </button>
      <button
        type="button"
        class="toggle-chip"
        :class="{ active: selectedVariant === 'TEACHER' }"
        @click="selectVariant('TEACHER')"
      >
        <strong>Öğretmen</strong>
        <small>Ders oluştur, sınıfları ve notları yönet.</small>
      </button>
    </div>

    <form @submit.prevent="handleSubmit">
      <label>
        T.C. Kimlik No
        <input
          v-model="identityNo"
          name="identityNo"
          type="text"
          maxlength="11"
          required
          placeholder="12345678901"
        />
      </label>

      <label>
        Parola
        <input
          v-model="password"
          name="password"
          type="password"
          required
          placeholder="••••••••"
        />
      </label>

      <div v-if="mfaChallenge" class="mfa-box">
        <strong>Çok faktörlü doğrulama</strong>
        <p>
          {{ mfaChallenge.message }}
          <span v-if="challengeExpiresLabel">· Son geçerlilik: {{ challengeExpiresLabel }}</span>
        </p>
        <label>
          Güvenlik Kodu
          <input
            v-model="mfaCode"
            name="mfaCode"
            type="text"
            inputmode="numeric"
            maxlength="6"
            required
            placeholder="123456"
          />
        </label>
      </div>

      <button type="submit" :disabled="loading">
        {{ loading ? 'Giriş yapılıyor...' : 'Giriş Yap' }}
      </button>
      <p v-if="formError" class="error">{{ formError }}</p>
    </form>

    <p class="helper">
      Parolanı mı unuttun?
      <RouterLink to="/forgot-password">Sıfırlama isteği gönder</RouterLink>
    </p>
    <p class="helper">
      Hesabın yok mu?
      <RouterLink to="/register">Hemen kayıt ol</RouterLink> veya Swagger dokümanından demo kullanıcıyı kullan.
    </p>
  </section>
</template>

<style scoped>
.session-expired {
  background-color: #fff4f4;
  border: 1px solid #f5cccc;
  color: #8c1c1c;
  border-radius: 0.75rem;
  padding: 0.75rem 1rem;
  margin-bottom: 1rem;
  font-weight: 600;
}

.mfa-box {
  border: 1px solid #d6d9ff;
  background: #f5f6ff;
  border-radius: 0.75rem;
  padding: 1rem;
  margin-bottom: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.mfa-box strong {
  font-size: 0.95rem;
}

.mfa-box p {
  margin: 0;
  font-size: 0.9rem;
  color: #4a4d8b;
}
</style>
