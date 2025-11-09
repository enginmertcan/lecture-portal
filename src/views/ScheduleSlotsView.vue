<script setup>
import { reactive, ref } from 'vue';
import httpClient from '../api/httpClient';
import InfoHint from '../components/InfoHint.vue';

const slots = ref([]);
const loading = ref(false);
const error = ref('');
const page = ref(0);
const pageSize = 20;
const totalPages = ref(0);

const slotForm = reactive({
  dayOfWeek: 'MONDAY',
  startTime: '09:00',
  endTime: '11:00',
});

const formLoading = ref(false);
const formError = ref('');

const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

const fetchSlots = async () => {
  loading.value = true;
  error.value = '';
  try {
    const { data } = await httpClient.get('/api/schedule-slots', {
      params: { page: page.value, pageSize },
    });
    slots.value = data.content;
    totalPages.value = data.totalPages;
  } catch (err) {
    error.value = err.response?.data?.message || 'Slot listesi alınamadı';
  } finally {
    loading.value = false;
  }
};

const createSlot = async () => {
  formLoading.value = true;
  formError.value = '';
  try {
    await httpClient.post('/api/schedule-slots', slotForm);
    await fetchSlots();
  } catch (err) {
    formError.value = err.response?.data?.message || 'Slot oluşturulamadı';
  } finally {
    formLoading.value = false;
  }
};

const deleteSlot = async (slot) => {
  const confirmed = window.confirm(`Slotu silmek istiyor musun? ${slot.dayOfWeek} ${slot.startTime}`);
  if (!confirmed) return;
  try {
    await httpClient.delete(`/api/schedule-slots/${slot.id}`);
    await fetchSlots();
  } catch (err) {
    alert(err.response?.data?.message || 'Slot silinemedi');
  }
};

const nextPage = () => {
  if (page.value < totalPages.value - 1) {
    page.value += 1;
    fetchSlots();
  }
};

const prevPage = () => {
  if (page.value > 0) {
    page.value -= 1;
    fetchSlots();
  }
};

fetchSlots();
</script>

<template>
  <section class="layout-grid">
    <header class="section-headline">
      <div>
        <p class="eyebrow">Vardiyalar</p>
        <h1>
          Slot yönetimi
          <InfoHint title="Slot nedir?">
            <p>
              Slot, belirli gün ve saatten oluşan zaman bloğudur. Ders planlarken sınıf ve dersle eşleştirilerek
              çakışmalar engellenir.
            </p>
          </InfoHint>
        </h1>
        <p>Gün/saat kombinasyonlarını tanımlayarak ders programı için kullanılabilir zaman blokları oluştur.</p>
      </div>
    </header>

    <div class="grid-2 stretch">
      <article class="card">
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Gün</th>
                <th>Başlangıç</th>
                <th>Bitiş</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="slot in slots" :key="slot.id">
                <td>#{{ slot.id }}</td>
                <td>{{ slot.dayOfWeek }}</td>
                <td>{{ slot.startTime }}</td>
                <td>{{ slot.endTime }}</td>
                <td><button class="ghost tiny" @click="deleteSlot(slot)">Sil</button></td>
              </tr>
              <tr v-if="!loading && !slots.length">
                <td colspan="5">Slot bulunamadı.</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-if="loading" class="status">Yükleniyor...</p>
        <p v-if="error" class="error">{{ error }}</p>
        <footer class="table-footer">
          <button @click="prevPage" :disabled="page === 0">Önceki</button>
          <span>Sayfa {{ page + 1 }} / {{ Math.max(totalPages, 1) }}</span>
          <button @click="nextPage" :disabled="page >= totalPages - 1">Sonraki</button>
        </footer>
      </article>

      <article class="card">
        <header class="card-header">
          <div>
            <p class="eyebrow">Slot ekle</p>
            <h2>Yeni zaman aralığı</h2>
          </div>
        </header>
        <form class="form-grid" @submit.prevent="createSlot">
          <label>
            Gün
            <select v-model="slotForm.dayOfWeek">
              <option v-for="day in days" :key="day" :value="day">{{ day }}</option>
            </select>
          </label>
          <label>
            Başlangıç
            <input v-model="slotForm.startTime" type="time" required />
          </label>
          <label>
            Bitiş
            <input v-model="slotForm.endTime" type="time" required />
          </label>
          <div class="full-span">
            <button type="submit" :disabled="formLoading">
              {{ formLoading ? 'Kaydediliyor...' : 'Slotu Kaydet' }}
            </button>
            <p v-if="formError" class="error">{{ formError }}</p>
          </div>
        </form>
      </article>
    </div>
  </section>
</template>
