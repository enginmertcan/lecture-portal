<script setup>
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useAuthStore } from '../stores/auth';

const identityNo = ref('12345678901');
const password = ref('P@ssw0rd!');
const authStore = useAuthStore();
const router = useRouter();
const route = useRoute();
const { loading } = storeToRefs(authStore);
const formError = ref('');

const handleSubmit = async () => {
  formError.value = '';
  try {
    await authStore.login({
      identityNo: identityNo.value,
      password: password.value,
    });
    router.push(route.query.redirect || '/');
  } catch (err) {
    formError.value = err.message || 'Giriş başarısız';
  }
};
</script>

<template>
  <section class="auth-card">
    <header>
      <p class="eyebrow">Trendyol Lecture Portal</p>
      <h1>Dev Portal’a giriş yap</h1>
      <p class="subtitle">
        Backend’deki canlı /api uçlarına JWT ile bağlanmak için lütfen kimlik bilgilerinizi girin.
      </p>
    </header>

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

      <button type="submit" :disabled="loading">
        {{ loading ? 'Giriş yapılıyor...' : 'Giriş Yap' }}
      </button>
      <p v-if="formError" class="error">{{ formError }}</p>
    </form>

    <p class="helper">
      Hesabın yok mu?
      <RouterLink to="/register">Hemen kayıt ol</RouterLink> veya Swagger dokümanından demo kullanıcıyı kullan.
    </p>
  </section>
</template>
