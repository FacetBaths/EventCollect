<template>
  <router-view />
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useEventStore } from './stores/event-store';

const eventStore = useEventStore();

// Load active event when app starts
onMounted(async () => {
  console.log('App mounted - loading active event...');
  await eventStore.loadActiveEvent();
});
</script>
