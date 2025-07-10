<template>
  <div class="resync-button-container">
    <q-btn @click="resyncData" color="primary" :loading="loading" :disable="loading">
      <template v-if="!loading"> Resync LEAP Data </template>
      <template v-else>
        <q-spinner-dots size="24px" />
      </template>
    </q-btn>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import axios from 'axios';

const loading = ref(false);

async function resyncData() {
  try {
    loading.value = true;
    const response = await axios.post('/api/leap-sync/resync-all');
    console.info('Resync successful:', response.data);
    // Handle success (e.g. notification)
  } catch (error) {
    console.error('Resync failed:', error);
    // Handle failure (e.g. notification)
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.resync-button-container {
  display: flex;
  justify-content: center;
  margin-top: 16px;
}

.q-btn {
  min-width: 200px;
  font-size: 16px;
  font-weight: bold;
}
</style>
