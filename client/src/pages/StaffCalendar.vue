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
                      :class="[
                        getTimeSlotClass(slot),
                        slot.appointments.length > 0 ? 'time-slot--booked' : ''
                      ]"
                      clickable
                      v-ripple="slot.appointments.length > 0"
                      @click="slot.appointments.length > 0 && openSlotDialog(day.date, slot)"
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
                          {{ slot.appointments.map((a: any) => a.customerName).join(', ') }}
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
    <!-- Slot Detail Dialog -->
    <q-dialog v-model="slotDialog" :maximized="$q.screen.xs">
      <q-card style="min-width: 360px; max-width: 640px; width: 95vw">
        <q-card-section class="row items-center bg-primary text-white q-pb-sm">
          <q-icon name="event" class="q-mr-sm" />
          <div>
            <div class="text-subtitle1 text-weight-bold">{{ slotDialogTitle }}</div>
            <div class="text-caption">{{ slotDialogTime }}</div>
          </div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup color="white" />
        </q-card-section>

        <q-separator />

        <q-scroll-area style="height: 400px; max-height: 60vh">
          <q-list separator>
            <q-item
              v-for="appt in slotDialogAppointments"
              :key="appt.id"
              class="q-py-md"
              :class="appt.leapCustomerId && appt.leapJobId ? 'appt-item--leap' : 'appt-item--sync'"
              clickable
              @click="openApptInLeap(appt)"
            >
              <q-item-section avatar>
                <q-avatar
                  :color="appt.leapCustomerId && appt.leapJobId ? 'purple-7' : 'orange-7'"
                  text-color="white"
                  size="36px"
                >
                  <q-icon :name="appt.leapCustomerId && appt.leapJobId ? 'open_in_new' : 'cloud_sync'" size="sm" />
                </q-avatar>
              </q-item-section>

              <q-item-section>
                <q-item-label class="text-weight-bold">{{ appt.customerName }}</q-item-label>
                <q-item-label caption>
                  <q-icon name="phone" size="xs" class="q-mr-xs" />{{ appt.customerPhone }}
                  <span class="q-ml-sm">
                    <q-icon name="mail" size="xs" class="q-mr-xs" />{{ appt.customerEmail }}
                  </span>
                </q-item-label>
                <q-item-label v-if="appt.servicesOfInterest?.length" caption class="text-primary">
                  <q-icon name="handyman" size="xs" class="q-mr-xs" />{{ appt.servicesOfInterest.join(', ') }}
                </q-item-label>
                <q-item-label v-if="appt.eventName" caption class="text-grey-7">
                  <q-icon name="event" size="xs" class="q-mr-xs" />{{ appt.eventName }}
                </q-item-label>
                <q-item-label v-if="appt.description" caption class="text-grey-6">
                  <q-icon name="note" size="xs" class="q-mr-xs" />{{ appt.description }}
                </q-item-label>
              </q-item-section>

              <q-item-section side>
                <q-badge
                  v-if="appt.leapCustomerId && appt.leapJobId"
                  color="purple-7"
                  label="Open LEAP"
                />
                <q-badge
                  v-else
                  color="orange-7"
                  label="Sync"
                />
              </q-item-section>
            </q-item>
          </q-list>
        </q-scroll-area>

        <q-card-actions align="right" class="q-pa-sm">
          <q-btn flat label="Close" color="grey" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useQuasar } from 'quasar';
import { apiService } from '../services/api';
import { Notify } from 'quasar';

interface TimeSlot {
  time: string;
  appointments: any[];
}

interface CalendarEvent {
  id: string;
  date: string;
  time: string;
  timeSlot: string;
  title: string;
  description: string;
  status: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  servicesOfInterest: string[];
  eventName: string;
  leadId?: string;
  leapCustomerId?: string;
  leapJobId?: string;
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

const $q = useQuasar();
const loading = ref(true);
const error = ref<string | null>(null);
const calendarEvents = ref<CalendarEvent[]>([]);
const selectedDate = ref(new Date().toISOString().substring(0, 10));

// Slot detail dialog
const slotDialog = ref(false);
const slotDialogTitle = ref('');
const slotDialogTime = ref('');
const slotDialogAppointments = ref<CalendarEvent[]>([]);

function openSlotDialog(date: string, slot: TimeSlot) {
  const [y, m, d] = date.split('-').map(Number);
  const dateObj = new Date(y!, (m! - 1), d!, 12, 0, 0);
  slotDialogTitle.value = dateObj.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
  });
  slotDialogTime.value = slot.time;
  slotDialogAppointments.value = slot.appointments as CalendarEvent[];
  slotDialog.value = true;
}

function openApptInLeap(appt: CalendarEvent) {
  if (appt.leapCustomerId && appt.leapJobId) {
    window.open(
      `https://www.jobprogress.com/app/#/customer-jobs/${appt.leapCustomerId}/job/${appt.leapJobId}/overview`,
      '_blank', 'noopener,noreferrer'
    );
  } else {
    // Not yet synced — let user know they need to resync from the dashboard
    Notify.create({
      type: 'warning',
      message: `${appt.customerName} is not yet synced to LEAP. Open the Leads Dashboard and resync this lead.`,
      timeout: 5000,
    });
  }
}

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

      // Use local date parts to avoid UTC timezone shift (toISOString gives Sunday for CDT Monday midnight)
      const currentDateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth()+1).padStart(2,'0')}-${String(currentDate.getDate()).padStart(2,'0')}`;
      const daySchedule: DaySchedule = {
        date: currentDateStr,
        timeSlots: timeSlots.map(time => ({
          time,
          appointments: getAppointmentsForDateTime(currentDateStr, time)
        }))
      };
      
      days.push(daySchedule);
    }
    
    const toLocal = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    weeks.push({
      weekNumber: weekNum + 1,
      startDate: toLocal(weekStart),
      endDate: toLocal(weekEnd),
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
      // Handle response from MongoDB appointments API
      const data = response.data.data || response.data;

      if (Array.isArray(data)) {
        // Process MongoDB appointments - map to expected format
        calendarEvents.value = data.map((appointment: any, index: number) => ({
          id: appointment._id || appointment.id || String(index),
          date: appointment.date ? String(appointment.date).split('T')[0] : '',
          time: appointment.timeSlot || '',
          timeSlot: appointment.timeSlot || '',
          title: `${appointment.customerName} - ${appointment.servicesOfInterest?.join(', ') || 'Appointment'}`,
          description: appointment.notes || '',
          status: appointment.status || 'scheduled',
          customerName: appointment.customerName || '',
          customerEmail: appointment.customerEmail || '',
          customerPhone: appointment.customerPhone || '',
          servicesOfInterest: appointment.servicesOfInterest || [],
          eventName: appointment.eventName || '',
          leadId: appointment.leadId || '',
          leapCustomerId: appointment.leapCustomerId || '',
          leapJobId: appointment.leapJobId || '',
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
    const eventTimeSlot = event.timeSlot || event.time;
    
    // Match exact time slot (e.g., "10:00 AM" === "10:00 AM")
    return eventDate === date && eventTimeSlot === time;
  });
}

function parseDateLocal(dateStr: string): Date {
  // Parse YYYY-MM-DD as local time (noon) to prevent UTC timezone shift
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0);
}

function formatDayHeader(date: string): string {
  return parseDateLocal(date).toLocaleDateString('en-US', { weekday: 'short' });
}

function formatDateShort(date: string): string {
  return parseDateLocal(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatWeekRange(startDate: string, endDate: string): string {
  const start = parseDateLocal(startDate);
  const end = parseDateLocal(endDate);
  return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}

function getDayCardClass(date: string): string {
  const today = new Date().toISOString().split('T')[0];
  const dateObj = parseDateLocal(date);
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

.time-slot--booked {
  cursor: pointer;
}

.appt-item--leap {
  cursor: pointer;
}
.appt-item--leap:hover {
  background: rgba(103, 58, 183, 0.06);
}

.appt-item--sync {
  cursor: pointer;
}
.appt-item--sync:hover {
  background: rgba(255, 152, 0, 0.06);
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
