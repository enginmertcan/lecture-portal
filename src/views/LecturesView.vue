<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import httpClient from '../api/httpClient';

const pageSize = 10;
const lectures = ref([]);
const page = ref(0);
const totalPages = ref(0);
const loading = ref(false);
const error = ref('');
const selectedLecture = ref(null);
const schedule = ref([]);
const scheduleLoading = ref(false);
const scheduleError = ref('');
const searchTerm = ref('');
const teacherOptions = ref([]);
const gradeComponents = ref([]);
const gradeLoading = ref(false);
const gradeError = ref('');

const lectureForm = reactive({
  name: '',
  description: '',
  capacity: 30,
  teacherId: '',
});

const formLoading = ref(false);
const formError = ref('');

const fetchLectures = async () => {
  loading.value = true;
  error.value = '';
  try {
    const { data } = await httpClient.get('/api/lectures', {
      params: { page: page.value, pageSize },
    });
    lectures.value = data.content;
    totalPages.value = data.totalPages;
    if (!data.content.length) {
      selectedLecture.value = null;
      schedule.value = [];
      gradeComponents.value = [];
    }
  } catch (err) {
    error.value = err.response?.data?.message || 'Dersler çekilirken hata oluştu';
  } finally {
    loading.value = false;
  }
};

const fetchTeachers = async () => {
  try {
    const { data } = await httpClient.get('/api/users/by-role', {
      params: { role: 'TEACHER' },
    });
    teacherOptions.value = data;
    if (!lectureForm.teacherId && data.length) {
      lectureForm.teacherId = data[0].id;
    }
  } catch (err) {
    console.error('Teachers yüklenemedi', err);
  }
};

const fetchLectureSchedule = async (lectureId) => {
  scheduleLoading.value = true;
  scheduleError.value = '';
  try {
    const { data } = await httpClient.get(`/api/lecture-schedules/lecture/${lectureId}`);
    schedule.value = data;
  } catch (err) {
    scheduleError.value = err.response?.data?.message || 'Program alınamadı';
  } finally {
    scheduleLoading.value = false;
  }
};

const fetchGradeComponents = async (lectureId) => {
  gradeLoading.value = true;
  gradeError.value = '';
  try {
    const { data } = await httpClient.get('/api/grade-components', {
      params: { lectureId },
    });
    gradeComponents.value = data;
  } catch (err) {
    gradeError.value = err.response?.data?.message || 'Not bileşenleri getirilemedi';
  } finally {
    gradeLoading.value = false;
  }
};

const handleSelectLecture = (lecture) => {
  selectedLecture.value = lecture;
  fetchLectureSchedule(lecture.id);
  fetchGradeComponents(lecture.id);
};

const createLecture = async () => {
  formLoading.value = true;
  formError.value = '';
  try {
    await httpClient.post('/api/lectures', lectureForm);
    Object.assign(lectureForm, { name: '', description: '', capacity: 30, teacherId: lectureForm.teacherId });
    await fetchLectures();
  } catch (err) {
    formError.value = err.response?.data?.message || 'Ders oluşturulamadı';
  } finally {
    formLoading.value = false;
  }
};

const deleteLecture = async (lecture) => {
  const confirmed = window.confirm(`"${lecture.name}" dersini silmek istediğine emin misin?`);
  if (!confirmed) return;
  try {
    await httpClient.delete(`/api/lectures/${lecture.id}`);
    if (selectedLecture.value?.id === lecture.id) {
      selectedLecture.value = null;
      schedule.value = [];
      gradeComponents.value = [];
    }
    await fetchLectures();
  } catch (err) {
    alert(err.response?.data?.message || 'Ders silinemedi');
  }
};

const filteredLectures = computed(() => {
  if (!searchTerm.value) {
    return lectures.value;
  }
  return lectures.value.filter((lecture) =>
    lecture.name.toLowerCase().includes(searchTerm.value.trim().toLowerCase())
  );
});

const nextPage = () => {
  if (page.value < totalPages.value - 1) {
    page.value += 1;
    fetchLectures();
  }
};

const prevPage = () => {
  if (page.value > 0) {
    page.value -= 1;
    fetchLectures();
  }
};

onMounted(() => {
  fetchLectures();
  fetchTeachers();
});
</script>

<template>
  <section class="layout-grid">
    <header class="section-headline">
      <div>
        <p class="eyebrow">Canlı API</p>
        <h1>Ders Operasyonları</h1>
        <p>
          Ders oluştur, güncel listeyi filtrele ve seçtiğin dersin programını/grade component’lerini incele.
        </p>
      </div>
      <input
        v-model="searchTerm"
        placeholder="Derste ara..."
        type="search"
        class="search-input"
      />
    </header>

    <div class="grid-2 stretch">
      <div class="card">
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Ders</th>
                <th>Açıklama</th>
                <th>Kontenjan</th>
                <th>Öğretmen</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="lecture in filteredLectures"
                :key="lecture.id"
                :class="{ active: selectedLecture?.id === lecture.id }"
                @click="handleSelectLecture(lecture)"
              >
                <td>{{ lecture.id }}</td>
                <td>{{ lecture.name }}</td>
                <td>{{ lecture.description }}</td>
                <td>{{ lecture.capacity }}</td>
                <td>#{{ lecture.teacherId }}</td>
                <td>
                  <button class="ghost tiny" @click.stop="deleteLecture(lecture)">Sil</button>
                </td>
              </tr>
              <tr v-if="!loading && !filteredLectures.length">
                <td colspan="6">Sonuç bulunamadı</td>
              </tr>
            </tbody>
          </table>
          <p v-if="loading" class="status">Dersler yükleniyor...</p>
          <p v-if="error" class="error status">{{ error }}</p>
        </div>

        <footer class="table-footer">
          <button @click="prevPage" :disabled="page === 0">Önceki</button>
          <span>Sayfa {{ page + 1 }} / {{ Math.max(totalPages, 1) }}</span>
          <button @click="nextPage" :disabled="page >= totalPages - 1">Sonraki</button>
        </footer>
      </div>

      <div class="card">
        <header class="card-header">
          <div>
            <p class="eyebrow">Yeni Ders</p>
            <h2>Ders oluştur</h2>
          </div>
        </header>
        <form class="form-grid" @submit.prevent="createLecture">
          <label>
            İsim
            <input v-model="lectureForm.name" placeholder="Mikroservis Tasarımı" required />
          </label>
          <label class="full-span">
            Açıklama
            <textarea
              v-model="lectureForm.description"
              placeholder="Kısa ders özeti"
              rows="3"
            ></textarea>
          </label>
          <label>
            Kontenjan
            <input v-model.number="lectureForm.capacity" type="number" min="1" required />
          </label>
          <label>
            Öğretmen
            <select v-model="lectureForm.teacherId" required>
              <option disabled value="">Öğretmen seç</option>
              <option v-for="teacher in teacherOptions" :key="teacher.id" :value="teacher.id">
                {{ teacher.name }} {{ teacher.surname }}
              </option>
            </select>
          </label>
          <div class="full-span">
            <button type="submit" :disabled="formLoading">
              {{ formLoading ? 'Kaydediliyor...' : 'Dersi Oluştur' }}
            </button>
            <p v-if="formError" class="error">{{ formError }}</p>
          </div>
        </form>
      </div>
    </div>

    <div class="grid-2" v-if="selectedLecture">
      <aside class="card">
        <h2>{{ selectedLecture.name }} programı</h2>
        <p>{{ selectedLecture.description }}</p>
        <p class="meta">
          Kapasite: <strong>{{ selectedLecture.capacity }}</strong> • Öğretmen ID:
          <strong>{{ selectedLecture.teacherId }}</strong>
        </p>

        <div class="schedule-wrapper">
          <p v-if="scheduleLoading" class="status">Program yükleniyor...</p>
          <p v-if="scheduleError" class="error">{{ scheduleError }}</p>
          <ul v-else-if="schedule.length">
            <li v-for="slot in schedule" :key="slot.id">
              <strong>{{ slot.dayOfWeek }}</strong>
              <span>{{ slot.startTime }} - {{ slot.endTime }}</span>
              <span>({{ slot.classroomName }})</span>
            </li>
          </ul>
          <p v-else>Bu ders için planlanmış oturum bulunamadı.</p>
        </div>
      </aside>

      <aside class="card">
        <h2>Not Bileşenleri</h2>
        <p class="subtitle">API: /api/grade-components?lectureId={{ selectedLecture.id }}</p>
        <p v-if="gradeLoading" class="status">Not bileşenleri yükleniyor...</p>
        <p v-if="gradeError" class="error">{{ gradeError }}</p>
        <ul class="resource-list" v-if="!gradeLoading && !gradeError">
          <li v-for="component in gradeComponents" :key="component.id">
            <div>
              <strong>{{ component.name }}</strong>
              <p>Ağırlık: %{{ component.weight }} • Max: {{ component.maxScore }}</p>
            </div>
            <span class="pill secondary">#{{ component.id }}</span>
          </li>
          <li v-if="!gradeComponents.length">
            <p>Derse ait bileşen tanımlanmamış.</p>
          </li>
        </ul>
      </aside>
    </div>
  </section>
</template>
