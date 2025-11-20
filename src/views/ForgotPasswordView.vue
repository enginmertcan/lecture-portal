<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { API_BASE_URL } from '../config';

const router = useRouter();

const requestIdentityNo = ref('');
const requestEmail = ref('');
const requestLoading = ref(false);
const requestMessage = ref('');

const resetToken = ref('');
const newPassword = ref('');
const resetLoading = ref(false);
const resetMessage = ref('');

const requestError = ref('');
const resetError = ref('');

const requestReset = async () => {
  requestError.value = '';
  requestMessage.value = '';
  requestLoading.value = true;
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/password/forgot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identityNo: requestIdentityNo.value,
        email: requestEmail.value || undefined,
      }),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.message || 'Sıfırlama isteği gönderilemedi');
    }
    requestMessage.value = 'Kod e-posta adresine gönderildi. Gelen kutunu kontrol et.';
  } catch (error) {
    requestError.value = error.message || 'Beklenmedik bir hata oluştu';
  } finally {
    requestLoading.value = false;
  }
};

const submitNewPassword = async () => {
  resetError.value = '';
  resetMessage.value = '';
  resetLoading.value = true;
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/password/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: resetToken.value,
        newPassword: newPassword.value,
      }),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.message || 'Parola güncellenemedi');
    }
    resetMessage.value = 'Parolan güncellendi. Şimdi giriş sayfasına dönebilirsin.';
    setTimeout(() => router.push({ name: 'login' }), 2000);
  } catch (error) {
    resetError.value = error.message || 'Beklenmedik bir hata oluştu';
  } finally {
    resetLoading.value = false;
  }
};
</script>

<template>
  <section class="auth-card forgot-view">
    <header>
      <p class="eyebrow">Güvenlik Merkezi</p>
      <h1>Parola Sıfırlama</h1>
      <p>Kimlik numaranla sıfırlama kodu iste ve yeni parolanı oluştur.</p>
    </header>

    <div class="stack">
      <form class="card" @submit.prevent="requestReset">
        <h2>Kod Talep Et</h2>
        <p>Kimlik numaranı girerek e-posta adresine doğrulama kodu gönder.</p>
        <label>
          T.C. Kimlik No
          <input v-model="requestIdentityNo" type="text" maxlength="11" required placeholder="12345678901" />
        </label>
        <label>
          E-posta (opsiyonel)
          <input v-model="requestEmail" type="email" placeholder="kullanici@domain.com" />
        </label>
        <button type="submit" :disabled="requestLoading">
          {{ requestLoading ? 'Gönderiliyor...' : 'Kodu Gönder' }}
        </button>
        <p v-if="requestMessage" class="success">{{ requestMessage }}</p>
        <p v-if="requestError" class="error">{{ requestError }}</p>
      </form>

      <form class="card" @submit.prevent="submitNewPassword">
        <h2>Yeni Parola Oluştur</h2>
        <p>Gelen kutuna ulaşan kodu ve yeni parolanı gir.</p>
        <label>
          Kod
          <input v-model="resetToken" type="text" required placeholder="********-****-****-****-************" />
        </label>
        <label>
          Yeni Parola
          <input v-model="newPassword" type="password" required minlength="8" placeholder="Yeni parolan" />
        </label>
        <button type="submit" :disabled="resetLoading">
          {{ resetLoading ? 'Güncelleniyor...' : 'Parolamı Güncelle' }}
        </button>
        <p v-if="resetMessage" class="success">{{ resetMessage }}</p>
        <p v-if="resetError" class="error">{{ resetError }}</p>
      </form>
    </div>

    <p class="helper">
      Giriş sayfasına dönmek için
      <RouterLink to="/login">buraya tıkla</RouterLink>.
    </p>
  </section>
</template>

<style scoped>
.forgot-view {
  max-width: 880px;
}

.stack {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1.5rem;
}

.card {
  border: 1px solid #e3e5ff;
  border-radius: 1rem;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  background: #fff;
}

.card h2 {
  margin: 0;
  font-size: 1.2rem;
}

.card p {
  margin: 0;
  color: #4a5072;
  font-size: 0.9rem;
}

.success {
  color: #0b7a45;
  font-weight: 600;
}

.error {
  color: #b42318;
  font-weight: 600;
}
</style>

