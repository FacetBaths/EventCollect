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

    <!-- Leads Grid -->
    <div class="q-mb-md">
      <!-- Mobile View Toggle -->
      <div class="row items-center q-mb-md">
        <q-space />
        <q-btn-toggle
          v-model="viewMode"
          spread
          no-caps
          rounded
          unelevated
          toggle-color="primary"
          color="white"
          text-color="primary"
          :options="[
            {label: 'Cards', value: 'cards', icon: 'view_module'},
            {label: 'Table', value: 'table', icon: 'table_chart'}
          ]"
        />
      </div>

      <!-- Card View -->
      <div v-if="viewMode === 'cards'" class="leads-grid">
        <div v-if="loading" class="text-center q-pa-lg">
          <q-spinner-dots size="50px" color="primary" />
          <div class="text-body2 text-grey-6 q-mt-md">Loading leads...</div>
        </div>
        
        <div v-else-if="filteredLeads.length === 0" class="text-center q-pa-xl">
          <q-icon name="people" size="4rem" color="grey-5" />
          <div class="text-h6 text-grey-6 q-mt-md">No leads found</div>
        </div>
        
        <div v-else class="row q-col-gutter-md">
          <div 
            v-for="lead in paginatedLeads" 
            :key="lead._id" 
            class="col-12 col-sm-6 col-md-4"
          >
            <LeadCard 
              :lead="lead"
              @edit="editLead"
              @set-appointment="setAppointment"
              @resync="resyncLead"
              @delete="deleteLead"
            />
          </div>
        </div>
        
        <!-- Pagination for Cards -->
        <div v-if="totalPages > 1" class="row justify-center q-mt-md">
          <q-pagination
            v-model="currentPage"
            :max="totalPages"
            :max-pages="6"
            boundary-numbers
          />
        </div>
      </div>

      <!-- Table View -->
      <div v-else>
        <q-table
          :rows="filteredLeads"
          :columns="columns"
          row-key="_id"
          :loading="loading"
          flat
          bordered
          :pagination="{ rowsPerPage: 20 }"
        >
          <!-- Custom cell rendering for status and temp -->
          <template v-slot:body-cell-syncStatus="props">
            <q-td :props="props">
              <q-chip
                :color="getSyncStatusColor(props.value)"
                text-color="white"
                :label="props.value.toUpperCase()"
                size="sm"
              />
            </q-td>
          </template>
          
          <template v-slot:body-cell-tempRating="props">
            <q-td :props="props">
              <q-chip
                v-if="props.value"
                :color="getTempColor(props.value)"
                text-color="white"
                :label="`${props.value}/10`"
                size="sm"
              />
              <span v-else class="text-grey-5">-</span>
            </q-td>
          </template>
          
          <!-- Actions column -->
          <template v-slot:body-cell-actions="props">
            <q-td :props="props">
              <div class="q-gutter-xs">
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
              </div>
            </q-td>
          </template>
        </q-table>
      </div>
    </div>
    
    <!-- Edit Lead Dialog -->
    <q-dialog v-model="editLeadDialog" persistent :maximized="$q.screen.lt.md" :full-width="$q.screen.lt.lg">
      <q-card :style="$q.screen.gt.sm ? 'min-width: 800px; max-width: 1200px; width: 90vw;' : 'width: 100vw; height: 100vh;'">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">Edit Lead</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        
        <q-card-section v-if="selectedLead" class="q-pt-sm" :class="$q.screen.lt.md ? 'q-pa-sm' : ''">
          <!-- Mobile: Collapsible Sections -->
          <div v-if="$q.screen.lt.md">
            <!-- Basic Information -->
            <q-expansion-item
              default-opened
              icon="person"
              label="Basic Information"
              class="q-mb-md"
            >
              <q-card>
                <q-card-section>
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
                </q-card-section>
              </q-card>
            </q-expansion-item>

            <!-- Address -->
            <q-expansion-item
              icon="location_on"
              label="Address"
              class="q-mb-md"
            >
              <q-card>
                <q-card-section>
                  <q-input
                    filled
                    v-model="selectedLead.address.street"
                    label="Street"
                    class="q-mb-sm"
                  />
                  <div class="row q-gutter-sm">
                    <q-input
                      filled
                      v-model="selectedLead.address.city"
                      label="City"
                      class="col"
                    />
                    <q-input
                      filled
                      v-model="selectedLead.address.state"
                      label="State"
                      class="col-4"
                    />
                  </div>
                  <q-input
                    filled
                    v-model="selectedLead.address.zipCode"
                    label="Zip Code"
                    class="q-mt-sm"
                  />
                </q-card-section>
              </q-card>
            </q-expansion-item>

            <!-- Services & Notes -->
            <q-expansion-item
              icon="handyman"
              label="Services & Notes"
              class="q-mb-md"
            >
              <q-card>
                <q-card-section>
                  <q-select
                    filled
                    v-model="selectedLead.servicesOfInterest"
                    multiple
                    :options="[]"
                    use-chips
                    stack-label
                    label="Services of Interest"
                    class="q-mb-md"
                  />
                  <q-input
                    filled
                    v-model="selectedLead.notes"
                    label="Notes"
                    type="textarea"
                    rows="3"
                    class="q-mb-md"
                  />
                </q-card-section>
              </q-card>
            </q-expansion-item>

            <!-- Temperature Rating -->
            <q-expansion-item
              icon="thermostat"
              label="Prospect Temperature"
              class="q-mb-md"
            >
              <q-card>
                <q-card-section>
                  <div class="row items-center q-gutter-sm q-mb-sm">
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
                    <div class="text-weight-bold col-auto" :class="`text-${getTempColor(selectedLead.tempRating || 1)}`">
                      {{ selectedLead.tempRating || 1 }}/10
                    </div>
                  </div>
                  <div class="text-caption text-grey-6">
                    1-3: Cold (Blue) | 4-7: Warm (Orange) | 8-10: Hot (Red)
                  </div>
                </q-card-section>
              </q-card>
            </q-expansion-item>

            <!-- LEAP CRM Details -->
            <q-expansion-item
              icon="cloud"
              label="LEAP CRM Details"
              class="q-mb-md"
            >
              <q-card>
                <q-card-section>
                  <div class="row q-gutter-sm q-mb-sm">
                    <q-input
                      filled
                      v-model.number="selectedLead.tradeIds"
                      label="Trade IDs"
                      class="col"
                    />
                    <q-input
                      filled
                      v-model.number="selectedLead.workTypeIds"
                      label="Work Type IDs"
                      class="col"
                    />
                  </div>
                  <div class="row q-gutter-sm q-mb-sm">
                    <q-input
                      filled
                      v-model.number="selectedLead.salesRepId"
                      label="Sales Rep ID"
                      class="col"
                    />
                    <q-input
                      filled
                      v-model.number="selectedLead.callCenterRepId"
                      label="Call Center Rep ID"
                      class="col"
                    />
                  </div>
                  <q-input
                    filled
                    v-model.number="selectedLead.divisionId"
                    label="Division ID"
                    class="q-mb-sm"
                  />
                </q-card-section>
              </q-card>
            </q-expansion-item>

            <!-- Referral Information -->
            <q-expansion-item
              icon="how_to_reg"
              label="Referral Information"
              class="q-mb-md"
            >
              <q-card>
                <q-card-section>
                  <q-input
                    filled
                    v-model="selectedLead.referredBy"
                    label="Referred By"
                    class="q-mb-sm"
                  />
                  <div class="row q-gutter-sm q-mb-sm">
                    <q-input
                      filled
                      v-model="selectedLead.referred_by_type"
                      label="Referral Type"
                      class="col"
                    />
                    <q-input
                      filled
                      v-model.number="selectedLead.referred_by_id"
                      label="Referral ID"
                      class="col-4"
                    />
                  </div>
                  <q-input
                    filled
                    v-model="selectedLead.referred_by_note"
                    label="Referral Note"
                    class="q-mb-sm"
                  />
                </q-card-section>
              </q-card>
            </q-expansion-item>

            <!-- Sync Error (if any) -->
            <div v-if="selectedLead.syncStatus === 'error'" class="q-mb-md">
              <q-banner class="text-white bg-negative" rounded>
                <template v-slot:avatar>
                  <q-icon name="error" />
                </template>
                Last sync error: {{ selectedLead.syncError || 'Unknown error' }}
              </q-banner>
            </div>
          </div>

          <!-- Desktop: Two Column Layout -->
          <div v-else class="row q-gutter-md">
            <div class="col">
              <div class="text-subtitle1 text-weight-medium q-mb-md">Basic Information</div>
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
              
              <div class="text-subtitle1 text-weight-medium q-mb-md q-mt-lg">Address</div>
              <q-input
                filled
                v-model="selectedLead.address.street"
                label="Street"
                class="q-mb-sm"
              />
              <div class="row q-gutter-sm">
                <q-input
                  filled
                  v-model="selectedLead.address.city"
                  label="City"
                  class="col"
                />
                <q-input
                  filled
                  v-model="selectedLead.address.state"
                  label="State"
                  class="col-4"
                />
              </div>
              <q-input
                filled
                v-model="selectedLead.address.zipCode"
                label="Zip Code"
                class="q-mt-sm"
              />
            </div>
            
            <div class="col">
              <div class="text-subtitle1 text-weight-medium q-mb-md">Services & Details</div>
              <q-select
                filled
                v-model="selectedLead.servicesOfInterest"
                multiple
                :options="[]"
                use-chips
                stack-label
                label="Services of Interest"
                class="q-mb-md"
              />
              <q-input
                filled
                v-model="selectedLead.notes"
                label="Notes"
                type="textarea"
                rows="3"
                class="q-mb-md"
              />

              <!-- Temperature Rating -->
              <div class="text-subtitle1 text-weight-medium q-mb-md q-mt-lg">Prospect Temperature</div>
              <div class="row items-center q-gutter-sm q-mb-sm">
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
                <div class="text-weight-bold col-auto" :class="`text-${getTempColor(selectedLead.tempRating || 1)}`">
                  {{ selectedLead.tempRating || 1 }}/10
                </div>
              </div>
              <div class="text-caption text-grey-6 q-mb-md">
                1-3: Cold (Blue) | 4-7: Warm (Orange) | 8-10: Hot (Red)
              </div>

              <!-- LEAP CRM Details -->
              <div class="text-subtitle1 text-weight-medium q-mb-md q-mt-lg">LEAP CRM Details</div>
              <div class="row q-gutter-sm q-mb-sm">
                <q-input
                  filled
                  v-model.number="selectedLead.tradeIds"
                  label="Trade IDs"
                  class="col"
                />
                <q-input
                  filled
                  v-model.number="selectedLead.workTypeIds"
                  label="Work Type IDs"
                  class="col"
                />
              </div>
              <div class="row q-gutter-sm q-mb-sm">
                <q-input
                  filled
                  v-model.number="selectedLead.salesRepId"
                  label="Sales Rep ID"
                  class="col"
                />
                <q-input
                  filled
                  v-model.number="selectedLead.callCenterRepId"
                  label="Call Center Rep ID"
                  class="col"
                />
              </div>
              <q-input
                filled
                v-model.number="selectedLead.divisionId"
                label="Division ID"
                class="q-mb-md"
              />

              <!-- Referral Information -->
              <div class="text-subtitle1 text-weight-medium q-mb-md q-mt-lg">Referral Information</div>
              <q-input
                filled
                v-model="selectedLead.referredBy"
                label="Referred By"
                class="q-mb-sm"
              />
              <div class="row q-gutter-sm q-mb-sm">
                <q-input
                  filled
                  v-model="selectedLead.referred_by_type"
                  label="Referral Type"
                  class="col"
                />
                <q-input
                  filled
                  v-model.number="selectedLead.referred_by_id"
                  label="Referral ID"
                  class="col-4"
                />
              </div>
              <q-input
                filled
                v-model="selectedLead.referred_by_note"
                label="Referral Note"
                class="q-mb-md"
              />
              
              <!-- Sync Error (if any) -->
              <div v-if="selectedLead.syncStatus === 'error'" class="q-mb-md">
                <q-banner class="text-white bg-negative" rounded>
                  <template v-slot:avatar>
                    <q-icon name="error" />
                  </template>
                  Last sync error: {{ selectedLead.syncError || 'Unknown error' }}
                </q-banner>
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
        
        <q-card-actions align="right" :class="$q.screen.lt.md ? 'q-pa-md' : ''">
          <q-btn flat label="Cancel" color="primary" @click="editLeadDialog = false" />
          <q-btn unelevated label="Save" color="primary" @click="saveLeadChanges" :loading="savingLead" />
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
import LeadCard from '../components/LeadCard.vue';
import { useEventStore } from '../stores/event-store';

interface Lead {
  _id: string;
  fullName: string;
  email: string;
  phone: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  servicesOfInterest: string[];
  tradeIds?: number[];
  workTypeIds?: number[];
  salesRepId?: number;
  callCenterRepId?: number;
  divisionId?: number;
  tempRating?: number;
  notes?: string;
  wantsAppointment: boolean;
  appointmentDetails?: {
    staffMemberId?: string;
    preferredDate: string;
    preferredTime: string;
    notes?: string;
  };
  eventId?: string;
  eventName?: string;
  referredBy?: string;
  referred_by_type?: string;
  referred_by_id?: number;
  referred_by_note?: string;
  leapProspectId?: string;
  leapCustomerId?: string;
  leapJobId?: string;
  leapAppointmentId?: string;
  syncStatus: "pending" | "synced" | "error";
  syncError?: string;
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

// View mode and pagination
const viewMode = ref('cards'); // 'cards' or 'table'
const currentPage = ref(1);
const itemsPerPage = 12;

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

// Computed property for pagination
const totalPages = computed(() => {
  return Math.ceil(filteredLeads.value.length / itemsPerPage);
});

const paginatedLeads = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  return filteredLeads.value.slice(start, end);
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
  
  // Initialize fields if not set
  if (!selectedLead.value.tempRating) {
    selectedLead.value.tempRating = 1;
  }
  if (!selectedLead.value.address) {
    selectedLead.value.address = {
      street: '',
      city: '',
      state: '',
      zipCode: ''
    };
  }
  if (!selectedLead.value.servicesOfInterest) {
    selectedLead.value.servicesOfInterest = [];
  }
  if (!selectedLead.value.notes) {
    selectedLead.value.notes = '';
  }
  if (!selectedLead.value.tradeIds) {
    selectedLead.value.tradeIds = [];
  }
  if (!selectedLead.value.workTypeIds) {
    selectedLead.value.workTypeIds = [];
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

    Notify.create({
      type: 'info',
      message: `Starting sync of ${pendingLeads.length} pending leads...`,
      timeout: 2000,
    });
    
    const response = await apiService.syncPendingLeads();
    
    if (response.success) {
      const results = response.data;
      const { totalProcessed, successful, failed } = results;
      
      if (successful > 0) {
        Notify.create({
          type: 'positive',
          message: `Bulk sync completed: ${successful} successful${failed > 0 ? `, ${failed} failed` : ''}`,
          timeout: 5000,
        });
      } else if (failed > 0) {
        Notify.create({
          type: 'negative',
          message: `Bulk sync failed: ${failed} leads could not be synced`,
          timeout: 5000,
        });
      }
      
      console.log('Bulk sync results:', results);
    } else {
      throw new Error(response.error || 'Bulk sync failed');
    }
    
    // Refresh leads after sync
    await fetchLeads();
  } catch (error: any) {
    console.error('Error syncing all pending leads:', error);
    Notify.create({
      type: 'negative',
      message: error.message || 'Failed to sync pending leads.',
      timeout: 5000,
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
