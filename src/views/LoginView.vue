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
</style>
