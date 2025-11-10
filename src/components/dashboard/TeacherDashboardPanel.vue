<script setup>
import { RouterLink } from 'vue-router';

defineProps({
  loading: Boolean,
  error: {
    type: String,
    default: '',
  },
  hasProfile: Boolean,
  headlineStats: {
    type: Array,
    default: () => [],
  },
  lectureCards: {
    type: Array,
    default: () => [],
  },
  recentEnrollments: {
    type: Array,
    default: () => [],
  },
  pendingApprovals: {
    type: Array,
    default: () => [],
  },
  gradingQueue: {
    type: Array,
    default: () => [],
  },
  lectureMap: {
    type: Object,
    default: () => ({}),
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

const emit = defineEmits(['refresh']);
</script>

<template>
  <section class="layout-grid">
    <header class="section-headline">
      <div>
        <p class="eyebrow">Öğretmen görünümü</p>
        <h1>Derslerim ve öğrencilerim</h1>
        <p>Atandığınız derslerdeki öğrenci akışı ve kritik aksiyonlar.</p>
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

    <div class="metric-grid">
      <article v-for="metric in headlineStats" :key="metric.label" class="card metric">
        <p class="eyebrow">{{ metric.label }}</p>
        <h2>{{ metric.value }}</h2>
        <p>{{ metric.helper }}</p>
      </article>
    </div>

    <div class="grid-2">
      <article class="card">
        <header class="card-header">
          <div>
            <p class="eyebrow">Dersler</p>
            <h2>Atandığım dersler</h2>
          </div>
        </header>
        <ul class="resource-list">
          <li v-for="lecture in lectureCards" :key="lecture.id">
            <div>
              <strong>{{ lecture.name }}</strong>
              <p class="date-range">Kontenjan {{ lecture.capacity }} · Boş {{ lecture.available }}</p>
            </div>
            <div class="pill-group">
              <span class="pill success">{{ lecture.active }} aktif</span>
              <span v-if="lecture.waiting" class="pill secondary">+{{ lecture.waiting }} bekleme</span>
            </div>
          </li>
          <li v-if="!lectureCards.length">Henüz size atanmış ders bulunmuyor.</li>
        </ul>
      </article>

      <article class="card">
        <header class="card-header">
          <div>
            <p class="eyebrow">Öğrenci hareketleri</p>
            <h2>En son işlemler</h2>
          </div>
        </header>
        <table>
          <thead>
            <tr>
              <th>Kayıt</th>
              <th>Durum</th>
              <th>Tarih</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in recentEnrollments" :key="item.id">
              <td>#{{ item.id }}</td>
              <td><span class="pill secondary">{{ statusLabel(item.status) }}</span></td>
              <td>{{ formatDateTime(item.enrolledAt) }}</td>
            </tr>
            <tr v-if="!recentEnrollments.length">
              <td colspan="3">Kayıt hareketi bulunamadı.</td>
            </tr>
          </tbody>
        </table>
      </article>
    </div>

    <div class="grid-2">
      <article class="card">
        <header class="card-header">
          <div>
            <p class="eyebrow">Onay bekleyenler</p>
            <h2>Öğrenci başvuruları</h2>
          </div>
          <RouterLink class="ghost tiny" to="/enrollments">Kayıt ekranı</RouterLink>
        </header>
        <table>
          <thead>
            <tr>
              <th>Kayıt</th>
              <th>Ders</th>
              <th>Başlangıç</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in pendingApprovals.slice(0, 5)" :key="item.id">
              <td>#{{ item.id }}</td>
              <td>{{ lectureMap[item.lectureId] || `#${item.lectureId}` }}</td>
              <td>{{ formatDateTime(item.enrolledAt) }}</td>
            </tr>
            <tr v-if="!pendingApprovals.length">
              <td colspan="3">Onay bekleyen kayıt yok.</td>
            </tr>
          </tbody>
        </table>
      </article>

      <article class="card">
        <header class="card-header">
          <div>
            <p class="eyebrow">Notlandırma</p>
            <h2>Not bekleyen öğrenciler</h2>
          </div>
          <RouterLink class="ghost tiny" to="/grade-components">Not bileşenleri</RouterLink>
        </header>
        <table>
          <thead>
            <tr>
              <th>Kayıt</th>
              <th>Ders</th>
              <th>Kayıt Tarihi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in gradingQueue.slice(0, 5)" :key="item.id">
              <td>#{{ item.id }}</td>
              <td>{{ lectureMap[item.lectureId] || `#${item.lectureId}` }}</td>
              <td>{{ formatDateTime(item.enrolledAt) }}</td>
            </tr>
            <tr v-if="!gradingQueue.length">
              <td colspan="3">Notlandırma bekleyen öğrenci yok.</td>
            </tr>
          </tbody>
        </table>
      </article>
    </div>

    <article class="card">
      <header class="card-header">
        <div>
          <p class="eyebrow">Hızlı bağlantılar</p>
          <h2>Sık kullanılan ekranlar</h2>
        </div>
      </header>
      <div class="action-buttons">
        <RouterLink class="ghost" to="/lectures">Dersleri Yönet</RouterLink>
        <RouterLink class="ghost" to="/schedules">Programı Gör</RouterLink>
        <RouterLink class="ghost" to="/grade-components">Not Bileşenleri</RouterLink>
        <RouterLink class="ghost" to="/enrollments">Kayıt Listesi</RouterLink>
      </div>
    </article>
  </section>
</template>
