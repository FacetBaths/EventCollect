<template>
  <div class="login-bg fullscreen flex flex-center">
    <q-card class="login-card glass q-pa-lg" flat>
      <!-- Logo + title -->
      <div class="column items-center q-mb-lg">
        <img
          src="https://raw.githubusercontent.com/FacetBaths/EventCollect/main/client/public/assets/Logo_V2_Gradient7_CTC.png"
          alt="EventCollect"
          style="height: 64px; object-fit: contain"
          class="q-mb-sm"
        />
        <div class="text-h5 text-white text-weight-medium">EventCollect</div>
        <div class="text-caption text-grey-4">Sign in to continue</div>
      </div>

      <q-form @submit.prevent="handleLogin" class="q-gutter-md">
        <q-input
          v-model="email"
          label="Email"
          type="email"
          outlined
          dark
          color="primary"
          label-color="grey-4"
          input-class="text-white"
          autocomplete="username"
          :rules="[v => !!v || 'Email is required']"
        >
          <template v-slot:prepend>
            <q-icon name="mail" color="grey-4" />
          </template>
        </q-input>

        <q-input
          v-model="password"
          label="Password"
          :type="showPassword ? 'text' : 'password'"
          outlined
          dark
          color="primary"
          label-color="grey-4"
          input-class="text-white"
          autocomplete="current-password"
          :rules="[v => !!v || 'Password is required']"
        >
          <template v-slot:prepend>
            <q-icon name="lock" color="grey-4" />
          </template>
          <template v-slot:append>
            <q-icon
              :name="showPassword ? 'visibility_off' : 'visibility'"
              color="grey-4"
              class="cursor-pointer"
              @click="showPassword = !showPassword"
            />
          </template>
        </q-input>

        <div v-if="errorMessage" class="text-negative text-caption q-px-xs">
          {{ errorMessage }}
        </div>

        <q-btn
          type="submit"
          label="Sign In"
          color="primary"
          unelevated
          class="full-width q-mt-sm"
          :loading="loading"
          size="lg"
        />
      </q-form>
    </q-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../stores/auth-store';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const email = ref('');
const password = ref('');
const showPassword = ref(false);
const loading = ref(false);
const errorMessage = ref('');

async function handleLogin() {
  errorMessage.value = '';
  loading.value = true;
  try {
    await authStore.login(email.value.trim(), password.value);
    const redirect = (route.query.redirect as string) || '/';
    await router.replace(redirect);
  } catch (err: any) {
    const msg = err.response?.data?.error || err.message || 'Login failed';
    errorMessage.value = msg;
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login-bg {
  background: linear-gradient(135deg, #0d1b2a 0%, #1a3a4a 50%, #0d1b2a 100%);
  min-height: 100vh;
}

.login-card {
  width: 100%;
  max-width: 400px;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.12);
}
</style>
