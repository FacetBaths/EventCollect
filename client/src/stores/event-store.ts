import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
// import type { Event } from '@eventcollect/shared';

// Temporary Event type until we set up the shared package
interface Event {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const useEventStore = defineStore('event', () => {
  // State
  const currentEvent = ref<Event | null>(null);
  const events = ref<Event[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Getters
  const getCurrentEvent = computed(() => currentEvent.value);
  const getEvents = computed(() => events.value);
  const getActiveEvents = computed(() => events.value.filter((event) => event.isActive));
  const isLoading = computed(() => loading.value);
  const getError = computed(() => error.value);

  // Actions
  function setCurrentEvent(event: Event | null) {
    currentEvent.value = event;
  }

  function setEvents(newEvents: Event[]) {
    events.value = newEvents;
  }

  function addEvent(event: Event) {
    events.value.push(event);
  }

  function updateEvent(updatedEvent: Event) {
    const index = events.value.findIndex((event) => event.id === updatedEvent.id);
    if (index !== -1) {
      events.value[index] = updatedEvent;
    }
  }

  function removeEvent(eventId: string) {
    events.value = events.value.filter((event) => event.id !== eventId);
  }

  function setLoading(value: boolean) {
    loading.value = value;
  }

  function setError(message: string | null) {
    error.value = message;
  }

  function clearError() {
    error.value = null;
  }

  return {
    // State
    currentEvent,
    events,
    loading,
    error,

    // Getters
    getCurrentEvent,
    getEvents,
    getActiveEvents,
    isLoading,
    getError,

    // Actions
    setCurrentEvent,
    setEvents,
    addEvent,
    updateEvent,
    removeEvent,
    setLoading,
    setError,
    clearError,
  };
});
