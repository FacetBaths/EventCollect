<template>
  <q-card class="appointment-picker">
    <q-card-section>
      <div class="text-h6 text-primary q-mb-md">
        <q-icon name="schedule" class="q-mr-sm" />
        Appointment Preference
      </div>

      <div class="text-body2 text-grey-7 q-mb-md">
        Select your preferred date and time. We'll contact you to confirm the appointment.
      </div>

      <q-form @submit.prevent="confirmAppointment">
        <q-input
          filled
          v-model="selectedDate"
          label="Preferred Date"
          type="date"
          :rules="[(val) => !!val || 'Date is required']"
          class="q-mb-md"
          :min="today"
        />

        <q-select
          filled
          v-model="selectedTime"
          :options="timeSlots"
          label="Preferred Time"
          :rules="[(val) => !!val || 'Time is required']"
          class="q-mb-md"
        />

        <q-input
          filled
          v-model="appointmentNotes"
          label="Additional Notes (Optional)"
          type="textarea"
          rows="2"
          hint="Any special requests or notes for your appointment"
          class="q-mb-md"
        />

        <div class="text-center">
          <q-btn
            type="submit"
            color="primary"
            label="Set Appointment Preference"
            :disable="!selectedDate || !selectedTime"
            :loading="confirming"
            class="full-width"
          />
        </div>
      </q-form>

      <!-- Next Monday Suggestion -->
      <div v-if="nextMondayData && !selectedDate" class="q-mt-md">
        <q-banner
          class="text-white bg-info q-mb-md"
          icon="info"
          rounded
        >
          <div class="text-subtitle2 q-mb-xs">💡 Suggestion</div>
          <div>The next available appointment is on <strong>{{ formatDate(nextMondayData.date) }}</strong> at <strong>{{ nextMondayData.nextAvailableSlot.time }}</strong></div>
          <div class="text-caption q-mt-xs">{{ getWeeksFromNowText(nextMondayData.weeksFromNow) }}</div>

          <template v-slot:action>
            <q-btn
              flat
              color="white"
              label="Use This Date"
              @click="useSuggestedDate"
              size="sm"
            />
          </template>
        </q-banner>
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import { ref, defineEmits, onMounted, computed } from 'vue';
import { apiService } from '../services/api';
import { Notify } from 'quasar';

const emit = defineEmits(['appointment-preference-set']);

const selectedDate = ref('');
const selectedTime = ref('');
const appointmentNotes = ref('');
const confirming = ref(false);
const nextMondayData = ref<any>(null);

// Today in YYYY-MM-DD format for min date
const today = computed(() => {
  return new Date().toISOString().split('T')[0];
});

const timeSlots = [
  '10:00 AM',
  '11:00 AM', 
  '12:00 PM',
  '1:00 PM',
  '2:00 PM',
  '3:00 PM',
  '4:00 PM',
  '5:00 PM'
];

// Load next Monday suggestion on component mount
onMounted(() => {
  loadNextMondaySuggestion();
});

async function loadNextMondaySuggestion() {
  try {
    const response = await apiService.findNextAvailableMonday(['10:00 AM', '2:00 PM', '5:00 PM']);

    if (response.success && response.data.date) {
      nextMondayData.value = response.data;
    }
  } catch (error: any) {
    console.error('Error loading next Monday suggestion:', error);
    // Silently fail - this is just a suggestion
  }
}

function useSuggestedDate() {
  if (nextMondayData.value) {
    selectedDate.value = nextMondayData.value.date;
    selectedTime.value = nextMondayData.value.nextAvailableSlot.time;
  }
}

function confirmAppointment() {
  if (!selectedDate.value || !selectedTime.value) {
    Notify.create({
      type: 'negative',
      message: 'Please select both date and time',
      timeout: 3000,
    });
    return;
  }

  // Check if the selected date is a Sunday (use local date parsing to avoid timezone issues)
  const [year, month, day] = selectedDate.value.split('-').map(Number);
  const selectedDateObj = new Date(year, month - 1, day, 12, 0, 0); // Use noon to avoid timezone edge cases
  if (selectedDateObj.getDay() === 0) {
    Notify.create({
      type: 'negative',
      message: 'Sunday appointments are not available. Please select a different date.',
      timeout: 5000,
    });
    return;
  }

  confirming.value = true;

  try {
    const appointmentData = {
      preferredDate: selectedDate.value,
      preferredTime: selectedTime.value,
      notes: appointmentNotes.value,
    };

    // Emit the appointment data to parent component
    emit('appointment-preference-set', appointmentData);

    Notify.create({
      type: 'positive',
      message: 'Appointment preference saved!',
      timeout: 3000,
    });

    // Reset form
    selectedDate.value = '';
    selectedTime.value = '';
    appointmentNotes.value = '';
  } catch (error: any) {
    console.error('Error setting appointment preference:', error);

    Notify.create({
      type: 'negative',
      message: 'Failed to set appointment preference. Please try again.',
      timeout: 5000,
    });
  } finally {
    confirming.value = false;
  }
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function getWeeksFromNowText(weeks: number): string {
  if (weeks === 0) return 'This Monday';
  if (weeks === 1) return '1 week from now';
  return `${weeks} weeks from now`;
}
</script>

<style scoped>
.appointment-picker {
  max-width: 500px;
  margin: 0 auto;
}
</style>
