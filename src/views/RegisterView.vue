<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { API_BASE_URL } from '../config';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const authStore = useAuthStore();

const form = ref({
  identityNo: '',
  name: '',
  surname: '',
  gender: 'FEMALE',
  password: '',
});

const loading = ref(false);
const error = ref('');

const genders = [
  { label: 'Kadın', value: 'FEMALE' },
  { label: 'Erkek', value: 'MALE' },
];

const handleSubmit = async () => {
  loading.value = true;
  error.value = '';
  try {
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
      const backendMessage = data?.errorMessage || data?.message;
      throw new Error(backendMessage || 'Kayıt oluşturulamadı');
    }
    authStore.setTokens(data);
    router.push('/');
  } catch (err) {
    error.value = err.message || 'Bilinmeyen bir hata oluştu';
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <section class="auth-card">
    <header>
      <p class="eyebrow">Yeni Hesap</p>
      <h1>Trendyol Lecture Portal Kaydı</h1>
      <p class="subtitle">
        IdentityNo benzersiz olmalı. Başarılı kayıt sonrası otomatik giriş yapılır.
      </p>
    </header>

    <form @submit.prevent="handleSubmit">
      <label>
        T.C. Kimlik No
        <input v-model="form.identityNo" type="text" maxlength="11" required placeholder="12345678901" />
      </label>
      <label>
        Ad
        <input v-model="form.name" type="text" required placeholder="Merve" />
      </label>
      <label>
        Soyad
        <input v-model="form.surname" type="text" required placeholder="Kaya" />
      </label>
      <label>
        Cinsiyet
        <select v-model="form.gender" required>
          <option v-for="option in genders" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
      </label>
      <label>
        Parola
        <input v-model="form.password" type="password" minlength="6" required placeholder="••••••••" />
      </label>
      <button type="submit" :disabled="loading">
        {{ loading ? 'Kaydediliyor...' : 'Kayıt Ol' }}
      </button>
      <p v-if="error" class="error">{{ error }}</p>
    </form>

    <p class="helper">
      Zaten hesabın var mı?
      <RouterLink to="/login">Giriş yap</RouterLink>
    </p>
  </section>
</template>
