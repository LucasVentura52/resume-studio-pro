<script setup>
import { computed } from 'vue'
import { useUiFeedback } from '../../composables/useUiFeedback'

const feedback = useUiFeedback()

const snackbarModel = computed({
  get: () => feedback.state.snackbar.open,
  set: (value) => feedback.setSnackbarVisible(value),
})

const confirmModel = computed({
  get: () => feedback.state.confirm.open,
  set: (value) => {
    if (!value) {
      feedback.cancelConfirm()
    }
  },
})
</script>

<template>
  <v-snackbar
    v-model="snackbarModel"
    :timeout="feedback.state.snackbar.timeout"
    :color="feedback.state.snackbar.color"
    class="app-feedback-snackbar"
    location="bottom end"
    rounded="pill"
    role="status"
    aria-live="polite"
  >
    <div class="d-flex align-center ga-3">
      <v-icon :icon="feedback.state.snackbar.icon" />
      <div class="feedback-snackbar-copy">
        <p v-if="feedback.state.snackbar.title" class="feedback-snackbar-title">
          {{ feedback.state.snackbar.title }}
        </p>
        <p class="feedback-snackbar-message">{{ feedback.state.snackbar.message }}</p>
      </div>
    </div>

    <template #actions>
      <v-btn color="white" variant="text" size="small" @click="feedback.setSnackbarVisible(false)">
        Fechar
      </v-btn>
    </template>
  </v-snackbar>

  <v-dialog v-model="confirmModel" max-width="470" :persistent="feedback.state.confirm.persistent">
    <v-card rounded="xl" class="feedback-dialog">
      <v-card-text class="pa-5">
        <div class="d-flex ga-3 align-start">
          <v-avatar :color="feedback.state.confirm.color" size="42" variant="tonal">
            <v-icon :icon="feedback.state.confirm.icon" />
          </v-avatar>
          <div>
            <p class="text-subtitle-1 font-weight-bold mb-1">
              {{ feedback.state.confirm.title }}
            </p>
            <p class="text-body-2 text-medium-emphasis mb-0">
              {{ feedback.state.confirm.message }}
            </p>
          </div>
        </div>
      </v-card-text>

      <v-divider />

      <v-card-actions class="justify-end ga-2 px-4 py-3">
        <v-btn variant="text" @click="feedback.cancelConfirm">
          {{ feedback.state.confirm.cancelText }}
        </v-btn>
        <v-btn :color="feedback.state.confirm.color" variant="flat" @click="feedback.acceptConfirm">
          {{ feedback.state.confirm.confirmText }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
