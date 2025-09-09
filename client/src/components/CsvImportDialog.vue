<template>
  <q-dialog v-model="showDialog" persistent :maximized="$q.screen.lt.md" :full-width="currentStep === 'preview'">
    <q-card :style="currentStep === 'preview' ? 'width: 95vw; max-width: 1200px;' : 'min-width: 500px; max-width: 800px;'">
      <q-card-section class="row items-center q-pb-none">
        <q-icon :name="currentStep === 'upload' ? 'upload_file' : 'preview'" size="2rem" color="primary" class="q-mr-md" />
        <div class="text-h6">
          {{ currentStep === 'upload' ? 'Import Facebook Leads from CSV' : 'Confirm Import' }}
        </div>
        <q-space />
        <div v-if="currentStep === 'preview'" class="text-caption text-grey-6 q-mr-md">
          {{ previewData.leads?.length || 0 }} leads ready to import
        </div>
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>
      
      <!-- Step 1: File Upload -->
      <q-card-section v-if="currentStep === 'upload'">
        <div class="text-body2 text-grey-7 q-mb-md">
          Upload a CSV file exported from Facebook Lead Ads to import leads directly into EventCollect and LEAP CRM.
        </div>
        
        <!-- File Upload Area -->
        <div
          class="file-drop-zone"
          :class="{ 'dragover': isDragOver, 'has-file': selectedFile }"
          @drop="onDrop"
          @dragover="onDragOver"
          @dragleave="onDragLeave"
          @click="triggerFileInput"
        >
          <input
            ref="fileInput"
            type="file"
            accept=".csv"
            @change="onFileSelect"
            style="display: none;"
          />
          
          <div v-if="!selectedFile" class="upload-content">
            <q-icon name="cloud_upload" size="3rem" color="primary" class="q-mb-md" />
            <div class="text-h6 text-primary q-mb-sm">Drop CSV file here</div>
            <div class="text-body2 text-grey-6 q-mb-md">or click to browse</div>
            <div class="text-caption text-grey-5">
              Supported format: CSV files from Facebook Lead Ads<br>
              Maximum file size: 5MB
            </div>
          </div>
          
          <div v-else class="selected-file">
            <q-icon name="description" size="2rem" color="positive" class="q-mb-sm" />
            <div class="text-subtitle1">{{ selectedFile.name }}</div>
            <div class="text-caption text-grey-6">
              {{ formatFileSize(selectedFile.size) }}
            </div>
            <q-btn
              flat
              icon="close"
              color="negative"
              size="sm"
              class="q-mt-sm"
              @click.stop="clearFile"
            >
              Remove file
            </q-btn>
          </div>
        </div>
        
        <!-- Loading Preview -->
        <div v-if="loadingPreview" class="q-mt-lg text-center">
          <q-spinner-dots size="40px" color="primary" />
          <div class="text-body2 text-grey-6 q-mt-sm">Processing CSV file...</div>
        </div>
      </q-card-section>
      
      <!-- Step 2: Preview and Configuration -->
      <q-card-section v-if="currentStep === 'preview'">
        <!-- Batch Settings -->
        <div class="q-mb-lg">
          <div class="text-subtitle1 text-weight-medium q-mb-md">Import Settings</div>
          <div class="row q-gutter-md">
            <q-select
              v-model="batchSettings.salesRepId"
              :options="salesRepOptions"
              label="Default Sales Rep"
              class="col"
              filled
              clearable
              option-label="label"
              option-value="value"
            />
            <q-select
              v-model="batchSettings.divisionId"
              :options="divisionOptions"
              label="Division"
              class="col"
              filled
              clearable
              option-label="label"
              option-value="value"
            />
          </div>
          <div class="row q-gutter-md q-mt-sm">
            <q-select
              v-model="batchSettings.tradeIds"
              :options="tradeOptions"
              label="Trade Type"
              multiple
              class="col"
              filled
              clearable
              use-chips
              option-label="label"
              option-value="value"
            />
            <q-input
              v-model.number="batchSettings.tempRating"
              label="Default Temperature Rating (1-10)"
              type="number"
              min="1"
              max="10"
              class="col"
              filled
              clearable
            />
          </div>
          <div class="text-caption text-grey-6 q-mt-sm">
            These settings will be applied to all imported leads. Individual leads can be edited after import.
          </div>
        </div>
        
        <!-- Preview Table -->
        <div class="text-subtitle1 text-weight-medium q-mb-md">Preview (showing first 5 leads)</div>
        <q-table
          :rows="previewData.leads?.slice(0, 5) || []"
          :columns="previewColumns"
          row-key="email"
          flat
          bordered
          dense
          class="preview-table"
        >
          <template v-slot:body-cell-phone="props">
            <q-td :props="props">
              <span class="text-green">{{ props.value }}</span>
            </q-td>
          </template>
        </q-table>
        
        <div v-if="(previewData.leads?.length || 0) > 5" class="text-caption text-grey-6 q-mt-sm text-center">
          ... and {{ (previewData.leads?.length || 0) - 5 }} more leads
        </div>
        
        <!-- Import Summary -->
        <div class="q-mt-lg">
          <q-banner class="bg-blue-1 text-primary" rounded>
            <template v-slot:avatar>
              <q-icon name="info" />
            </template>
            Ready to import {{ previewData.leads?.length || 0 }} leads from Facebook with the following settings:
            <ul class="q-mt-sm">
              <li><strong>Event:</strong> "Facebook Lead Ad"</li>
              <li><strong>Referral Source:</strong> Facebook</li>
              <li><strong>Sales Rep:</strong> {{ selectedSalesRep || 'Default (BDC)' }}</li>
              <li><strong>Division:</strong> {{ selectedDivision || 'Renovation' }}</li>
              <li><strong>LEAP Sync:</strong> Automatic</li>
            </ul>
          </q-banner>
        </div>
        
        <!-- Import Progress -->
        <div v-if="importing" class="q-mt-lg">
          <q-linear-progress
            :value="importProgress"
            color="primary"
            size="8px"
            class="q-mb-sm"
          />
          <div class="text-caption text-center">
            {{ importStatus }}
          </div>
        </div>
        
        <!-- Import Results -->
        <div v-if="importResults" class="q-mt-lg">
          <q-banner
            :class="importResults.successful > 0 ? 'bg-positive text-white' : 'bg-negative text-white'"
            rounded
          >
            <template v-slot:avatar>
              <q-icon :name="importResults.successful > 0 ? 'check_circle' : 'error'" />
            </template>
            Import completed: {{ importResults.successful }} successful, {{ importResults.failed }} failed
          </q-banner>
          
          <div v-if="importResults.errors?.length > 0" class="q-mt-md">
            <div class="text-subtitle2 q-mb-sm">Errors:</div>
            <q-list bordered class="rounded-borders">
              <q-item
                v-for="(error, index) in importResults.errors.slice(0, 3)"
                :key="index"
                dense
              >
                <q-item-section avatar>
                  <q-icon name="error" color="negative" size="sm" />
                </q-item-section>
                <q-item-section>
                  <div class="text-caption">{{ error }}</div>
                </q-item-section>
              </q-item>
              <q-item v-if="importResults.errors.length > 3" dense>
                <q-item-section class="text-center text-caption text-grey-6">
                  ... and {{ importResults.errors.length - 3 }} more errors
                </q-item-section>
              </q-item>
            </q-list>
          </div>
        </div>
      </q-card-section>
      
      <q-card-actions align="right">
        <q-btn flat label="Cancel" color="primary" @click="closeDialog" />
        <q-btn
          v-if="currentStep === 'upload'"
          unelevated
          label="Preview Import"
          color="primary"
          :loading="loadingPreview"
          :disable="!selectedFile || loadingPreview"
          @click="previewCsv"
        />
        <template v-else>
          <q-btn
            flat
            label="Back"
            color="primary"
            @click="goBack"
            :disable="importing"
          />
          <q-btn
            unelevated
            :label="`Import ${previewData.leads?.length || 0} Leads`"
            color="primary"
            :loading="importing"
            :disable="importing"
            @click="importLeads"
          />
        </template>
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { apiService } from '../services/api';
import { Notify } from 'quasar';

interface ImportResults {
  totalProcessed: number;
  successful: number;
  failed: number;
  errors: string[];
  importedLeads: any[];
}

interface PreviewData {
  leads: any[];
  leapData: {
    salesReps: any[];
    trades: any[];
    divisions: any[];
  };
  filename: string;
}

const emit = defineEmits<{
  importCompleted: [results: ImportResults];
  'update:modelValue': [value: boolean];
}>();

const props = defineProps<{
  modelValue: boolean;
}>();

const showDialog = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value)
});

// State management
const currentStep = ref<'upload' | 'preview'>('upload');
const fileInput = ref<HTMLInputElement>();
const selectedFile = ref<File | null>(null);
const isDragOver = ref(false);
const loadingPreview = ref(false);
const importing = ref(false);
const importProgress = ref(0);
const importStatus = ref('');
const importResults = ref<ImportResults | null>(null);
const previewData = ref<PreviewData>({ leads: [], leapData: { salesReps: [], trades: [], divisions: [] }, filename: '' });

// Batch settings
const batchSettings = ref({
  salesRepId: null as number | null,
  divisionId: 6496 as number | null, // Default to Renovation
  tradeIds: [105] as number[], // Default to Bath Remodel
  tempRating: null as number | null,
});

// Computed options for dropdowns
const salesRepOptions = computed(() => 
  previewData.value.leapData.salesReps.map((rep: any) => ({
    label: `${rep.first_name} ${rep.last_name}`,
    value: rep.id
  }))
);

const divisionOptions = computed(() =>
  previewData.value.leapData.divisions.map((div: any) => ({
    label: div.name,
    value: div.id
  }))
);

const tradeOptions = computed(() =>
  previewData.value.leapData.trades.map((trade: any) => ({
    label: trade.name,
    value: trade.id
  }))
);

const selectedSalesRep = computed(() => {
  const rep = previewData.value.leapData.salesReps.find((r: any) => r.id === batchSettings.value.salesRepId);
  return rep ? `${rep.first_name} ${rep.last_name}` : null;
});

const selectedDivision = computed(() => {
  const div = previewData.value.leapData.divisions.find((d: any) => d.id === batchSettings.value.divisionId);
  return div?.name || null;
});

// Table columns for preview
const previewColumns = [
  { name: 'fullName', label: 'Name', field: 'fullName', align: 'left', sortable: true },
  { name: 'email', label: 'Email', field: 'email', align: 'left', sortable: true },
  { name: 'phone', label: 'Phone', field: 'phone', align: 'left', sortable: true },
  { name: 'notes', label: 'Source Info', field: (row: any) => row.notes?.substring(0, 50) + '...', align: 'left' },
];

// File handling
function triggerFileInput() {
  fileInput.value?.click();
}

function onFileSelect(event: Event) {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files[0]) {
    handleFile(input.files[0]);
  }
}

function onDrop(event: DragEvent) {
  event.preventDefault();
  isDragOver.value = false;
  
  if (event.dataTransfer?.files && event.dataTransfer.files[0]) {
    handleFile(event.dataTransfer.files[0]);
  }
}

function onDragOver(event: DragEvent) {
  event.preventDefault();
  isDragOver.value = true;
}

function onDragLeave(event: DragEvent) {
  event.preventDefault();
  isDragOver.value = false;
}

function handleFile(file: File) {
  if (!file.name.toLowerCase().endsWith('.csv')) {
    Notify.create({
      type: 'negative',
      message: 'Please select a CSV file.',
      timeout: 3000,
    });
    return;
  }
  
  if (file.size > 5 * 1024 * 1024) {
    Notify.create({
      type: 'negative',
      message: 'File size must be less than 5MB.',
      timeout: 3000,
    });
    return;
  }
  
  selectedFile.value = file;
  importResults.value = null;
}

function clearFile() {
  selectedFile.value = null;
  importResults.value = null;
  if (fileInput.value) {
    fileInput.value.value = '';
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' bytes';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// Preview functionality
async function previewCsv() {
  if (!selectedFile.value) return;
  
  loadingPreview.value = true;
  
  try {
    const response = await apiService.previewLeadsFromCsv(selectedFile.value);
    
    if (response.success && response.data) {
      previewData.value = response.data;
      currentStep.value = 'preview';
      
      Notify.create({
        type: 'positive',
        message: `Found ${response.data.leads.length} leads in CSV file`,
        timeout: 3000,
      });
    } else {
      throw new Error(response.error || 'Failed to preview CSV');
    }
  } catch (error: any) {
    console.error('CSV preview error:', error);
    Notify.create({
      type: 'negative',
      message: error.message || 'Failed to preview CSV file. Please try again.',
      timeout: 5000,
    });
  } finally {
    loadingPreview.value = false;
  }
}

// Import functionality
async function importLeads() {
  if (!previewData.value.leads.length) return;
  
  importing.value = true;
  importProgress.value = 0;
  importStatus.value = 'Starting import...';
  importResults.value = null;
  
  try {
    // Apply batch settings to all leads
    const leadsToImport = previewData.value.leads.map(lead => ({
      ...lead,
      salesRepId: batchSettings.value.salesRepId || lead.salesRepId,
      divisionId: batchSettings.value.divisionId || lead.divisionId,
      tradeIds: batchSettings.value.tradeIds || lead.tradeIds,
      tempRating: batchSettings.value.tempRating || lead.tempRating,
    }));
    
    // Progress simulation
    const progressInterval = setInterval(() => {
      if (importProgress.value < 0.8) {
        importProgress.value += 0.1;
      }
    }, 300);
    
    importStatus.value = 'Importing leads to database and syncing to LEAP...';
    const response = await apiService.importLeadsFromPreview(leadsToImport);
    
    clearInterval(progressInterval);
    importProgress.value = 1;
    importStatus.value = 'Import completed!';
    
    if (response.success || (response.data && response.data.successful > 0)) {
      const results = response.data as ImportResults;
      importResults.value = results;
      
      emit('importCompleted', results);
      
      Notify.create({
        type: results.failed > 0 ? 'warning' : 'positive',
        message: `Import completed: ${results.successful} leads imported${results.failed > 0 ? `, ${results.failed} failed` : ''}`,
        timeout: 5000,
      });
    } else {
      throw new Error(response.error || 'Import failed');
    }
  } catch (error: any) {
    console.error('Import error:', error);
    importProgress.value = 0;
    importStatus.value = 'Import failed';
    
    Notify.create({
      type: 'negative',
      message: error.message || 'Failed to import leads. Please try again.',
      timeout: 5000,
    });
  } finally {
    importing.value = false;
  }
}

function goBack() {
  currentStep.value = 'upload';
  importResults.value = null;
}

function closeDialog() {
  showDialog.value = false;
  // Reset state when closing
  setTimeout(() => {
    currentStep.value = 'upload';
    selectedFile.value = null;
    loadingPreview.value = false;
    importing.value = false;
    importProgress.value = 0;
    importStatus.value = '';
    importResults.value = null;
    previewData.value = { leads: [], leapData: { salesReps: [], trades: [], divisions: [] }, filename: '' };
    batchSettings.value = {
      salesRepId: null,
      divisionId: 6496,
      tradeIds: [105],
      tempRating: null,
    };
    if (fileInput.value) {
      fileInput.value.value = '';
    }
  }, 300);
}
</script>

<style scoped>
.file-drop-zone {
  border: 2px dashed #e0e0e0;
  border-radius: 8px;
  padding: 2rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  background: #fafafa;
}

.file-drop-zone:hover,
.file-drop-zone.dragover {
  border-color: #1976d2;
  background: #f5f5f5;
}

.file-drop-zone.has-file {
  border-color: #4caf50;
  background: #f8fff8;
}

.upload-content {
  opacity: 0.8;
}

.selected-file {
  color: #2e7d32;
}

.preview-table {
  max-height: 300px;
}
</style>
