<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated class="bg-white text-dark">
      <q-toolbar class="q-pa-md">
        <q-btn
          v-if="$q.screen.lt.md"
          flat
          dense
          round
          icon="menu"
          aria-label="Menu"
          @click="toggleLeftDrawer"
          class="text-primary"
        />

    <q-toolbar-title class="flex items-center">
      <img src="https://raw.githubusercontent.com/FacetBaths/EventCollect/main/client/public/assets/Logo_V2_Gradient7_CTC.png" alt="EventCollect Logo" class="logo q-mr-md" loading="lazy" />
          <span class="text-h5 text-weight-medium text-primary">EventCollect</span>
        </q-toolbar-title>

        <div class="flex items-center q-gutter-md">
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

          <div class="text-caption text-accent">
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
          >
            <q-tooltip>Resync LEAP Data</q-tooltip>
          </q-btn>
        </div>
      </q-toolbar>
    </q-header>

    <q-drawer
      v-model="leftDrawerOpen"
      v-if="$q.screen.lt.md"
      show-if-above
      bordered
      class="bg-grey-1"
    >
      <q-list>
        <q-item-label header class="text-primary text-weight-bold"> EventCollect </q-item-label>

        <q-item
          v-for="link in navigationLinks"
          :key="link.title"
          :to="link.route"
          clickable
          v-ripple
          class="q-my-sm"
        >
          <q-item-section avatar>
            <q-icon :name="link.icon" color="primary" />
          </q-item-section>
          <q-item-section>
            <q-item-label class="text-weight-medium">{{ link.title }}</q-item-label>
            <q-item-label caption>{{ link.caption }}</q-item-label>
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
// import { useEventStore } from 'stores/event-store';

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

// const eventStore = useEventStore();
const leftDrawerOpen = ref(false);
const resyncLoading = ref(false);

const currentEvent = computed(() => 'Ribfest--LITH'); // Temporary placeholder

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
