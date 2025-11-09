<script setup>
import { computed, onMounted, ref } from 'vue';
import httpClient from '../api/httpClient';

const status = ref(null);
const loading = ref(false);
const error = ref('');
const note = ref('');
const seedLoading = ref(false);
const forceLoading = ref(false);

const fetchStatus = async () => {
  loading.value = true;
  error.value = '';
  try {
    const { data } = await httpClient.get('/api/bootstrap/status');
    status.value = data;
    note.value = data.note;
  } catch (err) {
    error.value = err.response?.data?.message || 'Durum alınamadı';
  } finally {
    loading.value = false;
  }
};

const runSeed = async (force = false) => {
  if (force) {
    const confirmed = window.confirm(
      'Bu işlem mevcut tüm ders/kullanıcı verisini temizleyip yeniden oluşturur. Devam etmek istediğine emin misin?'
    );
    if (!confirmed) {
      return;
    }
  }

  const targetState = force ? forceLoading : seedLoading;
  targetState.value = true;
  error.value = '';
  try {
    const { data } = await httpClient.post('/api/bootstrap/seed', null, {
      params: { force },
    });
    status.value = data;
    note.value = data.note;
  } catch (err) {
    error.value = err.response?.data?.message || 'Seed işlemi başarısız oldu';
  } finally {
    targetState.value = false;
  }
};

const summaryCards = computed(() => {
  if (!status.value) {
    return [];
  }
  return [
    { label: 'Ders', value: status.value.lectureCount },
    { label: 'Öğretmen', value: status.value.teacherCount },
    { label: 'Öğrenci', value: status.value.studentCount },
    { label: 'Sınıf', value: status.value.classroomCount },
    { label: 'Planlı Oturum', value: status.value.lectureScheduleCount },
    { label: 'Grade Component', value: status.value.gradeComponentCount },
  ];
});

const enrollmentStats = computed(() => {
  if (!status.value) return [];
  return [
    { label: 'Bekleyen', value: status.value.pendingEnrollments },
    { label: 'Aktif', value: status.value.activeEnrollments },
    { label: 'Waitlist', value: status.value.waitingEnrollments },
    { label: 'Tamamlanan', value: status.value.completedEnrollments },
  ];
});

onMounted(fetchStatus);
</script>

<template>
  <section class="layout-grid">
    <header class="section-headline">
      <div>
        <p class="eyebrow">Demo verisi</p>
        <h1>Sample Dataset Orkestrasyonu</h1>
        <p>
          Backend'deki `/api/bootstrap/*` uçları üzerinden ders kullanıcı, sınıf ve kayıt datasını
          tek tıkla oluştur. Force seçeneği tüm veriyi sıfırlayarak yeniden kurar.
        </p>
      </div>
      <div class="stacked align-end">
        <button class="ghost" @click="fetchStatus" :disabled="loading">
          {{ loading ? 'Yenileniyor...' : 'Durumu Yenile' }}
        </button>
        <small v-if="note">{{ note }}</small>
      </div>
    </header>

    <div v-if="error" class="card error-card">
      <p class="error">{{ error }}</p>
    </div>

    <div v-if="status" class="card">
      <span class="pill" :class="status.seeded ? 'success' : 'secondary'">
        {{ status.seeded ? 'Dataset hazır' : 'Veri henüz kurulmadı' }}
      </span>
      <p>Toplam kayıt: {{ status.enrollmentCount }} • Öğretmen: {{ status.teacherCount }}</p>
    </div>

    <div class="metric-grid" v-if="summaryCards.length">
      <article v-for="metric in summaryCards" :key="metric.label" class="card metric">
        <p class="eyebrow">{{ metric.label }}</p>
        <h2>{{ metric.value }}</h2>
      </article>
    </div>

    <div class="grid-2 stretch">
      <article class="card">
        <header class="card-header">
          <div>
            <p class="eyebrow">Seed İşlemi</p>
            <h2>Veriyi oluştur / sıfırla</h2>
          </div>
        </header>
        <p>
          Varsayılan seed tüm rollere ait kullanıcıları, dersleri, sınıfları, programları ve
          enrollment/grade örneklerini oluşturur. Force seçeneği mevcut veriyi temizler.
        </p>
        <div class="action-row">
          <button @click="runSeed(false)" :disabled="seedLoading">
            {{ seedLoading ? 'Seed ediliyor...' : 'Hızlı Seed' }}
          </button>
          <button class="ghost danger" @click="runSeed(true)" :disabled="forceLoading">
            {{ forceLoading ? 'Sıfırlanıyor...' : 'Temizle & Yeniden Kur' }}
          </button>
        </div>
        <small class="hint">Force işlemi geri alınamaz, canlı veride dikkatli kullan.</small>
      </article>

      <article class="card">
        <header class="card-header">
          <div>
            <p class="eyebrow">Kayıt Statüleri</p>
            <h2>Enrollment dağılımı</h2>
          </div>
        </header>
        <ul class="resource-list">
          <li v-for="stat in enrollmentStats" :key="stat.label">
            <div>
              <strong>{{ stat.label }}</strong>
              <p>Öğrenci sayısı</p>
            </div>
            <span class="pill">{{ stat.value }}</span>
          </li>
        </ul>
      </article>
    </div>

    <article class="card">
      <header class="card-header">
        <div>
          <p class="eyebrow">Hazır kimlikler</p>
          <h2>Demo giriş bilgileri</h2>
        </div>
        <p>Şifre: <code>Trend123!</code> (tüm hesaplar için)</p>
      </header>
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Rol</th>
              <th>TC Kimlik</th>
              <th>Açıklama</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="account in status?.sampleAccounts || []" :key="account.identityNo">
              <td><span class="pill secondary">{{ account.role }}</span></td>
              <td>{{ account.identityNo }}</td>
              <td>{{ account.description }}</td>
            </tr>
            <tr v-if="!(status?.sampleAccounts || []).length">
              <td colspan="3">Gösterilecek demo hesabı yok.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </article>
  </section>
</template>
