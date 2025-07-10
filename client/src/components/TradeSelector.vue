<template>
  <div class="trade-selector">
    <div class="text-h6 text-primary q-mb-sm">
      <q-icon name="construction" class="q-mr-sm" />
      Services/Trades of Interest
    </div>
    
    <!-- Loading state -->
    <div v-if="loading" class="q-pa-md text-center">
      <q-spinner color="primary" size="40px" />
      <div class="q-mt-sm text-grey-6">Loading available services...</div>
    </div>
    
    <!-- Error state -->
    <div v-else-if="error" class="q-pa-md">
      <q-banner class="text-white bg-negative" rounded>
        <q-icon name="error" class="q-mr-sm" />
        {{ error }}
        <template v-slot:action>
          <q-btn 
            flat 
            color="white" 
            label="Retry" 
            @click="loadLeapData"
          />
        </template>
      </q-banner>
      
      <!-- Fallback to default services -->
      <div class="q-mt-md">
        <div class="text-subtitle2 q-mb-sm">Using default services:</div>
        <q-option-group
          v-model="selectedServices"
          :options="defaultServiceOptions"
          type="checkbox"
          class="q-gutter-sm"
          color="primary"
        />
      </div>
    </div>
    
    <!-- Success state with LEAP work types -->
    <div v-else>
      <div class="q-mb-sm text-grey-6">
        Select from available bathroom remodel services:
      </div>
      
      <q-option-group
        v-model="selectedWorkTypes"
        :options="bathRemodelWorkTypes"
        type="checkbox"
        class="q-gutter-sm"
        color="primary"
      >
        <template v-slot:label="opt">
          <div class="row items-center">
            <q-badge 
              v-if="opt.color" 
              :style="{ backgroundColor: opt.color }"
              class="q-mr-sm"
            />
            <span>{{ opt.label }}</span>
          </div>
        </template>
      </q-option-group>
      
      <!-- Show divisions if available -->
      <div v-if="divisionOptions.length > 0" class="q-mt-lg">
        <div class="text-subtitle2 q-mb-sm">Division (optional):</div>
        <q-select
          v-model="selectedDivision"
          :options="divisionOptions"
          label="Select Division"
          clearable
          filled
          emit-value
          map-options
        />
      </div>
      
      <!-- Custom/Other option -->
      <div class="q-mt-md">
        <q-input
          v-model="customService"
          label="Other Service (specify)"
          hint="If your service isn't listed above"
          filled
          clearable
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useLeapData } from '../composables/useLeapData';
import { DEFAULT_SERVICES } from '../types/temp-types';

// Props and emits
interface Props {
  modelValue: string[];
}

interface Emits {
  (e: 'update:modelValue', value: string[]): void;
  (e: 'trade-ids-changed', tradeIds: number[]): void;
  (e: 'work-type-ids-changed', workTypeIds: number[]): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// Use LEAP data composable
const { 
  trades, 
  divisions, 
  tradeOptions, 
  divisionOptions,
  workTypeOptions,
  bathRemodelWorkTypes,
  loading, 
  error, 
  mapServiceToTradeId,
  mapWorkTypeToId,
  getDefaultWorkTypeId,
  loadLeapData 
} = useLeapData();

// Local state
const selectedTrades = ref<number[]>([]);
const selectedWorkTypes = ref<number[]>([]);
const selectedDivision = ref<number | null>(null);
const customService = ref<string>('');

// Fallback default services
const defaultServiceOptions = DEFAULT_SERVICES.map(service => ({
  label: service,
  value: service
}));
const selectedServices = ref<string[]>(props.modelValue || ['Vanity']); // Default to Vanity work type

// Watch for changes and emit updates
watch(selectedWorkTypes, (newWorkTypes) => {
  const workTypeNames = newWorkTypes.map(workTypeId => {
    const workType = workTypeOptions.value.find(wt => wt.value === workTypeId);
    return workType ? workType.label : '';
  }).filter(Boolean);
  
  const allServices = [...workTypeNames];
  if (customService.value.trim()) {
    allServices.push(customService.value.trim());
  }
  
  emit('update:modelValue', allServices);
  emit('work-type-ids-changed', newWorkTypes);
  
  // Also emit trade ID (always BATH REMODEL for now)
  emit('trade-ids-changed', [105]);
});

watch(customService, (newCustom) => {
  const tradeNames = selectedTrades.value.map(tradeId => {
    const trade = trades.value.find(t => t.id === tradeId);
    return trade ? trade.name : '';
  }).filter(Boolean);
  
  const allServices = [...tradeNames];
  if (newCustom.trim()) {
    allServices.push(newCustom.trim());
  }
  
  emit('update:modelValue', allServices);
});

// Watch for fallback services changes
watch(selectedServices, (newServices) => {
  if (error.value) {
    emit('update:modelValue', newServices);
    // Map to trade IDs as best we can
    const tradeIds = newServices.map(service => mapServiceToTradeId(service));
    emit('trade-ids-changed', tradeIds);
  }
});

// Watch for trades loading and auto-select BATH REMODEL
watch(trades, (newTrades) => {
  if (newTrades.length > 0 && selectedTrades.value.length === 0) {
    // Auto-select BATH REMODEL (ID: 105) when trades are loaded
    const bathRemodelTrade = newTrades.find(trade => trade.name === 'BATH REMODEL');
    if (bathRemodelTrade) {
      selectedTrades.value = [bathRemodelTrade.id];
    }
  }
}, { immediate: true });

// Watch props changes
watch(() => props.modelValue, (newValue) => {
  if (error.value) {
    selectedServices.value = newValue || ['BATH REMODEL'];
  } else {
    // Try to map back to trade IDs
    selectedTrades.value = (newValue || []).map(service => 
      mapServiceToTradeId(service)
    ).filter(id => id > 0);
  }
}, { immediate: true });
</script>

<style scoped>
.trade-selector {
  margin-bottom: 24px;
}

:deep(.q-option-group .q-checkbox) {
  margin-bottom: 12px;
}

:deep(.q-option-group .q-checkbox__label) {
  font-size: 16px;
  margin-left: 8px;
}

:deep(.q-select) {
  margin-top: 8px;
}

:deep(.q-badge) {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  min-width: 12px;
}
</style>
