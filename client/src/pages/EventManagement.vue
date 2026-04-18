<template>
  <q-page class="q-pa-md">
    <div class="text-h4 text-primary text-center">Event Management</div>
    <div v-if="loading" class="text-subtitle1 text-center q-mt-sm">
      Loading events...
    </div>
    <div v-else>
      <div class="text-center q-mb-md">
        <q-btn
          color="primary"
          icon="add"
          label="Create New Event"
          @click="openCreateDialog"
        />
      </div>

      <q-list v-if="events.length > 0" separator>
        <q-item
          v-for="event in events"
          :key="getEventId(event)"
          clickable
          @click="selectEvent(event)"
        >
          <q-item-section>
            <q-item-label>{{ event.name }}</q-item-label>
            <q-item-label v-if="event.description" caption>
              {{ event.description }}
            </q-item-label>
          </q-item-section>

          <q-item-section side>
            <div class="row items-center q-gutter-xs justify-end">
              <q-badge v-if="event.isActive" color="positive" label="Active" />
              <q-badge v-else color="grey" label="Inactive" />

              <q-btn
                v-if="event.isActive"
                flat
                dense
                label="Deactivate"
                color="negative"
                @click.stop="toggleActive(event, false)"
              />
              <q-btn
                v-else
                flat
                dense
                label="Activate"
                color="positive"
                @click.stop="toggleActive(event, true)"
              />

              <q-btn
                flat
                dense
                round
                icon="edit"
                color="primary"
                @click.stop="openEditDialog(event)"
              >
                <q-tooltip>Edit Event</q-tooltip>
              </q-btn>

              <q-btn
                flat
                dense
                round
                icon="delete"
                color="negative"
                @click.stop="confirmDeleteEvent(event)"
              >
                <q-tooltip>Delete Event</q-tooltip>
              </q-btn>
            </div>
          </q-item-section>
        </q-item>
      </q-list>

      <div v-else class="text-center q-mt-xl">
        <q-icon name="event" size="4rem" color="grey-5" />
        <div class="text-h6 text-grey-6 q-mt-md">No events found</div>
        <div class="text-body2 text-grey-5 q-mt-sm">
          Create your first event to start collecting leads
        </div>
      </div>

      <div v-if="selectedEvent" class="q-mt-md">
        <q-card>
          <q-card-section>
            <div class="text-h6">{{ selectedEvent.name }}</div>
            <div v-if="selectedEvent.description" class="text-body2 q-mt-sm">
              {{ selectedEvent.description }}
            </div>
            <div class="q-mt-sm">
              <q-badge v-if="selectedEvent.isActive" color="positive" label="Active" />
              <q-badge v-else color="grey" label="Inactive" />
            </div>
          </q-card-section>

          <q-card-actions align="right">
            <q-btn
              flat
              icon="edit"
              label="Edit"
              color="primary"
              @click="openEditDialog(selectedEvent)"
            />
            <q-btn
              flat
              icon="delete"
              label="Delete"
              color="negative"
              @click="confirmDeleteEvent(selectedEvent)"
            />
          </q-card-actions>
        </q-card>
      </div>
    </div>

    <q-dialog v-model="showEventDialog">
      <q-card style="min-width: 400px">
        <q-card-section>
          <div class="text-h6">{{ isEditingEvent ? "Edit Event" : "Create New Event" }}</div>
        </q-card-section>

        <q-card-section class="q-pt-none">
          <q-input
            filled
            v-model="eventForm.name"
            label="Event Name"
            :rules="[val => !!val || 'Event name is required']"
          />
          <q-input
            filled
            v-model="eventForm.description"
            label="Description (optional)"
            type="textarea"
            class="q-mt-md"
          />
          <q-toggle
            v-model="eventForm.isActive"
            label="Set as active event"
            class="q-mt-md"
          />
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancel" @click="closeEventDialog" />
          <q-btn
            flat
            :label="isEditingEvent ? 'Save Changes' : 'Create'"
            color="primary"
            @click="saveEvent"
            :loading="savingEvent"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { Notify, useQuasar } from "quasar";
import { apiService } from "../services/api";
import { useEventStore } from "../stores/event-store";

interface Event {
  _id: string;
  id?: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface EventFormState {
  name: string;
  description: string;
  isActive: boolean;
}

const events = ref<Event[]>([]);
const selectedEvent = ref<Event | null>(null);
const loading = ref(true);
const eventStore = useEventStore();
const $q = useQuasar();

const showEventDialog = ref(false);
const savingEvent = ref(false);
const editingEventId = ref<string | null>(null);
const eventDialogMode = ref<"create" | "edit">("create");
const eventForm = ref<EventFormState>({
  name: "",
  description: "",
  isActive: false,
});

const isEditingEvent = computed(() => eventDialogMode.value === "edit");

const getEventId = (event: Event | null | undefined) => event?._id || event?.id || "";

const resetEventForm = () => {
  eventForm.value = {
    name: "",
    description: "",
    isActive: false,
  };
  editingEventId.value = null;
  eventDialogMode.value = "create";
};

const closeEventDialog = () => {
  showEventDialog.value = false;
  resetEventForm();
};

const syncCurrentEventState = (fetchedEvents: Event[]) => {
  eventStore.setEvents(fetchedEvents);

  const activeEvent = fetchedEvents.find((event) => event.isActive) || null;
  eventStore.setCurrentEvent(activeEvent);
};

const fetchEvents = async (preferredSelectedId?: string | null) => {
  loading.value = true;
  try {
    const response = await apiService.getEvents();
    if (response.success && response.data) {
      const fetchedEvents = response.data as Event[];
      events.value = fetchedEvents;
      syncCurrentEventState(fetchedEvents);

      const selectedId = preferredSelectedId ?? getEventId(selectedEvent.value);
      selectedEvent.value = selectedId
        ? fetchedEvents.find((event) => getEventId(event) === selectedId) || null
        : null;
    }
  } catch (error) {
    console.error("Error fetching events:", error);
    Notify.create({
      type: "negative",
      message: "Failed to load events",
      timeout: 3000,
    });
  } finally {
    loading.value = false;
  }
};

const selectEvent = (event: Event) => {
  selectedEvent.value = event;
};

const openCreateDialog = () => {
  resetEventForm();
  showEventDialog.value = true;
};

const openEditDialog = (event: Event) => {
  editingEventId.value = getEventId(event);
  eventDialogMode.value = "edit";
  eventForm.value = {
    name: event.name,
    description: event.description || "",
    isActive: event.isActive,
  };
  showEventDialog.value = true;
};

const saveEvent = async () => {
  const trimmedName = eventForm.value.name.trim();
  if (!trimmedName) {
    Notify.create({
      type: "negative",
      message: "Event name is required",
      timeout: 3000,
    });
    return;
  }

  savingEvent.value = true;
  try {
    const payload = {
      name: trimmedName,
      description: eventForm.value.description.trim() || undefined,
      isActive: eventForm.value.isActive,
    };

    let response;
    if (isEditingEvent.value) {
      if (!editingEventId.value) {
        throw new Error("No event selected for editing");
      }
      response = await apiService.updateEvent(editingEventId.value, payload);
    } else {
      response = await apiService.createEvent(payload);
    }

    if (!response.success) {
      throw new Error(
        response.error || `Failed to ${isEditingEvent.value ? "update" : "create"} event`,
      );
    }

    const savedEvent = response.data as Event | undefined;
    const savedEventId = getEventId(savedEvent) || editingEventId.value;

    Notify.create({
      type: "positive",
      message: `Event ${isEditingEvent.value ? "updated" : "created"} successfully!`,
      timeout: 3000,
    });

    closeEventDialog();
    await fetchEvents(savedEventId);
  } catch (error: any) {
    console.error(`Error ${isEditingEvent.value ? "updating" : "creating"} event:`, error);
    Notify.create({
      type: "negative",
      message: error.message || `Failed to ${isEditingEvent.value ? "update" : "create"} event`,
      timeout: 3000,
    });
  } finally {
    savingEvent.value = false;
  }
};

const toggleActive = async (event: Event, activate: boolean) => {
  const action = activate ? "activate" : "deactivate";
  const eventId = getEventId(event);

  $q.dialog({
    title: "Confirm",
    message: `Are you sure you want to ${action} "${event.name}"?`,
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    try {
      const response = activate
        ? await apiService.activateEvent(eventId)
        : await apiService.updateEvent(eventId, { isActive: false });

      if (!response.success) {
        throw new Error(response.error || `Failed to ${action} event`);
      }

      Notify.create({
        type: "positive",
        message: `Event ${action}d successfully`,
      });

      await fetchEvents(eventId);
    } catch (error: any) {
      console.error(`Error ${action}ing event:`, error);
      Notify.create({
        type: "negative",
        message: error.message || `Failed to ${action} event`,
      });
    }
  });
};

const confirmDeleteEvent = (event: Event) => {
  const eventId = getEventId(event);
  const activeWarning = event.isActive
    ? " This event is currently active and deleting it will leave the app with no active event until another one is activated."
    : "";

  $q.dialog({
    title: "Delete Event",
    message: `Delete "${event.name}"? This cannot be undone.${activeWarning}`,
    cancel: true,
    persistent: true,
    ok: {
      label: "Delete",
      color: "negative",
      flat: true,
    },
  }).onOk(async () => {
    try {
      const response = await apiService.deleteEvent(eventId);
      if (!response.success) {
        throw new Error(response.error || "Failed to delete event");
      }

      const selectedId = getEventId(selectedEvent.value);
      const nextSelectedId = selectedId === eventId ? null : selectedId;

      Notify.create({
        type: "positive",
        message: response.message || "Event deleted successfully",
        timeout: 3000,
      });

      await fetchEvents(nextSelectedId);
    } catch (error: any) {
      console.error("Error deleting event:", error);
      Notify.create({
        type: "negative",
        message: error.message || "Failed to delete event",
        timeout: 3000,
      });
    }
  });
};

onMounted(() => {
  void fetchEvents();
});
</script>
