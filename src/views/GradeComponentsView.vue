<script setup>
import { reactive, ref, watch } from 'vue';
import httpClient from '../api/httpClient';

const gradeComponents = ref([]);
const loading = ref(false);
const error = ref('');
const lectures = ref([]);
const filterLectureId = ref('');
const page = ref(0);
const pageSize = 10;
const totalPages = ref(0);

const form = reactive({
  lectureId: '',
  name: '',
  weight: 40,
  maxScore: 100,
});

const formLoading = ref(false);
const formError = ref('');

const fetchLectures = async () => {
  try {
    const { data } = await httpClient.get('/api/lectures', { params: { page: 0, pageSize: 100 } });
    lectures.value = data.content;
    if (!form.lectureId && lectures.value.length) {
      form.lectureId = lectures.value[0].id;
    }
  } catch (err) {
    error.value = err.response?.data?.message || 'Ders listesi alınamadı';
  }
};

const fetchComponents = async () => {
  loading.value = true;
  error.value = '';
  try {
    const params = filterLectureId.value
      ? { lectureId: filterLectureId.value }
      : { page: page.value, pageSize };
    const { data } = await httpClient.get('/api/grade-components', { params });
    if (Array.isArray(data)) {
      gradeComponents.value = data;
      totalPages.value = 1;
    } else {
      gradeComponents.value = data.content;
      totalPages.value = data.totalPages;
    }
  } catch (err) {
    error.value = err.response?.data?.message || 'Bileşenler yüklenemedi';
  } finally {
    loading.value = false;
  }
};

const createComponent = async () => {
  formLoading.value = true;
  formError.value = '';
  try {
    await httpClient.post('/api/grade-components', form);
    await fetchComponents();
  } catch (err) {
    formError.value = err.response?.data?.message || 'Bileşen oluşturulamadı';
  } finally {
    formLoading.value = false;
  }
};

const deleteComponent = async (component) => {
  const confirmed = window.confirm(`"${component.name}" bileşenini sil?`);
  if (!confirmed) return;
  try {
    await httpClient.delete(`/api/grade-components/${component.id}`);
    await fetchComponents();
  } catch (err) {
    alert(err.response?.data?.message || 'Silme başarısız');
  }
};

const nextPage = () => {
  if (page.value < totalPages.value - 1) {
    page.value += 1;
    fetchComponents();
  }
};

const prevPage = () => {
  if (page.value > 0) {
    page.value -= 1;
    fetchComponents();
  }
};

watch(filterLectureId, () => {
  page.value = 0;
  fetchComponents();
});

fetchLectures();
fetchComponents();
</script>

<template>
  <section class="layout-grid">
    <header class="section-headline">
      <div>
        <p class="eyebrow">Notlandırma</p>
        <h1>Bileşen yönetimi</h1>
        <p>Derslerin vize, final, ödev gibi bileşenlerini tanımlayarak ağırlıklarını yönet.</p>
      </div>
      <select v-model="filterLectureId" class="filter-select">
        <option value="">Tüm dersler</option>
        <option v-for="lecture in lectures" :key="lecture.id" :value="lecture.id">
          {{ lecture.name }}
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
                <th>Ders</th>
                <th>İsim</th>
                <th>Ağırlık</th>
                <th>Max</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="component in gradeComponents" :key="component.id">
                <td>#{{ component.id }}</td>
                <td>{{ component.lectureId }}</td>
                <td>{{ component.name }}</td>
                <td>%{{ component.weight }}</td>
                <td>{{ component.maxScore }}</td>
                <td><button class="ghost tiny" @click="deleteComponent(component)">Sil</button></td>
              </tr>
              <tr v-if="!loading && !gradeComponents.length">
                <td colspan="6">Kayıt yok.</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-if="loading" class="status">Yükleniyor...</p>
        <p v-if="error" class="error">{{ error }}</p>
        <footer class="table-footer" v-if="!filterLectureId">
          <button @click="prevPage" :disabled="page === 0">Önceki</button>
          <span>Sayfa {{ page + 1 }} / {{ Math.max(totalPages, 1) }}</span>
          <button @click="nextPage" :disabled="page >= totalPages - 1">Sonraki</button>
        </footer>
      </article>

      <article class="card">
        <header class="card-header">
          <div>
            <p class="eyebrow">Yeni bileşen</p>
            <h2>Not bileşeni tanımla</h2>
          </div>
        </header>
        <form class="form-grid" @submit.prevent="createComponent">
          <label>
            Ders
            <select v-model="form.lectureId" required>
              <option disabled value="">Ders seç</option>
              <option v-for="lecture in lectures" :key="lecture.id" :value="lecture.id">
                {{ lecture.name }}
              </option>
            </select>
          </label>
          <label>
            İsim
            <input v-model="form.name" placeholder="Vize" required />
          </label>
          <label>
            Ağırlık (%)
            <input v-model.number="form.weight" type="number" min="1" max="100" required />
          </label>
          <label>
            Maksimum Puan
            <input v-model.number="form.maxScore" type="number" min="1" required />
          </label>
          <div class="full-span">
            <button type="submit" :disabled="formLoading">
              {{ formLoading ? 'Kaydediliyor...' : 'Bileşeni Oluştur' }}
            </button>
            <p v-if="formError" class="error">{{ formError }}</p>
          </div>
        </form>
      </article>
    </div>
  </section>
</template>
