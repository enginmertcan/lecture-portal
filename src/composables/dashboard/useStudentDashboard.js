import { computed, reactive, watch } from 'vue';
import httpClient from '../../api/httpClient';

export function useStudentDashboard(profileId, isActiveRef) {
  const isActive = isActiveRef || { value: true };
  const state = reactive({
    loading: false,
    error: '',
    enrollments: [],
    catalog: [],
    schedules: [],
  });

  const reset = () => {
    state.enrollments = [];
    state.catalog = [];
    state.schedules = [];
    state.error = '';
  };

  const refresh = async () => {
    if (!profileId.value) {
      reset();
      return;
    }
    state.loading = true;
    state.error = '';
    try {
      const [enrollmentRes, lecturesRes] = await Promise.all([
        httpClient.get(`/api/enrollments/student/${profileId.value}`),
        httpClient.get('/api/lectures', { params: { page: 0, pageSize: 100 } }),
      ]);
      state.enrollments = enrollmentRes.data || [];
      state.catalog = lecturesRes.data.content || [];

      if (state.enrollments.length) {
        const schedulesRes = await httpClient.get('/api/lecture-schedules', {
          params: { page: 0, pageSize: 100 },
        });
        const lectureIds = new Set(state.enrollments.map((enrollment) => enrollment.lectureId));
        state.schedules = (schedulesRes.data.content || []).filter((schedule) =>
          lectureIds.has(schedule.lectureId)
        );
      } else {
        state.schedules = [];
      }
    } catch (err) {
      state.error = err.response?.data?.message || 'Öğrenci verileri yüklenemedi';
    } finally {
      state.loading = false;
    }
  };

  const statusCounts = computed(() => {
    const base = { ACTIVE: 0, PENDING_APPROVAL: 0, WAITING: 0, COMPLETED: 0 };
    state.enrollments.forEach((enrollment) => {
      base[enrollment.status] = (base[enrollment.status] || 0) + 1;
    });
    return base;
  });

  const catalogMap = computed(() => {
    const map = new Map();
    state.catalog.forEach((lecture) => map.set(lecture.id, lecture));
    return map;
  });

  const enrollmentsDetailed = computed(() =>
    state.enrollments.map((enrollment) => ({
      ...enrollment,
      lecture: catalogMap.value.get(enrollment.lectureId),
    }))
  );

  const metricCards = computed(() => [
    { key: 'ACTIVE', label: 'Aktif Ders', helper: 'Devam eden kayıtlar' },
    { key: 'PENDING_APPROVAL', label: 'Onay Bekleyen', helper: 'Öğrenci işleri sürecinde' },
    { key: 'WAITING', label: 'Bekleme Listesi', helper: 'Kontenjan açılması bekleniyor' },
    { key: 'COMPLETED', label: 'Tamamlanan', helper: 'Final notu kesinleşti' },
  ].map((item) => ({ ...item, value: statusCounts.value[item.key] || 0 })));

  const upcomingSessions = computed(() =>
    [...state.schedules].sort(
      (a, b) => new Date(a.startDate || 0) - new Date(b.startDate || 0)
    ).slice(0, 4)
  );

  const availableLectures = computed(() => {
    const enrolled = new Set(state.enrollments.map((enrollment) => enrollment.lectureId));
    return state.catalog.filter((lecture) => !enrolled.has(lecture.id)).slice(0, 4);
  });

  const ensureLoaded = async () => {
    if (state.loading || !profileId.value || !isActive.value) return;
    if (!state.enrollments.length) {
      await refresh();
    }
  };

  watch(
    [profileId, isActive],
    ([id, active]) => {
      if (!active) {
        reset();
        return;
      }
      if (!id) {
        reset();
        return;
      }
      refresh();
    },
    { immediate: true }
  );

  return {
    state,
    metricCards,
    enrollmentsDetailed,
    upcomingSessions,
    availableLectures,
    refresh,
    ensureLoaded,
  };
}
