<script setup>
import { reactive, ref, watch } from 'vue';
import httpClient from '../api/httpClient';
import InfoHint from '../components/InfoHint.vue';

const enrollments = ref([]);
const loading = ref(false);
const error = ref('');
const page = ref(0);
const pageSize = 10;
const totalPages = ref(0);

const filterLectureId = ref('');
const filterStudentId = ref('');

const lectures = ref([]);

const enrollmentForm = reactive({
  lectureId: '',
  studentId: '',
});

const completionForm = reactive({
  enrollmentId: '',
  grade: '',
});

const gradeForm = reactive({
  enrollmentId: '',
  lectureId: '',
  gradeComponentId: '',
  score: '',
});

const gradeComponents = ref([]);
const gradeLoading = ref(false);
const gradeError = ref('');

const formState = reactive({
  createLoading: false,
  createError: '',
  completionLoading: false,
  completionError: '',
  gradeLoading: false,
  gradeError: '',
});

const fetchLectures = async () => {
  try {
    const { data } = await httpClient.get('/api/lectures', { params: { page: 0, pageSize: 100 } });
    lectures.value = data.content;
    if (!enrollmentForm.lectureId && lectures.value.length) {
      enrollmentForm.lectureId = lectures.value[0].id;
    }
  } catch (err) {
    error.value = err.response?.data?.message || 'Ders listesi getirilemedi';
  }
};

const fetchEnrollments = async () => {
  loading.value = true;
  error.value = '';
  try {
    let data;
    if (filterStudentId.value) {
      const res = await httpClient.get(`/api/enrollments/student/${filterStudentId.value}`);
      data = res.data;
      enrollments.value = data;
      totalPages.value = 1;
    } else if (filterLectureId.value) {
      const res = await httpClient.get(`/api/enrollments/lecture/${filterLectureId.value}`);
      data = res.data;
      enrollments.value = data;
      totalPages.value = 1;
    } else {
      const res = await httpClient.get('/api/enrollments', { params: { page: page.value, pageSize } });
      enrollments.value = res.data.content;
      totalPages.value = res.data.totalPages;
    }
  } catch (err) {
    error.value = err.response?.data?.message || 'Kayıtlar getirilemedi';
  } finally {
    loading.value = false;
  }
};

const createEnrollment = async () => {
  formState.createLoading = true;
  formState.createError = '';
  try {
    await httpClient.post('/api/enrollments', enrollmentForm);
    await fetchEnrollments();
  } catch (err) {
    formState.createError =
      err.response?.data?.message || 'Kayıt oluşturulamadı (öğrenci rolü gerekebilir).';
  } finally {
    formState.createLoading = false;
  }
};

const runAction = async (id, action) => {
  try {
    await httpClient.post(`/api/enrollments/${id}/${action}`);
    await fetchEnrollments();
  } catch (err) {
    alert(err.response?.data?.message || `${action} işlemi başarısız`);
  }
};

const completeEnrollment = async () => {
  formState.completionLoading = true;
  formState.completionError = '';
  try {
    await httpClient.post(`/api/enrollments/${completionForm.enrollmentId}/complete`, {
      grade: completionForm.grade ? Number(completionForm.grade) : null,
    });
    await fetchEnrollments();
  } catch (err) {
    formState.completionError = err.response?.data?.message || 'Tamamlama başarısız';
  } finally {
    formState.completionLoading = false;
  }
};

const fetchGradeComponents = async (lectureId) => {
  if (!lectureId) {
    gradeComponents.value = [];
    return;
  }
  gradeLoading.value = true;
  gradeError.value = '';
  try {
    const { data } = await httpClient.get('/api/grade-components', {
      params: { lectureId },
    });
    gradeComponents.value = data;
    if (data.length && !gradeForm.gradeComponentId) {
      gradeForm.gradeComponentId = data[0].id;
    }
  } catch (err) {
    gradeError.value = err.response?.data?.message || 'Not bileşenleri getirilemedi';
  } finally {
    gradeLoading.value = false;
  }
};

const recordGrade = async () => {
  formState.gradeLoading = true;
  formState.gradeError = '';
  try {
    await httpClient.post(`/api/enrollments/${gradeForm.enrollmentId}/grades`, {
      gradeComponentId: gradeForm.gradeComponentId,
      score: Number(gradeForm.score),
    });
    await fetchEnrollments();
  } catch (err) {
    formState.gradeError = err.response?.data?.message || 'Not kaydedilemedi';
  } finally {
    formState.gradeLoading = false;
  }
};

const nextPage = () => {
  if (page.value < totalPages.value - 1) {
    page.value += 1;
    fetchEnrollments();
  }
};

const prevPage = () => {
  if (page.value > 0) {
    page.value -= 1;
    fetchEnrollments();
  }
};

watch([filterLectureId, filterStudentId], () => {
  page.value = 0;
  fetchEnrollments();
});

watch(
  () => gradeForm.lectureId,
  (lectureId) => {
    gradeForm.gradeComponentId = '';
    fetchGradeComponents(lectureId);
  }
);

fetchLectures();
fetchEnrollments();
</script>

<template>
  <section class="layout-grid">
    <header class="section-headline">
      <div>
        <p class="eyebrow">Öğrenci İşleri</p>
        <h1>
          Kayıt ve not yönetimi
          <InfoHint title="Kayıt yaşam döngüsü">
            <ul>
              <li><strong>Pending:</strong> Onay bekleyen başvuru.</li>
              <li><strong>Active:</strong> Derse katılan öğrenci.</li>
              <li><strong>Waiting:</strong> Kontenjan doluysa sıraya alınır.</li>
              <li><strong>Completed:</strong> Ders bitince genel not girilir.</li>
            </ul>
          </InfoHint>
        </h1>
        <p>Enrollment uçları üzerinden ders kayıtlarını ilerlet, drop et, not gir.</p>
      </div>
      <div class="filter-row">
        <select v-model="filterLectureId">
          <option value="">Tüm dersler</option>
          <option v-for="lecture in lectures" :key="lecture.id" :value="lecture.id">
            Ders #{{ lecture.id }} - {{ lecture.name }}
          </option>
        </select>
        <input
          v-model="filterStudentId"
          placeholder="Öğrenci ID filtrele"
          type="number"
          min="1"
        />
      </div>
    </header>

    <article class="card">
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Ders</th>
              <th>Öğrenci</th>
              <th>Durum</th>
              <th>Bekleme</th>
              <th>Not</th>
              <th>Aksiyonlar</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="enrollment in enrollments" :key="enrollment.id">
              <td>#{{ enrollment.id }}</td>
              <td>{{ enrollment.lectureId }}</td>
              <td>{{ enrollment.studentId }}</td>
              <td><span class="pill secondary">{{ enrollment.status }}</span></td>
              <td>{{ enrollment.waitlistPosition ?? '—' }}</td>
              <td>{{ enrollment.grade ?? '—' }}</td>
              <td class="action-buttons">
                <button class="ghost tiny" @click="runAction(enrollment.id, 'approve')">Onayla</button>
                <button class="ghost tiny" @click="runAction(enrollment.id, 'drop')">Drop</button>
                <button class="ghost tiny" @click="runAction(enrollment.id, 'promote')">Promote</button>
              </td>
            </tr>
            <tr v-if="!loading && !enrollments.length">
              <td colspan="7">Kayıt bulunamadı.</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-if="loading" class="status">Kayıtlar yükleniyor...</p>
      <p v-if="error" class="error">{{ error }}</p>
      <footer class="table-footer" v-if="!filterLectureId && !filterStudentId">
        <button @click="prevPage" :disabled="page === 0">Önceki</button>
        <span>Sayfa {{ page + 1 }} / {{ Math.max(totalPages, 1) }}</span>
        <button @click="nextPage" :disabled="page >= totalPages - 1">Sonraki</button>
      </footer>
    </article>

    <div class="grid-2 stretch">
      <article class="card">
        <header class="card-header">
          <div>
            <p class="eyebrow">Öğrenci kaydı</p>
            <h2>Yeni kayıt oluştur (STUDENT rolü gerektirir)</h2>
          </div>
        </header>
        <form class="form-grid" @submit.prevent="createEnrollment">
          <label>
            Ders
            <select v-model="enrollmentForm.lectureId" required>
              <option disabled value="">Ders seç</option>
              <option v-for="lecture in lectures" :key="lecture.id" :value="lecture.id">
                {{ lecture.name }}
              </option>
            </select>
          </label>
          <label>
            Öğrenci ID
            <input v-model="enrollmentForm.studentId" type="number" min="1" required />
          </label>
          <div class="full-span">
            <button type="submit" :disabled="formState.createLoading">
              {{ formState.createLoading ? 'Kaydediliyor...' : 'Kayıt Oluştur' }}
            </button>
            <p v-if="formState.createError" class="error">{{ formState.createError }}</p>
          </div>
        </form>

        <header class="card-header slim">
          <div>
            <p class="eyebrow">Durum güncelle</p>
            <h3>Kaydı tamamla</h3>
          </div>
        </header>
        <form class="form-grid" @submit.prevent="completeEnrollment">
          <label>
            Enrollment ID
            <input v-model="completionForm.enrollmentId" type="number" min="1" required />
          </label>
          <label>
            Final Notu
            <input v-model="completionForm.grade" type="number" min="0" max="100" />
          </label>
          <div class="full-span">
            <button type="submit" :disabled="formState.completionLoading">
              {{ formState.completionLoading ? 'Gönderiliyor...' : 'Tamamla' }}
            </button>
            <p v-if="formState.completionError" class="error">{{ formState.completionError }}</p>
          </div>
        </form>
      </article>

      <article class="card">
        <header class="card-header">
          <div>
            <p class="eyebrow">Not kayıt</p>
            <h2>Bileşene not gir</h2>
          </div>
        </header>
        <form class="form-grid" @submit.prevent="recordGrade">
          <label>
            Enrollment ID
            <input v-model="gradeForm.enrollmentId" type="number" min="1" required />
          </label>
          <label>
            Ders
            <select v-model="gradeForm.lectureId" required>
              <option disabled value="">Ders seç</option>
              <option v-for="lecture in lectures" :key="lecture.id" :value="lecture.id">
                {{ lecture.name }}
              </option>
            </select>
          </label>
          <label>
            Bileşen
            <select v-model="gradeForm.gradeComponentId" required>
              <option value="" disabled>Bileşen seç</option>
              <option v-for="component in gradeComponents" :key="component.id" :value="component.id">
                {{ component.name }} (Max {{ component.maxScore }})
              </option>
            </select>
          </label>
          <label>
            Puan
            <input v-model="gradeForm.score" type="number" min="0" required />
          </label>
          <div class="full-span">
            <button type="submit" :disabled="formState.gradeLoading || gradeLoading">
              {{ formState.gradeLoading ? 'Kaydediliyor...' : 'Not Kaydet' }}
            </button>
            <p v-if="formState.gradeError" class="error">{{ formState.gradeError }}</p>
            <p v-if="gradeError" class="error">{{ gradeError }}</p>
          </div>
        </form>
      </article>
    </div>
  </section>
</template>
