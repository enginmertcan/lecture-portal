<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import httpClient from '../api/httpClient';

const loading = ref(false);
const errors = ref([]);

const state = reactive({
  lectures: [],
  schedules: [],
  enrollments: [],
  classrooms: [],
  gradeComponents: [],
  totals: {
    lectures: 0,
    schedules: 0,
    enrollments: 0,
    classrooms: 0,
    gradeComponents: 0,
  },
});

const fetchDashboard = async () => {
  loading.value = true;
  errors.value = [];

  const jobs = [
    {
      key: 'lectures',
      request: () => httpClient.get('/api/lectures', { params: { page: 0, pageSize: 6 } }),
    },
    {
      key: 'schedules',
      request: () => httpClient.get('/api/lecture-schedules', { params: { page: 0, pageSize: 6 } }),
    },
    {
      key: 'enrollments',
      request: () => httpClient.get('/api/enrollments', { params: { page: 0, pageSize: 6 } }),
    },
    {
      key: 'classrooms',
      request: () => httpClient.get('/api/classrooms', { params: { page: 0, pageSize: 6 } }),
    },
    {
      key: 'gradeComponents',
      request: () => httpClient.get('/api/grade-components', { params: { page: 0, pageSize: 6 } }),
    },
  ];

  const results = await Promise.allSettled(jobs.map((job) => job.request()));

  results.forEach((result, index) => {
    const key = jobs[index].key;
    if (result.status === 'fulfilled') {
      const { data } = result.value;
      state[key] = data.content ?? data;
      state.totals[key] = data.totalElements ?? data.length ?? state[key].length ?? 0;
    } else {
      errors.value.push(`${key} yüklenemedi: ${result.reason?.message || 'Bilinmeyen hata'}`);
    }
  });

  loading.value = false;
};

const metrics = computed(() => [
  {
    label: 'Aktif Ders',
    value: state.totals.lectures,
    helper: `${state.lectures.length} ders listelendi`,
  },
  {
    label: 'Planlı Oturum',
    value: state.totals.schedules,
    helper: `${state.schedules.length} kayıt yüklendi`,
  },
  {
    label: 'Öğrenci Kaydı',
    value: state.totals.enrollments,
    helper: `${state.enrollments.length} son işlem`,
  },
  {
    label: 'Sınıf Sayısı',
    value: state.totals.classrooms,
    helper: `${state.classrooms.length} kayıt yüklendi`,
  },
  {
    label: 'Not Bileşeni',
    value: state.totals.gradeComponents,
    helper: `${state.gradeComponents.length} bileşen gözüküyor`,
  },
]);

const recentSchedules = computed(() => state.schedules.slice(0, 4));
const recentLectures = computed(() => state.lectures.slice(0, 5));
const recentEnrollments = computed(() => state.enrollments.slice(0, 5));

onMounted(fetchDashboard);
</script>

<template>
  <section class="layout-grid">
    <header class="section-headline">
      <div>
        <p class="eyebrow">Durum</p>
        <h1>Trendyol Lecture Portal Paneli</h1>
        <p>Spring tabanlı API’nin kritik uçlarından gelen gerçek zamanlı veriler.</p>
      </div>
      <button class="ghost" @click="fetchDashboard" :disabled="loading">
        {{ loading ? 'Yenileniyor...' : 'Verileri Yenile' }}
      </button>
    </header>

    <div v-if="errors.length" class="card error-card">
      <p v-for="message in errors" :key="message" class="error">
        {{ message }}
      </p>
    </div>

    <div class="metric-grid">
      <article v-for="metric in metrics" :key="metric.label" class="card metric">
        <p class="eyebrow">{{ metric.label }}</p>
        <h2>{{ metric.value }}</h2>
        <p>{{ metric.helper }}</p>
      </article>
    </div>

    <div class="grid-2">
      <article class="card">
        <header class="card-header">
          <div>
            <p class="eyebrow">Dersler</p>
            <h2>Son oluşturulan dersler</h2>
          </div>
          <RouterLink to="/lectures" class="ghost small">Tümünü Gör</RouterLink>
        </header>
        <ul class="resource-list">
          <li v-for="lecture in recentLectures" :key="lecture.id">
            <div>
              <strong>{{ lecture.name }}</strong>
              <p>{{ lecture.description }}</p>
            </div>
            <span class="pill">Teacher #{{ lecture.teacherId }}</span>
          </li>
          <li v-if="!recentLectures.length">
            <p>Gösterilecek ders yok.</p>
          </li>
        </ul>
      </article>

      <article class="card">
        <header class="card-header">
          <div>
            <p class="eyebrow">Program</p>
            <h2>Yaklaşan oturumlar</h2>
          </div>
          <RouterLink to="/schedules" class="ghost small">Planı Aç</RouterLink>
        </header>
        <ul class="resource-list">
          <li v-for="slot in recentSchedules" :key="slot.id">
            <div>
              <strong>{{ slot.lectureName }}</strong>
              <p>{{ slot.dayOfWeek }} • {{ slot.startTime }} - {{ slot.endTime }}</p>
            </div>
            <span class="pill">{{ slot.classroomName }}</span>
          </li>
          <li v-if="!recentSchedules.length">
            <p>Planlı oturum yok.</p>
          </li>
        </ul>
      </article>
    </div>

    <article class="card">
      <header class="card-header">
        <div>
          <p class="eyebrow">Kayıt Akışı</p>
          <h2>Son öğrenci hareketleri</h2>
        </div>
        <RouterLink to="/enrollments" class="ghost small">Kayıtları Yönet</RouterLink>
      </header>
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Ders</th>
              <th>Öğrenci</th>
              <th>Durum</th>
              <th>Not</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="enrollment in recentEnrollments" :key="enrollment.id">
              <td>#{{ enrollment.id }}</td>
              <td>{{ enrollment.lectureId }}</td>
              <td>{{ enrollment.studentId }}</td>
              <td><span class="pill secondary">{{ enrollment.status }}</span></td>
              <td>{{ enrollment.grade ?? '—' }}</td>
            </tr>
            <tr v-if="!recentEnrollments.length">
              <td colspan="5">Henüz kayıt yok.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </article>
  </section>
</template>
