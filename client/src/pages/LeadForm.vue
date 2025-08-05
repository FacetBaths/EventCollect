<template>
  <q-page class="q-pa-md">
    <div class="q-gutter-md">
      <q-card flat bordered class="form-card">
        <q-card-section>
          <div class="text-h4 text-primary text-center q-mb-lg">
            <q-icon name="person_add" class="q-mr-sm" />
            Prospect Information
          </div>

          <q-input
            filled
            v-model="form.fullName"
            label="Full Name"
            :rules="[(val) => !!val || 'Full Name is required']"
            hint="Enter the full name"
            lazy-rules
          />

          <q-input
            filled
            v-model="form.email"
            label="Email"
            :rules="[(val) => /\S+@\S+\.\S+/.test(val) || 'Valid email is required']"
            hint="Enter the email address"
            lazy-rules
          />

          <q-input
            filled
            v-model="form.phone"
            label="Phone"
            :rules="[(val) => !!val || 'Phone is required']"
            hint="Enter the phone number"
            lazy-rules
          />

          <q-input
            filled
            v-model="form.address.street"
            label="Street Address"
            hint="Enter the street address"
          />

          <q-input filled v-model="form.address.city" label="City" hint="Enter the city" />

          <div class="row">
            <q-input
              filled
              v-model="form.address.state"
              label="State"
              hint="Enter the state"
              class="col"
            />

            <q-input
              filled
              v-model="form.address.zipCode"
              label="Zip Code"
              hint="Enter the zip code"
              class="col"
            />
          </div>

          <TradeSelector
            v-model="form.servicesOfInterest"
            @trade-ids-changed="onTradeIdsChanged"
            @work-type-ids-changed="onWorkTypeIdsChanged"
          />

          <SalesRepSelector
            v-model="selectedSalesRepId"
            @sales-rep-changed="onSalesRepChanged"
          />

          <q-input
            filled
            v-model="form.notes"
            label="Additional Notes"
            type="textarea"
            hint="Enter any additional notes"
          />

          <div class="text-h6 text-primary q-mt-lg">Set Appointment</div>
          <q-toggle
            v-model="form.wantsAppointment"
            label="Schedule an Appointment?"
            color="primary"
          />

          <div v-if="form.wantsAppointment" class="q-mt-md">
            <SimpleAppointmentPicker 
              @appointment-preference-set="onAppointmentPreferenceSet" 
            />
          </div>

          <div class="q-mt-xl text-center">
            <q-btn
              :label="leadSaved ? 'Update Lead' : 'Submit Lead'"
              color="primary"
              size="lg"
              @click="submitForm"
              :disable="loading || !isFormValid"
              :loading="loading"
              class="submit-btn"
            >
              <template v-slot:loading>
                <q-spinner-hourglass class="on-left" />
                {{ leadSaved ? 'Updating...' : 'Submitting...' }}
              </template>
            </q-btn>
          </div>
        </q-card-section>
      </q-card>
      
      <!-- Success Section - Shows after lead is saved -->
      <q-card v-if="leadSaved" flat bordered class="form-card q-mt-lg">
        <q-card-section>
          <div class="text-h4 text-primary text-center q-mb-lg">
            <q-icon name="check_circle" class="q-mr-sm" />
            Success!
          </div>
          
          <div v-if="savedLeadData" class="q-mb-md">
            <q-banner class="text-white bg-positive q-mb-md" icon="check_circle" rounded>
              <div class="text-subtitle2 q-mb-xs">Lead Saved Successfully!</div>
              <div class="text-caption">Lead ID: {{ savedLeadData._id }}</div>
              <div class="text-caption">Customer ID: {{ savedLeadData.leapCustomerId }}</div>
              <div v-if="form.wantsAppointment && form.appointmentDetails?.preferredDate" class="text-caption q-mt-sm">
                Appointment Preference: {{ formatDate(form.appointmentDetails.preferredDate) }} at {{ form.appointmentDetails.preferredTime }}
              </div>
            </q-banner>
          </div>
          
          <div class="text-center">
            <q-btn
              label="Start New Lead"
              color="primary"
              size="lg"
              @click="resetForm"
              class="q-mr-md"
            />
          </div>
        </q-card-section>
      </q-card>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { Notify } from 'quasar';
import type { LeadFormData } from '../types/temp-types';
import { apiService } from '../services/api';
import SimpleAppointmentPicker from '../components/SimpleAppointmentPicker.vue';
import TradeSelector from '../components/TradeSelector.vue';
import SalesRepSelector from '../components/SalesRepSelector.vue';
import { useEventStore } from '../stores/event-store';

const eventStore = useEventStore();

const form = ref<LeadFormData>({
  fullName: '',
  email: '',
  phone: '',
  address: {
    street: '',
    city: '',
    state: '',
    zipCode: '',
  },
  servicesOfInterest: ['BATH REMODEL'], // Default to BATH REMODEL
  notes: '',
  wantsAppointment: false,
  appointmentDetails: {
    preferredDate: '',
    preferredTime: '',
    notes: '',
  },
  eventName: 'Web Form Submission',
  referredBy: eventStore.getCurrentEvent?.name || 'Web Form Submission',
  referred_by_type: 'Event',
  referred_by_id: 8,
  referred_by_note: eventStore.getCurrentEvent?.name || 'Web Form Submission',
});

const loading = ref(false);
const selectedTradeIds = ref<number[]>([]);
const selectedWorkTypeIds = ref<number[]>([]);
const selectedSalesRepId = ref<number | null>(null);
const leadSaved = ref(false);
const savedLeadData = ref<any>(null);

const isFormValid = computed(() => {
  return (
    form.value.fullName.trim() !== '' &&
    form.value.email.trim() !== '' &&
    /\S+@\S+\.\S+/.test(form.value.email) &&
    form.value.phone.trim() !== ''
  );
});

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  
  // Parse the date string manually to avoid timezone issues
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3) return dateStr;
  
  const [year, month, day] = parts;
  if (!year || !month || !day) return dateStr;
  
  const date = new Date(year, month - 1, day); // month is 0-indexed
  
  return date.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
}

function onTradeIdsChanged(tradeIds: number[]) {
  selectedTradeIds.value = tradeIds;
  console.log('Selected trade IDs:', tradeIds);
}

function onWorkTypeIdsChanged(workTypeIds: number[]) {
  selectedWorkTypeIds.value = workTypeIds;
  console.log('Selected work type IDs:', workTypeIds);
}

function onSalesRepChanged(salesRepId: number | null) {
  selectedSalesRepId.value = salesRepId;
  console.log('Selected sales rep ID:', salesRepId);
}

function onAppointmentPreferenceSet(appointmentData: any) {
  // Store the appointment preference in the form
  form.value.appointmentDetails = appointmentData;
  
  Notify.create({
    type: 'positive',
    message: 'Appointment preference saved! You can now submit the lead.',
    timeout: 3000,
  });
}

async function submitForm() {
  if (!isFormValid.value) {
    Notify.create({
      type: 'negative',
      message: 'Please fill in all required fields correctly',
      timeout: 3000,
    });
    return;
  }

  loading.value = true;

  try {
    // Include trade IDs, work type IDs, and sales rep ID in the form data
    // Call center rep is automatically set to BDC Rep (88443) on the backend
    const formDataWithTrades = {
      ...form.value,
      tradeIds: selectedTradeIds.value,
      workTypeIds: selectedWorkTypeIds.value,
      salesRepId: selectedSalesRepId.value || undefined,
      // Include appointment details if provided
      wantsAppointment: form.value.wantsAppointment,
      appointmentDetails: form.value.wantsAppointment && form.value.appointmentDetails ? form.value.appointmentDetails : undefined
    };
    
    const response = await apiService.submitLead(formDataWithTrades);

    if (response.success) {
      Notify.create({
        type: 'positive',
        message: 'Lead submitted successfully!',
        timeout: 3000,
      });

      // Save the lead data and mark as saved
      savedLeadData.value = response.data;
      leadSaved.value = true;

      // Backend automatically handles LEAP sync
      if (response.data.syncStatus === 'synced') {
        Notify.create({
          type: 'positive',
          message: 'Lead synced to LEAP successfully!',
          timeout: 3000,
        });
      } else if (response.data.syncStatus === 'error') {
        Notify.create({
          type: 'warning',
          message: 'Lead saved but LEAP sync failed. Please check later.',
          timeout: 3000,
        });
      }

      console.log('Lead submitted successfully:', response.data);
    } else {
      throw new Error(response.error || 'Failed to submit lead');
    }
  } catch (error) {
    console.error('Error submitting lead:', error);
    Notify.create({
      type: 'negative',
      message: 'Failed to submit lead. Please try again.',
      timeout: 3000,
    });
  } finally {
    loading.value = false;
  }
}

// Reset form to start a new lead
function resetForm() {
  form.value = {
    fullName: '',
    email: '',
    phone: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
    },
    servicesOfInterest: ['BATH REMODEL'], // Default back to BATH REMODEL
    notes: '',
    wantsAppointment: false,
    appointmentDetails: {
      preferredDate: '',
      preferredTime: '',
      notes: '',
    },
    eventName: 'Web Form Submission',
    referredBy: eventStore.getCurrentEvent?.name || 'Web Form Submission',
    referred_by_type: 'Event',
    referred_by_id: 8,
    referred_by_note: eventStore.getCurrentEvent?.name || 'Web Form Submission',
  };

  // Reset other form state
  selectedTradeIds.value = [];
  selectedWorkTypeIds.value = [];
  selectedSalesRepId.value = null;
  leadSaved.value = false;
  savedLeadData.value = null;
}

</script>

<style scoped>
.form-card {
  max-width: 800px;
  margin: auto;
  background-color: #fff;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  padding: 32px;
}

/* iPad-specific input styling */
:deep(.q-field) {
  margin-bottom: 24px;
}

:deep(.q-field__control) {
  min-height: 56px;
  font-size: 16px;
}

:deep(.q-field__label) {
  font-size: 16px;
  font-weight: 500;
}

:deep(.q-btn) {
  min-height: 48px;
  font-size: 16px;
  font-weight: 600;
  border-radius: 8px;
  padding: 0 32px;
}

:deep(.q-checkbox) {
  margin-bottom: 12px;
}

:deep(.q-checkbox__label) {
  font-size: 16px;
  margin-left: 8px;
}

:deep(.q-toggle) {
  margin: 16px 0;
}

:deep(.q-toggle__label) {
  font-size: 16px;
  font-weight: 500;
}

/* Row styling for state/zip */
.row {
  gap: 16px;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .form-card {
    padding: 16px;
    max-width: 100%;
  }

  :deep(.q-field__control) {
    min-height: 48px;
  }

  :deep(.q-btn) {
    min-height: 44px;
  }
}
</style>
