<template>
  <div class="sales-rep-selector">
    <div class="text-h6 text-primary q-mb-md">
      <q-icon name="person" class="q-mr-sm" />
      Sales Representative
    </div>

    <q-select
      filled
      v-model="selectedSalesRep"
      :options="salesRepOptions"
      label="Select Sales Representative"
      hint="Choose a sales representative for this lead"
      option-label="label"
      option-value="value"
      emit-value
      map-options
      clearable
      @update:model-value="onSalesRepChange"
      :loading="loading"
      :disable="loading"
    >
      <template v-slot:option="scope">
        <q-item v-bind="scope.itemProps">
          <q-item-section>
            <q-item-label>{{ scope.opt.label }}</q-item-label>
            <q-item-label caption>{{ scope.opt.email }}</q-item-label>
            <q-item-label caption class="text-positive">{{ scope.opt.position }}</q-item-label>
            <q-item-label caption class="text-grey-6">{{ scope.opt.division }}</q-item-label>
          </q-item-section>
        </q-item>
      </template>

      <template v-slot:selected-item="scope">
        <div class="selected-rep-info">
          <div class="rep-name">{{ scope.opt.label }}</div>
          <div class="rep-details text-caption text-grey-6">
            {{ scope.opt.email }} • {{ scope.opt.position }}
          </div>
        </div>
      </template>

      <template v-slot:no-option>
        <q-item>
          <q-item-section class="text-grey">
            <q-item-label>No sales representatives available</q-item-label>
            <q-item-label caption>Please check your LEAP CRM connection</q-item-label>
          </q-item-section>
        </q-item>
      </template>
    </q-select>

    <div v-if="error" class="text-negative q-mt-sm text-caption">
      <q-icon name="warning" class="q-mr-xs" />
      {{ error }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useLeapData } from '../composables/useLeapData';

// Props & Emits
interface Props {
  modelValue?: number | null;
}

interface Emits {
  (e: 'update:modelValue', value: number | null): void;
  (e: 'salesRepChanged', salesRepId: number | null): void;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: null,
});

const emit = defineEmits<Emits>();

// Composables
const { salesReps, salesRepOptions, loading, error } = useLeapData();

// Local state
const selectedSalesRep = ref<number | null>(props.modelValue);

// Computed properties
const hasOptions = computed(() => salesRepOptions.value.length > 0);

// Methods
function onSalesRepChange(salesRepId: number | null) {
  selectedSalesRep.value = salesRepId;
  emit('update:modelValue', salesRepId);
  emit('salesRepChanged', salesRepId);
}

// Watch for prop changes
onMounted(() => {
  selectedSalesRep.value = props.modelValue;
});
</script>

<style scoped>
.sales-rep-selector {
  margin-bottom: 24px;
}

.selected-rep-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.rep-name {
  font-weight: 500;
  font-size: 14px;
}

.rep-details {
  font-size: 12px;
  opacity: 0.7;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .sales-rep-selector {
    margin-bottom: 16px;
  }
}
</style>
