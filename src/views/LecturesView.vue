<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import httpClient from '../api/httpClient';
import { useAuthStore } from '../stores/auth';
import InfoHint from '../components/InfoHint.vue';
import LectureListCard from '../components/lectures/LectureListCard.vue';
import LectureFormCard from '../components/lectures/LectureFormCard.vue';
import StudentLectureDetailCard from '../components/lectures/StudentLectureDetailCard.vue';
import TeacherAttendanceCard from '../components/lectures/TeacherAttendanceCard.vue';

const pageSize = 10;
const lectures = ref([]);
const page = ref(0);
const totalPages = ref(0);
const loading = ref(false);
const error = ref('');
const selectedLecture = ref(null);
const schedule = ref([]);
const scheduleLoading = ref(false);
const scheduleError = ref('');
const searchTerm = ref('');
const teacherOptions = ref([]);
const gradeComponents = ref([]);
const gradeLoading = ref(false);
const gradeError = ref('');
const lectureEnrollments = ref([]);
const attendanceWeek = ref(new Date().toISOString().slice(0, 10));
const attendanceState = reactive({
  savingId: null,
  error: '',
  success: '',
});
const attendanceRecords = ref([]);
const attendanceRecordsLoading = ref(false);
const attendanceRecordsError = ref('');
const watchedLectures = ref([]);
const lectureEnrollmentStats = reactive({
  active: 0,
  waiting: 0,
  pending: 0,
});

const lectureForm = reactive({
  name: '',
  description: '',
  capacity: 30,
  teacherId: '',
});

const formLoading = ref(false);
const formError = ref('');

const authStore = useAuthStore();
const canManageLectures = computed(() => authStore.hasAnyRole(['ADMIN', 'TEACHER']));
const isStudent = computed(() => authStore.hasRole('STUDENT'));
const isTeacher = computed(() => authStore.hasRole('TEACHER'));
const profileId = computed(() => authStore.profile?.id || null);

const statusLabels = {
  PENDING_APPROVAL: 'Onay bekliyor',
  WAITING: 'Bekleme listesi',
  ACTIVE: 'Aktif',
  COMPLETED: 'Tamamlandı',
  DROPPED: 'İptal edildi',
};

const myEnrollments = ref([]);
const myEnrollmentsLoading = ref(false);
const myEnrollmentsError = ref('');
const enrollmentState = reactive({
  loading: false,
  error: '',
  success: '',
});

const studentEnrollmentMap = computed(() => {
  const map = new Map();
  myEnrollments.value.forEach((enrollment) => {
    map.set(enrollment.lectureId, enrollment);
  });
  return map;
});

const canManageAttendance = computed(() => {
  if (!selectedLecture.value) return false;
  if (!isTeacher.value) return false;
  if (!profileId.value) return false;
  return selectedLecture.value.teacherId === profileId.value;
});

const attendanceEligibleEnrollments = computed(() =>
  lectureEnrollments.value.filter((enrollment) => enrollment.status === 'ACTIVE')
);

const attendanceLimit = computed(() => {
  const entry = lectureEnrollments.value.find(
    (enrollment) => typeof enrollment?.absenceLimit === 'number'
  );
  return entry?.absenceLimit || 5;
});

const isWatchedLecture = computed(() => {
  if (!selectedLecture.value) return false;
  return watchedLectures.value.includes(selectedLecture.value.id);
});

const seatAlertStatus = computed(() => {
  if (!isStudent.value || !selectedLecture.value) {
    return { message: '', available: 0, active: false };
  }
  if (!isWatchedLecture.value) {
    return { message: 'Kontenjan uyarısı kapalı.', available: 0, active: false };
  }
  const available = Math.max(
    (selectedLecture.value.capacity || 0) - (lectureEnrollmentStats.active || 0),
    0
  );
  if (available > 0) {
    return {
      message: `${available} boş kontenjan var! Hemen kayıt olabilirsin.`,
      available,
      active: true,
    };
  }
  return {
    message: 'Kontenjan takibinde. Yer açılınca bilgilendirileceksin.',
    available: 0,
    active: false,
  };
});

const selectedEnrollmentAbsenceLimit = computed(
  () => selectedEnrollment.value?.absenceLimit ?? attendanceLimit.value
);

const remainingAbsence = computed(() => {
  if (!selectedEnrollmentAbsenceLimit.value && selectedEnrollmentAbsenceLimit.value !== 0) {
    return null;
  }
  const used = selectedEnrollment.value?.absenceCount || 0;
  return Math.max((selectedEnrollmentAbsenceLimit.value || 0) - used, 0);
});

const lastAbsenceRecord = computed(() => {
  const absences = attendanceRecords.value.filter((record) => record && record.attended === false);
  if (!absences.length) return null;
  return absences[absences.length - 1];
});

const fetchLectures = async () => {
  loading.value = true;
  error.value = '';
  try {
    const { data } = await httpClient.get('/api/lectures', {
      params: { page: page.value, pageSize },
    });
    lectures.value = data.content;
    totalPages.value = data.totalPages;
    if (!data.content.length) {
      selectedLecture.value = null;
      schedule.value = [];
      gradeComponents.value = [];
    }
  } catch (err) {
    error.value = err.response?.data?.message || 'Dersler çekilirken hata oluştu';
  } finally {
    loading.value = false;
  }
};

const watchlistStorageKey = computed(() =>
  profileId.value ? `lecture_watchlist_${profileId.value}` : ''
);

const loadWatchlist = () => {
  if (typeof window === 'undefined' || !isStudent.value || !profileId.value) {
    watchedLectures.value = [];
    return;
  }
  try {
    const raw = window.localStorage.getItem(watchlistStorageKey.value);
    const parsed = raw ? JSON.parse(raw) : [];
    watchedLectures.value = Array.isArray(parsed) ? parsed : [];
  } catch {
    watchedLectures.value = [];
  }
};

const persistWatchlist = () => {
  if (typeof window === 'undefined' || !profileId.value) {
    return;
  }
  try {
    window.localStorage.setItem(watchlistStorageKey.value, JSON.stringify(watchedLectures.value));
  } catch {
    // ignore storage errors
  }
};

const toggleLectureWatch = (lecture) => {
  if (!lecture || !isStudent.value || !profileId.value) {
    return;
  }
  const index = watchedLectures.value.indexOf(lecture.id);
  if (index === -1) {
    watchedLectures.value.push(lecture.id);
  } else {
    watchedLectures.value.splice(index, 1);
  }
  persistWatchlist();
};

const fetchTeachers = async () => {
  if (!canManageLectures.value) {
    teacherOptions.value = [];
    return;
  }
  try {
    const { data } = await httpClient.get('/api/users/by-role', {
      params: { role: 'TEACHER' },
    });
    teacherOptions.value = data;
    if (!lectureForm.teacherId && data.length) {
      lectureForm.teacherId = data[0].id;
    }
  } catch (err) {
    console.error('Teachers yüklenemedi', err);
  }
};

const fetchLectureSchedule = async (lectureId) => {
  scheduleLoading.value = true;
  scheduleError.value = '';
  try {
    const { data } = await httpClient.get(`/api/lecture-schedules/lecture/${lectureId}`);
    schedule.value = data;
  } catch (err) {
    scheduleError.value = err.response?.data?.message || 'Program alınamadı';
  } finally {
    scheduleLoading.value = false;
  }
};

const fetchGradeComponents = async (lectureId) => {
  gradeLoading.value = true;
  gradeError.value = '';
  try {
    const { data } = await httpClient.get('/api/grade-components', {
      params: { lectureId },
    });
    gradeComponents.value = data;
  } catch (err) {
    gradeError.value = err.response?.data?.message || 'Not bileşenleri getirilemedi';
  } finally {
    gradeLoading.value = false;
  }
};

const resetLectureEnrollmentStats = () => {
  lectureEnrollmentStats.active = 0;
  lectureEnrollmentStats.waiting = 0;
  lectureEnrollmentStats.pending = 0;
};

const computeLectureEnrollmentStats = () => {
  resetLectureEnrollmentStats();
  lectureEnrollments.value.forEach((enrollment) => {
    if (enrollment.status === 'ACTIVE') lectureEnrollmentStats.active += 1;
    if (enrollment.status === 'WAITING') lectureEnrollmentStats.waiting += 1;
    if (enrollment.status === 'PENDING_APPROVAL') lectureEnrollmentStats.pending += 1;
  });
};

const fetchLectureEnrollments = async (lectureId) => {
  if (!lectureId || (!isStudent.value && !canManageLectures.value)) {
    lectureEnrollments.value = [];
    resetLectureEnrollmentStats();
    return;
  }
  try {
    const { data } = await httpClient.get(`/api/enrollments/lecture/${lectureId}`);
    lectureEnrollments.value = data || [];
  } catch {
    lectureEnrollments.value = [];
  } finally {
    computeLectureEnrollmentStats();
  }
};

const fetchAttendanceRecords = async (enrollmentId) => {
  if (!isStudent.value || !enrollmentId) {
    attendanceRecords.value = [];
    return;
  }
  attendanceRecordsLoading.value = true;
  attendanceRecordsError.value = '';
  try {
    const { data } = await httpClient.get(`/api/enrollments/${enrollmentId}/attendance`);
    attendanceRecords.value = data || [];
  } catch (err) {
    attendanceRecordsError.value = err.response?.data?.message || 'Yoklama bilgileri alınamadı';
    attendanceRecords.value = [];
  } finally {
    attendanceRecordsLoading.value = false;
  }
};

const handleSelectLecture = (lecture) => {
  selectedLecture.value = lecture;
  fetchLectureSchedule(lecture.id);
  fetchGradeComponents(lecture.id);
  fetchLectureEnrollments(lecture.id);
};

const createLecture = async () => {
  if (!canManageLectures.value) {
    formError.value = 'Bu işlem için yetkin yok';
    return;
  }
  formLoading.value = true;
  formError.value = '';
  try {
    await httpClient.post('/api/lectures', lectureForm);
    Object.assign(lectureForm, { name: '', description: '', capacity: 30, teacherId: lectureForm.teacherId });
    await fetchLectures();
  } catch (err) {
    formError.value = err.response?.data?.message || 'Ders oluşturulamadı';
  } finally {
    formLoading.value = false;
  }
};

const deleteLecture = async (lecture) => {
  if (!canManageLectures.value) {
    return;
  }
  const confirmed = window.confirm(`"${lecture.name}" dersini silmek istediğine emin misin?`);
  if (!confirmed) return;
  try {
    await httpClient.delete(`/api/lectures/${lecture.id}`);
    if (selectedLecture.value?.id === lecture.id) {
      selectedLecture.value = null;
      schedule.value = [];
      gradeComponents.value = [];
    }
    await fetchLectures();
  } catch (err) {
    alert(err.response?.data?.message || 'Ders silinemedi');
  }
};

const filteredLectures = computed(() => {
  if (!searchTerm.value) {
    return lectures.value;
  }
  return lectures.value.filter((lecture) =>
    lecture.name.toLowerCase().includes(searchTerm.value.trim().toLowerCase())
  );
});

const selectedEnrollment = computed(() => {
  if (!selectedLecture.value) return null;
  return studentEnrollmentMap.value.get(selectedLecture.value.id) || null;
});

const capacityUsage = computed(() => {
  if (!selectedLecture.value || !selectedLecture.value.capacity) {
    return 0;
  }
  return Math.min(
    100,
    Math.round((lectureEnrollmentStats.active / selectedLecture.value.capacity) * 100)
  );
});

const nextPage = () => {
  if (page.value < totalPages.value - 1) {
    page.value += 1;
    fetchLectures();
  }
};

const prevPage = () => {
  if (page.value > 0) {
    page.value -= 1;
    fetchLectures();
  }
};

const fetchMyEnrollments = async () => {
  if (!isStudent.value || !profileId.value) {
    myEnrollments.value = [];
    return;
  }
  myEnrollmentsLoading.value = true;
  myEnrollmentsError.value = '';
  try {
    const { data } = await httpClient.get(`/api/enrollments/student/${profileId.value}`);
    myEnrollments.value = data;
  } catch (err) {
    myEnrollmentsError.value = err.response?.data?.message || 'Kayıtların alınmasında sorun oluştu';
    myEnrollments.value = [];
  } finally {
    myEnrollmentsLoading.value = false;
  }
};

const enrollmentStatusLabel = (status) => statusLabels[status] || status;

const formatEnrollmentDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }
  return date.toLocaleDateString('tr-TR', { dateStyle: 'medium' });
};

const enrollInLecture = async (lecture) => {
  if (!profileId.value) {
    enrollmentState.error = 'Profil bilgisi yüklenemiyor. Lütfen yeniden giriş yap.';
    return;
  }
  enrollmentState.loading = true;
  enrollmentState.error = '';
  enrollmentState.success = '';
  try {
    await httpClient.post('/api/enrollments', {
      lectureId: lecture.id,
      studentId: profileId.value,
    });
    enrollmentState.success = `"${lecture.name}" dersine kayıt talebin alındı.`;
    await fetchMyEnrollments();
  } catch (err) {
    enrollmentState.error =
      err.response?.data?.message || 'Kayıt talebi gönderilemedi. Kontenjan dolu olabilir.';
  } finally {
    enrollmentState.loading = false;
  }
};

const dropEnrollment = async (enrollment, lecture) => {
  const confirmed = window.confirm(
    `"${lecture.name}" dersindeki kaydını iptal etmek istediğine emin misin?`
  );
  if (!confirmed) return;
  enrollmentState.loading = true;
  enrollmentState.error = '';
  enrollmentState.success = '';
  try {
    await httpClient.post(`/api/enrollments/${enrollment.id}/drop`);
    enrollmentState.success = `"${lecture.name}" kaydın iptal edildi.`;
    await fetchMyEnrollments();
  } catch (err) {
    enrollmentState.error = err.response?.data?.message || 'Kayıt iptal edilemedi.';
  } finally {
    enrollmentState.loading = false;
  }
};

const recordAttendanceForEnrollment = async (enrollment, attended) => {
  if (!canManageAttendance.value) {
    attendanceState.error = 'Yoklama kaydetmek için yetkin yok.';
    return;
  }
  if (!attendanceWeek.value) {
    attendanceState.error = 'Lütfen yoklama haftası seç.';
    attendanceState.success = '';
    return;
  }
  attendanceState.savingId = enrollment.id;
  attendanceState.error = '';
  attendanceState.success = '';
  try {
    await httpClient.post(`/api/enrollments/${enrollment.id}/attendance`, {
      weekOf: attendanceWeek.value,
      attended,
    });
    const name = enrollment.studentName
      ? `${enrollment.studentName} ${enrollment.studentSurname || ''}`.trim()
      : `#${enrollment.studentId}`;
    attendanceState.success = `${name} için yoklama kaydedildi.`;
    await fetchLectureEnrollments(enrollment.lectureId);
  } catch (err) {
    attendanceState.error = err.response?.data?.message || 'Yoklama kaydedilemedi.';
  } finally {
    attendanceState.savingId = null;
  }
};

const handleAttendanceWeekUpdate = (value) => {
  attendanceWeek.value = value;
};

const handleRecordAttendanceEvent = ({ enrollment, attended }) => {
  if (!enrollment) return;
  recordAttendanceForEnrollment(enrollment, attended);
};

watch(
  () => ({
    role: isStudent.value,
    id: profileId.value,
  }),
  ({ role, id }) => {
    if (role && id) {
      fetchMyEnrollments();
    }
  },
  { immediate: true }
);

watch(
  () => ({
    student: isStudent.value,
    id: profileId.value,
  }),
  ({ student }) => {
    if (student) {
      loadWatchlist();
    } else {
      watchedLectures.value = [];
    }
  },
  { immediate: true }
);

watch(
  () => ({
    lectureId: selectedLecture.value?.id,
    canView: isStudent.value || canManageLectures.value,
  }),
  ({ lectureId, canView }) => {
    if (canView && lectureId) {
      fetchLectureEnrollments(lectureId);
    } else {
      lectureEnrollments.value = [];
      resetLectureEnrollmentStats();
    }
  }
);

watch(attendanceWeek, () => {
  attendanceState.error = '';
  attendanceState.success = '';
});

watch(
  () => selectedLecture.value?.id,
  () => {
    attendanceState.error = '';
    attendanceState.success = '';
  }
);

watch(
  () => (isStudent.value ? selectedEnrollment.value?.id : null),
  (enrollmentId) => {
    if (enrollmentId) {
      fetchAttendanceRecords(enrollmentId);
    } else {
      attendanceRecords.value = [];
    }
  },
  { immediate: true }
);

onMounted(() => {
  authStore.ensureProfile();
  fetchLectures();
  fetchTeachers();
});
</script>

<template>
  <section class="layout-grid">
    <header class="section-headline">
      <div>
        <p class="eyebrow">Canlı API</p>
        <h1>
          Ders Operasyonları
          <InfoHint title="Ders oluşturma rehberi">
            <ul>
              <li>Öğretmen rolüyle giriş yapan hesaplar ders açabilir.</li>
              <li>Sınıf ve slot kayıtları hazır olmadan ders programı yapılamaz.</li>
              <li>Atanabilir öğretmen listesi `/api/users/by-role?role=TEACHER` çıktısından gelir.</li>
            </ul>
          </InfoHint>
        </h1>
        <p>
          Ders oluştur, güncel listeyi filtrele ve seçtiğin dersin programını/grade component’lerini incele.
          <template v-if="isStudent">
            Derslere buradan kayıt olabilir, kayıt durumunu (pending/waiting/active) anlık olarak takip
            edebilirsin.
          </template>
        </p>
      </div>
      <input
        v-model="searchTerm"
        placeholder="Derste ara..."
        type="search"
        class="search-input"
      />
    </header>

    <div class="grid-2 stretch">
      <LectureListCard
        :lectures="filteredLectures"
        :loading="loading"
        :error="error"
        :selected-lecture-id="selectedLecture?.id || null"
        :is-student="isStudent"
        :can-manage-lectures="canManageLectures"
        :student-enrollment-map="studentEnrollmentMap"
        :enrollment-status-label="enrollmentStatusLabel"
        :format-enrollment-date="formatEnrollmentDate"
        :page="page"
        :total-pages="totalPages"
        @select="handleSelectLecture"
        @delete="deleteLecture"
        @next-page="nextPage"
        @prev-page="prevPage"
      />

      <LectureFormCard
        v-if="canManageLectures"
        :can-manage-lectures="canManageLectures"
        :lecture-form="lectureForm"
        :teacher-options="teacherOptions"
        :form-loading="formLoading"
        :form-error="formError"
        @submit="createLecture"
      />
      <StudentLectureDetailCard
        v-else
        :selected-lecture="selectedLecture"
        :my-enrollments-loading="myEnrollmentsLoading"
        :my-enrollments-error="myEnrollmentsError"
        :enrollment-state="enrollmentState"
        :lecture-enrollment-stats="lectureEnrollmentStats"
        :capacity-usage="capacityUsage"
        :selected-enrollment="selectedEnrollment"
        :schedule="schedule"
        :schedule-loading="scheduleLoading"
        :schedule-error="scheduleError"
        :grade-components="gradeComponents"
        :grade-loading="gradeLoading"
        :grade-error="gradeError"
        :attendance-records="attendanceRecords"
        :attendance-records-loading="attendanceRecordsLoading"
        :attendance-records-error="attendanceRecordsError"
        :remaining-absence="remainingAbsence"
        :selected-enrollment-absence-limit="selectedEnrollmentAbsenceLimit"
        :last-absence-record="lastAbsenceRecord"
        :seat-alert-status="seatAlertStatus"
        :is-watched-lecture="isWatchedLecture"
        :format-enrollment-date="formatEnrollmentDate"
        @enroll="enrollInLecture"
        @drop="({ enrollment, lecture }) => dropEnrollment(enrollment, lecture)"
        @toggle-watch="toggleLectureWatch"
      />
    </div>

    <TeacherAttendanceCard
      :visible="Boolean(selectedLecture) && canManageAttendance"
      :attendance-eligible-enrollments="attendanceEligibleEnrollments"
      :attendance-week="attendanceWeek"
      :attendance-state="attendanceState"
      :attendance-limit="attendanceLimit"
      :status-labels="statusLabels"
      @update:attendanceWeek="handleAttendanceWeekUpdate"
      @record-attendance="handleRecordAttendanceEvent"
    />

    <div class="grid-2" v-if="selectedLecture && canManageLectures">
      <aside class="card">
        <h2>{{ selectedLecture.name }} programı</h2>
        <p>{{ selectedLecture.description }}</p>
        <p class="meta">
          Kapasite: <strong>{{ selectedLecture.capacity }}</strong> • Öğretmen:
          <strong>{{ selectedLecture.teacherName }}</strong>
          <span v-if="selectedLecture.teacherId">(#{{ selectedLecture.teacherId }})</span>
        </p>

        <div v-if="isStudent" class="capacity-panel">
          <div class="capacity-panel__row">
            <div>
              <p class="eyebrow">Kontenjan durumu</p>
              <div class="capacity-meter">
                <div class="capacity-meter__bar" :style="{ width: `${capacityUsage}%` }"></div>
              </div>
              <small>{{ lectureEnrollmentStats.active }} / {{ selectedLecture.capacity }} aktif öğrenci</small>
            </div>
            <div class="capacity-panel__stats">
              <span class="pill success">{{ lectureEnrollmentStats.pending }} onay kuyruğu</span>
              <span class="pill secondary">{{ lectureEnrollmentStats.waiting }} bekleme</span>
            </div>
          </div>
          <p v-if="selectedEnrollment?.waitlistPosition" class="hint">
            Bekleme sırası: #{{ selectedEnrollment.waitlistPosition }}
          </p>
          <div class="action-buttons">
            <button
              v-if="!selectedEnrollment"
              class="ghost"
              :disabled="enrollmentState.loading"
              @click="enrollInLecture(selectedLecture)"
            >
              {{ enrollmentState.loading ? 'Gönderiliyor...' : 'Bu derse kayıt ol' }}
            </button>
            <button
              v-else
              class="ghost danger"
              :disabled="enrollmentState.loading"
              @click="dropEnrollment(selectedEnrollment, selectedLecture)"
            >
              Kaydı iptal et
            </button>
          </div>
        </div>

        <div class="schedule-wrapper">
          <p v-if="scheduleLoading" class="status">Program yükleniyor...</p>
          <p v-if="scheduleError" class="error">{{ scheduleError }}</p>
          <ul v-else-if="schedule.length">
            <li v-for="slot in schedule" :key="slot.id">
              <strong>{{ slot.dayOfWeek }}</strong>
              <span>{{ slot.startTime }} - {{ slot.endTime }}</span>
              <span>({{ slot.classroomName }})</span>
            </li>
          </ul>
          <p v-else>Bu ders için planlanmış oturum bulunamadı.</p>
        </div>
      </aside>

      <aside class="card">
        <h2>Not Bileşenleri</h2>
        <p class="subtitle">API: /api/grade-components?lectureId={{ selectedLecture.id }}</p>
        <p v-if="gradeLoading" class="status">Not bileşenleri yükleniyor...</p>
        <p v-if="gradeError" class="error">{{ gradeError }}</p>
        <ul class="resource-list" v-if="!gradeLoading && !gradeError">
          <li v-for="component in gradeComponents" :key="component.id">
            <div>
              <strong>{{ component.name }}</strong>
              <p>Ağırlık: %{{ component.weight }} • Max: {{ component.maxScore }}</p>
            </div>
            <span class="pill secondary">#{{ component.id }}</span>
          </li>
          <li v-if="!gradeComponents.length">
            <p>Derse ait bileşen tanımlanmamış.</p>
          </li>
        </ul>
      </aside>
    </div>
  </section>
</template>
