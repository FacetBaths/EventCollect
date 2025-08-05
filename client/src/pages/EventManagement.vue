<template>
  <q-page class="q-pa-md">
    <div class="text-h4 text-primary text-center">Event Management</div>
    <div v-if="loading" class="text-subtitle1 text-center q-mt-sm">
      Loading events...
    </div>
    <div v-else>
      <!-- Add Event Button -->
      <div class="text-center q-mb-md">
        <q-btn 
          color="primary" 
          icon="add" 
          label="Create New Event" 
          @click="showCreateDialog = true"
        />
      </div>

      <!-- Events List -->
      <q-list v-if="events.length > 0">
        <q-item
          v-for="event in events"
          :key="event.id"
          clickable
          @click="selectEvent(event)"
        >
          <q-item-section>
            <q-item-label>{{ event.name }}</q-item-label>
            <q-item-label caption v-if="event.description">{{ event.description }}</q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-badge v-if="event.isActive" color="positive" label="Active" />
            <q-badge v-else color="grey" label="Inactive" />
          </q-item-section>
        </q-item>
      </q-list>

      <!-- Empty State -->
      <div v-else class="text-center q-mt-xl">
        <q-icon name="event" size="4rem" color="grey-5" />
        <div class="text-h6 text-grey-6 q-mt-md">No events found</div>
        <div class="text-body2 text-grey-5 q-mt-sm">
          Create your first event to start collecting leads
        </div>
      </div>

      <!-- Selected Event Details -->
      <div v-if="selectedEvent" class="q-mt-md">
        <q-card>
          <q-card-section>
            <div class="text-h6">{{ selectedEvent.name }}</div>
            <div v-if="selectedEvent.description" class="text-body2 q-mt-sm">{{ selectedEvent.description }}</div>
            <div class="q-mt-sm">
              <q-badge v-if="selectedEvent.isActive" color="positive" label="Active" />
              <q-badge v-else color="grey" label="Inactive" />
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Create Event Dialog -->
    <q-dialog v-model="showCreateDialog">
      <q-card style="min-width: 400px">
        <q-card-section>
          <div class="text-h6">Create New Event</div>
        </q-card-section>

        <q-card-section class="q-pt-none">
          <q-input
            filled
            v-model="newEvent.name"
            label="Event Name"
            :rules="[val => !!val || 'Event name is required']"
          />
          <q-input
            filled
            v-model="newEvent.description"
            label="Description (optional)"
            type="textarea"
            class="q-mt-md"
          />
          <q-toggle
            v-model="newEvent.isActive"
            label="Set as active event"
            class="q-mt-md"
          />
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancel" @click="showCreateDialog = false" />
          <q-btn 
            flat 
            label="Create" 
            color="primary" 
            @click="createEvent"
            :loading="creating"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { Notify } from "quasar";
import { apiService } from "../services/api";
import { useEventStore } from "../stores/event-store";

// Event interface
interface Event {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const events = ref<Event[]>([]);
const selectedEvent = ref<Event | null>(null);
const loading = ref(true);
const eventStore = useEventStore();

// Create event dialog state
const showCreateDialog = ref(false);
const creating = ref(false);
const newEvent = ref({
  name: '',
  description: '',
  isActive: false
});

const fetchEvents = async () => {
  loading.value = true;
  try {
    const response = await apiService.getEvents();
    if (response.success && response.data) {
      const fetchedEvents = response.data as Event[];
      events.value = fetchedEvents;
      
      // Sync events to the store
      eventStore.setEvents(fetchedEvents);
      
      // Set the first active event as current if no current event is set
      const activeEvent = fetchedEvents.find(event => event.isActive);
      if (activeEvent && !eventStore.getCurrentEvent) {
        eventStore.setCurrentEvent(activeEvent);
      }
    }
  } catch (error) {
    console.error("Error fetching events:", error);
    Notify.create({
      type: 'negative',
      message: 'Failed to load events',
      timeout: 3000
    });
  } finally {
    loading.value = false;
  }
};

const selectEvent = (event: Event) => {
  selectedEvent.value = event;
  eventStore.setCurrentEvent(event);
};

const createEvent = async () => {
  if (!newEvent.value.name.trim()) {
    Notify.create({
      type: 'negative',
      message: 'Event name is required',
      timeout: 3000
    });
    return;
  }

  creating.value = true;
  try {
    const response = await apiService.createEvent({
      name: newEvent.value.name.trim(),
      description: newEvent.value.description.trim() || undefined,
      isActive: newEvent.value.isActive
    });

    if (response.success) {
      Notify.create({
        type: 'positive',
        message: 'Event created successfully!',
        timeout: 3000
      });
      
      // Store the isActive flag before resetting the form
      const wasActive = newEvent.value.isActive;
      
      // Reset form
      newEvent.value = {
        name: '',
        description: '',
        isActive: false
      };
      showCreateDialog.value = false;
      
      // Refresh events list
      await fetchEvents();
      
      // If this new event was marked as active, set it as current
      if (wasActive && response.data) {
        const createdEvent = response.data as Event;
        eventStore.setCurrentEvent(createdEvent);
      }
    } else {
      throw new Error(response.error || 'Failed to create event');
    }
  } catch (error: any) {
    console.error('Error creating event:', error);
    Notify.create({
      type: 'negative',
      message: error.message || 'Failed to create event',
      timeout: 3000
    });
  } finally {
    creating.value = false;
  }
};

onMounted(fetchEvents);
</script>
