<script setup>
const props = defineProps({
  scheduleForm: { type: Object, required: true },
  lectureOptions: { type: Array, default: () => [] },
  classroomOptions: { type: Array, default: () => [] },
  slotOptions: { type: Array, default: () => [] },
  formLoading: { type: Boolean, default: false },
  formError: { type: String, default: '' },
});

const emit = defineEmits(['submit']);
const handleSubmit = () => emit('submit');
</script>

<template>
  <article class="card">
    <header class="card-header">
      <div>
        <p class="eyebrow">Planla</p>
        <h2>Yeni oturum oluştur</h2>
      </div>
    </header>
    <form class="form-grid" @submit.prevent="handleSubmit">
      <label>
        Ders
        <select v-model="scheduleForm.lectureId" required>
          <option disabled value="">Ders seç</option>
          <option v-for="lecture in lectureOptions" :key="lecture.id" :value="lecture.id">
            {{ lecture.name }}
          </option>
        </select>
      </label>
      <label>
        Sınıf
        <select v-model="scheduleForm.classroomId" required>
          <option disabled value="">Sınıf seç</option>
          <option v-for="room in classroomOptions" :key="room.id" :value="room.id">
            {{ room.name }} ({{ room.capacity }})
          </option>
        </select>
      </label>
      <label>
        Slot
        <select v-model="scheduleForm.scheduleSlotId" required>
          <option disabled value="">Slot seç</option>
          <option v-for="slot in slotOptions" :key="slot.id" :value="slot.id">
            {{ slot.dayOfWeek }} - {{ slot.startTime }} / {{ slot.endTime }}
          </option>
        </select>
      </label>
      <label>
        Başlangıç
        <input v-model="scheduleForm.startDate" type="date" />
      </label>
      <label>
        Bitiş
        <input v-model="scheduleForm.endDate" type="date" />
      </label>
      <div class="full-span">
        <button type="submit" :disabled="formLoading">
          {{ formLoading ? 'Planlanıyor...' : 'Oturumu Planla' }}
        </button>
        <p v-if="formError" class="error">{{ formError }}</p>
      </div>
    </form>
  </article>
</template>
