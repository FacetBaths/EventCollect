import { ref, computed, onMounted } from 'vue';
import { apiService } from '../services/api';
import type { LeapTrade, LeapDivision, LeapSalesRep } from '../types/temp-types';

export function useLeapData() {
  const trades = ref<LeapTrade[]>([]);
  const divisions = ref<LeapDivision[]>([]);
  const salesReps = ref<LeapSalesRep[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Computed properties for select options
  const tradeOptions = computed(() => 
    trades.value.map(trade => ({
      label: trade.name,
      value: trade.id,
      color: trade.color
    }))
  );

  const divisionOptions = computed(() => 
    divisions.value.map(division => ({
      label: division.name,
      value: division.id
    }))
  );

  const salesRepOptions = computed(() => 
    salesReps.value.map(rep => ({
      label: `${rep.first_name} ${rep.last_name}`,
      value: rep.id,
      email: rep.email,
      division: rep.group?.name || 'No Group',
      position: rep.profile?.position || 'No Position'
    }))
  );

  // Get all work types from all trades
  const workTypeOptions = computed(() => {
    const workTypes: Array<{label: string, value: number, color: string, trade: string}> = [];
    trades.value.forEach(trade => {
      if (trade.work_types?.data) {
        trade.work_types.data.forEach(workType => {
          workTypes.push({
            label: workType.name,
            value: workType.id,
            color: workType.color,
            trade: trade.name
          });
        });
      }
    });
    return workTypes;
  });

  // Get work types for BATH REMODEL specifically
  const bathRemodelWorkTypes = computed(() => {
    const bathTrade = trades.value.find(trade => trade.name === 'BATH REMODEL');
    if (bathTrade?.work_types?.data) {
      return bathTrade.work_types.data.map(workType => ({
        label: workType.name,
        value: workType.id,
        color: workType.color,
        trade: bathTrade.name
      }));
    }
    return [];
  });

  // Find trade by name (for backward compatibility with existing services)
  const findTradeByName = (name: string) => {
    return trades.value.find(trade => 
      trade.name.toLowerCase().includes(name.toLowerCase()) ||
      name.toLowerCase().includes(trade.name.toLowerCase())
    );
  };

  // Map service names to trade IDs
  const mapServiceToTradeId = (serviceName: string): number => {
    const trade = findTradeByName(serviceName);
    return trade ? trade.id : 105; // Default to BATH REMODEL (105) if not found
  };

  // Map work type names to work type IDs
  const mapWorkTypeToId = (workTypeName: string): number => {
    const workType = workTypeOptions.value.find(wt => 
      wt.label.toLowerCase() === workTypeName.toLowerCase()
    );
    return workType ? workType.value : 0;
  };

  // Find default work type (Vanity) from BATH REMODEL
  const getDefaultWorkTypeId = (): number => {
    const vanityWorkType = bathRemodelWorkTypes.value.find(wt => 
      wt.label.toLowerCase() === 'vanity'
    );
    return vanityWorkType ? vanityWorkType.value : 0;
  };

  // Load trades from LEAP CRM
  const loadTrades = async () => {
    try {
      loading.value = true;
      error.value = null;
      
      const response = await apiService.getCompanyTrades();
      
      if (response.success && response.data) {
        trades.value = response.data;
        console.log('Loaded trades:', trades.value);
      } else {
        throw new Error(response.error || 'Failed to load trades');
      }
    } catch (err: any) {
      error.value = err.message || 'Failed to load trades';
      console.error('Error loading trades:', err);
    } finally {
      loading.value = false;
    }
  };

  // Load divisions from LEAP CRM
  const loadDivisions = async () => {
    try {
      loading.value = true;
      error.value = null;
      
      const response = await apiService.getDivisions();
      
      if (response.success && response.data) {
        divisions.value = response.data;
        console.log('Loaded divisions:', divisions.value);
      } else {
        throw new Error(response.error || 'Failed to load divisions');
      }
    } catch (err: any) {
      error.value = err.message || 'Failed to load divisions';
      console.error('Error loading divisions:', err);
    } finally {
      loading.value = false;
    }
  };

  // Load sales reps from LEAP CRM
  const loadSalesReps = async () => {
    try {
      loading.value = true;
      error.value = null;
      
      const response = await apiService.getSalesReps();
      
      if (response.success && response.data) {
        salesReps.value = response.data;
        console.log('Loaded sales reps:', salesReps.value);
      } else {
        throw new Error(response.error || 'Failed to load sales reps');
      }
    } catch (err: any) {
      error.value = err.message || 'Failed to load sales reps';
      console.error('Error loading sales reps:', err);
    } finally {
      loading.value = false;
    }
  };

  // Load trades, divisions, and sales reps
  const loadLeapData = async () => {
    await Promise.all([loadTrades(), loadDivisions(), loadSalesReps()]);
  };

  // Auto-load on mount
  onMounted(() => {
    loadLeapData();
  });

  return {
    trades,
    divisions,
    salesReps,
    tradeOptions,
    divisionOptions,
    salesRepOptions,
    workTypeOptions,
    bathRemodelWorkTypes,
    loading,
    error,
    findTradeByName,
    mapServiceToTradeId,
    mapWorkTypeToId,
    getDefaultWorkTypeId,
    loadTrades,
    loadDivisions,
    loadSalesReps,
    loadLeapData
  };
}
