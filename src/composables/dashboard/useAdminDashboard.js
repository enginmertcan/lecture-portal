import { computed, reactive, ref } from 'vue';
import httpClient from '../../api/httpClient';

const ALERT_OPTIONS = [
  { label: 'Tüm uyarılar', value: 'ALL' },
  { label: 'Kontenjan', value: 'CAPACITY' },
  { label: 'Bekleme', value: 'WAITLIST' },
  { label: 'Onay Bekleyen', value: 'PENDING' },
];

const UPCOMING_OPTIONS = [
  { label: '7 gün', value: 7 },
  { label: '14 gün', value: 14 },
  { label: '30 gün', value: 30 },
];

export function useAdminDashboard() {
  const state = reactive({
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

  const alertFilter = ref('ALL');
  const upcomingRange = ref(7);

  const loadCollections = async () => {
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
        state.lists[key] = content;
        state.totals[key] = data.totalElements ?? content.length ?? 0;
      } else {
        state.errors.push(`${key} yüklenemedi: ${result.reason?.message || 'Bilinmeyen hata'}`);
        state.lists[key] = [];
        state.totals[key] = 0;
      }
    });
  };

  const loadAnalytics = async () => {
    try {
      const { data } = await httpClient.get('/api/analytics/summary');
      state.analyticsSummary = data;
    } catch (err) {
      state.analyticsSummary = null;
      state.errors.push(err.response?.data?.message || 'analytics/summary yüklenemedi');
    }

    try {
      const { data } = await httpClient.get('/api/analytics/teacher-workload');
      state.teacherWorkload = data;
    } catch (err) {
      state.teacherWorkload = [];
      state.errors.push(err.response?.data?.message || 'Öğretmen iş yükü alınamadı');
    }

    try {
      const { data } = await httpClient.get('/api/analytics/enrollment-funnel');
      state.enrollmentFunnel = data.statusCounts || {};
    } catch (err) {
      state.enrollmentFunnel = {};
      state.errors.push(err.response?.data?.message || 'Kayıt hunisi hesaplanamadı');
    }
  };

  const refresh = async () => {
    state.loading = true;
    state.errors = [];
    await loadCollections();
    await loadAnalytics();
    state.loading = false;
  };

  const summaryMetrics = computed(() => {
    const summary = state.analyticsSummary;
    if (!summary) return [];
    return [
      { label: 'Toplam Ders', value: summary.totalLectures, helper: 'Sistemde tanımlı ders sayısı' },
      { label: 'Aktif Kayıt', value: summary.activeEnrollments, helper: 'Devam eden öğrenciler' },
      { label: 'Bekleyen', value: summary.waitlistedEnrollments, helper: 'Waitlist boyutu' },
      { label: 'Kullanılan Sınıf', value: summary.classroomsInUse, helper: 'Programda aktif sınıflar' },
      { label: 'Yaklaşan Oturum', value: summary.upcomingSessions, helper: 'Takvimde sıradaki seans' },
    ];
  });

  const metrics = computed(() => [
    { label: 'Aktif Ders', value: state.totals.lectures, helper: `${state.lists.lectures.length} kayıt görüntüleniyor` },
    { label: 'Planlı Oturum', value: state.totals.schedules, helper: `${state.lists.schedules.length} kayıt` },
    { label: 'Öğrenci Kaydı', value: state.totals.enrollments, helper: `${state.lists.enrollments.length} son işlem` },
    { label: 'Sınıf Sayısı', value: state.totals.classrooms, helper: `${state.lists.classrooms.length} kayıt` },
    { label: 'Not Bileşeni', value: state.totals.gradeComponents, helper: `${state.lists.gradeComponents.length} kayıt` },
  ]);

  const teacherWorkload = computed(() => state.teacherWorkload.slice(0, 5));
  const recentLectures = computed(() => state.lists.lectures.slice(0, 5));
  const recentEnrollments = computed(() => state.lists.enrollments.slice(0, 5));
  const enrollmentFunnelList = computed(() => {
    const preferredOrder = ['PENDING_APPROVAL', 'ACTIVE', 'WAITING', 'COMPLETED', 'DROPPED'];
    const source = state.enrollmentFunnel || {};
    return preferredOrder.map((status) => ({ status, total: source[status] || 0 }));
  });

  const recentSchedules = computed(() => state.lists.schedules.slice(0, 6));

  const lectureAlertStats = computed(() => {
    const stats = new Map();
    state.lists.enrollments.forEach((enrollment) => {
      const entry = stats.get(enrollment.lectureId) || { active: 0, waiting: 0, pending: 0 };
      if (enrollment.status === 'ACTIVE') entry.active += 1;
      if (enrollment.status === 'WAITING') entry.waiting += 1;
      if (enrollment.status === 'PENDING_APPROVAL') entry.pending += 1;
      stats.set(enrollment.lectureId, entry);
    });
    return stats;
  });

  const alerts = computed(() => {
    const now = Date.now();
    const results = [];
    state.lists.lectures.forEach((lecture) => {
      const stats = lectureAlertStats.value.get(lecture.id) || { active: 0, waiting: 0, pending: 0 };
      if (lecture.capacity && stats.active >= lecture.capacity) {
        results.push({ lectureId: lecture.id, lectureName: lecture.name, type: 'CAPACITY', message: 'Kontenjan dolu' });
      } else if (lecture.capacity && stats.active >= Math.max(lecture.capacity - 1, lecture.capacity * 0.9)) {
        results.push({
          lectureId: lecture.id,
          lectureName: lecture.name,
          type: 'CAPACITY',
          message: 'Kapasite dolmak üzere',
        });
      }
      if (stats.waiting > 0) {
        results.push({
          lectureId: lecture.id,
          lectureName: lecture.name,
          type: 'WAITLIST',
          message: `${stats.waiting} öğrenci beklemede`,
        });
      }
    });
    state.lists.enrollments.forEach((enrollment) => {
      if (enrollment.status === 'PENDING_APPROVAL' && enrollment.enrolledAt) {
        const ageHours = (now - new Date(enrollment.enrolledAt).getTime()) / 36e5;
        if (ageHours >= 48) {
          results.push({
            lectureId: enrollment.lectureId,
            lectureName: `Kayıt #${enrollment.id}`,
            type: 'PENDING',
            message: '48 saattir onay bekliyor',
          });
        }
      }
    });
    return results;
  });

  const filteredAlerts = computed(() => {
    if (alertFilter.value === 'ALL') {
      return alerts.value;
    }
    return alerts.value.filter((alert) => alert.type === alertFilter.value);
  });

  const filteredSchedules = computed(() => {
    const range = upcomingRange.value;
    return recentSchedules.value.filter((schedule) => {
      if (!schedule.startDate) return true;
      const daysDiff = (new Date(schedule.startDate).getTime() - Date.now()) / 86400000;
      return daysDiff <= range;
    });
  });

  const ensureLoaded = async () => {
    if (!state.loading && !state.lists.lectures.length) {
      await refresh();
    }
  };

  return {
    state,
    alertFilter,
    alertOptions: ALERT_OPTIONS,
    upcomingRange,
    upcomingRangeOptions: UPCOMING_OPTIONS,
    summaryMetrics,
    metrics,
    recentLectures,
    recentEnrollments,
    teacherWorkload,
    enrollmentFunnelList,
    filteredSchedules,
    filteredAlerts,
    refresh,
    ensureLoaded,
  };
}
