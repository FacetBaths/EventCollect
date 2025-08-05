
<template>
  <q-card class="lead-card q-mb-md" flat bordered>
    <q-card-section>
      <div class="row items-start no-wrap">
        <div class="col">
          <div class="text-h6 q-mb-sm">{{ lead.fullName }}</div>
          <div class="text-subtitle2 text-grey-7 q-mb-xs">
            <q-icon name="mail" size="sm" class="q-mr-xs" />{{ lead.email }}
          </div>
          <div class="text-subtitle2 text-grey-7 q-mb-xs">
            <q-icon name="phone" size="sm" class="q-mr-xs" />{{ lead.phone }}
          </div>
          <div class="text-caption text-grey-6">
            <q-icon name="event" size="sm" class="q-mr-xs" />{{ lead.eventName || 'No event' }}
          </div>
          <div class="text-caption text-grey-6">
            <q-icon name="schedule" size="sm" class="q-mr-xs" />{{ formatDate(lead.createdAt) }}
          </div>
        </div>
        <div class="col-auto">
          <q-btn flat round icon="more_vert" size="sm">
            <q-menu>
              <q-list style="min-width: 150px">
                <q-item clickable v-close-popup @click="$emit('edit', lead)">
                  <q-item-section avatar>
                    <q-icon name="edit" />
                  </q-item-section>
                  <q-item-section>Edit</q-item-section>
                </q-item>
                <q-item clickable v-close-popup @click="$emit('set-appointment', lead)">
                  <q-item-section avatar>
                    <q-icon name="event" />
                  </q-item-section>
                  <q-item-section>Set Appointment</q-item-section>
                </q-item>
                <q-item v-if="lead.syncStatus === 'error'" clickable v-close-popup @click="$emit('resync', lead._id)">
                  <q-item-section avatar>
                    <q-icon name="sync" />
                  </q-item-section>
                  <q-item-section>Resync</q-item-section>
                </q-item>
                <q-separator />
                <q-item clickable v-close-popup @click="$emit('delete', lead._id)">
                  <q-item-section avatar>
                    <q-icon name="delete" color="negative" />
                  </q-item-section>
                  <q-item-section>Delete</q-item-section>
                </q-item>
              </q-list>
            </q-menu>
          </q-btn>
        </div>
      </div>
    </q-card-section>

    <q-card-section class="q-pt-none">
      <div class="row items-center q-gutter-sm">
        <q-chip :color="getSyncStatusColor(lead.syncStatus)" text-color="white" size="sm" dense>
          <q-avatar :icon="getSyncStatusIcon(lead.syncStatus)" size="sm" />
          {{ lead.syncStatus.toUpperCase() }}
        </q-chip>

        <q-chip :color="getTempColor(lead.tempRating)" text-color="white" size="sm" dense>
          <q-avatar :icon="getTempIcon(lead.tempRating)" size="sm" />
          {{ lead.tempRating || 'N/A' }}/10
        </q-chip>

        <q-chip v-if="lead.wantsAppointment" color="info" text-color="white" size="sm" dense>
          <q-avatar icon="event_available" size="sm" />
          Appt
        </q-chip>
        
        <q-chip v-if="lead.notes" color="grey-6" text-color="white" size="sm" dense>
          <q-avatar icon="note" size="sm" />
          Notes
        </q-chip>
      </div>
    </q-card-section>

    <q-card-actions class="bg-grey-2 q-pa-sm">
      <q-btn flat dense color="primary" icon="edit" @click="$emit('edit', lead)" size="sm">
        <q-tooltip>Edit</q-tooltip>
      </q-btn>
      <q-btn flat dense color="secondary" icon="event" @click="$emit('set-appointment', lead)" size="sm">
        <q-tooltip>Set Appointment</q-tooltip>
      </q-btn>
      <q-btn v-if="lead.syncStatus === 'error'" flat dense color="warning" icon="sync" @click="$emit('resync', lead._id)" size="sm">
        <q-tooltip>Resync</q-tooltip>
      </q-btn>
      <q-space />
      <q-btn flat dense color="negative" icon="delete" @click="$emit('delete', lead._id)" size="sm">
        <q-tooltip>Delete</q-tooltip>
      </q-btn>
    </q-card-actions>
  </q-card>
</template>

<script setup lang="ts">
import { defineProps } from 'vue';

const props = defineProps({
  lead: {
    type: Object as () => any,
    required: true,
  },
});

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

function getSyncStatusIcon(status: string) {
  switch (status) {
    case 'synced':
      return 'cloud_done';
    case 'error':
      return 'cloud_off';
    case 'pending':
      return 'cloud_upload';
    default:
      return 'cloud';
  }
}

function getTempColor(rating?: number): string {
  if (!rating) return 'grey';
  if (rating >= 1 && rating <= 3) {
    return 'blue';
  }
  if (rating >= 4 && rating <= 7) {
    return 'orange';
  }
  if (rating >= 8 && rating <= 10) {
    return 'red';
  }
  return 'grey';
}

function getTempIcon(rating?: number): string {
  if (!rating) return 'thermostat';
  if (rating >= 8) {
    return 'local_fire_department';
  }
  return 'thermostat';
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}
</script>

<style scoped>
.lead-card {
  transition: box-shadow 0.3s;
}

.lead-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}
</style>

