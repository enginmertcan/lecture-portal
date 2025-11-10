import { computed, reactive, watch } from 'vue';
import httpClient from '../../api/httpClient';

export function useTeacherDashboard(profileId, isActiveRef) {
  const isActive = isActiveRef || { value: true };
  const state = reactive({
    loading: false,
    error: '',
    lectures: [],
    enrollmentsByLecture: {},
  });

  const reset = () => {
    state.lectures = [];
    state.enrollmentsByLecture = {};
    state.error = '';
  };

  const refresh = async () => {
    if (!profileId.value) {
      reset();
      return;
    }
    state.loading = true;
    state.error = '';
    state.enrollmentsByLecture = {};
    try {
      const { data } = await httpClient.get('/api/lectures', { params: { page: 0, pageSize: 100 } });
      state.lectures = (data.content || []).filter((lecture) => lecture.teacherId === profileId.value);

      if (!state.lectures.length) {
        state.enrollmentsByLecture = {};
        return;
      }

      const responses = await Promise.allSettled(
        state.lectures.map((lecture) => httpClient.get(`/api/enrollments/lecture/${lecture.id}`))
      );
      const map = {};
      responses.forEach((result, index) => {
        const lectureId = state.lectures[index].id;
        if (result.status === 'fulfilled') {
          map[lectureId] = result.value.data || [];
        } else {
          map[lectureId] = [];
          if (!state.error) {
            state.error = result.reason?.response?.data?.message || 'Ders kayıtları yüklenemedi';
          }
        }
      });
      state.enrollmentsByLecture = map;
    } catch (err) {
      state.error = err.response?.data?.message || 'Öğretmen verileri getirilemedi';
    } finally {
      state.loading = false;
    }
  };

  const enrollmentsFlat = computed(() =>
    Object.values(state.enrollmentsByLecture)
      .flat()
      .sort((a, b) => new Date(b.enrolledAt) - new Date(a.enrolledAt))
  );

  const headlineStats = computed(() => {
    const active = enrollmentsFlat.value.filter((item) => item.status === 'ACTIVE').length;
    const waiting = enrollmentsFlat.value.filter((item) => item.status === 'WAITING').length;
    const completed = enrollmentsFlat.value.filter((item) => item.status === 'COMPLETED').length;
    return [
      { label: 'Ders Sayım', value: state.lectures.length, helper: 'Atandığınız toplam ders' },
      { label: 'Aktif Öğrenci', value: active, helper: 'Şu anda derse devam eden' },
      { label: 'Bekleme', value: waiting, helper: 'Kontenjan bekleyen öğrenciler' },
      { label: 'Tamamlanan', value: completed, helper: 'Notlandırması biten kayıtlar' },
    ];
  });

  const lectureCards = computed(() =>
    state.lectures.map((lecture) => {
      const enrollments = state.enrollmentsByLecture[lecture.id] || [];
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

  const pendingApprovals = computed(() =>
    enrollmentsFlat.value.filter((item) => item.status === 'PENDING_APPROVAL')
  );

  const gradingQueue = computed(() =>
    enrollmentsFlat.value.filter((item) => item.status === 'ACTIVE' && (item.grade === null || item.grade === undefined))
  );

  const recentEnrollments = computed(() => enrollmentsFlat.value.slice(0, 6));

  const lectureMap = computed(() => {
    const map = {};
    state.lectures.forEach((lecture) => {
      map[lecture.id] = lecture.name;
    });
    return map;
  });

  const ensureLoaded = async () => {
    if (state.loading || !profileId.value || !isActive.value) return;
    if (!state.lectures.length) {
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
    headlineStats,
    lectureCards,
    enrollmentsFlat,
    recentEnrollments,
    pendingApprovals,
    gradingQueue,
    lectureMap,
    refresh,
    ensureLoaded,
  };
}
