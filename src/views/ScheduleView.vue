<script setup>
import { computed, onMounted, watch } from 'vue';
import InfoHint from '../components/InfoHint.vue';
import ScheduleAdminListCard from '../components/schedule/ScheduleAdminListCard.vue';
import ScheduleFormCard from '../components/schedule/ScheduleFormCard.vue';
import ScheduleStudentTimetable from '../components/schedule/ScheduleStudentTimetable.vue';
import { useScheduleAdmin } from '../composables/schedule/useScheduleAdmin';
import { useStudentTimetable } from '../composables/schedule/useStudentTimetable';
import { useAuthStore } from '../stores/auth';

const {
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
} = useScheduleAdmin();

const {
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
} = useStudentTimetable();

const authStore = useAuthStore();
const canManageSchedules = computed(() => authStore.hasAnyRole(['ADMIN', 'TEACHER']));
const isStudentView = computed(() => !canManageSchedules.value && authStore.hasRole('STUDENT'));

const handleCreateSchedule = async () => {
  if (!canManageSchedules.value) {
    formError.value = 'Bu işlem için yetkin yok.';
    return;
  }
  await createSchedule();
};

const handleDeleteSchedule = async (slot) => {
  if (!canManageSchedules.value) {
    return;
  }
  const confirmed = window.confirm(`${slot.lectureName} oturumunu silmek istiyor musun?`);
  if (!confirmed) return;
  try {
    await deleteSchedule(slot);
  } catch (err) {
    alert(err.message);
  }
};

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
      clearMySchedules();
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
      <ScheduleAdminListCard
        :schedules="schedules"
        :loading="loading"
        :error="error"
        @delete="handleDeleteSchedule"
      />

      <ScheduleFormCard
        :schedule-form="scheduleForm"
        :lecture-options="lectureOptions"
        :classroom-options="classroomOptions"
        :slot-options="slotOptions"
        :form-loading="formLoading"
        :form-error="formError"
        @submit="handleCreateSchedule"
      />
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

    <ScheduleStudentTimetable
      :day-order="dayOrder"
      :format-day="formatDay"
      :timetable-slots="timetableSlots"
      :timetable-matrix="timetableMatrix"
      :format-time-slot-label="formatTimeSlotLabel"
      :sorted-my-schedules="sortedMySchedules"
      :my-loading="myLoading"
      :my-error="myError"
    />
  </section>
</template>
