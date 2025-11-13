import { computed, ref } from 'vue';
import httpClient from '../../api/httpClient';

const dayLabels = {
  MONDAY: 'Pazartesi',
  TUESDAY: 'Salı',
  WEDNESDAY: 'Çarşamba',
  THURSDAY: 'Perşembe',
  FRIDAY: 'Cuma',
  SATURDAY: 'Cumartesi',
  SUNDAY: 'Pazar',
};

const dayOrderDefault = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

const normalizeTime = (value) => (value ? value.slice(0, 5) : '--:--');

const parseTimeToMinutes = (time) => {
  if (!time) return 0;
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

export function useStudentTimetable() {
  const mySchedules = ref([]);
  const myLoading = ref(false);
  const myError = ref('');

  const dayOrder = ref([...dayOrderDefault]);

  const fetchMySchedules = async () => {
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

  const formatDay = (value) => dayLabels[value] || value || '-';

  const formatTimeSlotLabel = (slot) => {
    if (!slot.start && !slot.end) {
      return 'Belirtilmedi';
    }
    return `${normalizeTime(slot.start)} - ${normalizeTime(slot.end)}`;
  };

  const sortedMySchedules = computed(() => {
    const orderValue = (day) => {
      const index = dayOrder.value.indexOf(day);
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

  const timetableSlots = computed(() => {
    const keys = new Map();
    mySchedules.value.forEach((session) => {
      const key = `${session.startTime || ''}|${session.endTime || ''}`;
      if (!keys.has(key)) {
        keys.set(key, {
          key,
          start: session.startTime,
          end: session.endTime,
          order: parseTimeToMinutes(session.startTime),
        });
      }
    });
    return [...keys.values()].sort((a, b) => a.order - b.order);
  });

  const timetableMatrix = computed(() => {
    const matrix = {};
    dayOrder.value.forEach((day) => {
      matrix[day] = {};
      timetableSlots.value.forEach(({ key }) => {
        matrix[day][key] = [];
      });
    });
    mySchedules.value.forEach((session) => {
      const day = session.dayOfWeek;
      const key = `${session.startTime || ''}|${session.endTime || ''}`;
      if (matrix[day] && matrix[day][key]) {
        matrix[day][key].push(session);
      }
    });
    return matrix;
  });

  const clearMySchedules = () => {
    mySchedules.value = [];
  };

  return {
    dayOrder,
    mySchedules,
    myLoading,
    myError,
    fetchMySchedules,
    formatDay,
    formatTimeSlotLabel,
    timetableSlots,
    timetableMatrix,
    sortedMySchedules,
    clearMySchedules,
  };
}
