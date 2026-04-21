<template>
  <q-page class="q-pa-md">
    <div class="text-h4 text-primary text-center q-mb-lg">Admin Settings</div>

    <!-- User list -->
    <q-card flat bordered class="q-mb-lg">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6">Users</div>
        <q-space />
        <q-btn unelevated color="primary" icon="person_add" label="Add User" @click="openCreate" />
      </q-card-section>

      <q-card-section>
        <q-table
          :rows="users"
          :columns="columns"
          row-key="_id"
          :loading="loadingUsers"
          flat
          :pagination="{ rowsPerPage: 20 }"
        >
          <template v-slot:body-cell-role="props">
            <q-td :props="props">
              <q-chip
                :color="roleColor(props.value)"
                text-color="white"
                size="sm"
                dense
                :label="props.value.toUpperCase()"
              />
            </q-td>
          </template>

          <template v-slot:body-cell-isActive="props">
            <q-td :props="props">
              <q-icon :name="props.value ? 'check_circle' : 'cancel'" :color="props.value ? 'positive' : 'grey-5'" />
            </q-td>
          </template>

          <template v-slot:body-cell-leapRepId="props">
            <q-td :props="props">
              <span v-if="props.value" class="text-caption">
                {{ repNameForId(props.value) || `#${props.value}` }}
              </span>
              <span v-else class="text-grey-5 text-caption">—</span>
            </q-td>
          </template>

          <template v-slot:body-cell-leapCallCenterRepId="props">
            <q-td :props="props">
              <span v-if="props.value" class="text-caption">
                {{ repNameForId(props.value) || `#${props.value}` }}
              </span>
              <span v-else class="text-grey-5 text-caption">—</span>
            </q-td>
          </template>

          <template v-slot:body-cell-actions="props">
            <q-td :props="props">
              <q-btn flat icon="edit" color="primary" size="sm" @click="openEdit(props.row)">
                <q-tooltip>Edit</q-tooltip>
              </q-btn>
            </q-td>
          </template>
        </q-table>
      </q-card-section>
    </q-card>

    <!-- Create / Edit User Dialog -->
    <q-dialog v-model="showUserDialog" persistent>
      <q-card style="min-width: 420px; max-width: 600px; width: 95vw">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">{{ editingUser ? 'Edit User' : 'Add User' }}</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section class="q-gutter-sm">
          <q-input v-model="form.name" label="Full Name" outlined dense />
          <q-input
            v-model="form.email"
            label="Email"
            type="email"
            outlined dense
            :disable="!!editingUser"
          />

          <!-- Password (required for create, optional for edit) -->
          <q-input
            v-model="form.password"
            :label="editingUser ? 'New Password (leave blank to keep current)' : 'Password'"
            :type="showFormPwd ? 'text' : 'password'"
            outlined dense
          >
            <template v-slot:append>
              <q-icon :name="showFormPwd ? 'visibility_off' : 'visibility'" class="cursor-pointer" @click="showFormPwd = !showFormPwd" />
            </template>
          </q-input>

          <q-select
            v-model="form.role"
            :options="roleOptions"
            emit-value map-options
            label="Role" outlined dense
          />

          <!-- LEAP Rep (sales rep for standard/admin users) -->
          <q-select
            v-model="form.leapRepId"
            :options="[{ label: 'None', value: null }, ...salesRepOptions]"
            emit-value map-options
            option-value="value" option-label="label"
            label="LEAP Sales Rep"
            outlined dense clearable
            :loading="leapLoading"
            hint="Default sales rep assigned to their leads"
          />

          <!-- LEAP Call Center Rep (for BDC users) -->
          <q-select
            v-model="form.leapCallCenterRepId"
            :options="[{ label: 'None', value: null }, ...salesRepOptions]"
            emit-value map-options
            option-value="value" option-label="label"
            label="LEAP Call Center Rep"
            outlined dense clearable
            :loading="leapLoading"
            hint="BDC/call center rep for LEAP syncs"
          />

          <q-toggle
            v-if="editingUser"
            v-model="form.isActive"
            label="Active"
            color="positive"
          />
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancel" v-close-popup />
          <q-btn
            unelevated
            :label="editingUser ? 'Save Changes' : 'Create User'"
            color="primary"
            :loading="savingUser"
            :disable="!form.name || !form.email || (!editingUser && !form.password)"
            @click="saveUser"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { Notify } from 'quasar';
import api from '../services/api';
import { useLeapData } from '../composables/useLeapData';

interface AdminUser {
  _id: string;
  name: string;
  email: string;
  role: 'admin' | 'standard' | 'bdc';
  leapRepId: number | null;
  leapCallCenterRepId: number | null;
  isActive: boolean;
}

const { salesRepOptions, loading: leapLoading } = useLeapData();

const users = ref<AdminUser[]>([]);
const loadingUsers = ref(false);
const showUserDialog = ref(false);
const savingUser = ref(false);
const editingUser = ref<AdminUser | null>(null);
const showFormPwd = ref(false);

const form = ref({
  name: '',
  email: '',
  password: '',
  role: 'standard' as 'admin' | 'standard' | 'bdc',
  leapRepId: null as number | null,
  leapCallCenterRepId: null as number | null,
  isActive: true,
});

const roleOptions = [
  { label: 'Admin', value: 'admin' },
  { label: 'Standard', value: 'standard' },
  { label: 'BDC', value: 'bdc' },
];

const columns = [
  { name: 'name', label: 'Name', field: 'name', align: 'left' as const, sortable: true },
  { name: 'email', label: 'Email', field: 'email', align: 'left' as const, sortable: true },
  { name: 'role', label: 'Role', field: 'role', align: 'center' as const, sortable: true },
  { name: 'leapRepId', label: 'Sales Rep', field: 'leapRepId', align: 'left' as const },
  { name: 'leapCallCenterRepId', label: 'CC Rep', field: 'leapCallCenterRepId', align: 'left' as const },
  { name: 'isActive', label: 'Active', field: 'isActive', align: 'center' as const },
  { name: 'actions', label: '', field: 'actions', align: 'center' as const },
];

const repNameMap = computed(() => {
  const m = new Map<number, string>();
  salesRepOptions.value.forEach(r => m.set(r.value, r.label));
  return m;
});

function repNameForId(id: number | null): string | undefined {
  if (id === null) return undefined;
  return repNameMap.value.get(id);
}

function roleColor(role: string) {
  if (role === 'admin') return 'orange-8';
  if (role === 'bdc') return 'teal-8';
  return 'blue-8';
}

async function fetchUsers() {
  loadingUsers.value = true;
  try {
    const res = await api.get('/auth/users');
    users.value = res.data.data;
  } catch (err: any) {
    Notify.create({ type: 'negative', message: 'Failed to load users', timeout: 3000 });
  } finally {
    loadingUsers.value = false;
  }
}

function resetForm() {
  form.value = { name: '', email: '', password: '', role: 'standard', leapRepId: null, leapCallCenterRepId: null, isActive: true };
  showFormPwd.value = false;
}

function openCreate() {
  editingUser.value = null;
  resetForm();
  showUserDialog.value = true;
}

function openEdit(user: AdminUser) {
  editingUser.value = user;
  form.value = {
    name: user.name,
    email: user.email,
    password: '',
    role: user.role,
    leapRepId: user.leapRepId,
    leapCallCenterRepId: user.leapCallCenterRepId,
    isActive: user.isActive,
  };
  showUserDialog.value = true;
}

async function saveUser() {
  savingUser.value = true;
  try {
    if (editingUser.value) {
      const payload: Record<string, any> = {
        name: form.value.name,
        role: form.value.role,
        leapRepId: form.value.leapRepId,
        leapCallCenterRepId: form.value.leapCallCenterRepId,
        isActive: form.value.isActive,
      };
      if (form.value.password) payload.newPassword = form.value.password;
      await api.put(`/auth/users/${editingUser.value._id}`, payload);
      Notify.create({ type: 'positive', message: 'User updated', timeout: 3000 });
    } else {
      await api.post('/auth/users', {
        name: form.value.name,
        email: form.value.email,
        password: form.value.password,
        role: form.value.role,
        leapRepId: form.value.leapRepId,
        leapCallCenterRepId: form.value.leapCallCenterRepId,
      });
      Notify.create({ type: 'positive', message: 'User created', timeout: 3000 });
    }
    showUserDialog.value = false;
    await fetchUsers();
  } catch (err: any) {
    Notify.create({
      type: 'negative',
      message: err.response?.data?.error || 'Failed to save user',
      timeout: 4000,
    });
  } finally {
    savingUser.value = false;
  }
}

onMounted(fetchUsers);
</script>
