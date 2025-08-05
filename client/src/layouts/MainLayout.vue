<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated class="bg-white text-dark">
      <q-toolbar class="q-pa-sm q-pa-md-md">
        <q-btn
          v-if="$q.screen.lt.md"
          flat
          dense
          round
          icon="menu"
          aria-label="Menu"
          @click="toggleLeftDrawer"
          class="text-primary q-mr-sm"
        />

        <q-toolbar-title class="flex items-center no-wrap">
          <img src="https://raw.githubusercontent.com/FacetBaths/EventCollect/main/client/public/assets/Logo_V2_Gradient7_CTC.png" alt="EventCollect Logo" class="logo q-mr-sm q-mr-md-md" loading="lazy" />
          <span class="text-h6 text-h5-md text-weight-medium text-primary" :class="$q.screen.lt.sm ? 'text-no-wrap' : ''">EventCollect</span>
        </q-toolbar-title>

        <div class="flex items-center q-gutter-xs q-gutter-md-md">
          <!-- Desktop Navigation -->
          <div v-if="$q.screen.gt.sm" class="desktop-nav q-mr-lg">
            <q-btn
              v-for="link in navigationLinks"
              :key="link.title"
              :to="link.route"
              flat
              :icon="link.icon"
              :label="link.title"
              color="primary"
              class="q-mr-sm"
              size="sm"
            >
              <q-tooltip>{{ link.caption }}</q-tooltip>
            </q-btn>
          </div>

          <!-- Mobile current event display -->
          <div v-if="$q.screen.lt.md" class="text-caption text-accent mobile-event-display">
            {{ currentEvent && currentEvent.length > 20 ? currentEvent.substring(0, 20) + '...' : currentEvent || 'No event' }}
          </div>
          
          <!-- Desktop current event display -->
          <div v-else class="text-caption text-accent">
            Current Event: {{ currentEvent || 'No event selected' }}
          </div>

          <q-btn
            flat
            dense
            color="primary"
            icon="refresh"
            @click="resyncLeapData"
            :loading="resyncLoading"
            :disable="resyncLoading"
            :size="$q.screen.lt.sm ? 'xs' : 'sm'"
          >
            <q-tooltip>Resync LEAP Data</q-tooltip>
          </q-btn>
        </div>
      </q-toolbar>
    </q-header>

    <q-drawer
      v-model="leftDrawerOpen"
      show-if-above
      bordered
      class="bg-grey-1"
      :breakpoint="768"
      :width="280"
    >
      <q-list>
        <q-item-label header class="text-primary text-weight-bold q-pa-md"> 
          <q-icon name="business" class="q-mr-sm" />EventCollect 
        </q-item-label>

        <q-separator class="q-mb-md" />

        <q-item
          v-for="link in navigationLinks"
          :key="link.title"
          :to="link.route"
          clickable
          v-ripple
          class="q-my-xs"
          @click="$q.screen.lt.md && (leftDrawerOpen = false)"
        >
          <q-item-section avatar>
            <q-icon :name="link.icon" color="primary" size="md" />
          </q-item-section>
          <q-item-section>
            <q-item-label class="text-weight-medium text-body1">{{ link.title }}</q-item-label>
            <q-item-label caption class="text-body2">{{ link.caption }}</q-item-label>
          </q-item-section>
        </q-item>
        
        <q-separator class="q-my-md" />
        
        <!-- Mobile-specific actions -->
        <q-item clickable v-ripple @click="resyncLeapData" :disable="resyncLoading">
          <q-item-section avatar>
            <q-icon name="refresh" color="primary" :class="resyncLoading ? 'rotating' : ''" />
          </q-item-section>
          <q-item-section>
            <q-item-label class="text-weight-medium">Resync LEAP Data</q-item-label>
            <q-item-label caption>Refresh CRM integration</q-item-label>
          </q-item-section>
        </q-item>
      </q-list>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { Notify } from 'quasar';
import { apiService } from '../services/api';
import { useEventStore } from 'stores/event-store';

interface NavigationLink {
  title: string;
  caption: string;
  icon: string;
  route: string;
}

const navigationLinks: NavigationLink[] = [
  {
    title: 'Lead Form',
    caption: 'Collect prospect information',
    icon: 'person_add',
    route: '/',
  },
  {
    title: 'Event Management',
    caption: 'Manage events and settings',
    icon: 'event',
    route: '/events',
  },
  {
    title: 'Staff Management',
    caption: 'Manage staff and availability',
    icon: 'groups',
    route: '/staff',
  },
  {
    title: 'Leads Dashboard',
    caption: 'View and manage leads',
    icon: 'dashboard',
    route: '/leads',
  },
  {
    title: 'Staff Calendar',
    caption: 'View staff availability',
    icon: 'calendar_today',
    route: '/staff-calendar',
  },
];

const leftDrawerOpen = ref(false);
const resyncLoading = ref(false);
const eventStore = useEventStore();

// Access the current event from the store
const currentEvent = computed(() => {
  if (eventStore.isLoading) {
    return 'Loading event...';
  }
  return eventStore.getCurrentEvent?.name || 'No event selected';
});

function toggleLeftDrawer() {
  leftDrawerOpen.value = !leftDrawerOpen.value;
}

async function resyncLeapData() {
  resyncLoading.value = true;
  try {
    const response = await apiService.syncAllLeapData();

    if (response.success) {
      Notify.create({
        type: 'positive',
        message: 'LEAP data synced successfully',
        timeout: 3000,
      });
      console.log('LEAP sync result:', response.data);
    } else {
      throw new Error(response.error || 'Failed to sync LEAP data');
    }
  } catch (error) {
    console.error('LEAP sync error:', error);
    Notify.create({
      type: 'negative',
      message: 'Failed to sync LEAP data',
      timeout: 3000,
    });
  } finally {
    resyncLoading.value = false;
  }
}
</script>

<style scoped>
.logo {
  height: 40px;
  width: auto;
  max-width: 120px;
}

@media (max-width: 768px) {
  .logo {
    height: 32px;
    max-width: 80px;
  }
}

.q-toolbar {
  min-height: 64px;
}

@media (min-width: 768px) {
  .q-toolbar {
    min-height: 80px;
  }

  .logo {
    height: 48px;
    max-width: 140px;
  }
}

.desktop-nav {
  display: flex;
  gap: 8px;
  align-items: center;
}

@media (max-width: 1200px) {
  .desktop-nav .q-btn {
    padding: 4px 8px;
  }

  .desktop-nav .q-btn .q-btn__content {
    font-size: 0.85rem;
  }
}
</style>
