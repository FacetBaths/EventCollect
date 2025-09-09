<template>
  <q-dialog v-model="showDialog" persistent :maximized="$q.screen.lt.md">
    <q-card style="min-width: 500px; max-width: 800px;">
      <q-card-section class="row items-center q-pb-none">
        <q-icon name="upload_file" size="2rem" color="primary" class="q-mr-md" />
        <div class="text-h6">Import Facebook Leads from CSV</div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>
      
      <q-card-section>
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
        
        <!-- Import Options -->
        <div v-if="selectedFile" class="q-mt-lg">
          <div class="text-subtitle2 q-mb-sm">Import Options</div>
          
          <q-checkbox
            v-model="autoSyncToLeap"
            label="Automatically sync leads to LEAP CRM"
            color="primary"
            class="q-mb-sm"
          />
          
          <div class="text-caption text-grey-6">
            All imported leads will be labeled as "Facebook Lead Ad" and marked with Facebook as the referral source.
          </div>
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
                v-for="(error, index) in importResults.errors.slice(0, 5)"
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
              <q-item v-if="importResults.errors.length > 5" dense>
                <q-item-section class="text-center text-caption text-grey-6">
                  ... and {{ importResults.errors.length - 5 }} more errors
                </q-item-section>
              </q-item>
            </q-list>
          </div>
        </div>
      </q-card-section>
      
      <q-card-actions align="right">
        <q-btn flat label="Cancel" color="primary" @click="closeDialog" />
        <q-btn
          unelevated
          label="Import Leads"
          color="primary"
          :loading="importing"
          :disable="!selectedFile || importing"
          @click="importCsv"
        />
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

const emit = defineEmits<{
  importCompleted: [results: ImportResults];
}>();

const props = defineProps<{
  modelValue: boolean;
}>();

const showDialog = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value)
});

const fileInput = ref<HTMLInputElement>();
const selectedFile = ref<File | null>(null);
const isDragOver = ref(false);
const importing = ref(false);
const importProgress = ref(0);
const importStatus = ref('');
const importResults = ref<ImportResults | null>(null);
const autoSyncToLeap = ref(true);

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

async function importCsv() {
  if (!selectedFile.value) return;
  
  importing.value = true;
  importProgress.value = 0;
  importStatus.value = 'Uploading file...';
  importResults.value = null;
  
  try {
    // Simulate progress
    const progressInterval = setInterval(() => {
      if (importProgress.value < 0.8) {
        importProgress.value += 0.1;
      }
    }, 200);
    
    importStatus.value = 'Processing CSV file...';
    const response = await apiService.importLeadsFromCsv(selectedFile.value);
    
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
    console.error('CSV import error:', error);
    importProgress.value = 0;
    importStatus.value = 'Import failed';
    
    Notify.create({
      type: 'negative',
      message: error.message || 'Failed to import CSV file. Please try again.',
      timeout: 5000,
    });
  } finally {
    importing.value = false;
  }
}

function closeDialog() {
  showDialog.value = false;
  // Reset state when closing
  setTimeout(() => {
    selectedFile.value = null;
    importing.value = false;
    importProgress.value = 0;
    importStatus.value = '';
    importResults.value = null;
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
</style>
