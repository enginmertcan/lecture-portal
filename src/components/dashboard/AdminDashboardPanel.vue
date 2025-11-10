<script setup>
import { RouterLink } from 'vue-router';

const props = defineProps({
  loading: Boolean,
  errors: {
    type: Array,
    default: () => [],
  },
  summaryMetrics: {
    type: Array,
    default: () => [],
  },
  metrics: {
    type: Array,
    default: () => [],
  },
  schedules: {
    type: Array,
    default: () => [],
  },
  lectures: {
    type: Array,
    default: () => [],
  },
  enrollments: {
    type: Array,
    default: () => [],
  },
  teacherWorkload: {
    type: Array,
    default: () => [],
  },
  enrollmentFunnel: {
    type: Array,
    default: () => [],
  },
  alerts: {
    type: Array,
    default: () => [],
  },
  alertOptions: {
    type: Array,
    default: () => [],
  },
  upcomingRangeOptions: {
    type: Array,
    default: () => [],
  },
  alertFilter: {
    type: String,
    default: 'ALL',
  },
  upcomingRange: {
    type: Number,
    default: 7,
  },
  formatDay: {
    type: Function,
    required: true,
  },
  formatTimeRange: {
    type: Function,
    required: true,
  },
  statusLabel: {
    type: Function,
    required: true,
  },
  formatDateTime: {
    type: Function,
    required: true,
  },
});

const emit = defineEmits(['refresh', 'update:alertFilter', 'update:upcomingRange']);
</script>

<template>
  <section class="layout-grid">
    <header class="section-headline">
      <div>
        <p class="eyebrow">Yönetim görünümü</p>
        <h1>Trendyol Lecture Portal Paneli</h1>
        <p>Spring tabanlı API'den gelen gerçek zamanlı kurumsal metrikler.</p>
      </div>
      <button class="ghost" @click="$emit('refresh')" :disabled="loading">
        {{ loading ? 'Yenileniyor...' : 'Verileri Yenile' }}
      </button>
    </header>

    <div v-if="errors.length" class="card error-card">
      <p v-for="message in errors" :key="message" class="error">
        {{ message }}
      </p>
    </div>

    <div class="action-buttons admin-actions">
      <RouterLink class="ghost small" to="/lectures">Ders yönetimi</RouterLink>
      <RouterLink class="ghost small" to="/classrooms">Sınıflar</RouterLink>
      <RouterLink class="ghost small" to="/slots">Slotlar</RouterLink>
      <RouterLink class="ghost small" to="/grade-components">Not bileşenleri</RouterLink>
      <RouterLink class="ghost small" to="/enrollments">Kayıt onayları</RouterLink>
    </div>

    <div v-if="summaryMetrics.length" class="metric-grid">
      <article v-for="metric in summaryMetrics" :key="metric.label" class="card metric">
        <p class="eyebrow">{{ metric.label }}</p>
        <h2>{{ metric.value }}</h2>
        <p>{{ metric.helper }}</p>
      </article>
    </div>

    <div class="metric-grid">
      <article v-for="metric in metrics" :key="metric.label" class="card metric">
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
          <select
            class="filter-select"
            :value="upcomingRange"
            @change="$emit('update:upcomingRange', Number($event.target.value))"
          >
            <option v-for="option in upcomingRangeOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </header>
        <ul class="resource-list">
          <li v-for="schedule in schedules" :key="schedule.id">
            <div>
              <strong>{{ schedule.lectureName }}</strong>
              <p class="date-range">
                {{ formatDay(schedule.dayOfWeek) }} · {{ formatTimeRange(schedule.startTime, schedule.endTime) }}
              </p>
            </div>
            <span class="pill secondary">{{ schedule.classroomName }}</span>
          </li>
          <li v-if="!schedules.length">Belirtilen aralıkta oturum yok.</li>
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
          <li v-for="lecture in lectures" :key="lecture.id">
            <div>
              <strong>{{ lecture.name }}</strong>
              <p class="date-range">Kapasite: {{ lecture.capacity }}</p>
            </div>
            <span class="pill">#{{ lecture.id }}</span>
          </li>
          <li v-if="!lectures.length">Bekleyen ders kaydı bulunmuyor.</li>
        </ul>
      </article>
    </div>

    <article class="card">
      <header class="card-header">
        <div>
          <p class="eyebrow">Uyarılar</p>
          <h2>Kritik ders ve kayıt durumları</h2>
        </div>
        <select
          class="filter-select"
          :value="alertFilter"
          @change="$emit('update:alertFilter', $event.target.value)"
        >
          <option v-for="option in alertOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
      </header>
      <ul class="resource-list">
        <li v-for="alert in alerts" :key="`${alert.type}-${alert.lectureId}-${alert.message}`">
          <div>
            <strong>{{ alert.lectureName }}</strong>
            <p class="date-range">{{ alert.message }}</p>
          </div>
          <span class="pill" :class="{ secondary: alert.type !== 'CAPACITY' }">{{ alert.type }}</span>
        </li>
        <li v-if="!alerts.length">Şu anda kritik uyarı bulunmuyor.</li>
      </ul>
    </article>

    <div class="grid-2">
      <article class="card">
        <header class="card-header">
          <div>
            <p class="eyebrow">Öğretmen iş yükü</p>
            <h2>En yoğun 5 öğretmen</h2>
          </div>
        </header>
        <ul class="resource-list">
          <li v-for="teacher in teacherWorkload" :key="teacher.teacherId">
            <div>
              <strong>{{ teacher.teacherName }}</strong>
              <p class="date-range">{{ teacher.totalLectures }} ders · {{ teacher.activeEnrollments }} aktif öğrenci</p>
            </div>
            <span class="pill">{{ teacher.pendingApprovals }} bekleyen onay</span>
          </li>
          <li v-if="!teacherWorkload.length">Öğretmen kayıtları görüntülenemedi.</li>
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
          <li v-for="stage in enrollmentFunnel" :key="stage.status">
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
          <tr v-for="enrollment in enrollments" :key="enrollment.id">
            <td>#{{ enrollment.id }}</td>
            <td><span class="pill secondary">{{ statusLabel(enrollment.status) }}</span></td>
            <td>{{ enrollment.grade ?? '-' }}</td>
            <td>{{ formatDateTime(enrollment.enrolledAt) }}</td>
          </tr>
          <tr v-if="!enrollments.length">
            <td colspan="4">Kayıt geçmişi bulunamadı.</td>
          </tr>
        </tbody>
      </table>
    </article>
  </section>
</template>
