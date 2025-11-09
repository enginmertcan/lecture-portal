<script setup>
import { reactive, ref } from 'vue';
import httpClient from '../api/httpClient';

const classrooms = ref([]);
const loading = ref(false);
const error = ref('');
const page = ref(0);
const pageSize = 10;
const totalPages = ref(0);

const form = reactive({
  name: '',
  location: '',
  capacity: 20,
});

const formLoading = ref(false);
const formError = ref('');

const fetchClassrooms = async () => {
  loading.value = true;
  error.value = '';
  try {
    const { data } = await httpClient.get('/api/classrooms', {
      params: { page: page.value, pageSize },
    });
    classrooms.value = data.content;
    totalPages.value = data.totalPages;
  } catch (err) {
    error.value = err.response?.data?.message || 'Sınıflar çekilemedi';
  } finally {
    loading.value = false;
  }
};

const createClassroom = async () => {
  formLoading.value = true;
  formError.value = '';
  try {
    await httpClient.post('/api/classrooms', form);
    Object.assign(form, { name: '', location: '', capacity: 20 });
    await fetchClassrooms();
  } catch (err) {
    formError.value = err.response?.data?.message || 'Sınıf oluşturulamadı';
  } finally {
    formLoading.value = false;
  }
};

const deleteClassroom = async (room) => {
  const confirmed = window.confirm(`"${room.name}" sınıfını silmek istiyor musun?`);
  if (!confirmed) return;
  try {
    await httpClient.delete(`/api/classrooms/${room.id}`);
    await fetchClassrooms();
  } catch (err) {
    alert(err.response?.data?.message || 'Sınıf silinemedi');
  }
};

const nextPage = () => {
  if (page.value < totalPages.value - 1) {
    page.value += 1;
    fetchClassrooms();
  }
};

const prevPage = () => {
  if (page.value > 0) {
    page.value -= 1;
    fetchClassrooms();
  }
};

fetchClassrooms();
</script>

<template>
  <section class="layout-grid">
    <header class="section-headline">
      <div>
        <p class="eyebrow">Kaynaklar</p>
        <h1>Sınıf yönetimi</h1>
        <p>Fiziksel sınıflar, kapasite ve lokasyon bilgilerini API üzerinden yönet.</p>
      </div>
    </header>

    <div class="grid-2 stretch">
      <article class="card">
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>İsim</th>
                <th>Lokasyon</th>
                <th>Kapasite</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="room in classrooms" :key="room.id">
                <td>#{{ room.id }}</td>
                <td>{{ room.name }}</td>
                <td>{{ room.location || '—' }}</td>
                <td>{{ room.capacity }}</td>
                <td><button class="ghost tiny" @click="deleteClassroom(room)">Sil</button></td>
              </tr>
              <tr v-if="!loading && !classrooms.length">
                <td colspan="5">Kayıt yok.</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-if="loading" class="status">Yükleniyor...</p>
        <p v-if="error" class="error">{{ error }}</p>
        <footer class="table-footer">
          <button @click="prevPage" :disabled="page === 0">Önceki</button>
          <span>Sayfa {{ page + 1 }} / {{ Math.max(totalPages, 1) }}</span>
          <button @click="nextPage" :disabled="page >= totalPages - 1">Sonraki</button>
        </footer>
      </article>

      <article class="card">
        <header class="card-header">
          <div>
            <p class="eyebrow">Yeni sınıf</p>
            <h2>Sınıf oluştur</h2>
          </div>
        </header>
        <form class="form-grid" @submit.prevent="createClassroom">
          <label>
            İsim
            <input v-model="form.name" placeholder="Lab 201" required />
          </label>
          <label>
            Lokasyon
            <input v-model="form.location" placeholder="B blok" />
          </label>
          <label>
            Kapasite
            <input v-model.number="form.capacity" type="number" min="1" required />
          </label>
          <div class="full-span">
            <button type="submit" :disabled="formLoading">
              {{ formLoading ? 'Kaydediliyor...' : 'Kaydet' }}
            </button>
            <p v-if="formError" class="error">{{ formError }}</p>
          </div>
        </form>
      </article>
    </div>
  </section>
</template>
