<template>
  <q-page class="q-pa-md">
    <div class="text-h4 text-primary text-center">Event Management</div>
    <div v-if="loading" class="text-subtitle1 text-center q-mt-sm">
      Loading events...
    </div>
    <div v-else>
      <q-list>
        <q-item
          v-for="event in events"
          :key="event.id"
          clickable
          @click="selectEvent(event)"
        >
          <q-item-section>{{ event.name }}</q-item-section>
        </q-item>
      </q-list>

      <div v-if="selectedEvent" class="q-mt-md">
        <h5>Selected Event:</h5>
        <p>{{ selectedEvent.name }}</p>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
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

const fetchEvents = async () => {
  loading.value = true;
  try {
    const response = await apiService.getEvents();
    if (response.success && response.data) {
      events.value = response.data as Event[];
    }
  } catch (error) {
    console.error("Error fetching events:", error);
  } finally {
    loading.value = false;
  }
};

const selectEvent = (event: Event) => {
  selectedEvent.value = event;
  eventStore.setCurrentEvent(event);
};

onMounted(fetchEvents);
// Event Management functionality will be implemented here
</script>
