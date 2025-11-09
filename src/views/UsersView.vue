<script setup>
import { reactive, ref, watch } from 'vue';
import httpClient from '../api/httpClient';

const users = ref([]);
const loading = ref(false);
const error = ref('');
const page = ref(0);
const pageSize = 10;
const totalPages = ref(0);
const roleFilter = ref('');

const form = reactive({
  identityNo: '',
  name: '',
  surname: '',
  gender: 'FEMALE',
  role: 'STUDENT',
  password: '',
});

const formLoading = ref(false);
const formError = ref('');

const roles = ['ADMIN', 'TEACHER', 'STUDENT'];
const genders = [
  { label: 'Kadın', value: 'FEMALE' },
  { label: 'Erkek', value: 'MALE' },
];

const fetchUsers = async () => {
  loading.value = true;
  error.value = '';
  try {
    if (roleFilter.value) {
      const { data } = await httpClient.get('/api/users/by-role', {
        params: { role: roleFilter.value },
      });
      users.value = data;
      totalPages.value = 1;
    } else {
      const { data } = await httpClient.get('/api/users', {
        params: { page: page.value, pageSize },
      });
      users.value = data.content;
      totalPages.value = data.totalPages;
    }
  } catch (err) {
    error.value = err.response?.data?.message || 'Kullanıcılar alınamadı';
  } finally {
    loading.value = false;
  }
};

const createUser = async () => {
  formLoading.value = true;
  formError.value = '';
  try {
    await httpClient.post('/api/users', form);
    Object.assign(form, {
      identityNo: '',
      name: '',
      surname: '',
      gender: 'FEMALE',
      role: 'STUDENT',
      password: '',
    });
    await fetchUsers();
  } catch (err) {
    formError.value = err.response?.data?.message || 'Kullanıcı oluşturulamadı';
  } finally {
    formLoading.value = false;
  }
};

const deleteUser = async (user) => {
  const confirmed = window.confirm(`${user.name} kullanıcısını silmek istiyor musun?`);
  if (!confirmed) return;
  try {
    await httpClient.delete('/api/users', { params: { id: user.id } });
    await fetchUsers();
  } catch (err) {
    alert(err.response?.data?.message || 'Silme işlemi başarısız');
  }
};

const nextPage = () => {
  if (page.value < totalPages.value - 1) {
    page.value += 1;
    fetchUsers();
  }
};

const prevPage = () => {
  if (page.value > 0) {
    page.value -= 1;
    fetchUsers();
  }
};

watch(roleFilter, () => {
  page.value = 0;
  fetchUsers();
});

fetchUsers();
</script>

<template>
  <section class="layout-grid">
    <header class="section-headline">
      <div>
        <p class="eyebrow">Kimlik</p>
        <h1>Kullanıcı yönetimi</h1>
        <p>Admin paneli üzerinden kimlik ve rol atamalarını yönet.</p>
      </div>
      <select v-model="roleFilter">
        <option value="">Tüm roller</option>
        <option v-for="role in roles" :key="role" :value="role">
          {{ role }}
        </option>
      </select>
    </header>

    <div class="grid-2 stretch">
      <article class="card">
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>TC</th>
                <th>Ad Soyad</th>
                <th>Cinsiyet</th>
                <th>Rol</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="user in users" :key="user.id">
                <td>#{{ user.id }}</td>
                <td>{{ user.identityNo }}</td>
                <td>{{ user.name }} {{ user.surname }}</td>
                <td>{{ user.gender }}</td>
                <td><span class="pill secondary">{{ user.role }}</span></td>
                <td><button class="ghost tiny" @click="deleteUser(user)">Sil</button></td>
              </tr>
              <tr v-if="!loading && !users.length">
                <td colspan="6">Kullanıcı bulunamadı.</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-if="loading" class="status">Yükleniyor...</p>
        <p v-if="error" class="error">{{ error }}</p>
        <footer class="table-footer" v-if="!roleFilter">
          <button @click="prevPage" :disabled="page === 0">Önceki</button>
          <span>Sayfa {{ page + 1 }} / {{ Math.max(totalPages, 1) }}</span>
          <button @click="nextPage" :disabled="page >= totalPages - 1">Sonraki</button>
        </footer>
      </article>

      <article class="card">
        <header class="card-header">
          <div>
            <p class="eyebrow">Yeni kullanıcı</p>
            <h2>Sisteme manuel kullanıcı ekle</h2>
          </div>
        </header>
        <form class="form-grid" @submit.prevent="createUser">
          <label>
            T.C. Kimlik No
            <input v-model="form.identityNo" maxlength="11" required />
          </label>
          <label>
            Ad
            <input v-model="form.name" required />
          </label>
          <label>
            Soyad
            <input v-model="form.surname" required />
          </label>
          <label>
            Cinsiyet
            <select v-model="form.gender" required>
              <option v-for="gender in genders" :key="gender.value" :value="gender.value">
                {{ gender.label }}
              </option>
            </select>
          </label>
          <label>
            Rol
            <select v-model="form.role" required>
              <option v-for="role in roles" :key="role" :value="role">{{ role }}</option>
            </select>
          </label>
          <label class="full-span">
            Parola
            <input v-model="form.password" type="password" minlength="6" required />
          </label>
          <div class="full-span">
            <button type="submit" :disabled="formLoading">
              {{ formLoading ? 'Kaydediliyor...' : 'Kullanıcı Oluştur' }}
            </button>
            <p v-if="formError" class="error">{{ formError }}</p>
          </div>
        </form>
      </article>
    </div>
  </section>
</template>
