<template>
  <q-page class="q-pa-md">
    <div class="text-h4 text-primary text-center">Leads Dashboard</div>
    
    <!-- Action Controls -->
    <div class="row items-center q-mb-sm q-gutter-xs flex-wrap">
      <q-toggle
        v-model="showAllEvents"
        label="Show All Events"
        color="primary"
        dense
        class="q-mr-xs"
      />
      <q-btn
        flat dense no-caps
        label="Refresh"
        @click="fetchLeads"
        color="primary"
        icon="refresh"
        :loading="loading"
      />
      <q-btn
        flat dense no-caps
        label="Sync Pending"
        @click="syncAllpending"
        color="orange"
        icon="sync"
        :loading="syncingAll"
      />
      <q-btn
        flat dense no-caps
        label="Import CSV"
        @click="showCsvImport = true"
        color="secondary"
        icon="file_upload"
      >
        <q-tooltip>Import Facebook leads from CSV file</q-tooltip>
      </q-btn>
      <q-btn
        flat dense no-caps
        :label="batchMode ? 'Cancel' : 'Select'"
        :color="batchMode ? 'grey' : 'purple'"
        icon="checklist"
        @click="toggleBatchMode"
      />
      <q-space />
      <span class="text-caption text-grey-7">{{ filteredLeads.length }} / {{ allLeads.length }} leads</span>
    </div>

    <!-- Filter Row -->
    <div class="row items-center q-mb-md q-gutter-sm flex-wrap">
      <q-select
        v-model="filterEvent"
        :options="eventOptions"
        label="Event"
        clearable dense outlined
        style="min-width: 170px; max-width: 220px"
        emit-value map-options
        :option-label="(v) => v"
        :option-value="(v) => v"
      >
        <template v-slot:prepend><q-icon name="event" size="xs" /></template>
      </q-select>

      <q-btn-toggle
        v-model="filterAppointment"
        :options="APPOINTMENT_FILTER_OPTIONS"
        dense no-caps
        toggle-color="teal-7"
        color="grey-2"
        text-color="grey-8"
        style="border: 1px solid #bdbdbd; border-radius: 4px"
      />

      <q-select
        v-model="filterSync"
        :options="SYNC_FILTER_OPTIONS"
        label="Status"
        clearable dense outlined
        emit-value map-options
        style="min-width: 120px; max-width: 160px"
      >
        <template v-slot:prepend><q-icon name="cloud" size="xs" /></template>
      </q-select>

      <q-btn
        v-if="filterEvent || filterAppointment !== 'all' || filterSync"
        flat dense no-caps
        icon="filter_alt_off"
        color="grey-6"
        label="Clear"
        @click="filterEvent = null; filterAppointment = 'all'; filterSync = null"
        size="sm"
      />

      <q-space />

      <!-- Cards/Table toggle moved here, right-aligned -->
      <q-btn-toggle
        v-model="viewMode"
        dense no-caps
        toggle-color="primary"
        color="white"
        text-color="primary"
        :options="[
          {label: 'Cards', value: 'cards', icon: 'view_module'},
          {label: 'Table', value: 'table', icon: 'table_chart'}
        ]"
        style="border: 1px solid #9c27b0; border-radius: 4px"
      />
    </div>
    
    <!-- Batch Action Bar -->
    <q-banner
      v-if="batchMode && selectedLeadIds.size > 0"
      rounded
      class="bg-purple-1 q-mb-md"
      style="border: 1px solid #9c27b0"
    >
      <template v-slot:avatar>
        <q-icon name="checklist" color="purple" />
      </template>
      <div class="row items-center q-gutter-md flex-wrap">
        <div class="text-weight-medium text-purple">
          {{ selectedLeadIds.size }} lead{{ selectedLeadIds.size === 1 ? '' : 's' }} selected
        </div>

        <!-- Event Name -->
        <q-select
          v-model="batchEventName"
          :options="eventOptions"
          use-input
          fill-input
          hide-selected
          input-debounce="0"
          label="Event Name"
          clearable
          dense
          outlined
          style="min-width: 200px"
          @filter="(val, update) => update()"
        />

        <!-- Sales Rep -->
        <q-select
          v-model="batchSalesRepId"
          :options="salesRepOptions"
          emit-value map-options clearable
          option-value="value" option-label="label"
          label="Sales Rep"
          dense outlined
          style="min-width: 180px"
          :loading="leapLoading"
        />

        <!-- Division -->
        <q-select
          v-model="batchDivisionId"
          :options="divisionOptions"
          emit-value map-options clearable
          option-value="value" option-label="label"
          label="Division"
          dense outlined
          style="min-width: 150px"
          :loading="leapLoading"
        />

        <!-- Temperature -->
        <div class="row items-center q-gutter-sm" style="min-width: 180px">
          <div class="text-caption text-grey-7 col-auto">Temp:</div>
          <q-slider
            v-model="batchTempRating"
            :min="1"
            :max="10"
            :step="1"
            snap
            :markers="true"
            :color="batchTempRating ? getTempColor(batchTempRating) : 'grey-4'"
            track-color="grey-3"
            class="col"
            style="min-width: 120px"
          />
          <div
            class="text-caption text-weight-bold col-auto"
            :class="batchTempRating ? `text-${getTempColor(batchTempRating)}` : 'text-grey-5'"
            style="width: 32px"
          >
            {{ batchTempRating ?? '–' }}/10
          </div>
          <q-btn
            v-if="batchTempRating"
            flat round dense
            icon="close"
            size="xs"
            color="grey"
            @click="batchTempRating = null"
          />
        </div>

        <q-btn
          label="Apply to Selected"
          color="purple"
          unelevated
          :loading="batchUpdating"
          :disable="!batchEventName && !batchTempRating && !batchSalesRepId && !batchDivisionId"
          @click="batchApplyChanges"
        />
        <q-btn flat label="Clear Selection" color="grey" @click="selectedLeadIds.value = new Set()" />
      </div>
    </q-banner>

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
      <!-- Batch select/deselect helpers -->
      <div v-if="batchMode" class="row q-gutter-sm q-mb-sm">
        <q-btn flat dense no-caps label="Select All" color="purple" icon="select_all" @click="selectAllPage" />
        <q-btn flat dense no-caps label="Deselect All" color="grey" icon="deselect" @click="selectedLeadIds = new Set()" />
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
            style="position: relative"
          >
            <!-- Batch selection checkbox overlay -->
            <div
              v-if="batchMode"
              style="position: absolute; top: 8px; left: 20px; z-index: 10"
              @click.stop
            >
              <q-checkbox
                :model-value="selectedLeadIds.has(lead._id)"
                color="purple"
                @update:model-value="toggleLeadSelection(lead._id)"
              />
            </div>
            <div
              :style="batchMode && selectedLeadIds.has(lead._id) ? 'outline: 2px solid #9c27b0; border-radius: 8px' : ''"
              @click="batchMode ? toggleLeadSelection(lead._id) : null"
            >
              <LeadCard 
                :lead="lead"
                :rep-name="lead.salesRepId ? (repNameMap.get(lead.salesRepId) || null) : null"
                @edit="editLead"
                @resync="resyncLead"
                @delete="deleteLead"
              />
            </div>
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
          :selection="batchMode ? 'multiple' : 'none'"
          v-model:selected="tableSelectedLeads"
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
                </q-btn>                <q-btn flat icon="sync" @click="resyncLead(props.row._id)" color="orange" size="sm" v-if="props.row.syncStatus === 'error'">
                  <q-tooltip>Resync to LEAP</q-tooltip>
                </q-btn>
                <q-btn flat icon="content_copy" @click="copyTableLead(props.row)" color="secondary" size="sm" :loading="copyingLeadIds.includes(props.row._id)">
                  <q-tooltip>Copy Lead Info</q-tooltip>
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
                  <q-select
                    filled
                    v-model="selectedLead.eventName"
                    :options="eventOptions"
                    use-input
                    fill-input
                    hide-selected
                    input-debounce="0"
                    label="Event Name"
                    hint="Select an existing event or type a custom name"
                    clearable
                    class="q-mb-md"
                    @filter="(val, update) => update()"
                  />
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

            <!-- Appointment Preferences -->
            <q-expansion-item
              icon="event"
              label="Appointment Preferences"
              class="q-mb-md"
              v-if="selectedLead.wantsAppointment || selectedLead.appointmentDetails"
            >
              <q-card>
                <q-card-section>
                  <q-toggle
                    v-model="selectedLead.wantsAppointment"
                    label="Wants Appointment"
                    color="primary"
                    class="q-mb-md"
                  />
                  
                  <div v-if="selectedLead.wantsAppointment">
                    <q-input
                      filled
                      v-model="selectedLead.appointmentDetails.preferredDate"
                      label="Preferred Date"
                      type="date"
                      class="q-mb-md"
                    />
                    
                    <q-select
                      filled
                      v-model="selectedLead.appointmentDetails.preferredTime"
                      :options="appointmentTimeSlots"
                      label="Preferred Time"
                      class="q-mb-md"
                    />
                    
                    <q-input
                      filled
                      v-model="selectedLead.appointmentDetails.notes"
                      label="Appointment Notes"
                      type="textarea"
                      rows="2"
                      class="q-mb-md"
                    />
                  </div>
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
                  <q-select
                    filled
                    v-model="selectedLead.tradeIds"
                    :options="tradeOptions"
                    multiple use-chips emit-value map-options
                    option-value="value" option-label="label"
                    label="Trades" class="q-mb-sm"
                    :loading="leapLoading"
                  />
                  <q-select
                    filled
                    v-model="selectedLead.workTypeIds"
                    :options="workTypeOptions"
                    multiple use-chips emit-value map-options
                    option-value="value" option-label="label"
                    label="Work Types" class="q-mb-sm"
                    :loading="leapLoading"
                  />
                  <q-select
                    filled
                    v-model="selectedLead.salesRepId"
                    :options="salesRepOptions"
                    emit-value map-options clearable
                    option-value="value" option-label="label"
                    label="Sales Rep" class="q-mb-sm"
                    :loading="leapLoading"
                  />
                  <q-select
                    filled
                    v-model="selectedLead.callCenterRepId"
                    :options="salesRepOptions"
                    emit-value map-options clearable
                    option-value="value" option-label="label"
                    label="Call Center Rep" class="q-mb-sm"
                    :loading="leapLoading"
                  />
                  <q-select
                    filled
                    v-model="selectedLead.divisionId"
                    :options="divisionOptions"
                    emit-value map-options clearable
                    option-value="value" option-label="label"
                    label="Division" class="q-mb-sm"
                    :loading="leapLoading"
                  />
                </q-card-section>
              </q-card>
            </q-expansion-item>

            <!-- Referral Information -->
            <q-expansion-item
              icon="how_to_reg"
              label="Event & Referral Information"
              class="q-mb-md"
            >
              <q-card>
                <q-card-section>
                  <q-select
                    filled
                    v-model="selectedLead.eventName"
                    :options="eventOptions"
                    use-input
                    fill-input
                    hide-selected
                    input-debounce="0"
                    label="Event Name"
                    hint="Select an existing event or type a custom name"
                    clearable
                    class="q-mb-md"
                    @filter="(val, update) => update()"
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
              <q-select
                filled
                v-model="selectedLead.tradeIds"
                :options="tradeOptions"
                multiple use-chips emit-value map-options
                option-value="value" option-label="label"
                label="Trades" class="q-mb-sm"
                :loading="leapLoading"
              />
              <q-select
                filled
                v-model="selectedLead.workTypeIds"
                :options="workTypeOptions"
                multiple use-chips emit-value map-options
                option-value="value" option-label="label"
                label="Work Types" class="q-mb-sm"
                :loading="leapLoading"
              />
              <div class="row q-gutter-sm q-mb-sm">
                <q-select
                  filled
                  v-model="selectedLead.salesRepId"
                  :options="salesRepOptions"
                  emit-value map-options clearable
                  option-value="value" option-label="label"
                  label="Sales Rep" class="col"
                  :loading="leapLoading"
                />
                <q-select
                  filled
                  v-model="selectedLead.callCenterRepId"
                  :options="salesRepOptions"
                  emit-value map-options clearable
                  option-value="value" option-label="label"
                  label="Call Center Rep" class="col"
                  :loading="leapLoading"
                />
              </div>
              <q-select
                filled
                v-model="selectedLead.divisionId"
                :options="divisionOptions"
                emit-value map-options clearable
                option-value="value" option-label="label"
                label="Division" class="q-mb-md"
                :loading="leapLoading"
              />
              
              <!-- Appointment Preferences (Desktop) -->
              <div class="text-subtitle1 text-weight-medium q-mb-md q-mt-lg" v-if="selectedLead.wantsAppointment || selectedLead.appointmentDetails">Appointment Preferences</div>
              <div v-if="selectedLead.wantsAppointment || selectedLead.appointmentDetails" class="q-mb-md">
                <q-toggle
                  v-model="selectedLead.wantsAppointment"
                  label="Wants Appointment"
                  color="primary"
                  class="q-mb-md"
                />
                
                <div v-if="selectedLead.wantsAppointment" class="row q-gutter-sm q-mb-sm">
                  <q-input
                    filled
                    v-model="selectedLead.appointmentDetails.preferredDate"
                    label="Preferred Date"
                    type="date"
                    class="col"
                  />
                  <q-select
                    filled
                    v-model="selectedLead.appointmentDetails.preferredTime"
                    :options="appointmentTimeSlots"
                    label="Preferred Time"
                    class="col"
                  />
                </div>
                
                <q-input
                  v-if="selectedLead.wantsAppointment"
                  filled
                  v-model="selectedLead.appointmentDetails.notes"
                  label="Appointment Notes"
                  type="textarea"
                  rows="2"
                  class="q-mb-md"
                />
              </div>
              
              <!-- Event & Referral Information -->
              <div class="text-subtitle1 text-weight-medium q-mb-md q-mt-lg">Event</div>
              <q-select
                filled
                v-model="selectedLead.eventName"
                :options="eventOptions"
                use-input
                fill-input
                hide-selected
                input-debounce="0"
                label="Event Name"
                hint="Select an existing event or type a custom name"
                clearable
                class="q-mb-md"
                @filter="(val, update) => update()"
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
    
    <!-- CSV Import Dialog -->
    <CsvImportDialog 
      v-model="showCsvImport" 
      @import-completed="onCsvImportCompleted" 
    />
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { apiService } from '../services/api';
import { Notify } from 'quasar';
import LeadCard from '../components/LeadCard.vue';
import CsvImportDialog from '../components/CsvImportDialog.vue';
import { useEventStore } from '../stores/event-store';
import { useCopyLead } from '../composables/useCopyLead';
import { useLeapData } from '../composables/useLeapData';

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

// Dashboard filters
const filterEvent = ref<string | null>(null);
const filterAppointment = ref<'all' | 'has' | 'none'>('all');
const filterSync = ref<string | null>(null);

const APPOINTMENT_FILTER_OPTIONS = [
  { label: 'All', value: 'all' },
  { label: 'Has Appointment', value: 'has' },
  { label: 'No Appointment', value: 'none' },
];
const SYNC_FILTER_OPTIONS = [
  { label: 'All', value: null },
  { label: 'Pending', value: 'pending' },
  { label: 'Synced', value: 'synced' },
  { label: 'Error', value: 'error' },
];
const editLeadDialog = ref(false);
const showCsvImport = ref(false);
const selectedLead = ref<Lead | null>(null);
const eventStore = useEventStore();
const eventOptions = ref<string[]>([]);

// LEAP CRM data (names for dropdowns)
const { salesRepOptions, divisionOptions, tradeOptions, workTypeOptions, loading: leapLoading } = useLeapData();

// Map from LEAP rep ID → display name for LeadCard avatar
const repNameMap = computed(() => {
  const m = new Map<number, string>();
  salesRepOptions.value.forEach(r => m.set(r.value, r.label));
  return m;
});

// Copy functionality
const { copyLeadToClipboard } = useCopyLead();
const copyingLeadIds = ref<string[]>([]);

// View mode and pagination
const viewMode = ref('cards'); // 'cards' or 'table'
const currentPage = ref(1);
const itemsPerPage = 12;

// Batch selection
const batchMode = ref(false);
let selectedLeadIds = ref(new Set<string>());
const batchEventName = ref('');
const batchTempRating = ref<number | null>(null);
const batchSalesRepId = ref<number | null>(null);
const batchDivisionId = ref<number | null>(null);
const batchUpdating = ref(false);
const tableSelectedLeads = ref<Lead[]>([]);

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

// Computed property to filter leads
const filteredLeads = computed(() => {
  let result = allLeads.value;

  // Event store quick-filter
  if (!showAllEvents.value) {
    const currentEvent = eventStore.getCurrentEvent;
    if (currentEvent) {
      result = result.filter(l => l.eventName === currentEvent.name);
    }
  }

  // Dashboard event filter
  if (filterEvent.value) {
    result = result.filter(l => l.eventName === filterEvent.value);
  }

  // Appointment filter
  if (filterAppointment.value === 'has') {
    result = result.filter(l => l.wantsAppointment && !!l.appointmentDetails?.preferredDate);
  } else if (filterAppointment.value === 'none') {
    result = result.filter(l => !l.wantsAppointment || !l.appointmentDetails?.preferredDate);
  }

  // Sync status filter
  if (filterSync.value) {
    result = result.filter(l => l.syncStatus === filterSync.value);
  }

  return result;
});

// Reset to page 1 whenever any filter changes
watch([filterEvent, filterAppointment, filterSync, showAllEvents], () => {
  currentPage.value = 1;
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
  await Promise.all([fetchLeads(), fetchEventOptions()]);
});

function cloneLead<T>(lead: T): T {
  // structuredClone cannot handle Vue reactive Proxy objects — use JSON roundtrip.
  return JSON.parse(JSON.stringify(lead)) as T;
}

function normalizeText(value?: string | null): string {
  return value?.trim() || '';
}

async function fetchEventOptions() {
  try {
    const response = await apiService.getEvents();
    if (response.success && response.data) {
      eventOptions.value = [...new Set(
        response.data
          .map((event: { name?: string }) => event.name?.trim())
          .filter((name): name is string => !!name)
      )];
    }
  } catch (error) {
    console.error('Error fetching event options:', error);
  }
}


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

// Batch select helpers
function toggleBatchMode() {
  batchMode.value = !batchMode.value;
  selectedLeadIds.value = new Set();
  tableSelectedLeads.value = [];
  batchEventName.value = '';
  batchTempRating.value = null;
  batchSalesRepId.value = null;
  batchDivisionId.value = null;
}

function toggleLeadSelection(id: string) {
  const next = new Set(selectedLeadIds.value);
  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }
  selectedLeadIds.value = next;
}

function selectAllPage() {
  const next = new Set(selectedLeadIds.value);
  paginatedLeads.value.forEach(l => next.add(l._id));
  selectedLeadIds.value = next;
}

async function batchApplyChanges() {
  const ids = viewMode.value === 'table'
    ? tableSelectedLeads.value.map(l => l._id)
    : [...selectedLeadIds.value];

  if (!ids.length || (!batchEventName.value && !batchTempRating.value && !batchSalesRepId.value && !batchDivisionId.value)) return;

  batchUpdating.value = true;
  const eventName = batchEventName.value?.trim() || null;
  const tempRating = batchTempRating.value;
  const salesRepId = batchSalesRepId.value;
  const divisionId = batchDivisionId.value;
  let succeeded = 0;
  let failed = 0;

  await Promise.allSettled(
    ids.map(async id => {
      try {
        const lead = allLeads.value.find(l => l._id === id);
        if (!lead) return;
        const patch: Record<string, any> = JSON.parse(JSON.stringify(lead));
        if (eventName) {
          patch.eventName = eventName;
          patch.referredBy = eventName;
          patch.referred_by_type = 'Event';
          patch.referred_by_id = 8;
          patch.referred_by_note = eventName;
        }
        if (tempRating !== null) {
          patch.tempRating = tempRating;
        }
        if (salesRepId !== null) {
          patch.salesRepId = salesRepId;
        }
        if (divisionId !== null) {
          patch.divisionId = divisionId;
        }
        // Normalize unset temp to 5 (warm) on every batch operation
        if (!patch.tempRating) {
          patch.tempRating = 5;
        }
        await apiService.updateLead(id, patch);
        succeeded++;
      } catch {
        failed++;
      }
    })
  );

  batchUpdating.value = false;

  const repName = salesRepId !== null
    ? salesRepOptions.value.find(r => r.value === salesRepId)?.label || `Rep #${salesRepId}`
    : null;
  const divName = divisionId !== null
    ? divisionOptions.value.find(d => d.value === divisionId)?.label || `Div #${divisionId}`
    : null;

  const changes = [
    eventName ? `event → "${eventName}"` : null,
    tempRating !== null ? `temp → ${tempRating}/10` : null,
    repName ? `rep → ${repName}` : null,
    divName ? `division → ${divName}` : null,
  ].filter(Boolean).join(', ');

  Notify.create({
    type: failed === 0 ? 'positive' : 'warning',
    message: failed === 0
      ? `Updated ${succeeded} lead${succeeded === 1 ? '' : 's'}: ${changes}`
      : `${succeeded} updated, ${failed} failed`,
    timeout: 4000,
  });

  // Refresh and clear
  await fetchLeads();
  selectedLeadIds.value = new Set();
  tableSelectedLeads.value = [];
  batchEventName.value = '';
  batchTempRating.value = null;
  batchSalesRepId.value = null;
  batchDivisionId.value = null;
}

function editLead(lead: Lead) {
  selectedLead.value = cloneLead(lead);
  
  // Initialize fields if not set
  if (!selectedLead.value.tempRating) {
    selectedLead.value.tempRating = 5; // Default to 5 (warm) when previously unset
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
  if (!selectedLead.value.eventName) {
    selectedLead.value.eventName = '';
  }
  selectedLead.value.referredBy = selectedLead.value.eventName;
  selectedLead.value.referred_by_type = 'Event';
  selectedLead.value.referred_by_id = 8;
  selectedLead.value.referred_by_note = selectedLead.value.eventName;
  
  // Initialize appointment details if needed
  if (!selectedLead.value.appointmentDetails) {
    selectedLead.value.appointmentDetails = {
      preferredDate: '',
      preferredTime: '',
      notes: ''
    };
  }
  
  editLeadDialog.value = true;
}

async function saveLeadChanges() {
  if (!selectedLead.value) return;
  
  savingLead.value = true;
  
  try {
    const leadToSave = cloneLead(selectedLead.value);

    leadToSave.eventName = normalizeText(leadToSave.eventName);
    leadToSave.referredBy = leadToSave.eventName;
    leadToSave.referred_by_type = 'Event';
    leadToSave.referred_by_id = 8;
    leadToSave.referred_by_note = leadToSave.eventName;

    const response = await apiService.updateLead(leadToSave._id, leadToSave);
    
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

// CSV import completion handler
async function onCsvImportCompleted(results: any) {
  console.log('CSV import completed:', results);
  showCsvImport.value = false;
  
  // Refresh the leads list to show the new imports
  await fetchLeads();
  
  // Show detailed notification
  if (results.successful > 0) {
    Notify.create({
      type: results.failed > 0 ? 'warning' : 'positive',
      message: `Successfully imported ${results.successful} Facebook leads${results.failed > 0 ? `. ${results.failed} leads failed to import.` : '.'}`,
      timeout: 6000,
      actions: [
        {
          label: 'View Leads',
          color: 'white',
          handler: () => {
            // Scroll to top to see new leads
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }
      ]
    });
  }
}

// Copy lead functionality for table view
async function copyTableLead(lead: Lead) {
  copyingLeadIds.value.push(lead._id);
  try {
    await copyLeadToClipboard(lead);
  } catch (error) {
    console.error('Error copying lead:', error);
  } finally {
    copyingLeadIds.value = copyingLeadIds.value.filter(id => id !== lead._id);
  }
}
</script>
