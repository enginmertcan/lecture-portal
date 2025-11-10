<script setup>
import { computed, onMounted, watch } from 'vue';
import { useAuthStore } from '../stores/auth';
import AdminDashboardPanel from '../components/dashboard/AdminDashboardPanel.vue';
import TeacherDashboardPanel from '../components/dashboard/TeacherDashboardPanel.vue';
import StudentDashboardPanel from '../components/dashboard/StudentDashboardPanel.vue';
import { useAdminDashboard } from '../composables/dashboard/useAdminDashboard';
import { useTeacherDashboard } from '../composables/dashboard/useTeacherDashboard';
import { useStudentDashboard } from '../composables/dashboard/useStudentDashboard';

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

const adminDashboard = useAdminDashboard();
const teacherDashboard = useTeacherDashboard(profileId, computed(() => roleView.value === 'TEACHER'));
const studentDashboard = useStudentDashboard(profileId, computed(() => roleView.value === 'STUDENT'));

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

watch(
  roleView,
  (role) => {
    if (role === 'ADMIN') {
      adminDashboard.ensureLoaded();
    } else if (role === 'TEACHER') {
      teacherDashboard.ensureLoaded();
    } else {
      studentDashboard.ensureLoaded();
    }
  },
  { immediate: true }
);

onMounted(() => {
  authStore.ensureProfile();
});
</script>

<template>
  <AdminDashboardPanel
    v-if="roleView === 'ADMIN'"
    :loading="adminDashboard.state.loading"
    :errors="adminDashboard.state.errors"
    :summary-metrics="adminDashboard.summaryMetrics"
    :metrics="adminDashboard.metrics"
    :schedules="adminDashboard.filteredSchedules"
    :lectures="adminDashboard.recentLectures"
    :enrollments="adminDashboard.recentEnrollments"
    :teacher-workload="adminDashboard.teacherWorkload"
    :enrollment-funnel="adminDashboard.enrollmentFunnelList"
    :alerts="adminDashboard.filteredAlerts"
    :alert-options="adminDashboard.alertOptions"
    :upcoming-range-options="adminDashboard.upcomingRangeOptions"
    :format-day="formatDay"
    :format-time-range="formatTimeRange"
    :status-label="statusLabel"
    :format-date-time="formatDateTime"
    v-model:alert-filter="adminDashboard.alertFilter"
    v-model:upcoming-range="adminDashboard.upcomingRange"
    @refresh="adminDashboard.refresh"
  />

  <TeacherDashboardPanel
    v-else-if="roleView === 'TEACHER'"
    :loading="teacherDashboard.state.loading"
    :error="teacherDashboard.state.error"
    :has-profile="Boolean(profileId)"
    :headline-stats="teacherDashboard.headlineStats"
    :lecture-cards="teacherDashboard.lectureCards"
    :recent-enrollments="teacherDashboard.recentEnrollments"
    :pending-approvals="teacherDashboard.pendingApprovals"
    :grading-queue="teacherDashboard.gradingQueue"
    :lecture-map="teacherDashboard.lectureMap"
    :status-label="statusLabel"
    :format-date-time="formatDateTime"
    @refresh="teacherDashboard.refresh"
  />

  <StudentDashboardPanel
    v-else
    :loading="studentDashboard.state.loading"
    :error="studentDashboard.state.error"
    :has-profile="Boolean(profileId)"
    :metrics="studentDashboard.metricCards"
    :enrollments="studentDashboard.enrollmentsDetailed"
    :upcoming-sessions="studentDashboard.upcomingSessions"
    :available-lectures="studentDashboard.availableLectures"
    :status-label="statusLabel"
    :format-day="formatDay"
    :format-time-range="formatTimeRange"
    @refresh="studentDashboard.refresh"
  />
</template>
