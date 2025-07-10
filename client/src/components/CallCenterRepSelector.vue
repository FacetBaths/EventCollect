<template>
  <div class="call-center-rep-selector">
    <div class="text-h6 text-primary q-mb-md">
      <q-icon name="support_agent" class="q-mr-sm" />
      Call Center Representative
    </div>

    <q-select
      filled
      v-model="selectedCallCenterRep"
      :options="callCenterRepOptions"
      label="Select Call Center Representative"
      hint="Choose a call center representative for this lead"
      option-label="label"
      option-value="value"
      emit-value
      map-options
      clearable
      @update:model-value="onCallCenterRepChange"
      :loading="loading"
      :disable="loading"
    >
      <template v-slot:option="scope">
        <q-item v-bind="scope.itemProps">
          <q-item-section>
            <q-item-label>{{ scope.opt.label }}</q-item-label>
            <q-item-label caption>{{ scope.opt.email }}</q-item-label>
            <q-item-label caption class="text-info">{{ scope.opt.position }}</q-item-label>
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
            <q-item-label>No call center representatives available</q-item-label>
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
  (e: 'callCenterRepChanged', callCenterRepId: number | null): void;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: null,
});

const emit = defineEmits<Emits>();

// Composables
const { salesReps, loading, error } = useLeapData();

// Local state
const selectedCallCenterRep = ref<number | null>(props.modelValue);

// Computed properties - use same sales reps data but filter for call center reps
const callCenterRepOptions = computed(() => 
  salesReps.value
    .filter(rep => rep.profile?.position?.toLowerCase().includes('bdc') || 
                   rep.profile?.position?.toLowerCase().includes('call center') ||
                   rep.profile?.position?.toLowerCase().includes('representatives'))
    .map(rep => ({
      label: `${rep.first_name} ${rep.last_name}`,
      value: rep.id,
      email: rep.email,
      division: rep.group?.name || 'No Group',
      position: rep.profile?.position || 'No Position'
    }))
);

// Methods
function onCallCenterRepChange(callCenterRepId: number | null) {
  selectedCallCenterRep.value = callCenterRepId;
  emit('update:modelValue', callCenterRepId);
  emit('callCenterRepChanged', callCenterRepId);
}

// Watch for prop changes
onMounted(() => {
  selectedCallCenterRep.value = props.modelValue;
});
</script>

<style scoped>
.call-center-rep-selector {
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
  .call-center-rep-selector {
    margin-bottom: 16px;
  }
}
</style>
