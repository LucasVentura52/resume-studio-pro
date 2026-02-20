<script setup>
import { computed } from 'vue'
import { useDisplay } from 'vuetify'

defineProps({
  records: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(['create', 'edit', 'preview', 'delete', 'duplicate'])
const display = useDisplay()
const useCompactActions = computed(() => display.smAndDown.value)
</script>

<template>
  <v-card rounded="xl" class="glass-card">
    <div class="d-flex align-center justify-space-between flex-wrap ga-2 pa-4 pb-2">
      <div>
        <p class="text-subtitle-1 font-weight-bold mb-1">Currículos salvos</p>
        <p class="text-caption text-medium-emphasis">
          Visualize, edite, duplique ou exclua cada versão.
        </p>
      </div>
      <v-btn color="primary" prepend-icon="mdi-plus" @click="emit('create')">Novo currículo</v-btn>
    </div>

    <v-divider />

    <v-list lines="two" density="compact">
      <v-list-item
        v-for="record in records"
        :key="record.id"
        class="resume-list-item"
        role="button"
        tabindex="0"
        :aria-label="`Editar currículo ${record.title}`"
        @click="emit('edit', record.id)"
        @keydown.enter.prevent="emit('edit', record.id)"
        @keydown.space.prevent="emit('edit', record.id)"
      >
        <template #prepend>
          <v-avatar size="34" color="primary" variant="tonal">
            <v-icon icon="mdi-file-document-outline" size="18" />
          </v-avatar>
        </template>

        <v-list-item-title class="font-weight-medium">{{ record.title }}</v-list-item-title>
        <v-list-item-subtitle class="resume-list-subtitle">{{
          record.subtitle
        }}</v-list-item-subtitle>

        <template #append>
          <v-menu v-if="useCompactActions" location="bottom end">
            <template #activator="{ props: menuProps }">
              <v-btn
                v-bind="menuProps"
                icon="mdi-dots-vertical"
                size="default"
                variant="text"
                :aria-label="`Ações para ${record.title}`"
                @click.stop
              />
            </template>

            <v-list density="compact" class="mobile-record-menu">
              <v-list-item
                prepend-icon="mdi-eye-outline"
                title="Visualizar"
                @click="emit('preview', record.id)"
              />
              <v-list-item
                prepend-icon="mdi-pencil-outline"
                title="Editar"
                @click="emit('edit', record.id)"
              />
              <v-list-item
                prepend-icon="mdi-content-copy"
                title="Duplicar"
                @click="emit('duplicate', record.id)"
              />
              <v-list-item
                prepend-icon="mdi-delete-outline"
                title="Excluir"
                class="text-error"
                @click="emit('delete', record.id)"
              />
            </v-list>
          </v-menu>

          <div v-else class="d-flex ga-1">
            <v-tooltip text="Visualizar currículo" location="top">
              <template #activator="{ props: tooltipProps }">
                <v-btn
                  v-bind="tooltipProps"
                  icon="mdi-eye-outline"
                  size="small"
                  variant="text"
                  :aria-label="`Visualizar ${record.title}`"
                  @click.stop="emit('preview', record.id)"
                />
              </template>
            </v-tooltip>

            <v-tooltip text="Editar currículo" location="top">
              <template #activator="{ props: tooltipProps }">
                <v-btn
                  v-bind="tooltipProps"
                  icon="mdi-pencil-outline"
                  size="small"
                  variant="text"
                  :aria-label="`Editar ${record.title}`"
                  @click.stop="emit('edit', record.id)"
                />
              </template>
            </v-tooltip>

            <v-tooltip text="Duplicar currículo" location="top">
              <template #activator="{ props: tooltipProps }">
                <v-btn
                  v-bind="tooltipProps"
                  icon="mdi-content-copy"
                  size="small"
                  variant="text"
                  :aria-label="`Duplicar ${record.title}`"
                  @click.stop="emit('duplicate', record.id)"
                />
              </template>
            </v-tooltip>

            <v-tooltip text="Excluir currículo" location="top">
              <template #activator="{ props: tooltipProps }">
                <v-btn
                  v-bind="tooltipProps"
                  icon="mdi-delete-outline"
                  size="small"
                  color="error"
                  variant="text"
                  :aria-label="`Excluir ${record.title}`"
                  @click.stop="emit('delete', record.id)"
                />
              </template>
            </v-tooltip>
          </div>
        </template>
      </v-list-item>

      <v-list-item v-if="!records.length" class="py-8">
        <template #prepend>
          <v-avatar size="34" color="secondary" variant="tonal">
            <v-icon icon="mdi-folder-outline" size="18" />
          </v-avatar>
        </template>
        <v-list-item-title>Nenhum currículo salvo</v-list-item-title>
        <v-list-item-subtitle
          >Clique em "Novo currículo" para iniciar o primeiro registro.</v-list-item-subtitle
        >
      </v-list-item>
    </v-list>
  </v-card>
</template>
