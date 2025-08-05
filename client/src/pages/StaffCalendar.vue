<template>
  <q-page class="q-pa-md">
    <div class="text-h4 text-primary text-center q-mb-lg">
      <q-icon name="calendar_today" class="q-mr-sm" />
      Staff Calendar & Availability
    </div>

    <div class="row q-mb-lg">
      <div class="col">
        <q-btn
          color="primary"
          icon="refresh"
          label="Sync Calendar"
          @click="fetchStaffAvailability"
          :loading="loading"
          class="q-mr-md"
        />
        <q-btn color="secondary" icon="today" label="View Today" @click="goToToday" />
      </div>
    </div>

    <div v-if="loading" class="text-center q-mt-md">
      <q-spinner size="50px" />
      <div>Loading staff availability...</div>
    </div>

    <div v-else-if="error" class="text-center q-mt-md">
      <q-icon name="warning" size="40px" color="negative" />
      <div class="text-negative q-mt-sm">{{ error }}</div>
      <q-btn color="primary" label="Retry" @click="fetchStaffAvailability" class="q-mt-md" />
    </div>

    <div v-else>
      <!-- Appointment Grid -->
      <div class="appointment-grid">
        <q-card v-for="week in appointmentWeeks" :key="week.weekNumber" class="q-mb-lg">
          <q-card-section>
            <div class="text-h6 text-primary">
              <q-icon name="date_range" class="q-mr-sm" />
              Week {{ week.weekNumber }} - {{ formatWeekRange(week.startDate, week.endDate) }}
            </div>
          </q-card-section>
          <q-separator />
          <q-card-section>
            <div class="row q-gutter-md">
              <div 
                v-for="day in week.days" 
                :key="day.date" 
                class="col-12 col-sm-6 col-md-4 col-lg-2"
              >
                <q-card class="day-card" :class="getDayCardClass(day.date)">
                  <q-card-section class="q-pa-sm">
                    <div class="text-subtitle2 text-weight-bold text-center">
                      {{ formatDayHeader(day.date) }}
                    </div>
                    <div class="text-caption text-center text-grey-6">
                      {{ formatDateShort(day.date) }}
                    </div>
                  </q-card-section>
                  <q-separator />
                  <q-list dense>
                    <q-item 
                      v-for="slot in day.timeSlots" 
                      :key="slot.time" 
                      class="q-pa-xs time-slot"
                      :class="getTimeSlotClass(slot)"
                    >
                      <q-item-section>
                        <q-item-label class="text-weight-medium text-xs">
                          {{ slot.time }}
                        </q-item-label>
                        <q-item-label 
                          v-if="slot.appointments.length > 0" 
                          caption 
                          class="text-xs"
                        >
                          {{ slot.appointments.length }}/2 booked
                        </q-item-label>
                        <q-item-label 
                          v-else
                          caption 
                          class="text-xs text-positive"
                        >
                          Available
                        </q-item-label>
                      </q-item-section>
                      <q-item-section side>
                        <q-badge 
                          :color="getSlotBadgeColor(slot)"
                          :label="getSlotBadgeLabel(slot)"
                          class="text-xs"
                        />
                      </q-item-section>
                    </q-item>
                  </q-list>
                </q-card>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { apiService } from '../services/api';
import { Notify } from 'quasar';

interface TimeSlot {
  time: string;
  appointments: any[];
}

interface DaySchedule {
  date: string;
  timeSlots: TimeSlot[];
}

interface WeekSchedule {
  weekNumber: number;
  startDate: string;
  endDate: string;
  days: DaySchedule[];
}

const loading = ref(true);
const error = ref<string | null>(null);
const calendarEvents = ref<any[]>([]);
const selectedDate = ref(new Date().toISOString().substring(0, 10));

// Time slots for each day (3 slots per day)
const timeSlots = [
  '10:00 AM',
  '2:00 PM',
  '5:00 PM'
];

// Generate 4 weeks of Monday-Saturday schedules
const appointmentWeeks = computed(() => {
  const weeks: WeekSchedule[] = [];
  const today = new Date();
  
  // Find the start of the current week (Monday)
  const startOfWeek = new Date(today);
  const dayOfWeek = startOfWeek.getDay();
  const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  startOfWeek.setDate(startOfWeek.getDate() + daysToMonday);
  
  for (let weekNum = 0; weekNum < 4; weekNum++) {
    const weekStart = new Date(startOfWeek);
    weekStart.setDate(weekStart.getDate() + (weekNum * 7));
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 5); // Saturday
    
    const days: DaySchedule[] = [];
    
    // Generate Monday through Saturday
    for (let dayNum = 0; dayNum < 6; dayNum++) {
      const currentDate = new Date(weekStart);
      currentDate.setDate(currentDate.getDate() + dayNum);
      
      const currentDateStr = currentDate.toISOString().split('T')[0] as string;
      const daySchedule: DaySchedule = {
        date: currentDateStr,
        timeSlots: timeSlots.map(time => ({
          time,
          appointments: getAppointmentsForDateTime(currentDateStr, time)
        }))
      };
      
      days.push(daySchedule);
    }
    
    weeks.push({
      weekNumber: weekNum + 1,
      startDate: weekStart.toISOString().split('T')[0] as string,
      endDate: weekEnd.toISOString().split('T')[0] as string,
      days
    });
  }
  
  return weeks;
});

async function fetchStaffAvailability() {
  loading.value = true;
  error.value = null;

  try {
    // Get 4 weeks of appointments
    const today = new Date();
    const startDate = today.toISOString().split('T')[0];
    const endDate = new Date(today.getTime() + 28 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const response = await apiService.getAppointments(startDate, endDate);

    if (response.success && response.data) {
      // Handle different response structures from LEAP API
      const data = response.data.data || response.data;

      if (Array.isArray(data)) {
        // Process calendar events/appointments
        calendarEvents.value = data.map((event: any, index: number) => ({
          id: event.id || index,
          date: event.date || event.start_date || '',
          time: event.start_time || event.time || '',
          endTime: event.end_time || '',
          title: event.title || event.job_name || event.description || `Appointment ${index + 1}`,
          description: event.notes || event.description || '',
          status: event.status || 'scheduled',
          staffId: event.staff_id || event.user_id || '',
        }));
      } else {
        calendarEvents.value = [];
      }

      Notify.create({
        type: 'positive',
        message: `Loaded ${calendarEvents.value.length} appointments`,
        timeout: 3000,
      });
    } else {
      throw new Error(response.error || 'Failed to fetch appointments');
    }
  } catch (err: any) {
    console.error('Appointments fetch error:', err);

    // Extract more detailed error information
    const errorMessage = err.response?.data?.error || err.message || 'Failed to load appointments';
    const errorDetails = err.response?.data?.details || null;
    const statusCode = err.response?.status || 'unknown';

    error.value = `${errorMessage} (Status: ${statusCode})`;

    // Log detailed error information
    console.error('Detailed error information:', {
      message: errorMessage,
      details: errorDetails,
      statusCode: statusCode,
      timestamp: err.response?.data?.timestamp || new Date().toISOString(),
      fullError: err,
    });

    Notify.create({
      type: 'negative',
      message: `Error fetching appointments: ${errorMessage}`,
      timeout: 5000,
      actions: [{ label: 'Dismiss', color: 'white' }],
    });
  } finally {
    loading.value = false;
  }
}

function getAppointmentsForDateTime(date: string, time: string): any[] {
  return calendarEvents.value.filter(event => {
    const eventDate = event.date;
    const eventTime = event.time;
    
    // Simple time matching - in a real app you'd want more sophisticated time parsing
    return eventDate === date && eventTime && eventTime.includes(time.split(' ')[0]);
  });
}

function formatDayHeader(date: string): string {
  const dateObj = new Date(date);
  return dateObj.toLocaleDateString('en-US', { weekday: 'short' });
}

function formatDateShort(date: string): string {
  const dateObj = new Date(date);
  return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatWeekRange(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}

function getDayCardClass(date: string): string {
  const today = new Date().toISOString().split('T')[0];
  const dateObj = new Date(date);
  const dayOfWeek = dateObj.getDay();
  
  if (date === today) {
    return 'today-card';
  }
  
  if (dayOfWeek === 0) { // Sunday
    return 'weekend-card';
  }
  
  return '';
}

function getTimeSlotClass(slot: TimeSlot): string {
  const bookedCount = slot.appointments.length;
  
  if (bookedCount === 0) {
    return 'available-slot';
  } else if (bookedCount === 1) {
    return 'partial-slot';
  } else {
    return 'full-slot';
  }
}

function getSlotBadgeColor(slot: TimeSlot): string {
  const bookedCount = slot.appointments.length;
  
  if (bookedCount === 0) {
    return 'positive';
  } else if (bookedCount === 1) {
    return 'warning';
  } else {
    return 'negative';
  }
}

function getSlotBadgeLabel(slot: TimeSlot): string {
  const bookedCount = slot.appointments.length;
  
  if (bookedCount === 0) {
    return 'Open';
  } else if (bookedCount === 1) {
    return '1/2';
  } else {
    return 'Full';
  }
}

function goToToday() {
  selectedDate.value = new Date().toISOString().substring(0, 10);
  void fetchStaffAvailability();
}

onMounted(() => {
  void fetchStaffAvailability();
});
</script>

<style scoped>
.appointment-grid {
  max-width: 1400px;
  margin: 0 auto;
}

.day-card {
  min-height: 240px;
  transition: all 0.3s ease;
}

.day-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.today-card {
  border: 2px solid #1976d2;
  background-color: #f3f8ff;
}

.weekend-card {
  background-color: #f8f8f8;
}

.time-slot {
  border-radius: 4px;
  margin: 2px 0;
  transition: background-color 0.3s ease;
}

.available-slot {
  background-color: #e8f5e8;
}

.partial-slot {
  background-color: #fff3e0;
}

.full-slot {
  background-color: #ffebee;
}

.time-slot:hover {
  background-color: #f0f0f0;
}

.text-xs {
  font-size: 0.75rem;
  line-height: 1.2;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .day-card {
    min-height: 200px;
  }
  
  .text-xs {
    font-size: 0.7rem;
  }
}

@media (max-width: 480px) {
  .day-card {
    min-height: 180px;
  }
  
  .appointment-grid {
    max-width: 100%;
  }
}
</style>
