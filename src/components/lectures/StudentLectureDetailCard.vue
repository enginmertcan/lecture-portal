<script setup>
const props = defineProps({
  selectedLecture: { type: Object, default: null },
  myEnrollmentsLoading: { type: Boolean, default: false },
  myEnrollmentsError: { type: String, default: '' },
  enrollmentState: { type: Object, required: true },
  lectureEnrollmentStats: { type: Object, required: true },
  capacityUsage: { type: Number, default: 0 },
  selectedEnrollment: { type: Object, default: null },
  schedule: { type: Array, default: () => [] },
  scheduleLoading: { type: Boolean, default: false },
  scheduleError: { type: String, default: '' },
  gradeComponents: { type: Array, default: () => [] },
  gradeLoading: { type: Boolean, default: false },
  gradeError: { type: String, default: '' },
  attendanceRecords: { type: Array, default: () => [] },
  attendanceRecordsLoading: { type: Boolean, default: false },
  attendanceRecordsError: { type: String, default: '' },
  remainingAbsence: { type: Number, default: null },
  selectedEnrollmentAbsenceLimit: { type: Number, default: null },
  lastAbsenceRecord: { type: Object, default: null },
  seatAlertStatus: { type: Object, default: () => ({ message: '', active: false }) },
  isWatchedLecture: { type: Boolean, default: false },
  formatEnrollmentDate: { type: Function, required: true },
});

const emit = defineEmits(['enroll', 'drop', 'toggle-watch']);

const handleEnroll = () => props.selectedLecture && emit('enroll', props.selectedLecture);
const handleDrop = () =>
  props.selectedLecture && props.selectedEnrollment && emit('drop', { enrollment: props.selectedEnrollment, lecture: props.selectedLecture });
const handleToggleWatch = () => props.selectedLecture && emit('toggle-watch', props.selectedLecture);
</script>

<template>
  <div class="card student-detail-card">
    <template v-if="selectedLecture">
      <header class="card-header">
        <div>
          <p class="eyebrow">Seçilen ders</p>
          <h2>{{ selectedLecture.name }}</h2>
          <p class="subtitle">{{ selectedLecture.description || 'Açıklama bulunmuyor' }}</p>
        </div>
      </header>
      <p class="meta">
        Kapasite: <strong>{{ selectedLecture.capacity }}</strong> • Öğretmen:
        <strong>{{ selectedLecture.teacherName }}</strong>
        <span v-if="selectedLecture.teacherId">(#{{ selectedLecture.teacherId }})</span>
      </p>

      <div class="student-enrollment-state">
        <p v-if="myEnrollmentsLoading" class="status">Kayıt durumun güncelleniyor...</p>
        <p v-if="myEnrollmentsError" class="error status">{{ myEnrollmentsError }}</p>
        <p v-if="enrollmentState.error" class="error status">{{ enrollmentState.error }}</p>
        <p v-if="enrollmentState.success" class="status success">
          {{ enrollmentState.success }}
        </p>
      </div>

      <div class="capacity-panel">
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
            @click="handleEnroll"
          >
            {{ enrollmentState.loading ? 'Gönderiliyor...' : 'Bu derse kayıt ol' }}
          </button>
          <button
            v-else
            class="ghost danger"
            :disabled="enrollmentState.loading"
            @click="handleDrop"
          >
            Kaydı iptal et
          </button>
        </div>
        <div class="alert-panel">
          <button class="ghost small" @click="handleToggleWatch" :disabled="!selectedLecture">
            {{ isWatchedLecture ? 'Kontenjan uyarısını kapat' : 'Kontenjan uyarısını aç' }}
          </button>
          <p class="status-note" :class="{ success: seatAlertStatus.active }">
            {{ seatAlertStatus.message }}
          </p>
        </div>
      </div>

      <section class="student-detail-section">
        <h3>Program</h3>
        <p v-if="scheduleLoading" class="status">Program yükleniyor...</p>
        <p v-if="scheduleError" class="error">{{ scheduleError }}</p>
        <ul v-else-if="schedule.length" class="resource-list">
          <li v-for="slot in schedule" :key="slot.id">
            <div>
              <strong>{{ slot.dayOfWeek }}</strong>
              <p class="date-range">{{ slot.startTime }} - {{ slot.endTime }}</p>
            </div>
            <span class="pill">{{ slot.classroomName }}</span>
          </li>
        </ul>
        <p v-else>Bu ders için planlanmış oturum bulunamadı.</p>
      </section>

      <section v-if="selectedEnrollment" class="student-detail-section">
        <h3>Yoklama & Devamsızlık</h3>
        <p v-if="remainingAbsence !== null" class="absence-summary">
          Kalan devamsızlık hakkın:
          <strong :class="{ danger: remainingAbsence <= 1 }">{{ remainingAbsence }}</strong>
          / {{ selectedEnrollmentAbsenceLimit }}
        </p>
        <p v-if="lastAbsenceRecord" class="error status">
          {{ formatEnrollmentDate(lastAbsenceRecord.weekOf) }} tarihli derse katılmadın.
        </p>
        <p v-if="attendanceRecordsLoading" class="status">Yoklama kayıtları yükleniyor...</p>
        <p v-if="attendanceRecordsError" class="error status">{{ attendanceRecordsError }}</p>
        <ul
          class="resource-list"
          v-if="attendanceRecords.length && !attendanceRecordsLoading && !attendanceRecordsError"
        >
          <li v-for="record in attendanceRecords" :key="`${record.id}-${record.weekOf}`">
            <div>
              <strong>{{ formatEnrollmentDate(record.weekOf) }}</strong>
              <p class="hint">
                {{ record.recordedAt ? formatEnrollmentDate(record.recordedAt) : 'Kaydedilme tarihi yok' }}
              </p>
            </div>
            <span class="pill" :class="{ danger: record.attended === false, success: record.attended }">
              {{ record.attended ? 'Katıldı' : 'Yok' }}
            </span>
          </li>
        </ul>
        <p v-else-if="!attendanceRecordsLoading && !attendanceRecordsError" class="hint">
          Bu ders için henüz yoklama kaydı eklenmemiş.
        </p>
      </section>

      <section class="student-detail-section">
        <h3>Not bileşenleri</h3>
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
      </section>
    </template>
    <template v-else>
      <p class="status">Detayları görmek için listeden bir ders seç.</p>
    </template>
  </div>
</template>
