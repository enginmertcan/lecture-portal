import { reactive, ref } from 'vue';
import httpClient from '../../api/httpClient';

export function useScheduleAdmin() {
  const schedules = ref([]);
  const loading = ref(false);
  const error = ref('');
  const formError = ref('');
  const formLoading = ref(false);
  const lectureOptions = ref([]);
  const classroomOptions = ref([]);
  const slotOptions = ref([]);

  const scheduleForm = reactive({
    lectureId: '',
    classroomId: '',
    scheduleSlotId: '',
    startDate: '',
    endDate: '',
  });

  const fetchSchedules = async () => {
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
    error.value = '';
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
    try {
      await httpClient.delete(`/api/lecture-schedules/${slot.id}`);
      await fetchSchedules();
    } catch (err) {
      throw new Error(err.response?.data?.message || 'Oturum silinemedi');
    }
  };

  return {
    schedules,
    loading,
    error,
    formError,
    formLoading,
    lectureOptions,
    classroomOptions,
    slotOptions,
    scheduleForm,
    fetchSchedules,
    fetchLookups,
    createSchedule,
    deleteSchedule,
  };
}
