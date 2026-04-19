<template>
  <div class="stats-bar" :class="{ 'stats-bar--loading': loading && !stats }">
    <!-- Event name + refresh -->
    <div class="stats-event-name">
      <q-icon name="event" size="14px" class="q-mr-xs" />
      <span class="text-caption text-weight-medium">{{ eventName || 'No event selected' }}</span>
      <q-btn
        flat dense round
        icon="refresh"
        size="xs"
        color="white"
        class="q-ml-xs stats-refresh-btn"
        :loading="loading"
        @click="fetchStats"
      >
        <q-tooltip>Refresh stats</q-tooltip>
      </q-btn>
    </div>

    <!-- Stats chips — hidden until loaded -->
    <div v-if="stats" class="stats-chips">
      <!-- TODAY -->
      <div class="stats-group">
        <span class="stats-label">TODAY</span>
        <div class="stats-pills">
          <div class="stats-pill stats-pill--leads">
            <span class="stats-pill__num">{{ stats.today.leads }}</span>
            <span class="stats-pill__lbl">Leads</span>
          </div>
          <span class="stats-sep">+</span>
          <div class="stats-pill stats-pill--appts">
            <span class="stats-pill__num">{{ stats.today.appointments }}</span>
            <span class="stats-pill__lbl">Appts</span>
          </div>
          <span class="stats-sep">=</span>
          <div class="stats-pill stats-pill--entries">
            <span class="stats-pill__num">{{ stats.today.entries }}</span>
            <span class="stats-pill__lbl">Entries</span>
          </div>
        </div>
      </div>

      <div class="stats-divider" />

      <!-- TOTAL -->
      <div class="stats-group">
        <span class="stats-label">TOTAL</span>
        <div class="stats-pills">
          <div class="stats-pill stats-pill--leads">
            <span class="stats-pill__num">{{ stats.total.leads }}</span>
            <span class="stats-pill__lbl">Leads</span>
          </div>
          <span class="stats-sep">+</span>
          <div class="stats-pill stats-pill--appts">
            <span class="stats-pill__num">{{ stats.total.appointments }}</span>
            <span class="stats-pill__lbl">Appts</span>
          </div>
          <span class="stats-sep">=</span>
          <div class="stats-pill stats-pill--entries">
            <span class="stats-pill__num">{{ stats.total.entries }}</span>
            <span class="stats-pill__lbl">Entries</span>
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="!loading" class="stats-chips stats-chips--empty">
      <span class="text-caption" style="opacity:.5">— no data yet —</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue';
import { apiService } from '../services/api';

const props = defineProps<{ eventName?: string }>();

interface StatGroup { leads: number; appointments: number; entries: number; }
interface Stats { today: StatGroup; total: StatGroup; }

const stats = ref<Stats | null>(null);
const loading = ref(false);
let timer: ReturnType<typeof setInterval> | null = null;

async function fetchStats() {
  if (!props.eventName) { stats.value = null; return; }
  loading.value = true;
  try {
    const res = await apiService.getLeadStats(props.eventName);
    if (res.success && res.data) stats.value = res.data;
  } catch { /* fail silently — stats are decorative */ }
  finally { loading.value = false; }
}

onMounted(() => {
  fetchStats();
  timer = setInterval(fetchStats, 60_000); // refresh every minute
});
onUnmounted(() => { if (timer) clearInterval(timer); });
watch(() => props.eventName, fetchStats);
</script>

<style scoped>
.stats-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 16px;
  padding: 6px 16px;
  background: linear-gradient(135deg, rgba(153,69,255,0.12) 0%, rgba(20,241,149,0.08) 100%);
  border-top: 1px solid rgba(153,69,255,0.15);
  min-height: 36px;
}

.stats-event-name {
  display: flex;
  align-items: center;
  color: #9945FF;
  font-size: 12px;
  white-space: nowrap;
  flex-shrink: 0;
}

.stats-refresh-btn { opacity: 0.6; }
.stats-refresh-btn:hover { opacity: 1; }

.stats-chips {
  display: flex;
  align-items: center;
  gap: 6px 12px;
  flex-wrap: wrap;
  flex: 1;
  justify-content: flex-end;
}

.stats-group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.stats-label {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 1px;
  color: rgba(153,69,255,0.6);
  white-space: nowrap;
}

.stats-pills {
  display: flex;
  align-items: center;
  gap: 4px;
}

.stats-sep {
  font-size: 11px;
  color: rgba(0,0,0,0.25);
  font-weight: 600;
}

.stats-pill {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2px 8px;
  border-radius: 8px;
  min-width: 38px;
}

.stats-pill__num {
  font-size: 16px;
  font-weight: 800;
  line-height: 1.1;
}

.stats-pill__lbl {
  font-size: 8px;
  font-weight: 600;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  opacity: 0.7;
}

.stats-pill--leads   { background: rgba(153,69,255,0.12); color: #7c3de0; }
.stats-pill--appts   { background: rgba(20,241,149,0.15); color: #0d9b5f; }
.stats-pill--entries { background: rgba(30,30,30,0.07);   color: #333;    font-weight: 900; }
.stats-pill--entries .stats-pill__num { font-size: 18px; }

.stats-divider {
  width: 1px;
  height: 28px;
  background: rgba(153,69,255,0.2);
  flex-shrink: 0;
}

@media (max-width: 600px) {
  .stats-bar { justify-content: space-between; }
  .stats-chips { justify-content: flex-start; }
  .stats-pill__num { font-size: 14px; }
  .stats-pill--entries .stats-pill__num { font-size: 15px; }
}
</style>
