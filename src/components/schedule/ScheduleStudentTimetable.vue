<script setup>
const props = defineProps({
  dayOrder: { type: Array, default: () => [] },
  formatDay: { type: Function, required: true },
  timetableSlots: { type: Array, default: () => [] },
  timetableMatrix: { type: Object, default: () => ({}) },
  formatTimeSlotLabel: { type: Function, required: true },
  sortedMySchedules: { type: Array, default: () => [] },
  myLoading: { type: Boolean, default: false },
  myError: { type: String, default: '' },
});
</script>

<template>
  <article class="card">
    <header class="card-header">
      <div>
        <p class="eyebrow">Haftalık görünüm</p>
        <h2>Ders takvimi</h2>
      </div>
    </header>
    <div class="timetable-wrapper">
      <table class="timetable">
        <thead>
          <tr>
            <th>Saat</th>
            <th v-for="day in dayOrder" :key="day">{{ formatDay(day) }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="slot in timetableSlots" :key="slot.key">
            <td class="time-cell">{{ formatTimeSlotLabel(slot) }}</td>
            <td v-for="day in dayOrder" :key="`${slot.key}-${day}`">
              <div
                v-for="session in timetableMatrix[day][slot.key]"
                :key="session.id"
                class="timetable-cell"
              >
                <strong>{{ session.lectureName }}</strong>
                <small>{{ session.classroomName }}</small>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <p v-if="!myLoading && !myError && !sortedMySchedules.length" class="status">
      Kayıtlı olduğun dersler için planlanmış bir oturum bulunamadı.
    </p>
    <p v-if="myLoading" class="status">Programın yükleniyor...</p>
    <p v-if="myError" class="error">{{ myError }}</p>
  </article>
</template>
