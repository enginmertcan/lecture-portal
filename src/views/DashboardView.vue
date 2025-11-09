<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import httpClient from '../api/httpClient';

const loading = ref(false);
const errors = ref([]);
const analyticsSummary = ref(null);
const teacherWorkload = ref([]);
const enrollmentFunnel = ref({});

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

const fetchAnalytics = async () => {
  try {
    const { data } = await httpClient.get('/api/analytics/summary');
    analyticsSummary.value = data;
  } catch (err) {
    errors.value.push(`analytics/summary: ${err.message || 'yüklenemedi'}`);
  }

  try {
    const { data } = await httpClient.get('/api/analytics/teacher-workload');
    teacherWorkload.value = data;
  } catch (err) {
    errors.value.push(`teacher workload: ${err.message || 'yüklenemedi'}`);
  }

  try {
    const { data } = await httpClient.get('/api/analytics/enrollment-funnel');
    enrollmentFunnel.value = data.statusCounts || {};
  } catch (err) {
    errors.value.push(`enrollment funnel: ${err.message || 'yüklenemedi'}`);
  }
};

const summaryMetrics = computed(() => {
  if (!analyticsSummary.value) {
    return [];
  }
  const summary = analyticsSummary.value;
  return [
    {
      label: 'Toplam Ders',
      value: summary.totalLectures,
      helper: 'Sistemde tanımlı ders sayısı',
    },
    {
      label: 'Aktif Kayıt',
      value: summary.activeEnrollments,
      helper: 'Şu anda derse devam eden öğrenciler',
    },
    {
      label: 'Bekleme Listesi',
      value: summary.waitlistedEnrollments,
      helper: 'Seat bekleyen öğrenciler',
    },
    {
      label: 'Kullanılan Sınıf',
      value: summary.classroomsInUse,
      helper: 'Programda aktif sınıf sayısı',
    },
    {
      label: 'Yaklaşan Oturum',
      value: summary.upcomingSessions,
      helper: 'Bugünden sonra planlı oturumlar',
    },
  ];
});

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
const topTeacherWorkload = computed(() => teacherWorkload.value.slice(0, 5));
const enrollmentFunnelList = computed(() => {
  const preferredOrder = ['PENDING_APPROVAL', 'ACTIVE', 'WAITING', 'COMPLETED', 'DROPPED'];
  const source = enrollmentFunnel.value || {};
  return preferredOrder.map((status) => ({
    status,
    total: source[status] || 0,
  }));
});

onMounted(() => {
  fetchDashboard();
  fetchAnalytics();
});
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

    <div v-if="summaryMetrics.length" class="metric-grid">
      <article v-for="metric in summaryMetrics" :key="metric.label" class="card metric">
        <p class="eyebrow">{{ metric.label }}</p>
        <h2>{{ metric.value }}</h2>
        <p>{{ metric.helper }}</p>
      </article>
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
            <p class="eyebrow">Öğretmen Yükü</p>
            <h2>Haftalık ders saatleri</h2>
          </div>
        </header>
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Öğretmen</th>
                <th>Ders Sayısı</th>
                <th>Haftalık Saat</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="teacher in topTeacherWorkload" :key="teacher.teacherId">
                <td>{{ teacher.teacherName }}</td>
                <td>{{ teacher.lectureCount }}</td>
                <td>{{ teacher.weeklyHours.toFixed(1) }}</td>
              </tr>
              <tr v-if="!topTeacherWorkload.length">
                <td colspan="3">Öğretmen verisi bulunamadı.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>

      <article class="card">
        <header class="card-header">
          <div>
            <p class="eyebrow">Kayıt Hunisi</p>
            <h2>Durum bazlı öğrenci sayıları</h2>
          </div>
        </header>
        <ul class="resource-list">
          <li v-for="item in enrollmentFunnelList" :key="item.status">
            <div>
              <strong>{{ item.status }}</strong>
              <p>Kayıt sayısı</p>
            </div>
            <span class="pill">{{ item.total }}</span>
          </li>
        </ul>
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
            <span class="pill">{{ lecture.teacherName || `#${lecture.teacherId}` }}</span>
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
