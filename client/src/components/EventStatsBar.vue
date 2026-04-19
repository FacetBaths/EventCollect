<template>
  <div class="stats-card">
    <div class="stats-card__header">
      <span class="stats-card__title">Live Stats</span>
      <q-btn flat dense round icon="refresh" size="xs" color="primary"
        :loading="loading" @click="fetchStats" style="opacity:.6" />
    </div>

    <div v-if="stats" class="stats-card__body">
      <!-- TODAY -->
      <div class="stats-section">
        <div class="stats-section__label">TODAY</div>
        <div class="stats-row">
          <div class="stat-box stat-box--leads">
            <div class="stat-box__num">{{ stats.today.leads }}</div>
            <div class="stat-box__lbl">Leads</div>
          </div>
          <div class="stat-box stat-box--appts">
            <div class="stat-box__num">{{ stats.today.appointments }}</div>
            <div class="stat-box__lbl">Appts</div>
          </div>
          <div class="stat-box stat-box--entries">
            <div class="stat-box__num">{{ stats.today.entries }}</div>
            <div class="stat-box__lbl">Total</div>
          </div>
        </div>
      </div>

      <div class="stats-divider" />

      <!-- EVENT TOTAL -->
      <div class="stats-section">
        <div class="stats-section__label">EVENT TOTAL</div>
        <div class="stats-row">
          <div class="stat-box stat-box--leads">
            <div class="stat-box__num">{{ stats.total.leads }}</div>
            <div class="stat-box__lbl">Leads</div>
          </div>
          <div class="stat-box stat-box--appts">
            <div class="stat-box__num">{{ stats.total.appointments }}</div>
            <div class="stat-box__lbl">Appts</div>
          </div>
          <div class="stat-box stat-box--entries">
            <div class="stat-box__num">{{ stats.total.entries }}</div>
            <div class="stat-box__lbl">Total</div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="stats-card__empty">
      <q-spinner v-if="loading" size="sm" color="primary" />
      <span v-else class="text-caption text-grey-5">No data yet</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue';
import { apiService } from '../services/api';

const props = defineProps<{ eventName?: string; compact?: boolean }>();

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
  } catch { /* fail silently */ }
  finally { loading.value = false; }
}

onMounted(() => { fetchStats(); timer = setInterval(fetchStats, 60_000); });
onUnmounted(() => { if (timer) clearInterval(timer); });
watch(() => props.eventName, fetchStats);
</script>

<style scoped>
.stats-card {
  background: linear-gradient(135deg, rgba(153,69,255,0.25) 0%, rgba(20,241,149,0.15) 100%);
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 12px;
  padding: 10px 12px;
}

.stats-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.stats-card__title {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1.2px;
  text-transform: uppercase;
  color: rgba(255,255,255,0.8);
}

.stats-section { margin-bottom: 6px; }
.stats-section:last-child { margin-bottom: 0; }

.stats-section__label {
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: rgba(255,255,255,0.5);
  margin-bottom: 4px;
}

.stats-row {
  display: flex;
  gap: 6px;
}

.stat-box {
  flex: 1;
  text-align: center;
  padding: 4px 6px;
  border-radius: 8px;
}

.stat-box__num {
  font-size: 20px;
  font-weight: 900;
  line-height: 1;
}

.stat-box__lbl {
  font-size: 8px;
  font-weight: 600;
  letter-spacing: 0.4px;
  text-transform: uppercase;
  opacity: 0.65;
  margin-top: 1px;
}

.stat-box--leads   { background: rgba(153,69,255,0.35); color: #fff; }
.stat-box--appts   { background: rgba(20,241,149,0.30); color: #fff; }
.stat-box--entries { background: rgba(255,255,255,0.15); color: #fff; }
.stat-box--entries .stat-box__num { font-size: 22px; }

.stats-divider {
  height: 1px;
  background: rgba(255,255,255,0.15);
  margin: 8px 0;
}

.stats-card__empty {
  text-align: center;
  padding: 8px 0;
}
</style>
