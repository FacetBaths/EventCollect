<template>
  <q-card class="appointment-scheduler">
    <q-card-section>
      <div class="text-h6 text-primary q-mb-md">
        <q-icon name="schedule" class="q-mr-sm" />
        Schedule Appointment
      </div>

      <q-form @submit.prevent="checkAvailability">
        <q-input
          filled
          v-model="selectedDate"
          label="Select Date"
          type="date"
          :rules="[(val) => !!val || 'Date is required']"
          class="q-mb-md"
        />

        <q-btn
          type="submit"
          color="primary"
          label="Check Availability"
          :loading="loading"
          :disable="!selectedDate"
          class="q-mb-md full-width"
        />
      </q-form>

      <!-- Next Available Monday Suggestion -->
      <div v-if="nextMondayData && !availability.length" class="q-mt-md">
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

      <div v-if="availability && availability.length > 0" class="q-mt-md">
        <div class="text-subtitle1 q-mb-sm">Available Time Slots:</div>
        <div class="slot-grid">
          <q-btn
            v-for="slot in availability"
            :key="slot.time"
            :color="slot.available ? 'positive' : 'negative'"
            :label="getSlotLabel(slot)"
            :disable="!slot.available"
            @click="selectTimeSlot(slot)"
            class="slot-btn"
            :icon="slot.available ? 'check_circle' : 'cancel'"
          >
            <q-tooltip v-if="!slot.available">
              Fully booked ({{ (slot.totalSlots || 0) - (slot.availableSlots || 0) }}/{{ slot.totalSlots || 0 }} slots taken)
            </q-tooltip>
            <q-tooltip v-else>
              {{ slot.availableSlots || 0 }} of {{ slot.totalSlots || 0 }} slots available
            </q-tooltip>
          </q-btn>
        </div>
      </div>

      <div v-if="selectedSlot" class="q-mt-md">
        <q-separator class="q-mb-md" />
        <div class="text-subtitle1 q-mb-sm">Selected Appointment:</div>
        <div class="selected-slot">
          <q-icon name="event" class="q-mr-sm" />
          {{ formatDateTime(selectedDate, selectedSlot.time) }}
        </div>

        <q-input
          filled
          v-model="appointmentNotes"
          label="Appointment Notes"
          type="textarea"
          rows="3"
          class="q-mt-md"
        />

        <q-btn
          color="primary"
          label="Confirm Appointment"
          @click="confirmAppointment"
          :loading="confirming"
          class="q-mt-md full-width"
        />
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import { ref, defineEmits, onMounted } from 'vue';
import { apiService } from '../services/api';
import { Notify } from 'quasar';

interface TimeSlot {
  time: string;
  available: boolean;
  availableSlots?: number;
  totalSlots?: number;
  conflictingAppointments?: any[];
}

const emit = defineEmits(['appointment-scheduled']);

const selectedDate = ref('');
const availability = ref<TimeSlot[]>([]);
const selectedSlot = ref<TimeSlot | null>(null);
const appointmentNotes = ref('');
const loading = ref(false);
const confirming = ref(false);
const nextMondayData = ref<any>(null);

const DEFAULT_TIME_SLOTS = ['10:00 AM', '2:00 PM', '5:00 PM'];

// Load next Monday suggestion on component mount
onMounted(() => {
  loadNextMondaySuggestion();
});

async function checkAvailability() {
  if (!selectedDate.value) {
    Notify.create({
      type: 'negative',
      message: 'Please select a date',
      timeout: 3000,
    });
    return;
  }

  // Check if the selected date is a Sunday
  const selectedDateObj = new Date(selectedDate.value);
  if (selectedDateObj.getDay() === 0) {
    Notify.create({
      type: 'negative',
      message: 'Sunday appointments are not available. Please select a different date.',
      timeout: 5000,
    });
    return;
  }

  loading.value = true;
  selectedSlot.value = null;

  try {
    const response = await apiService.checkAppointmentAvailability(
      selectedDate.value,
      DEFAULT_TIME_SLOTS
    );

    console.log('Availability response:', response);

    if (response.success && response.data) {
      availability.value = response.data.timeSlots || [];

      Notify.create({
        type: 'positive',
        message: `Found ${availability.value.filter(s => s.available).length} available slots`,
        timeout: 3000,
      });
    } else {
      console.error('API returned unsuccessful response:', response);
      throw new Error(response.error || 'Failed to check availability');
    }
  } catch (error: any) {
    console.error('Error checking availability:', error);
    console.error('Error details:', {
      message: error.message,
      response: error.response,
      stack: error.stack
    });

    // More detailed error handling
    let errorMessage = 'Failed to check availability. Please try again.';
    if (error.response?.data?.error) {
      errorMessage = error.response.data.error;
    } else if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    } else if (error.message) {
      errorMessage = error.message;
    }

    // Show a more detailed error for debugging
    if (error.response?.status) {
      errorMessage += ` (Status: ${error.response.status})`;
    }

    Notify.create({
      type: 'negative',
      message: errorMessage,
      timeout: 5000,
    });
  } finally {
    loading.value = false;
  }
}

function selectTimeSlot(slot: TimeSlot) {
  if (slot.available) {
    selectedSlot.value = slot;

    Notify.create({
      type: 'positive',
      message: `Selected ${slot.time} on ${selectedDate.value}`,
      timeout: 3000,
    });
  }
}

// async
 function confirmAppointment() {
  if (!selectedSlot.value || !selectedDate.value) {
    Notify.create({
      type: 'negative',
      message: 'Please select a time slot',
      timeout: 3000,
    });
    return;
  }

  confirming.value = true;

  try {
    const appointmentData = {
      date: selectedDate.value,
      time: selectedSlot.value.time,
      notes: appointmentNotes.value,
    };

    // Emit the appointment data to parent component
    emit('appointment-scheduled', appointmentData);

    Notify.create({
      type: 'positive',
      message: 'Appointment scheduled successfully!',
      timeout: 3000,
    });

    // Reset form
    selectedDate.value = '';
    availability.value = [];
    selectedSlot.value = null;
    appointmentNotes.value = '';
  } catch (error: any) {
    console.error('Error confirming appointment:', error);

    Notify.create({
      type: 'negative',
      message: 'Failed to schedule appointment. Please try again.',
      timeout: 5000,
    });
  } finally {
    confirming.value = false;
  }
}

async function loadNextMondaySuggestion() {
  try {
    const response = await apiService.findNextAvailableMonday(DEFAULT_TIME_SLOTS);

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
    checkAvailability();
  }
}

function getSlotLabel(slot: TimeSlot): string {
  if (slot.availableSlots && slot.totalSlots) {
    return `${slot.time} (${slot.availableSlots}/${slot.totalSlots})`;
  }
  return slot.time;
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

function formatDateTime(date: string, time: string): string {
  if (!date) return 'No date specified';

  const dateObj = new Date(date);
  const dateStr = dateObj.toLocaleDateString();

  return `${dateStr} at ${time}`;
}

function getWeeksFromNowText(weeksFromNow: number): string {
  if (weeksFromNow === 0) {
    return 'This Monday';
  } else if (weeksFromNow === 1) {
    return 'Next Monday';
  } else {
    return `${weeksFromNow} weeks from now`;
  }
}
</script>

<style scoped>
.appointment-scheduler {
  max-width: 600px;
  margin: 0 auto;
}

.slot-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.slot-btn {
  height: 48px;
  font-weight: 600;
}

.selected-slot {
  background: #e3f2fd;
  padding: 12px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  color: #1976d2;
  font-weight: 500;
}

.full-width {
  width: 100%;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .slot-grid {
    grid-template-columns: 1fr;
  }

  .slot-btn {
    height: 44px;
  }
}
</style>
