<script setup>
import { RouterLink } from 'vue-router';
import { computed, unref } from 'vue';
const props = defineProps({
  loading: Boolean,
  error: {
    type: String,
    default: '',
  },
  hasProfile: Boolean,
  metrics: {
    type: Array,
    default: () => [],
  },
  enrollments: {
    type: Array,
    default: () => [],
  },
  upcomingSessions: {
    type: Array,
    default: () => [],
  },
  availableLectures: {
    type: Array,
    default: () => [],
  },
  statusLabel: {
    type: Function,
    required: true,
  },
  formatDay: {
    type: Function,
    required: true,
  },
  formatTimeRange: {
    type: Function,
    required: true,
  },
});

const emit = defineEmits(['refresh']);

const normalizeList = (value) => {
  const resolved = unref(value);
  if (Array.isArray(resolved)) return resolved;
  if (resolved == null) return [];
  return [resolved];
};

const safeMetrics = computed(() => normalizeList(props.metrics).filter(Boolean));
const safeEnrollments = computed(() => normalizeList(props.enrollments).filter(Boolean));
const safeSessions = computed(() => normalizeList(props.upcomingSessions).filter(Boolean));
const safeSuggestions = computed(() => normalizeList(props.availableLectures).filter(Boolean));
</script>

<template>
  <section class="layout-grid">
    <header class="section-headline">
      <div>
        <p class="eyebrow">Öğrenci görünümü</p>
        <h1>Derslerim</h1>
        <p>Aktif kayıtların, yaklaşan oturumların ve uygun derslerin tek ekranda.</p>
      </div>
      <button class="ghost" @click="$emit('refresh')" :disabled="loading">
        {{ loading ? 'Yükleniyor...' : 'Verileri Yenile' }}
      </button>
    </header>

    <div v-if="error" class="card error-card">
      <p class="error">{{ error }}</p>
    </div>

    <div v-else-if="!hasProfile" class="card">
      <p>Profil bilgisi yükleniyor...</p>
    </div>

    <div class="metric-grid" v-if="safeMetrics.length">
      <article v-for="metric in safeMetrics" :key="metric.label" class="card metric">
        <p class="eyebrow">{{ metric.label }}</p>
        <h2>{{ metric.value }}</h2>
        <p>{{ metric.helper }}</p>
      </article>
    </div>
    <div v-else class="card">
      <p class="status">Henüz gösterilecek metrik yok.</p>
    </div>

    <div class="grid-2">
      <article class="card">
        <header class="card-header">
          <div>
            <p class="eyebrow">Kayıtlarım</p>
            <h2>Aktif dersler</h2>
          </div>
        </header>
        <table>
          <thead>
            <tr>
              <th>Ders</th>
              <th>Durum</th>
              <th>Not</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="enrollment in safeEnrollments" :key="enrollment.id">
              <td>{{ enrollment.lecture?.name || 'Bilinmeyen ders' }}</td>
              <td><span class="pill secondary">{{ statusLabel(enrollment.status) }}</span></td>
              <td>{{ enrollment.grade ?? '-' }}</td>
            </tr>
            <tr v-if="!enrollments.length">
              <td colspan="3">Herhangi bir derse kayıtlı değilsiniz.</td>
            </tr>
          </tbody>
        </table>
      </article>

      <article class="card">
        <header class="card-header">
          <div>
            <p class="eyebrow">Ajanda</p>
            <h2>Yaklaşan oturumlar</h2>
          </div>
        </header>
        <ul class="resource-list">
          <li v-for="session in safeSessions" :key="session.id">
            <div>
              <strong>{{ session.lectureName }}</strong>
              <p class="date-range">
                {{ formatDay(session.dayOfWeek) }} · {{ formatTimeRange(session.startTime, session.endTime) }}
              </p>
            </div>
            <span class="pill">{{ session.classroomName }}</span>
          </li>
          <li v-if="!safeSessions.length">Planlanmış oturum bulunmuyor.</li>
        </ul>
      </article>
    </div>

    <article class="card">
      <header class="card-header">
        <div>
          <p class="eyebrow">Önerilen dersler</p>
          <h2>Kontenjanı uygun seçenekler</h2>
        </div>
        <RouterLink class="ghost" to="/lectures">Tüm dersleri gör</RouterLink>
      </header>
      <div class="suggest-grid">
        <div v-for="lecture in safeSuggestions" :key="lecture.id" class="suggest-card">
          <strong>{{ lecture.name }}</strong>
          <p>{{ lecture.description || 'Açıklama bulunmuyor' }}</p>
          <small>Kontenjan: {{ lecture.capacity }}</small>
        </div>
        <p v-if="!safeSuggestions.length">
          Tüm derslerde kayıtlısınız veya uygun ders bulunamadı.
        </p>
      </div>
    </article>
  </section>
</template>
