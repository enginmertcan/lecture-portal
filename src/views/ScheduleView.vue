<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import httpClient from '../api/httpClient';
import InfoHint from '../components/InfoHint.vue';
import { useAuthStore } from '../stores/auth';

const schedules = ref([]);
const loading = ref(false);
const error = ref('');
const formError = ref('');
const formLoading = ref(false);
const lectureOptions = ref([]);
const classroomOptions = ref([]);
const slotOptions = ref([]);
const mySchedules = ref([]);
const myLoading = ref(false);
const myError = ref('');

const scheduleForm = reactive({
  lectureId: '',
  classroomId: '',
  scheduleSlotId: '',
  startDate: '',
  endDate: '',
});

const authStore = useAuthStore();
const canManageSchedules = computed(() => authStore.hasAnyRole(['ADMIN', 'TEACHER']));
const isStudentView = computed(() => !canManageSchedules.value && authStore.hasRole('STUDENT'));

const dayLabels = {
  MONDAY: 'Pazartesi',
  TUESDAY: 'Salı',
  WEDNESDAY: 'Çarşamba',
  THURSDAY: 'Perşembe',
  FRIDAY: 'Cuma',
  SATURDAY: 'Cumartesi',
  SUNDAY: 'Pazar',
};

const dayOrder = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

const fetchSchedules = async () => {
  if (!canManageSchedules.value) {
    return;
  }
  loading.value = true;
  error.value = '';
  try {
    const { data } = await httpClient.get('/api/lecture-schedules', {
      params: { page: 0, pageSize: 50 },
    });
    schedules.value = data.content;
  } catch (err) {
    error.value = err.response?.data?.message || 'Ders programı alınamadı';
  } finally {
    loading.value = false;
  }
};

const fetchLookups = async () => {
  if (!canManageSchedules.value) {
    return;
  }
  try {
    const [lecturesRes, classroomRes, slotRes] = await Promise.all([
      httpClient.get('/api/lectures', { params: { page: 0, pageSize: 50 } }),
      httpClient.get('/api/classrooms', { params: { page: 0, pageSize: 50 } }),
      httpClient.get('/api/schedule-slots', { params: { page: 0, pageSize: 50 } }),
    ]);
    lectureOptions.value = lecturesRes.data.content;
    classroomOptions.value = classroomRes.data.content;
    slotOptions.value = slotRes.data.content;
    if (lectureOptions.value.length && !scheduleForm.lectureId) {
      scheduleForm.lectureId = lectureOptions.value[0].id;
    }
    if (classroomOptions.value.length && !scheduleForm.classroomId) {
      scheduleForm.classroomId = classroomOptions.value[0].id;
    }
    if (slotOptions.value.length && !scheduleForm.scheduleSlotId) {
      scheduleForm.scheduleSlotId = slotOptions.value[0].id;
    }
  } catch (err) {
    error.value = err.response?.data?.message || 'Referans veriler getirilemedi';
  }
};

const createSchedule = async () => {
  if (!canManageSchedules.value) {
    formError.value = 'Bu işlem için yetkin yok.';
    return;
  }
  formLoading.value = true;
  formError.value = '';
  try {
    await httpClient.post('/api/lecture-schedules', scheduleForm);
    await fetchSchedules();
  } catch (err) {
    formError.value = err.response?.data?.message || 'Plan oluşturulamadı';
  } finally {
    formLoading.value = false;
  }
};

const deleteSchedule = async (slot) => {
  if (!canManageSchedules.value) {
    return;
  }
  const confirmed = window.confirm(`${slot.lectureName} oturumunu silmek istiyor musun?`);
  if (!confirmed) return;
  try {
    await httpClient.delete(`/api/lecture-schedules/${slot.id}`);
    await fetchSchedules();
  } catch (err) {
    alert(err.response?.data?.message || 'Oturum silinemedi');
  }
};

const fetchMySchedules = async () => {
  if (!authStore.isAuthenticated) {
    mySchedules.value = [];
    return;
  }
  myLoading.value = true;
  myError.value = '';
  try {
    const { data } = await httpClient.get('/api/lecture-schedules/my');
    mySchedules.value = data;
  } catch (err) {
    myError.value = err.response?.data?.message || 'Kişisel program alınamadı';
  } finally {
    myLoading.value = false;
  }
};

const normalizeTime = (value) => (value ? value.slice(0, 5) : '--:--');
const formatTimeRange = (start, end) => `${normalizeTime(start)} - ${normalizeTime(end)}`;
const formatDay = (value) => dayLabels[value] || value || '-';
const formatDateRange = (start, end) => {
  if (!start && !end) {
    return 'Tarih belirtilmedi';
  }
  return `${start || 'Süresiz'} → ${end || 'Süresiz'}`;
};

const sortedMySchedules = computed(() => {
  const orderValue = (day) => {
    const index = dayOrder.indexOf(day);
    return index === -1 ? Number.MAX_SAFE_INTEGER : index;
  };
  return [...mySchedules.value].sort((a, b) => {
    const dayDiff = orderValue(a.dayOfWeek) - orderValue(b.dayOfWeek);
    if (dayDiff !== 0) {
      return dayDiff;
    }
    return normalizeTime(a.startTime).localeCompare(normalizeTime(b.startTime));
  });
});

watch(
  () => canManageSchedules.value,
  async (value) => {
    if (value) {
      await fetchLookups();
      await fetchSchedules();
    } else {
      schedules.value = [];
    }
  },
  { immediate: true }
);

watch(
  () => isStudentView.value,
  async (value) => {
    if (value) {
      await fetchMySchedules();
    } else {
      mySchedules.value = [];
    }
  },
  { immediate: true }
);

onMounted(() => {
  authStore.ensureProfile();
});
</script>

<template>
  <section v-if="canManageSchedules" class="layout-grid">
    <header class="section-headline">
      <div>
        <p class="eyebrow">Planlama</p>
        <h1>
          Ders takvimi
          <InfoHint title="Programlama adımları">
            <ul>
              <li>Ders, sınıf ve slot kayıtları hazır olmadan oturum oluşturamazsın.</li>
              <li>Tarih aralığı ile gün/saat bilgisi çakışmaları otomatik kontrol eder.</li>
            </ul>
          </InfoHint>
        </h1>
        <p>Canlı API’daki /api/lecture-schedules uçlarından gelen ders oturumları.</p>
      </div>
      <button class="ghost" @click="fetchSchedules" :disabled="loading">
        {{ loading ? 'Yenileniyor...' : 'Yenile' }}
      </button>
    </header>

    <div class="grid-2 stretch">
      <article class="card">
        <p v-if="loading" class="status">Program yükleniyor...</p>
        <p v-if="error" class="error">{{ error }}</p>
        <div class="schedule-grid" v-if="!loading && !error">
          <article v-for="item in schedules" :key="item.id" class="card schedule mini">
            <header>
              <div>
                <p class="eyebrow">#{{ item.id }}</p>
                <h2>{{ item.lectureName }}</h2>
                <p>Classroom: {{ item.classroomName }} (#{{ item.classroomId }})</p>
              </div>
              <button class="ghost tiny" @click="deleteSchedule(item)">Sil</button>
            </header>
            <div class="schedule-meta">
              <span>{{ item.dayOfWeek }}</span>
              <span>{{ item.startTime }} - {{ item.endTime }}</span>
            </div>
            <p class="date-range">
              {{ item.startDate }} → {{ item.endDate }}
            </p>
          </article>
        </div>
        <p v-if="!loading && !error && !schedules.length" class="status">
          Gösterilecek oturum bulunamadı.
        </p>
      </article>

      <article class="card">
        <header class="card-header">
          <div>
            <p class="eyebrow">Planla</p>
            <h2>Yeni oturum oluştur</h2>
          </div>
        </header>
        <form class="form-grid" @submit.prevent="createSchedule">
          <label>
            Ders
            <select v-model="scheduleForm.lectureId" required>
              <option disabled value="">Ders seç</option>
              <option v-for="lecture in lectureOptions" :key="lecture.id" :value="lecture.id">
                {{ lecture.name }}
              </option>
            </select>
          </label>
          <label>
            Sınıf
            <select v-model="scheduleForm.classroomId" required>
              <option disabled value="">Sınıf seç</option>
              <option v-for="room in classroomOptions" :key="room.id" :value="room.id">
                {{ room.name }} ({{ room.capacity }})
              </option>
            </select>
          </label>
          <label>
            Slot
            <select v-model="scheduleForm.scheduleSlotId" required>
              <option disabled value="">Slot seç</option>
              <option v-for="slot in slotOptions" :key="slot.id" :value="slot.id">
                {{ slot.dayOfWeek }} - {{ slot.startTime }} / {{ slot.endTime }}
              </option>
            </select>
          </label>
          <label>
            Başlangıç
            <input v-model="scheduleForm.startDate" type="date" />
          </label>
          <label>
            Bitiş
            <input v-model="scheduleForm.endDate" type="date" />
          </label>
          <div class="full-span">
            <button type="submit" :disabled="formLoading">
              {{ formLoading ? 'Planlanıyor...' : 'Oturumu Planla' }}
            </button>
            <p v-if="formError" class="error">{{ formError }}</p>
          </div>
        </form>
      </article>
    </div>
  </section>

  <section v-else class="layout-grid">
    <header class="section-headline">
      <div>
        <p class="eyebrow">Programım</p>
        <h1>Derslerimin takvimi</h1>
        <p>Kayıtlı olduğun dersler ve onlara ait oturumlar burada listelenir.</p>
      </div>
      <button class="ghost" @click="fetchMySchedules" :disabled="myLoading">
        {{ myLoading ? 'Yenileniyor...' : 'Yenile' }}
      </button>
    </header>

    <article class="card">
      <p v-if="myLoading" class="status">Programın yükleniyor...</p>
      <p v-if="myError" class="error">{{ myError }}</p>
      <ul v-if="!myLoading && !myError && sortedMySchedules.length" class="resource-list">
        <li v-for="session in sortedMySchedules" :key="session.id">
          <div>
            <strong>{{ session.lectureName }}</strong>
            <p class="date-range">
              {{ formatDay(session.dayOfWeek) }} · {{ formatTimeRange(session.startTime, session.endTime) }}
            </p>
            <small>{{ formatDateRange(session.startDate, session.endDate) }}</small>
          </div>
          <span class="pill">{{ session.classroomName }}</span>
        </li>
      </ul>
      <p v-if="!myLoading && !myError && !sortedMySchedules.length" class="status">
        Kayıtlı olduğun dersler için planlanmış bir oturum bulunamadı.
      </p>
    </article>
  </section>
</template>
