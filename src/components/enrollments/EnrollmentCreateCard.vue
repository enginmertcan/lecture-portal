<script setup>
const props = defineProps({
  lectures: { type: Array, default: () => [] },
  enrollmentForm: { type: Object, required: true },
  completionForm: { type: Object, required: true },
  formState: { type: Object, required: true },
});

const emit = defineEmits(['create', 'complete']);

const handleCreate = () => emit('create');
const handleComplete = () => emit('complete');
</script>

<template>
  <article class="card">
    <header class="card-header">
      <div>
        <p class="eyebrow">Öğrenci kaydı</p>
        <h2>Yeni kayıt oluştur (STUDENT rolü gerektirir)</h2>
      </div>
    </header>
    <form class="form-grid" @submit.prevent="handleCreate">
      <label>
        Ders
        <select v-model="enrollmentForm.lectureId" required>
          <option disabled value="">Ders seç</option>
          <option v-for="lecture in lectures" :key="lecture.id" :value="lecture.id">
            {{ lecture.name }}
          </option>
        </select>
      </label>
      <label>
        Öğrenci ID
        <input v-model="enrollmentForm.studentId" type="number" min="1" required />
      </label>
      <div class="full-span">
        <button type="submit" :disabled="formState.createLoading">
          {{ formState.createLoading ? 'Kaydediliyor...' : 'Kayıt Oluştur' }}
        </button>
        <p v-if="formState.createError" class="error">{{ formState.createError }}</p>
      </div>
    </form>

    <header class="card-header slim">
      <div>
        <p class="eyebrow">Durum güncelle</p>
        <h3>Kaydı tamamla</h3>
      </div>
    </header>
    <form class="form-grid" @submit.prevent="handleComplete">
      <label>
        Enrollment ID
        <input v-model="completionForm.enrollmentId" type="number" min="1" required />
      </label>
      <label>
        Final Notu
        <input v-model="completionForm.grade" type="number" min="0" max="100" />
      </label>
      <div class="full-span">
        <button type="submit" :disabled="formState.completionLoading">
          {{ formState.completionLoading ? 'Gönderiliyor...' : 'Tamamla' }}
        </button>
        <p v-if="formState.completionError" class="error">{{ formState.completionError }}</p>
      </div>
    </form>
  </article>
</template>
