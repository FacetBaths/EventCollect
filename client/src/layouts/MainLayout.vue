<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated class="glass text-white">
      <!-- Row 1: logo + nav + refresh -->
      <q-toolbar class="q-pa-sm q-pa-md-md">
        <q-btn
          v-if="$q.screen.lt.md"
          flat
          dense
          round
          icon="menu"
          aria-label="Menu"
          @click="toggleLeftDrawer"
          class="text-white q-mr-sm"
        />

        <q-toolbar-title>
          <div :class="$q.screen.lt.md ? 'flex column items-center' : 'flex items-center no-wrap'">
            <img
              src="https://raw.githubusercontent.com/FacetBaths/EventCollect/main/client/public/assets/Logo_V2_Gradient7_CTC.png"
              alt="EventCollect Logo"
              class="logo"
              :class="$q.screen.lt.md ? 'q-mb-xs' : 'q-mr-sm'"
              loading="lazy"
            />
            <div class="flex column" :class="$q.screen.lt.md ? 'items-center' : ''">
              <span
                class="text-weight-medium text-white"
                :class="$q.screen.lt.md ? 'text-caption' : 'text-h6'"
                >EventCollect</span
              >
              <span class="text-caption version text-primary" v-if="$q.screen.gt.xs && $q.screen.gt.sm"
                >v{{ versionInfo.version }}</span
              >
            </div>
          </div>
        </q-toolbar-title>

        <!-- Desktop nav buttons -->
        <!-- <div v-if="$q.screen.gt.sm" class="desktop-nav q-mr-sm">
          <q-btn
            v-for="link in navigationLinks"
            :key="link.title"
            :to="link.route"
            flat
            :icon="link.icon"
            :label="link.title"
            color="secondary"
            class="q-mr-xs"
            size="sm"
          >
            <q-tooltip>{{ link.caption }}</q-tooltip>
          </q-btn>
        </div> -->

        <q-btn
          flat
          dense
          color="white"
          icon="refresh"
          @click="resyncLeapData"
          :loading="resyncLoading"
          :disable="resyncLoading"
          size="sm"
          class="q-mr-xs"
        >
          <q-tooltip>Resync LEAP Data</q-tooltip>
        </q-btn>

        <!-- User avatar / account menu -->
        <q-avatar
          v-if="authStore.user"
          :color="userAvatarColor"
          text-color="white"
          size="34px"
          class="cursor-pointer user-avatar"
        >
          <span class="text-caption text-weight-bold">{{ userInitials }}</span>
          <q-tooltip>{{ authStore.user.name }} ({{ authStore.user.role }})</q-tooltip>
          <q-menu>
            <q-list style="min-width: 200px">
              <q-item-label header class="text-grey-7">
                {{ authStore.user.name }}
                <div class="text-caption text-grey-5">{{ authStore.user.email }}</div>
              </q-item-label>
              <q-separator />
              <q-item clickable @click="showChangePassword = true">
                <q-item-section avatar><q-icon name="lock" /></q-item-section>
                <q-item-section>Change Password</q-item-section>
              </q-item>
              <q-separator />
              <q-item clickable @click="handleLogout">
                <q-item-section avatar><q-icon name="logout" color="negative" /></q-item-section>
                <q-item-section class="text-negative">Logout</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </q-avatar>
      </q-toolbar>

      <!-- Row 2: active event -->
      <div class="no-glass event-bar q-px-md q-py-xs">
        <q-icon name="event" size="xs" color="white" class="q-mr-xs" />
        <span class="text-caption text-white">{{ currentEvent || 'No event selected' }}</span>
      </div>
    </q-header>

    <q-drawer
      v-model="leftDrawerOpen"
      show-if-above
      elevated
      class="glass"
      :breakpoint="768"
      :width="280"
    >
      <q-list>
        <q-item-label header class="text-white text-weight-bold q-pa-md">
          <q-icon name="business" class="q-mr-sm" /> EventCollect
          <span class="text-caption version" v-if="$q.screen.lt.sm && $q.screen.lt.md"
            >v{{ versionInfo.version }}</span
          >
        </q-item-label>

        <!-- <q-separator class="q-mb-md" /> -->

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
            <q-item-label class="text-weight-medium text-body1 text-white">{{ link.title }}</q-item-label>
            <q-item-label caption class="text-body2 green">{{ link.caption }}</q-item-label>
          </q-item-section>
        </q-item>

        <!-- Admin Settings (admin only) -->
        <q-item
          v-if="authStore.isAdmin"
          to="/admin"
          clickable
          v-ripple
          class="q-my-xs"
          @click="$q.screen.lt.md && (leftDrawerOpen = false)"
        >
          <q-item-section avatar>
            <q-icon name="admin_panel_settings" color="orange" size="md" />
          </q-item-section>
          <q-item-section>
            <q-item-label class="text-weight-medium text-body1 text-white">Admin Settings</q-item-label>
            <q-item-label caption class="green">Users &amp; LEAP assignments</q-item-label>
          </q-item-section>
        </q-item>

        <q-separator class="q-my-md" />

        <!-- Stats card -->
        <div class="q-px-md q-pb-md">
          <EventStatsBar :event-name="currentEvent || ''" compact />
        </div>

        <q-separator class="q-mb-sm" />

        <!-- Mobile-specific actions -->
        <q-item clickable v-ripple @click="resyncLeapData" :disable="resyncLoading">
          <q-item-section avatar>
            <q-icon name="refresh" color="primary" :class="resyncLoading ? 'rotating' : ''" />
          </q-item-section>
          <q-item-section>
            <q-item-label class="text-weight-medium text-white">Resync LEAP Data</q-item-label>
            <q-item-label caption class="green">Refresh CRM integration</q-item-label>
          </q-item-section>
        </q-item>
      </q-list>
    </q-drawer>

    <!-- Change Password Dialog -->
    <q-dialog v-model="showChangePassword">
      <q-card style="min-width: 320px">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">Change Password</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-card-section>
          <q-input
            v-model="cpCurrent"
            label="Current Password"
            :type="cpShowCurrent ? 'text' : 'password'"
            outlined dense class="q-mb-sm"
          >
            <template v-slot:append>
              <q-icon :name="cpShowCurrent ? 'visibility_off' : 'visibility'" class="cursor-pointer" @click="cpShowCurrent = !cpShowCurrent" />
            </template>
          </q-input>
          <q-input
            v-model="cpNew"
            label="New Password"
            :type="cpShowNew ? 'text' : 'password'"
            outlined dense class="q-mb-sm"
          >
            <template v-slot:append>
              <q-icon :name="cpShowNew ? 'visibility_off' : 'visibility'" class="cursor-pointer" @click="cpShowNew = !cpShowNew" />
            </template>
          </q-input>
          <q-input
            v-model="cpConfirm"
            label="Confirm New Password"
            :type="cpShowNew ? 'text' : 'password'"
            outlined dense
            :error="cpNew !== cpConfirm && cpConfirm.length > 0"
            error-message="Passwords do not match"
          />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancel" v-close-popup />
          <q-btn
            unelevated label="Save" color="primary"
            :loading="cpLoading"
            :disable="!cpCurrent || !cpNew || cpNew !== cpConfirm || cpNew.length < 6"
            @click="submitChangePassword"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-page-container class="gradient-bg">
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import EventStatsBar from '../components/EventStatsBar.vue';
import { Notify } from 'quasar';
import { apiService } from '../services/api';
import { useEventStore } from '../stores/event-store';
import { useAuthStore } from '../stores/auth-store';
import { useRouter } from 'vue-router';
import versionInfo from '../version.json';

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
const authStore = useAuthStore();
const router = useRouter();

// Change Password dialog state
const showChangePassword = ref(false);
const cpCurrent = ref('');
const cpNew = ref('');
const cpConfirm = ref('');
const cpShowCurrent = ref(false);
const cpShowNew = ref(false);
const cpLoading = ref(false);

// User avatar initials + deterministic color
const USER_COLORS = ['blue-8', 'purple-8', 'deep-orange-8', 'teal-8', 'indigo-8', 'green-8'];
const userInitials = computed(() => {
  const name = authStore.user?.name || '';
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]!.toUpperCase()).join('');
});
const userAvatarColor = computed(() => {
  const name = authStore.user?.name || '';
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) & 0xffff;
  return USER_COLORS[hash % USER_COLORS.length];
});

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

function handleLogout() {
  authStore.logout();
  router.replace({ name: 'login' });
}

async function submitChangePassword() {
  if (!cpCurrent.value || !cpNew.value || cpNew.value !== cpConfirm.value) return;
  cpLoading.value = true;
  try {
    await authStore.changePassword(cpCurrent.value, cpNew.value);
    Notify.create({ type: 'positive', message: 'Password changed successfully', timeout: 3000 });
    showChangePassword.value = false;
    cpCurrent.value = '';
    cpNew.value = '';
    cpConfirm.value = '';
  } catch (err: any) {
    Notify.create({
      type: 'negative',
      message: err.response?.data?.error || 'Failed to change password',
      timeout: 4000,
    });
  } finally {
    cpLoading.value = false;
  }
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
  min-width: 100px;
  max-width: 120px;
}
.version {
  color: #14f195;
  font-weight: bold;
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

.event-bar {
  background: oklab(59.818000000000005% 0.12384 -0.22469 / 0.8);
  border-top: 1px solid rgba(153, 69, 255, 0.1);
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 32px;
}

.desktop-nav {
  display: flex;
  gap: 4px;
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
