<script setup>
import { computed, reactive, watch } from 'vue';
import httpClient from '../api/httpClient';
import { useAuthStore } from '../stores/auth';

const authStore = useAuthStore();

const statusLabels = {
  PENDING_APPROVAL: 'Onay bekliyor',
  WAITING: 'Bekleme listesi',
  ACTIVE: 'Aktif',
  COMPLETED: 'Tamamlandı',
  DROPPED: 'Kayıt iptal',
};

const dayLabels = {
  MONDAY: 'Pazartesi',
  TUESDAY: 'Salı',
  WEDNESDAY: 'Çarşamba',
  THURSDAY: 'Perşembe',
  FRIDAY: 'Cuma',
  SATURDAY: 'Cumartesi',
  SUNDAY: 'Pazar',
};

const roleView = computed(() => {
  if (authStore.hasRole('ADMIN')) return 'ADMIN';
  if (authStore.hasRole('TEACHER')) return 'TEACHER';
  return 'STUDENT';
});

const profileId = computed(() => authStore.profile?.id || null);

const initialized = reactive({
  ADMIN: false,
  TEACHER: false,
  STUDENT: false,
});

const adminState = reactive({
  loading: false,
  errors: [],
  analyticsSummary: null,
  teacherWorkload: [],
  enrollmentFunnel: {},
  lists: {
    lectures: [],
    schedules: [],
    enrollments: [],
    classrooms: [],
    gradeComponents: [],
  },
  totals: {
    lectures: 0,
    schedules: 0,
    enrollments: 0,
    classrooms: 0,
    gradeComponents: 0,
  },
});

const teacherState = reactive({
  loading: false,
  error: '',
  lectures: [],
  enrollmentsByLecture: {},
});

const studentState = reactive({
  loading: false,
  error: '',
  enrollments: [],
  catalog: [],
  schedules: [],
});

const normalizeTime = (value) => (value ? value.slice(0, 5) : '--:--');
const formatTimeRange = (start, end) => `${normalizeTime(start)} · ${normalizeTime(end)}`;
const formatDay = (day) => dayLabels[day] || day;
const statusLabel = (status) => statusLabels[status] || status;
const formatDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }
  return date.toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' });
};
const scheduleDateValue = (schedule) => {
  if (schedule.startDate) {
    return new Date(`${schedule.startDate}T${schedule.startTime || '00:00'}`).getTime();
  }
  return Date.now();
};

const loadAdminCollections = async () => {
  const jobs = [
    { key: 'lectures', request: () => httpClient.get('/api/lectures', { params: { page: 0, pageSize: 6 } }) },
    { key: 'schedules', request: () => httpClient.get('/api/lecture-schedules', { params: { page: 0, pageSize: 6 } }) },
    { key: 'enrollments', request: () => httpClient.get('/api/enrollments', { params: { page: 0, pageSize: 6 } }) },
    { key: 'classrooms', request: () => httpClient.get('/api/classrooms', { params: { page: 0, pageSize: 6 } }) },
    { key: 'gradeComponents', request: () => httpClient.get('/api/grade-components', { params: { page: 0, pageSize: 6 } }) },
  ];

  const results = await Promise.allSettled(jobs.map((job) => job.request()));
  results.forEach((result, index) => {
    const key = jobs[index].key;
    if (result.status === 'fulfilled') {
      const { data } = result.value;
      const content = data.content ?? data ?? [];
      adminState.lists[key] = content;
      adminState.totals[key] = data.totalElements ?? content.length ?? 0;
    } else {
      adminState.errors.push(`${key} yüklenemedi: ${result.reason?.message || 'Bilinmeyen hata'}`);
      adminState.lists[key] = [];
      adminState.totals[key] = 0;
    }
  });
};

const loadAdminAnalytics = async () => {
  try {
    const { data } = await httpClient.get('/api/analytics/summary');
    adminState.analyticsSummary = data;
  } catch (err) {
    adminState.analyticsSummary = null;
    adminState.errors.push(err.response?.data?.message || 'analytics/summary yüklenemedi');
  }

  try {
    const { data } = await httpClient.get('/api/analytics/teacher-workload');
    adminState.teacherWorkload = data;
  } catch (err) {
    adminState.teacherWorkload = [];
    adminState.errors.push(err.response?.data?.message || 'Öğretmen iş yükü alınamadı');
  }

  try {
    const { data } = await httpClient.get('/api/analytics/enrollment-funnel');
    adminState.enrollmentFunnel = data.statusCounts || {};
  } catch (err) {
    adminState.enrollmentFunnel = {};
    adminState.errors.push(err.response?.data?.message || 'Kayıt hunisi hesaplanamadı');
  }
};

const loadAdminDashboard = async () => {
  adminState.loading = true;
  adminState.errors = [];
  await loadAdminCollections();
  await loadAdminAnalytics();
  adminState.loading = false;
};

const fetchTeacherData = async () => {
  if (!profileId.value) return;
  teacherState.loading = true;
  teacherState.error = '';
  teacherState.enrollmentsByLecture = {};
  try {
    const { data } = await httpClient.get('/api/lectures', { params: { page: 0, pageSize: 100 } });
    teacherState.lectures = (data.content || []).filter((lecture) => lecture.teacherId === profileId.value);

    if (!teacherState.lectures.length) {
      teacherState.enrollmentsByLecture = {};
      return;
    }

    const responses = await Promise.allSettled(
      teacherState.lectures.map((lecture) => httpClient.get(`/api/enrollments/lecture/${lecture.id}`))
    );
    const map = {};
    responses.forEach((result, index) => {
      const lectureId = teacherState.lectures[index].id;
      if (result.status === 'fulfilled') {
        map[lectureId] = result.value.data || [];
      } else {
        map[lectureId] = [];
        if (!teacherState.error) {
          teacherState.error = result.reason?.response?.data?.message || 'Ders kayıtları yüklenemedi';
        }
      }
    });
    teacherState.enrollmentsByLecture = map;
  } catch (err) {
    teacherState.error = err.response?.data?.message || 'Öğretmen verileri getirilemedi';
  } finally {
    teacherState.loading = false;
  }
};

const fetchStudentData = async () => {
  if (!profileId.value) return;
  studentState.loading = true;
  studentState.error = '';
  try {
    const [enrollmentRes, lecturesRes] = await Promise.all([
      httpClient.get(`/api/enrollments/student/${profileId.value}`),
      httpClient.get('/api/lectures', { params: { page: 0, pageSize: 100 } }),
    ]);
    studentState.enrollments = enrollmentRes.data || [];
    studentState.catalog = lecturesRes.data.content || [];

    if (studentState.enrollments.length) {
      const schedulesRes = await httpClient.get('/api/lecture-schedules', {
        params: { page: 0, pageSize: 100 },
      });
      const lectureIds = new Set(studentState.enrollments.map((enrollment) => enrollment.lectureId));
      studentState.schedules = (schedulesRes.data.content || []).filter((schedule) =>
        lectureIds.has(schedule.lectureId)
      );
    } else {
      studentState.schedules = [];
    }
  } catch (err) {
    studentState.error = err.response?.data?.message || 'Öğrenci verileri yüklenemedi';
  } finally {
    studentState.loading = false;
  }
};

watch(
  roleView,
  (role) => {
    if (role === 'ADMIN' && !initialized.ADMIN) {
      initialized.ADMIN = true;
      loadAdminDashboard();
    }
  },
  { immediate: true }
);

watch(
  () => ({ role: roleView.value, id: profileId.value }),
  ({ role, id }) => {
    if (role === 'TEACHER' && id && !initialized.TEACHER) {
      initialized.TEACHER = true;
      fetchTeacherData();
    }
    if (role === 'STUDENT' && id && !initialized.STUDENT) {
      initialized.STUDENT = true;
      fetchStudentData();
    }
  },
  { immediate: true }
);

const adminSummaryMetrics = computed(() => {
  const summary = adminState.analyticsSummary;
  if (!summary) return [];
  return [
    { label: 'Toplam Ders', value: summary.totalLectures, helper: 'Sistemde tanımlı ders sayısı' },
    { label: 'Aktif Kayıt', value: summary.activeEnrollments, helper: 'Devam eden öğrenciler' },
    { label: 'Bekleyen', value: summary.waitlistedEnrollments, helper: 'Waitlist boyutu' },
    { label: 'Kullanılan Sınıf', value: summary.classroomsInUse, helper: 'Programda aktif sınıflar' },
    { label: 'Yaklaşan Oturum', value: summary.upcomingSessions, helper: 'Takvimde sıradaki seans' },
  ];
});

const adminMetrics = computed(() => [
  { label: 'Aktif Ders', value: adminState.totals.lectures, helper: `${adminState.lists.lectures.length} kayıt görüntüleniyor` },
  { label: 'Planlı Oturum', value: adminState.totals.schedules, helper: `${adminState.lists.schedules.length} kayıt` },
  { label: 'Öğrenci Kaydı', value: adminState.totals.enrollments, helper: `${adminState.lists.enrollments.length} son işlem` },
  { label: 'Sınıf Sayısı', value: adminState.totals.classrooms, helper: `${adminState.lists.classrooms.length} kayıt` },
  { label: 'Not Bileşeni', value: adminState.totals.gradeComponents, helper: `${adminState.lists.gradeComponents.length} kayıt` },
]);

const adminRecentSchedules = computed(() => adminState.lists.schedules.slice(0, 4));
const adminRecentLectures = computed(() => adminState.lists.lectures.slice(0, 5));
const adminRecentEnrollments = computed(() => adminState.lists.enrollments.slice(0, 5));
const adminTeacherWorkload = computed(() => adminState.teacherWorkload.slice(0, 5));
const adminEnrollmentFunnelList = computed(() => {
  const preferredOrder = ['PENDING_APPROVAL', 'ACTIVE', 'WAITING', 'COMPLETED', 'DROPPED'];
  const source = adminState.enrollmentFunnel || {};
  return preferredOrder.map((status) => ({ status, total: source[status] || 0 }));
});

const teacherEnrollmentsFlat = computed(() =>
  Object.values(teacherState.enrollmentsByLecture)
    .flat()
    .sort((a, b) => new Date(b.enrolledAt) - new Date(a.enrolledAt))
);

const teacherHeadlineStats = computed(() => {
  const enrollments = teacherEnrollmentsFlat.value;
  const active = enrollments.filter((item) => item.status === 'ACTIVE').length;
  const waiting = enrollments.filter((item) => item.status === 'WAITING').length;
  const completed = enrollments.filter((item) => item.status === 'COMPLETED').length;
  return [
    { label: 'Ders Sayım', value: teacherState.lectures.length, helper: 'Atandığınız toplam ders' },
    { label: 'Aktif Öğrenci', value: active, helper: 'Şu anda derse devam eden' },
    { label: 'Bekleme', value: waiting, helper: 'Kontenjan bekleyen öğrenciler' },
    { label: 'Tamamlanan', value: completed, helper: 'Notlandırması biten kayıtlar' },
  ];
});

const teacherLectureCards = computed(() =>
  teacherState.lectures.map((lecture) => {
    const enrollments = teacherState.enrollmentsByLecture[lecture.id] || [];
    const active = enrollments.filter((item) => item.status === 'ACTIVE').length;
    const waiting = enrollments.filter((item) => item.status === 'WAITING').length;
    return {
      id: lecture.id,
      name: lecture.name,
      capacity: lecture.capacity,
      active,
      waiting,
      available: Math.max(lecture.capacity - active, 0),
    };
  })
);

const studentStatusCounts = computed(() => {
  const base = { ACTIVE: 0, PENDING_APPROVAL: 0, WAITING: 0, COMPLETED: 0 };
  studentState.enrollments.forEach((enrollment) => {
    base[enrollment.status] = (base[enrollment.status] || 0) + 1;
  });
  return base;
});

const studentMetricCards = computed(() => [
  { key: 'ACTIVE', label: 'Aktif Ders', helper: 'Devam eden kayıtlar' },
  { key: 'PENDING_APPROVAL', label: 'Onay Bekleyen', helper: 'Öğrenci işleri sürecinde' },
  { key: 'WAITING', label: 'Bekleme Listesi', helper: 'Kontenjan açılması bekleniyor' },
  { key: 'COMPLETED', label: 'Tamamlanan', helper: 'Final notu kesinleşti' },
].map((item) => ({ ...item, value: studentStatusCounts.value[item.key] || 0 })));

const catalogMap = computed(() => {
  const map = new Map();
  studentState.catalog.forEach((lecture) => map.set(lecture.id, lecture));
  return map;
});

const studentEnrollmentsDetailed = computed(() =>
  studentState.enrollments.map((enrollment) => ({
    ...enrollment,
    lecture: catalogMap.value.get(enrollment.lectureId),
  }))
);

const studentUpcomingSessions = computed(() =>
  [...studentState.schedules]
    .sort((a, b) => scheduleDateValue(a) - scheduleDateValue(b))
    .slice(0, 4)
);

const studentAvailableLectures = computed(() => {
  const enrolled = new Set(studentState.enrollments.map((enrollment) => enrollment.lectureId));
  return studentState.catalog.filter((lecture) => !enrolled.has(lecture.id)).slice(0, 4);
});

const refreshAdmin = () => loadAdminDashboard();
const refreshTeacher = () => fetchTeacherData();
const refreshStudent = () => fetchStudentData();
</script>

<template>
  <section v-if="roleView === 'ADMIN'" class="layout-grid">
    <header class="section-headline">
      <div>
        <p class="eyebrow">Yönetim görünümü</p>
        <h1>Trendyol Lecture Portal Paneli</h1>
        <p>Spring tabanlı API'den gelen gerçek zamanlı kurumsal metrikler.</p>
      </div>
      <button class="ghost" @click="refreshAdmin" :disabled="adminState.loading">
        {{ adminState.loading ? 'Yenileniyor...' : 'Verileri Yenile' }}
      </button>
    </header>

    <div v-if="adminState.errors.length" class="card error-card">
      <p v-for="message in adminState.errors" :key="message" class="error">
        {{ message }}
      </p>
    </div>

    <div v-if="adminSummaryMetrics.length" class="metric-grid">
      <article v-for="metric in adminSummaryMetrics" :key="metric.label" class="card metric">
        <p class="eyebrow">{{ metric.label }}</p>
        <h2>{{ metric.value }}</h2>
        <p>{{ metric.helper }}</p>
      </article>
    </div>

    <div class="metric-grid">
      <article v-for="metric in adminMetrics" :key="metric.label" class="card metric">
        <p class="eyebrow">{{ metric.label }}</p>
        <h2>{{ metric.value }}</h2>
        <p>{{ metric.helper }}</p>
      </article>
    </div>

    <div class="grid-2">
      <article class="card">
        <header class="card-header">
          <div>
            <p class="eyebrow">Program</p>
            <h2>Yaklaşan oturumlar</h2>
          </div>
        </header>
        <ul class="resource-list">
          <li v-for="schedule in adminRecentSchedules" :key="schedule.id">
            <div>
              <strong>{{ schedule.lectureName }}</strong>
              <p class="date-range">
                {{ formatDay(schedule.dayOfWeek) }} · {{ formatTimeRange(schedule.startTime, schedule.endTime) }}
              </p>
            </div>
            <span class="pill secondary">{{ schedule.classroomName }}</span>
          </li>
          <li v-if="!adminRecentSchedules.length">Henüz programlanmış oturum yok.</li>
        </ul>
      </article>

      <article class="card">
        <header class="card-header">
          <div>
            <p class="eyebrow">Son dersler</p>
            <h2>Yeni oluşturulan dersler</h2>
          </div>
        </header>
        <ul class="resource-list">
          <li v-for="lecture in adminRecentLectures" :key="lecture.id">
            <div>
              <strong>{{ lecture.name }}</strong>
              <p class="date-range">Kapasite: {{ lecture.capacity }}</p>
            </div>
            <span class="pill">#{{ lecture.id }}</span>
          </li>
          <li v-if="!adminRecentLectures.length">Bekleyen ders kaydı bulunmuyor.</li>
        </ul>
      </article>
    </div>

    <div class="grid-2">
      <article class="card">
        <header class="card-header">
          <div>
            <p class="eyebrow">Öğretmen iş yükü</p>
            <h2>En yoğun 5 öğretmen</h2>
          </div>
        </header>
        <ul class="resource-list">
          <li v-for="teacher in adminTeacherWorkload" :key="teacher.teacherId">
            <div>
              <strong>{{ teacher.teacherName }}</strong>
              <p class="date-range">{{ teacher.totalLectures }} ders · {{ teacher.activeEnrollments }} aktif öğrenci</p>
            </div>
            <span class="pill">{{ teacher.pendingApprovals }} bekleyen onay</span>
          </li>
          <li v-if="!adminTeacherWorkload.length">Öğretmen kayıtları görüntülenemedi.</li>
        </ul>
      </article>

      <article class="card">
        <header class="card-header">
          <div>
            <p class="eyebrow">Kayıt hunisi</p>
            <h2>Duruma göre dağılım</h2>
          </div>
        </header>
        <ul class="resource-list">
          <li v-for="stage in adminEnrollmentFunnelList" :key="stage.status">
            <div>
              <strong>{{ statusLabel(stage.status) }}</strong>
            </div>
            <span class="pill secondary">{{ stage.total }}</span>
          </li>
        </ul>
      </article>
    </div>

    <article class="card">
      <header class="card-header">
        <div>
          <p class="eyebrow">Son işlemler</p>
          <h2>Öğrenci kayıt geçmişi</h2>
        </div>
      </header>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Durum</th>
            <th>Not</th>
            <th>Oluşturulma</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="enrollment in adminRecentEnrollments" :key="enrollment.id">
            <td>#{{ enrollment.id }}</td>
            <td><span class="pill secondary">{{ statusLabel(enrollment.status) }}</span></td>
            <td>{{ enrollment.grade ?? '-' }}</td>
            <td>{{ formatDateTime(enrollment.enrolledAt) }}</td>
          </tr>
          <tr v-if="!adminRecentEnrollments.length">
            <td colspan="4">Kayıt geçmişi bulunamadı.</td>
          </tr>
        </tbody>
      </table>
    </article>
  </section>

  <section v-else-if="roleView === 'TEACHER'" class="layout-grid">
    <header class="section-headline">
      <div>
        <p class="eyebrow">Öğretmen görünümü</p>
        <h1>Derslerim ve öğrencilerim</h1>
        <p>Atandığınız derslerdeki öğrenci akışı ve kritik aksiyonlar.</p>
      </div>
      <button class="ghost" @click="refreshTeacher" :disabled="teacherState.loading">
        {{ teacherState.loading ? 'Yükleniyor...' : 'Verileri Yenile' }}
      </button>
    </header>

    <div v-if="teacherState.error" class="card error-card">
      <p class="error">{{ teacherState.error }}</p>
    </div>

    <div v-else-if="!profileId" class="card">
      <p>Profil bilgisi yükleniyor...</p>
    </div>

    <div class="metric-grid">
      <article v-for="metric in teacherHeadlineStats" :key="metric.label" class="card metric">
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
            <h2>Atandığım dersler</h2>
          </div>
        </header>
        <ul class="resource-list">
          <li v-for="lecture in teacherLectureCards" :key="lecture.id">
            <div>
              <strong>{{ lecture.name }}</strong>
              <p class="date-range">Kontenjan {{ lecture.capacity }} · Boş {{ lecture.available }}</p>
            </div>
            <div class="pill-group">
              <span class="pill success">{{ lecture.active }} aktif</span>
              <span v-if="lecture.waiting" class="pill secondary">+{{ lecture.waiting }} bekleme</span>
            </div>
          </li>
          <li v-if="!teacherLectureCards.length">Henüz size atanmış ders bulunmuyor.</li>
        </ul>
      </article>

      <article class="card">
        <header class="card-header">
          <div>
            <p class="eyebrow">Öğrenci hareketleri</p>
            <h2>En son işlemler</h2>
          </div>
        </header>
        <table>
          <thead>
            <tr>
              <th>Kayıt</th>
              <th>Durum</th>
              <th>Tarih</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in teacherEnrollmentsFlat.slice(0, 6)" :key="item.id">
              <td>#{{ item.id }}</td>
              <td><span class="pill secondary">{{ statusLabel(item.status) }}</span></td>
              <td>{{ formatDateTime(item.enrolledAt) }}</td>
            </tr>
            <tr v-if="!teacherEnrollmentsFlat.length">
              <td colspan="3">Kayıt hareketi bulunamadı.</td>
            </tr>
          </tbody>
        </table>
      </article>
    </div>

    <article class="card">
      <header class="card-header">
        <div>
          <p class="eyebrow">Hızlı bağlantılar</p>
          <h2>Sık kullanılan ekranlar</h2>
        </div>
      </header>
      <div class="action-buttons">
        <router-link class="ghost" to="/lectures">Dersleri Yönet</router-link>
        <router-link class="ghost" to="/schedules">Programı Gör</router-link>
        <router-link class="ghost" to="/grade-components">Not Bileşenleri</router-link>
        <router-link class="ghost" to="/enrollments">Kayıt Listesi</router-link>
      </div>
    </article>
  </section>

  <section v-else class="layout-grid">
    <header class="section-headline">
      <div>
        <p class="eyebrow">Öğrenci görünümü</p>
        <h1>Derslerim</h1>
        <p>Aktif kayıtların, yaklaşan oturumların ve uygun derslerin tek ekranda.</p>
      </div>
      <button class="ghost" @click="refreshStudent" :disabled="studentState.loading">
        {{ studentState.loading ? 'Yükleniyor...' : 'Verileri Yenile' }}
      </button>
    </header>

    <div v-if="studentState.error" class="card error-card">
      <p class="error">{{ studentState.error }}</p>
    </div>

    <div v-else-if="!profileId" class="card">
      <p>Profil bilgisi yükleniyor...</p>
    </div>

    <div class="metric-grid">
      <article v-for="metric in studentMetricCards" :key="metric.label" class="card metric">
        <p class="eyebrow">{{ metric.label }}</p>
        <h2>{{ metric.value }}</h2>
        <p>{{ metric.helper }}</p>
      </article>
    </div>

    <div class="grid-2">
      <article class="card">
        <header class="card-header">
          <div>
            <p class="eyebrow">Kayıtlarım</p>
            <h2>Aktif dersler</h2>
          </div>
        </header>
        <table>
          <thead>
            <tr>
              <th>Ders</th>
              <th>Durum</th>
              <th>Not</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="enrollment in studentEnrollmentsDetailed" :key="enrollment.id">
              <td>{{ enrollment.lecture?.name || 'Bilinmeyen ders' }}</td>
              <td><span class="pill secondary">{{ statusLabel(enrollment.status) }}</span></td>
              <td>{{ enrollment.grade ?? '-' }}</td>
            </tr>
            <tr v-if="!studentEnrollmentsDetailed.length">
              <td colspan="3">Herhangi bir derse kayıtlı değilsiniz.</td>
            </tr>
          </tbody>
        </table>
      </article>

      <article class="card">
        <header class="card-header">
          <div>
            <p class="eyebrow">Ajanda</p>
            <h2>Yaklaşan oturumlar</h2>
          </div>
        </header>
        <ul class="resource-list">
          <li v-for="session in studentUpcomingSessions" :key="session.id">
            <div>
              <strong>{{ session.lectureName }}</strong>
              <p class="date-range">
                {{ formatDay(session.dayOfWeek) }} · {{ formatTimeRange(session.startTime, session.endTime) }}
              </p>
            </div>
            <span class="pill">{{ session.classroomName }}</span>
          </li>
          <li v-if="!studentUpcomingSessions.length">Planlanmış oturum bulunmuyor.</li>
        </ul>
      </article>
    </div>

    <article class="card">
      <header class="card-header">
        <div>
          <p class="eyebrow">Önerilen dersler</p>
          <h2>Kontenjanı uygun seçenekler</h2>
        </div>
        <router-link class="ghost" to="/lectures">Tüm dersleri gör</router-link>
      </header>
      <div class="suggest-grid">
        <div v-for="lecture in studentAvailableLectures" :key="lecture.id" class="suggest-card">
          <strong>{{ lecture.name }}</strong>
          <p>{{ lecture.description || 'Açıklama bulunmuyor' }}</p>
          <small>Kontenjan: {{ lecture.capacity }}</small>
        </div>
        <p v-if="!studentAvailableLectures.length">
          Tüm derslerde kayıtlısınız veya uygun ders bulunamadı.
        </p>
      </div>
    </article>
  </section>
</template>
