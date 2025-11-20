<script setup>
import { computed } from 'vue';

const props = defineProps({
  question: {
    type: Object,
    required: true,
  },
  index: {
    type: Number,
    default: 0,
  },
});

const emit = defineEmits(['remove']);

const uid = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Math.random().toString(36).slice(2)}`;

const questionTypes = [
  { value: 'MULTIPLE_CHOICE', label: 'Çoktan Seçmeli' },
  { value: 'TRUE_FALSE', label: 'Doğru / Yanlış' },
  { value: 'CLASSIC', label: 'Klasik (Açık Uçlu)' },
  { value: 'FILL_IN_THE_BLANK', label: 'Boşluk Doldurma' },
];

const usesOptions = computed(() =>
  ['MULTIPLE_CHOICE', 'TRUE_FALSE'].includes(props.question.questionType)
);

const requiresTextAnswer = computed(() =>
  ['CLASSIC', 'FILL_IN_THE_BLANK'].includes(props.question.questionType)
);

const ensureOptionSkeleton = (type) => {
  if (type === 'TRUE_FALSE') {
    props.question.options = [
      { uid: uid(), label: 'Doğru', content: 'Doğru', correct: true },
      { uid: uid(), label: 'Yanlış', content: 'Yanlış', correct: false },
    ];
    return;
  }
  if (type === 'MULTIPLE_CHOICE' && (!props.question.options || !props.question.options.length)) {
    props.question.options = [
      { uid: uid(), label: 'A', content: '', correct: false },
      { uid: uid(), label: 'B', content: '', correct: false },
    ];
    return;
  }
  if (!usesOptions.value) {
    props.question.options = [];
  }
};

const handleTypeChange = (event) => {
  const type = event.target.value;
  props.question.questionType = type;
  ensureOptionSkeleton(type);
  if (requiresTextAnswer.value) {
    props.question.correctAnswer = '';
  }
};

const addOption = () => {
  if (!props.question.options) {
    props.question.options = [];
  }
  const nextLabel = String.fromCharCode(65 + props.question.options.length);
  props.question.options.push({
    uid: uid(),
    label: nextLabel,
    content: '',
    correct: false,
  });
};

const removeOption = (index) => {
  if (props.question.options.length <= 2) {
    return;
  }
  props.question.options.splice(index, 1);
};

const toggleCorrect = (option) => {
  if (props.question.questionType === 'TRUE_FALSE') {
    props.question.options.forEach((entry) => {
      entry.correct = entry.uid === option.uid;
    });
    return;
  }
  option.correct = !option.correct;
};

const removeQuestion = () => emit('remove', props.question.uid);
</script>

<template>
  <article class="question-editor">
    <header>
      <div>
        <p class="eyebrow">Soru {{ index + 1 }}</p>
        <strong>{{ question.questionType.replaceAll('_', ' ') }}</strong>
      </div>
      <button class="ghost tiny danger" type="button" @click="removeQuestion">Sil</button>
    </header>

    <label>
      Soru Metni
      <textarea v-model="question.prompt" rows="3" placeholder="Soru içeriğini yaz"></textarea>
    </label>

    <div class="question-grid">
      <label>
        Tip
        <select :value="question.questionType" @change="handleTypeChange">
          <option v-for="type in questionTypes" :key="type.value" :value="type.value">
            {{ type.label }}
          </option>
        </select>
      </label>

      <label>
        Puan
        <input v-model.number="question.points" type="number" step="0.5" min="0.5" />
      </label>
    </div>

    <label v-if="requiresTextAnswer">
      Doğru Cevap
      <textarea
        v-model="question.correctAnswer"
        rows="2"
        placeholder="Öğrenci yanıtını karşılaştırmak için referans cevap"
      ></textarea>
    </label>

    <div v-if="usesOptions" class="option-stack">
      <p class="eyebrow">Seçenekler</p>
      <div
        v-for="(option, optionIndex) in question.options"
        :key="option.uid"
        class="option-row"
      >
        <span class="pill">{{ option.label || optionIndex + 1 }}</span>
        <input
          v-model="option.content"
          type="text"
          placeholder="Seçenek metni"
        />
        <label class="checkbox">
          <input
            type="checkbox"
            :checked="option.correct"
            @change="toggleCorrect(option)"
          />
          Doğru
        </label>
        <button
          class="ghost tiny"
          type="button"
          :disabled="question.options.length <= 2"
          @click="removeOption(optionIndex)"
        >
          Sil
        </button>
      </div>
      <button
        v-if="question.questionType === 'MULTIPLE_CHOICE'"
        type="button"
        class="ghost tiny"
        @click="addOption"
      >
        Seçenek Ekle
      </button>
    </div>
  </article>
</template>

<style scoped>
.question-editor {
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 1rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.question-editor header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.question-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 1rem;
}

.option-stack {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.option-row {
  display: grid;
  grid-template-columns: auto 1fr auto auto;
  gap: 0.5rem;
  align-items: center;
}

.pill {
  background: #eef2ff;
  color: #4338ca;
  border-radius: 999px;
  padding: 0.25rem 0.6rem;
  font-size: 0.85rem;
}

.checkbox {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.9rem;
  color: #475569;
}

.tiny {
  font-size: 0.8rem;
  padding: 0.35rem 0.75rem;
}

.danger {
  border-color: #dc2626;
  color: #dc2626;
}
</style>

