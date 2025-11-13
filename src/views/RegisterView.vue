<script setup>
import { computed, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { API_BASE_URL } from '../config';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const authStore = useAuthStore();

const accountTypes = [
  { label: 'Öğrenci Hesabı', value: 'STUDENT', helper: 'Derslere katılmak ve not görmek için' },
  { label: 'Öğretmen Hesabı', value: 'TEACHER', helper: 'Ders oluşturmak ve yönetmek için' },
];

const form = ref({
  identityNo: '',
  name: '',
  surname: '',
  email: '',
  gender: 'FEMALE',
  password: '',
  role: accountTypes[0].value,
});

const loading = ref(false);
const error = ref('');
const fieldErrors = reactive({
  identityNo: '',
  name: '',
  surname: '',
  email: '',
  gender: '',
  password: '',
  role: '',
});

const verification = reactive({
  active: false,
  identityNo: '',
  email: '',
  code: '',
  loading: false,
  error: '',
  info: '',
  success: '',
});

const resetVerification = () => {
  verification.active = false;
  verification.identityNo = '';
  verification.email = '';
  verification.code = '';
  verification.loading = false;
  verification.error = '';
  verification.info = '';
  verification.success = '';
};

const genders = [
  { label: 'Kadın', value: 'FEMALE' },
  { label: 'Erkek', value: 'MALE' },
];

const passwordRules = [
  { key: 'length', label: 'En az 8 karakter', test: (value) => value.length >= 8 },
  { key: 'lower', label: 'En az 1 küçük harf', test: (value) => /[a-z]/.test(value) },
  { key: 'upper', label: 'En az 1 büyük harf', test: (value) => /[A-Z]/.test(value) },
  { key: 'number', label: 'En az 1 rakam', test: (value) => /\d/.test(value) },
  { key: 'special', label: 'En az 1 özel karakter', test: (value) => /[^A-Za-z0-9]/.test(value) },
];

const passwordChecklist = computed(() =>
  passwordRules.map((rule) => ({
    ...rule,
    passed: rule.test(form.value.password),
  }))
);

const passwordStrength = computed(() => {
  const passed = passwordChecklist.value.filter((rule) => rule.passed).length;
  return Math.round((passed / passwordRules.length) * 100);
});

const passwordStrengthLabel = computed(() => {
  const strength = passwordStrength.value;
  if (strength >= 80) return 'Çok güçlü';
  if (strength >= 60) return 'Güçlü';
  if (strength >= 40) return 'Orta';
  return 'Zayıf';
});

const passwordStrengthColor = computed(() => {
  const strength = passwordStrength.value;
  if (strength >= 80) return '#22c55e';
  if (strength >= 60) return '#84cc16';
  if (strength >= 40) return '#f97316';
  return '#ef4444';
});

const meetsPasswordRules = computed(() => passwordChecklist.value.every((rule) => rule.passed));

const resetFieldErrors = () => {
  Object.keys(fieldErrors).forEach((key) => {
    fieldErrors[key] = '';
  });
};

const clearFieldError = (field) => {
  if (field && fieldErrors[field]) {
    fieldErrors[field] = '';
  }
};

const applyFieldErrors = (details) => {
  if (!Array.isArray(details)) {
    return;
  }
  details.forEach(({ field, message }) => {
    const normalizedField = field?.split('.')?.pop();
    if (normalizedField && normalizedField in fieldErrors) {
      fieldErrors[normalizedField] = message;
    }
  });
};

const handleSubmit = async () => {
  loading.value = true;
  error.value = '';
  resetFieldErrors();
  try {
    if (!meetsPasswordRules.value) {
      fieldErrors.password = 'Parola gereksinimlerini karşılamıyor.';
      throw new Error('Parolan minimum gereksinimlerini karşılamıyor.');
    }

    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form.value),
    });
    let data;
    try {
      data = await response.json();
    } catch {
      data = null;
    }
    if (!response.ok) {
      applyFieldErrors(data?.details);
      const backendMessage = data?.message || data?.errorMessage;
      throw new Error(backendMessage || 'Kayıt oluşturulamadı');
    }
    verification.active = true;
    verification.identityNo = data.identityNo;
    verification.email = data.email;
    verification.code = '';
    verification.info = data.message || 'E-posta adresine doğrulama kodu gönderildi.';
    verification.error = '';
    verification.success = '';
  } catch (err) {
    error.value = err.message || 'Bilinmeyen bir hata oluştu';
  } finally {
    loading.value = false;
  }
};

const handleVerifyCode = async () => {
  verification.loading = true;
  verification.error = '';
  verification.success = '';
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identityNo: verification.identityNo,
        code: verification.code,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.message || 'Doğrulama kodu kabul edilmedi');
    }
    authStore.setTokens(data);
    router.push('/');
  } catch (err) {
    verification.error = err.message || 'Doğrulama tamamlanamadı';
  } finally {
    verification.loading = false;
  }
};

const handleResendCode = async () => {
  verification.loading = true;
  verification.error = '';
  verification.success = '';
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/resend-verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identityNo: verification.identityNo }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.message || 'Kod yeniden gönderilemedi');
    }
    verification.success = data?.message || 'Yeni doğrulama kodu gönderildi.';
    verification.info = verification.success;
  } catch (err) {
    verification.error = err.message || 'Kod yeniden gönderilemedi';
  } finally {
    verification.loading = false;
  }
};
</script>

<template>
  <section v-if="!verification.active" class="auth-card">
    <header>
      <p class="eyebrow">Yeni Hesap</p>
      <h1>Trendyol Lecture Portal Kaydı</h1>
      <p class="subtitle">
        IdentityNo benzersiz olmalı. Başarılı kayıt sonrası e-posta doğrulaması tamamlanmalıdır.
      </p>
    </header>

    <div class="account-toggle">
      <button
        v-for="option in accountTypes"
        :key="option.value"
        type="button"
        :class="['toggle-chip', { active: form.role === option.value }]"
        @click="
          form.role = option.value;
          clearFieldError('role');
        "
      >
        <strong>{{ option.label }}</strong>
        <small>{{ option.helper }}</small>
      </button>
    </div>
    <p v-if="fieldErrors.role" class="field-error">{{ fieldErrors.role }}</p>

    <div v-if="error" class="form-error-banner" role="alert">
      <strong>Kayıt tamamlanamadı</strong>
      <span>{{ error }}</span>
    </div>

    <form @submit.prevent="handleSubmit">
      <label :class="{ invalid: fieldErrors.identityNo }">
        T.C. Kimlik No
        <input
          v-model="form.identityNo"
          type="text"
          maxlength="11"
          required
          placeholder="12345678901"
          @input="clearFieldError('identityNo')"
        />
        <small v-if="fieldErrors.identityNo" class="field-error">{{ fieldErrors.identityNo }}</small>
      </label>
      <label :class="{ invalid: fieldErrors.name }">
        Ad
        <input
          v-model="form.name"
          type="text"
          required
          placeholder="Merve"
          @input="clearFieldError('name')"
        />
        <small v-if="fieldErrors.name" class="field-error">{{ fieldErrors.name }}</small>
      </label>
      <label :class="{ invalid: fieldErrors.surname }">
        Soyad
        <input
          v-model="form.surname"
          type="text"
          required
          placeholder="Kaya"
          @input="clearFieldError('surname')"
        />
        <small v-if="fieldErrors.surname" class="field-error">{{ fieldErrors.surname }}</small>
      </label>
      <label :class="{ invalid: fieldErrors.email }">
        E-posta
        <input
          v-model="form.email"
          type="email"
          required
          placeholder="ornek@mail.com"
          @input="clearFieldError('email')"
        />
        <small v-if="fieldErrors.email" class="field-error">{{ fieldErrors.email }}</small>
      </label>
      <label :class="{ invalid: fieldErrors.gender }">
        Cinsiyet
        <select v-model="form.gender" required @change="clearFieldError('gender')">
          <option v-for="option in genders" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
        <small v-if="fieldErrors.gender" class="field-error">{{ fieldErrors.gender }}</small>
      </label>
      <label :class="{ invalid: fieldErrors.password }">
        Parola
        <input
          v-model="form.password"
          type="password"
          minlength="8"
          required
          placeholder="••••••••"
          @input="clearFieldError('password')"
        />
        <div class="password-meter">
          <div
            class="password-meter__bar"
            :style="{ width: `${passwordStrength}%`, backgroundColor: passwordStrengthColor }"
          ></div>
        </div>
        <span class="password-meter__label" :style="{ color: passwordStrengthColor }">
          {{ passwordStrengthLabel }}
        </span>
        <ul class="password-checklist">
          <li v-for="rule in passwordChecklist" :key="rule.key" :class="{ passed: rule.passed }">
            <span class="dot"></span>
            {{ rule.label }}
          </li>
        </ul>
        <small v-if="fieldErrors.password" class="field-error">{{ fieldErrors.password }}</small>
      </label>
      <button type="submit" :disabled="loading">
        {{ loading ? 'Kaydediliyor...' : 'Kayıt Ol' }}
      </button>
    </form>

    <p class="helper">
      Zaten hesabın var mı?
      <RouterLink to="/login">Giriş yap</RouterLink>
    </p>
  </section>

  <section v-else class="auth-card">
    <header>
      <p class="eyebrow">E-posta Doğrulama</p>
      <h1>{{ verification.email }}</h1>
      <p class="subtitle">
        {{ verification.info || 'E-postana gönderilen kodu girerek hesabını aktifleştir.' }}
      </p>
    </header>

    <div v-if="verification.error" class="form-error-banner" role="alert">
      <strong>Doğrulama tamamlanamadı</strong>
      <span>{{ verification.error }}</span>
    </div>
    <p v-if="verification.success" class="status success">{{ verification.success }}</p>

    <form @submit.prevent="handleVerifyCode">
      <label>
        Doğrulama Kodu
        <input
          v-model="verification.code"
          type="text"
          maxlength="6"
          required
          placeholder="123456"
        />
      </label>
      <div class="action-row">
        <button type="submit" :disabled="verification.loading">
          {{ verification.loading ? 'Doğrulanıyor...' : 'Kodu Onayla' }}
        </button>
        <button
          type="button"
          class="ghost"
          :disabled="verification.loading"
          @click="handleResendCode"
        >
          Kodu Yeniden Gönder
        </button>
      </div>
    </form>
    <button class="ghost small" type="button" :disabled="verification.loading" @click="resetVerification">
      Farklı kullanıcıyla kayıt ol
    </button>
  </section>
</template>
