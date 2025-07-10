<template>
  <q-page class="q-pa-md">
    <div class="text-h4 text-primary text-center q-mb-lg">
      <q-icon name="event" class="q-mr-sm" />
      Appointment Scheduling Test
    </div>

    <div class="row justify-center">
      <div class="col-12 col-md-8 col-lg-6">
        <AppointmentScheduler @appointment-scheduled="onAppointmentScheduled" />
        
        <div v-if="scheduledAppointments.length > 0" class="q-mt-lg">
          <q-card>
            <q-card-section>
              <div class="text-h6 text-primary q-mb-md">
                <q-icon name="event_available" class="q-mr-sm" />
                Scheduled Appointments
              </div>
              
              <q-list>
                <q-item 
                  v-for="(appointment, index) in scheduledAppointments" 
                  :key="index"
                  class="q-mb-sm"
                >
                  <q-item-section avatar>
                    <q-avatar color="positive" text-color="white" icon="event" />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label>{{ formatDateTime(appointment.date, appointment.time) }}</q-item-label>
                    <q-item-label caption v-if="appointment.notes">
                      {{ appointment.notes }}
                    </q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>
            </q-card-section>
          </q-card>
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { Notify } from 'quasar';
import AppointmentScheduler from '../components/AppointmentScheduler.vue';

const scheduledAppointments = ref<any[]>([]);

function onAppointmentScheduled(appointmentData: any) {
  scheduledAppointments.value.push(appointmentData);
  
  Notify.create({
    type: 'positive',
    message: 'Appointment added to test list',
    timeout: 3000,
  });
}

function formatDateTime(date: string, time: string): string {
  if (!date) return 'No date specified';
  
  const dateObj = new Date(date);
  const dateStr = dateObj.toLocaleDateString();
  
  return `${dateStr} at ${time}`;
}
</script>

<style scoped>
/* Add any specific styles for the test page */
</style>
