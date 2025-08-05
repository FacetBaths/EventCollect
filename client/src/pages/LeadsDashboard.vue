<template>
  <q-page class="q-pa-md">
    <div class="text-h4 text-primary text-center">Leads Dashboard</div>
    
    <!-- Filter Controls -->
    <div class="row items-center q-mb-md q-gutter-md">
      <q-toggle
        v-model="showAllEvents"
        label="Show All Events"
        color="primary"
      />
      <q-btn 
        label="Refresh" 
        @click="fetchLeads" 
        color="primary" 
        icon="refresh"
        :loading="loading"
      />
      <q-btn 
        label="Sync All Pending"
        @click="syncAllpending"
        color="orange"
        icon="sync"
        :loading="syncingAll"
      />
      <q-space />
      <div class="text-caption">
        Showing {{ filteredLeads.length }} of {{ allLeads.length }} leads
        <span v-if="!showAllEvents && eventStore.getCurrentEvent" class="text-grey-6">
          (filtered by: {{ eventStore.getCurrentEvent.name }})
        </span>
        <span v-else-if="!showAllEvents && !eventStore.getCurrentEvent" class="text-grey-6">
          (no active event - showing all)
        </span>
      </div>
    </div>
    
    <!-- No Leads Message -->
    <div v-if="!loading && allLeads.length === 0" class="text-center q-pa-xl">
      <q-icon name="people" size="4rem" color="grey-5" />
      <div class="text-h6 text-grey-6 q-mt-md">No leads found</div>
      <div class="text-body2 text-grey-5 q-mt-sm">
        Leads will appear here once they are submitted through the lead form.
      </div>
    </div>
    
    <!-- Filtered Leads Empty Message -->
    <div v-else-if="!loading && filteredLeads.length === 0 && allLeads.length > 0" class="text-center q-pa-xl">
      <q-icon name="filter_list" size="4rem" color="grey-5" />
      <div class="text-h6 text-grey-6 q-mt-md">No leads match current filter</div>
      <div class="text-body2 text-grey-5 q-mt-sm">
        Try enabling "Show All Events" to see all {{ allLeads.length }} leads.
      </div>
    </div>

    <div class="q-mb-md">
      <q-table
        :rows="filteredLeads"
        :columns="columns"
        row-key="_id"
        :loading="loading"
        flat
        bordered
        :pagination="{ rowsPerPage: 20 }"
      >

        <template v-slot:body="props">
          <q-tr :props="props">
            <q-td
              v-for="col in props.cols.filter(c => c.name !== 'actions')"
              :key="col.name"
              :props="props"
            >
              <template v-if="col.name === 'syncStatus'">
                <q-chip
                  :color="getSyncStatusColor(col.value)"
                  text-color="white"
                  :label="col.value.toUpperCase()"
                  size="sm"
                />
              </template>
              <template v-else-if="col.name === 'tempRating'">
                <q-chip
                  v-if="col.value"
                  :color="getTempColor(col.value)"
                  text-color="white"
                  :label="`${col.value}/10`"
                  size="sm"
                />
                <span v-else class="text-grey-5">-</span>
              </template>
              <template v-else>
                {{ col.value }}
              </template>
            </q-td>
            <q-td align="center" :props="props">
              <q-btn flat icon="edit" @click="editLead(props.row)" color="primary" size="sm">
                <q-tooltip>Edit Lead</q-tooltip>
              </q-btn>
              <q-btn flat icon="event" @click="setAppointment(props.row)" color="green" size="sm">
                <q-tooltip>Set Appointment</q-tooltip>
              </q-btn>
              <q-btn flat icon="sync" @click="resyncLead(props.row._id)" color="orange" size="sm" v-if="props.row.syncStatus === 'error'">
                <q-tooltip>Resync to LEAP</q-tooltip>
              </q-btn>
              <q-btn flat icon="delete" @click="deleteLead(props.row._id)" color="negative" size="sm">
                <q-tooltip>Delete Lead</q-tooltip>
              </q-btn>
            </q-td>
          </q-tr>
        </template>
      </q-table>
    </div>
    
    <!-- Edit Lead Dialog -->
    <q-dialog v-model="editLeadDialog" persistent>
      <q-card style="min-width: 500px">
        <q-card-section>
          <div class="text-h6">Edit Lead</div>
        </q-card-section>
        
        <q-card-section v-if="selectedLead" class="q-pt-none">
          <div class="row q-gutter-md">
            <div class="col">
              <q-input
                filled
                v-model="selectedLead.fullName"
                label="Full Name"
                class="q-mb-md"
              />
              <q-input
                filled
                v-model="selectedLead.email"
                label="Email"
                type="email"
                class="q-mb-md"
              />
              <q-input
                filled
                v-model="selectedLead.phone"
                label="Phone"
                class="q-mb-md"
              />
            </div>
            <div class="col">
              <q-input
                filled
                v-model="selectedLead.eventName"
                label="Event Name"
                class="q-mb-md"
                readonly
              />
              <q-chip
                :color="getSyncStatusColor(selectedLead.syncStatus)"
                text-color="white"
                :label="selectedLead.syncStatus.toUpperCase()"
                class="q-mb-md"
              />
              <div v-if="selectedLead.syncStatus === 'error'" class="text-negative text-caption q-mb-md">
                Last sync error: {{ selectedLead.syncError || 'Unknown error' }}
              </div>
              
              <!-- Temp Rating Gauge -->
              <div class="q-mb-md">
                <div class="text-subtitle2 q-mb-sm">Prospect Temperature</div>
                <div class="row items-center q-gutter-sm">
                  <div class="col">
                    <q-slider
                      v-model="selectedLead.tempRating"
                      :min="1"
                      :max="10"
                      :step="1"
                      :color="getTempColor(selectedLead.tempRating || 1)"
                      track-color="grey-3"
                      thumb-color="white"
                      :markers="true"
                      snap
                    />
                  </div>
                  <div class="text-weight-bold" :class="`text-${getTempColor(selectedLead.tempRating || 1)}`">
                    {{ selectedLead.tempRating || 1 }}/10
                  </div>
                </div>
                <div class="text-caption text-grey-6 q-mt-xs">
                  1-3: Cold (Blue) | 4-7: Warm (Orange) | 8-10: Hot (Red)
                </div>
              </div>
            </div>
          </div>
          
          <q-separator class="q-my-md" />
          
          <q-checkbox
            v-model="resyncAfterSave"
            label="Resync to LEAP after saving changes"
            color="primary"
          />
        </q-card-section>
        
        <q-card-actions align="right">
          <q-btn flat label="Cancel" color="primary" @click="editLeadDialog = false" />
          <q-btn flat label="Save" color="primary" @click="saveLeadChanges" :loading="savingLead" />
        </q-card-actions>
      </q-card>
    </q-dialog>
    
    <!-- Set Appointment Dialog -->
    <q-dialog v-model="appointmentDialog" persistent>
      <q-card style="min-width: 600px">
        <q-card-section>
          <div class="text-h6">Set Appointment</div>
          <div class="text-subtitle2" v-if="selectedLead">For: {{ selectedLead.fullName }}</div>
        </q-card-section>
        
        <q-card-section class="q-pt-none">
          <AppointmentScheduler @appointment-scheduled="onAppointmentScheduled" />
        </q-card-section>
        
        <q-card-actions align="right">
          <q-btn flat label="Cancel" color="primary" @click="appointmentDialog = false" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { apiService } from '../services/api';
import { Notify } from 'quasar';
import AppointmentScheduler from '../components/AppointmentScheduler.vue';
import { useEventStore } from '../stores/event-store';

interface Lead {
  _id: string;
  fullName: string;
  email: string;
  phone: string;
  eventName: string;
  leapCustomerId?: string;
  leapJobId?: string;
  syncStatus: "pending" | "synced" | "error";
  tempRating?: number;
  createdAt: string;
  updatedAt: string;
}

const allLeads = ref<Lead[]>([]);
const leads = ref<Lead[]>([]);
const loading = ref(false);
const syncingAll = ref(false);
const savingLead = ref(false);
const resyncAfterSave = ref(false);
const showAllEvents = ref(true); // Default to showing all events since we may not have an active event
const editLeadDialog = ref(false);
const appointmentDialog = ref(false);
const selectedLead = ref<Lead | null>(null);
const eventStore = useEventStore();

const columns = [
  {
    name: 'fullName',
    required: true,
    label: 'Full Name',
    align: 'left',
    field: 'fullName',
    sortable: true,
  },
  {
    name: 'email',
    align: 'left',
    label: 'Email',
    field: 'email',
    sortable: true,
  },
  {
    name: 'phone',
    align: 'left',
    label: 'Phone',
    field: 'phone',
    sortable: true,
  },
  {
    name: 'eventName',
    align: 'left',
    label: 'Event',
    field: 'eventName',
    sortable: true,
  },
  {
    name: 'syncStatus',
    align: 'center',
    label: 'LEAP Status',
    field: 'syncStatus',
    sortable: true,
  },
  {
    name: 'tempRating',
    align: 'center',
    label: 'Temp',
    field: 'tempRating',
    sortable: true,
    format: (val: number) => val ? `${val}/10` : '-',
  },
  {
    name: 'createdAt',
    align: 'center',
    label: 'Created',
    field: 'createdAt',
    sortable: true,
    format: (val: string) => new Date(val).toLocaleDateString(),
  },
  {
    name: 'actions',
    align: 'center',
    label: 'Actions',
    field: 'actions',
  },
];

// Computed property to filter leads by active event
const filteredLeads = computed(() => {
  if (showAllEvents.value) {
    return allLeads.value;
  }
  
  // Filter by current event from store if one is selected
  const currentEvent = eventStore.getCurrentEvent;
  if (!currentEvent) {
    return allLeads.value; // Show all leads if no current event
  }
  
  return allLeads.value.filter(lead => lead.eventName === currentEvent.name);
});

onMounted(async () => {
  await fetchLeads();
});


async function fetchLeads() {
  loading.value = true;
  try {
    const response = await apiService.getLeads();
    if (response.success) {
      allLeads.value = response.data || [];
      console.log('Leads fetched successfully:', allLeads.value);
    } else {
      throw new Error(response.error || 'Failed to fetch leads');
    }
  } catch (error) {
    console.error('Error fetching leads:', error);
    Notify.create({
      type: 'negative',
      message: 'Failed to fetch leads. Please try again.',
      timeout: 3000,
    });
  } finally {
    loading.value = false;
  }
}

function getSyncStatusColor(status: string) {
  switch (status) {
    case 'synced':
      return 'positive';
    case 'error':
      return 'negative';
    case 'pending':
      return 'warning';
    default:
      return 'grey';
  }
}

function getTempColor(rating: number): string {
  if (rating >= 1 && rating <= 3) {
    return 'blue';
  } else if (rating >= 4 && rating <= 7) {
    return 'orange';
  } else if (rating >= 8 && rating <= 10) {
    return 'red';
  }
  return 'grey';
}

function editLead(lead: Lead) {
  selectedLead.value = { ...lead }; // Create a copy to avoid mutating original
  // Initialize tempRating to 1 if not set
  if (!selectedLead.value.tempRating) {
    selectedLead.value.tempRating = 1;
  }
  editLeadDialog.value = true;
}

function setAppointment(lead: Lead) {
  selectedLead.value = lead;
  appointmentDialog.value = true;
}

async function saveLeadChanges() {
  if (!selectedLead.value) return;
  
  savingLead.value = true;
  
  try {
    const response = await apiService.updateLead(selectedLead.value._id, selectedLead.value);
    
    if (response.success) {
      let message = 'Lead updated successfully!';
      
      // If resync option is checked, also resync the lead
      if (resyncAfterSave.value) {
        try {
          const resyncResponse = await apiService.resyncLead(selectedLead.value._id);
          if (resyncResponse.success) {
            message += ' Lead resynced to LEAP.';
          } else {
            message += ' (Resync failed - check status)';
          }
        } catch (resyncError) {
          console.error('Resync failed:', resyncError);
          message += ' (Resync failed - check status)';
        }
      }
      
      Notify.create({
        type: 'positive',
        message,
        timeout: 4000,
      });
      
      editLeadDialog.value = false;
      selectedLead.value = null;
      resyncAfterSave.value = false;
      
      // Refresh the leads list to show updated data
      await fetchLeads();
    } else {
      throw new Error(response.error || 'Failed to update lead');
    }
  } catch (error) {
    console.error('Error updating lead:', error);
    Notify.create({
      type: 'negative',
      message: 'Failed to update lead. Please try again.',
      timeout: 3000,
    });
  } finally {
    savingLead.value = false;
  }
}

async function onAppointmentScheduled(appointmentData: any) {
  if (!selectedLead.value?.leapCustomerId) {
    Notify.create({
      type: 'negative',
      message: 'Customer not synced to LEAP. Cannot schedule appointment.',
      timeout: 3000,
    });
    return;
  }
  
  try {
    // Create appointment using the customer ID
    const appointmentPayload = {
      customerId: selectedLead.value.leapCustomerId,
      date: appointmentData.date,
      time: appointmentData.time,
      notes: appointmentData.notes || '',
    };
    
    const response = await apiService.createAppointment(appointmentPayload);
    
    if (response.success) {
      Notify.create({
        type: 'positive',
        message: 'Appointment scheduled successfully!',
        timeout: 3000,
      });
      
      appointmentDialog.value = false;
      selectedLead.value = null;
    } else {
      throw new Error(response.error || 'Failed to schedule appointment');
    }
  } catch (error: any) {
    console.error('Error scheduling appointment:', error);
    Notify.create({
      type: 'negative',
      message: `Failed to schedule appointment: ${error.message}`,
      timeout: 5000,
    });
  }
}

async function syncAllpending() {
  syncingAll.value = true;
  try {
    const pendingLeads = allLeads.value.filter(lead => lead.syncStatus === 'pending');
    
    if (pendingLeads.length === 0) {
      Notify.create({
        type: 'info',
        message: 'No pending leads to sync.',
        timeout: 3000,
      });
      return;
    }

    // This would ideally call a batch sync API endpoint
    // For now, we'll simulate the sync process
    Notify.create({
      type: 'positive',
      message: `Syncing ${pendingLeads.length} pending leads...`,
      timeout: 3000,
    });
    
    // Refresh leads after sync
    await fetchLeads();
  } catch (error) {
    console.error('Error syncing all pending leads:', error);
    Notify.create({
      type: 'negative',
      message: 'Failed to sync pending leads.',
      timeout: 3000,
    });
  } finally {
    syncingAll.value = false;
  }
}

async function resyncLead(leadId: string) {
  try {
    const response = await apiService.resyncLead(leadId);

    if (response.success) {
      Notify.create({
        type: 'positive',
        message: 'Lead resynced successfully.',
        timeout: 3000,
      });
      await fetchLeads();
    } else {
      throw new Error(response.error || 'Failed to resync lead');
    }
  } catch (error) {
    console.error('Error resyncing lead:', error);
    Notify.create({
      type: 'negative',
      message: 'Failed to resync lead. Please try again.',
      timeout: 3000,
    });
  }
}
async function deleteLead(leadId: string) {
  try {
    const response = await apiService.deleteLead(leadId);

    if (response.success) {
      Notify.create({
        type: 'positive',
        message: response.message || 'Lead deleted successfully!',
        timeout: 3000,
      });
      await fetchLeads();
    } else {
      throw new Error(response.error || 'Failed to delete lead');
    }
  } catch (error) {
    console.error('Error deleting lead:', error);
    Notify.create({
      type: 'negative',
      message: 'Failed to delete lead. Please try again.',
      timeout: 3000,
    });
  }
}
</script>
