
<template>
  <q-card
    class="lead-card q-mb-md lead-card--clickable"
    :class="{ 'lead-card--leap': leapUrl }"
    flat bordered
    @click="onCardClick"
  >
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
        <div class="col-auto row items-center q-gutter-xs">
          <!-- Sales Rep Avatar -->
          <q-avatar
            v-if="repName"
            :color="repAvatarColor"
            text-color="white"
            size="32px"
            class="rep-avatar"
          >
            <span class="text-caption text-weight-bold">{{ repInitials }}</span>
            <q-tooltip>{{ repName }}</q-tooltip>
          </q-avatar>
          <!-- Action indicator: open in JobProgress if synced, resync if not -->
          <q-icon
            :name="leapUrl ? 'open_in_new' : 'cloud_sync'"
            size="14px"
            :color="leapUrl ? 'purple-4' : 'orange-4'"
            class="leap-link-icon"
          >
            <q-tooltip>{{ leapUrl ? 'Open in JobProgress' : 'Click to sync to LEAP' }}</q-tooltip>
          </q-icon>
          <q-btn flat round icon="more_vert" size="sm" @click.stop>
            <q-menu v-model="actionMenuOpen">
              <q-list style="min-width: 150px">
                <q-item clickable @click="openEdit">
                  <q-item-section avatar>
                    <q-icon name="edit" />
                  </q-item-section>
                  <q-item-section>Edit</q-item-section>
                </q-item>                <q-item v-if="lead.syncStatus === 'error'" clickable @click="triggerResync">
                  <q-item-section avatar>
                    <q-icon name="sync" />
                  </q-item-section>
                  <q-item-section>Resync</q-item-section>
                </q-item>
                <q-item clickable @click="copyLead">
                  <q-item-section avatar>
                    <q-icon name="content_copy" :loading="copyLoading" />
                  </q-item-section>
                  <q-item-section>Copy Lead Info</q-item-section>
                </q-item>
                <q-separator />
                <q-item clickable @click="triggerDelete">
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

    <!-- Appointment Banner -->
    <q-card-section
      v-if="lead.wantsAppointment && lead.appointmentDetails?.preferredDate"
      class="q-pt-none q-pb-xs q-px-md"
    >
      <div class="appt-banner row items-center no-wrap q-pa-sm q-gutter-xs">
        <q-icon name="event_available" color="teal" size="sm" />
        <span class="text-caption text-teal-9 text-weight-medium">
          {{ formatAppointmentDate(lead.appointmentDetails.preferredDate) }}
        </span>
        <span v-if="lead.appointmentDetails?.preferredTime" class="text-caption text-teal-7">
          &nbsp;&bull;&nbsp;{{ lead.appointmentDetails.preferredTime }}
        </span>
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
        <q-chip v-if="lead.notes" color="grey-6" text-color="white" size="sm" dense>
          <q-avatar icon="note" size="sm" />
          Notes
        </q-chip>
      </div>
    </q-card-section>

    <q-card-actions class="bg-grey-2 q-pa-sm" @click.stop>
      <q-btn flat dense color="primary" icon="edit" @click="$emit('edit', lead)" size="sm">
        <q-tooltip>Edit</q-tooltip>
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
import { defineProps, computed, ref } from 'vue';
import { useCopyLead } from '../composables/useCopyLead';

// JobProgress deep-link — only available once the lead is synced and has both IDs
const leapUrl = computed(() => {
  const cid = props.lead.leapCustomerId;
  const jid = props.lead.leapJobId;
  if (!cid || !jid) return null;
  return `https://www.jobprogress.com/app/#/customer-jobs/${cid}/job/${jid}/overview`;
});

function onCardClick() {
  if (leapUrl.value) {
    window.open(leapUrl.value, '_blank', 'noopener,noreferrer');
  } else {
    // Lead not yet in LEAP or sync failed — trigger a fresh sync attempt
    emit('resync', props.lead._id);
  }
}

const props = defineProps({
  lead: {
    type: Object as () => any,
    required: true,
  },
  repName: {
    type: String as () => string | null | undefined,
    default: null,
  },
});
const emit = defineEmits(['edit', 'resync', 'delete']);

// Deterministic avatar color from rep name (cycles through 8 Quasar palette colors)
const REP_COLORS = ['blue-8', 'purple-8', 'deep-orange-8', 'teal-8', 'indigo-8', 'green-8', 'brown-8', 'cyan-8'];
const repAvatarColor = computed(() => {
  if (!props.repName) return 'grey-6';
  let hash = 0;
  for (let i = 0; i < props.repName.length; i++) hash = (hash * 31 + props.repName.charCodeAt(i)) & 0xffff;
  return REP_COLORS[hash % REP_COLORS.length];
});

const repInitials = computed(() => {
  if (!props.repName) return '';
  return props.repName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0]!.toUpperCase())
    .join('');
});

// Copy functionality
const { copyLeadToClipboard } = useCopyLead();
const copyLoading = ref(false);
const actionMenuOpen = ref(false);

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

function formatAppointmentDate(dateString: string): string {
  // Parse YYYY-MM-DD without UTC shift by using local noon
  const [y, m, d] = dateString.split('-').map(Number);
  const date = new Date(y!, (m! - 1), d!, 12, 0, 0);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
function closeMenuThen(action: () => void) {
  actionMenuOpen.value = false;
  // Use a small delay so the menu finishes closing before the action fires.
  // nextTick alone is not enough on iOS Safari — a 50ms timeout is reliable.
  window.setTimeout(action, 50);
}

function openEdit() {
  closeMenuThen(() => emit('edit', props.lead));
}

function triggerResync() {
  closeMenuThen(() => emit('resync', props.lead._id));
}

function triggerDelete() {
  closeMenuThen(() => emit('delete', props.lead._id));
}

// Copy lead functionality
async function copyLead() {
  actionMenuOpen.value = false;
  copyLoading.value = true;
  try {
    await copyLeadToClipboard(props.lead);
  } catch (error) {
    console.error('Error copying lead:', error);
  } finally {
    copyLoading.value = false;
  }
}
</script>

<style scoped>
.lead-card {
  transition: box-shadow 0.2s, border-color 0.2s;
}

.lead-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.lead-card--clickable {
  cursor: pointer;
}

/* Synced leads with a JP link: purple hover */
.lead-card--leap:hover {
  box-shadow: 0 4px 16px rgba(103, 58, 183, 0.18);
  border-color: rgba(103, 58, 183, 0.35) !important;
}

/* Unsynced leads: orange hint to match the sync icon */
.lead-card--clickable:not(.lead-card--leap):hover {
  box-shadow: 0 4px 12px rgba(255, 152, 0, 0.15);
  border-color: rgba(255, 152, 0, 0.3) !important;
}

.leap-link-icon {
  opacity: 0.6;
}

.rep-avatar {
  cursor: default;
  font-size: 11px;
}

.appt-banner {
  background: rgba(0, 150, 136, 0.08);
  border-left: 3px solid #00968880;
  border-radius: 4px;
}
</style>

