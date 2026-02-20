<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import ResumeListPanel from '../components/resume/ResumeListPanel.vue'
import { templateOptions } from '../constants/resumeOptions'
import { useResumeManager } from '../composables/useResumeManager'
import { useUiFeedback } from '../composables/useUiFeedback'

const router = useRouter()
const manager = useResumeManager()
const feedback = useUiFeedback()
const searchQuery = ref('')
const selectedTemplate = ref('all')
const importingBackup = ref(false)
const backupInput = ref(null)

const notifyStorageWarning = () => {
  const message = manager.consumeStorageWarning()
  if (!message) return
  feedback.warning({
    title: 'Armazenamento local',
    message,
  })
}
notifyStorageWarning()

const templateFilterOptions = computed(() => [
  { title: 'Todos os templates', value: 'all' },
  ...templateOptions.map((item) => ({ title: item.title, value: item.value })),
])

const recordsForList = computed(() =>
  manager.records.value.map(({ id, title, updatedAt, template, data }) => {
    const role = data?.personal?.role?.trim() || 'Sem cargo definido'
    return {
      id,
      title,
      updatedAt,
      template: template || 'classic',
      subtitle: `${role} - Atualizado em ${manager.formatRecordDateTime(updatedAt)}`,
    }
  }),
)

const filteredRecords = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  const template = selectedTemplate.value

  return recordsForList.value.filter((record) => {
    const templateOk = template === 'all' || record.template === template
    if (!templateOk) return false
    if (!query) return true

    const haystack = [record.title, record.subtitle].join(' ').toLowerCase()
    return haystack.includes(query)
  })
})

const totalRecords = computed(() => recordsForList.value.length)
const filteredCount = computed(() => filteredRecords.value.length)
const latestRecord = computed(() => recordsForList.value[0] ?? null)

const triggerBackupImport = () => {
  backupInput.value?.click()
}

const exportBackup = () => {
  const payload = manager.exportBackup()
  const file = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(file)
  const link = document.createElement('a')
  link.href = url
  link.download = `resume-studio-backup-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)

  feedback.success({
    title: 'Backup exportado',
    message: 'Arquivo JSON gerado com os currículos atuais.',
  })
}

const importBackup = async (event) => {
  const file = Array.isArray(event) ? event[0] : event?.target?.files?.[0]
  if (!file) return

  importingBackup.value = true
  try {
    const text = await file.text()
    const payload = JSON.parse(text)
    const result = manager.importBackup(payload, { mode: 'merge' })
    notifyStorageWarning()
    feedback.success({
      title: 'Backup importado',
      message: `${result.imported} registros processados. Total atual: ${result.total}.`,
    })
  } catch (error) {
    console.error(error)
    feedback.error({
      title: 'Falha na importação',
      message: 'Não foi possível importar o backup. Verifique o arquivo e tente novamente.',
    })
  } finally {
    importingBackup.value = false
    if (event?.target) {
      event.target.value = ''
    }
  }
}

const goToCreate = () => {
  router.push({ name: 'resume-create' })
}

const goToEdit = (recordId) => {
  router.push({ name: 'resume-edit', params: { id: recordId } })
}

const goToPreview = (recordId) => {
  router.push({ name: 'resume-preview', params: { id: recordId } })
}

const deleteRecord = async (recordId) => {
  const target = manager.getRecordById(recordId)
  if (!target) return

  const confirmed = await feedback.confirm({
    title: 'Excluir currículo',
    message: `Excluir "${target.title}"? Esta ação não pode ser desfeita.`,
    confirmText: 'Excluir',
    cancelText: 'Cancelar',
    color: 'error',
    icon: 'mdi-delete-alert-outline',
  })
  if (!confirmed) return

  const removed = manager.deleteRecord(recordId)

  if (removed) {
    feedback.success({
      title: 'Currículo excluído',
      message: `"${target.title}" foi removido com sucesso.`,
    })
    notifyStorageWarning()
    return
  }

  feedback.error({
    title: 'Falha ao excluir',
    message: 'Não foi possível remover o currículo selecionado.',
  })
}

const duplicateRecord = (recordId) => {
  const duplicated = manager.duplicateRecord(recordId)
  if (!duplicated) {
    feedback.error({
      title: 'Falha na duplicação',
      message: 'Não foi possível duplicar o currículo selecionado.',
    })
    return
  }

  feedback.success({
    title: 'Currículo duplicado',
    message: `Nova cópia criada: "${duplicated.title}".`,
  })
  notifyStorageWarning()

  router.push({ name: 'resume-edit', params: { id: duplicated.id } })
}
</script>

<template>
  <v-container fluid class="page-shell">
    <v-row>
      <v-col cols="12">
        <v-card rounded="xl" class="dashboard-hero">
          <div class="d-flex justify-space-between align-center flex-wrap ga-3">
            <div>
              <p class="text-overline text-white font-weight-bold mb-1">Resume Studio Pro</p>
              <h1 class="text-h5 font-weight-bold mb-1">Gestão profissional de currículos</h1>
              <p class="text-body-2 text-white-80">
                Centralize versões, edite com estrutura completa e exporte PDF final sem depender da impressão do navegador.
              </p>
            </div>
            <div class="d-flex flex-wrap ga-2">
              <v-btn color="white" class="text-primary font-weight-bold" prepend-icon="mdi-plus" @click="goToCreate">
                Novo currículo
              </v-btn>
              <v-btn
                color="white"
                variant="outlined"
                prepend-icon="mdi-database-export-outline"
                class="text-white"
                @click="exportBackup"
              >
                Exportar backup
              </v-btn>
              <v-btn
                color="white"
                variant="outlined"
                prepend-icon="mdi-database-import-outline"
                class="text-white"
                :loading="importingBackup"
                @click="triggerBackupImport"
              >
                Importar backup
              </v-btn>
            </div>
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" md="4">
        <v-card rounded="xl" class="glass-card stat-card">
          <p class="text-caption text-medium-emphasis mb-1">Currículos salvos</p>
          <p class="text-h4 font-weight-bold mb-1">{{ totalRecords }}</p>
          <p class="text-caption text-medium-emphasis">
            {{ filteredCount }} exibidos nos filtros atuais.
          </p>
        </v-card>
      </v-col>

      <v-col cols="12" md="8">
        <v-card rounded="xl" class="glass-card stat-card">
          <p class="text-caption text-medium-emphasis mb-1">Última atualização</p>
          <p class="text-h6 font-weight-bold mb-1">
            {{ latestRecord ? latestRecord.title : 'Nenhum currículo salvo' }}
          </p>
          <p class="text-caption text-medium-emphasis">
            {{ latestRecord ? manager.formatRecordDateTime(latestRecord.updatedAt) : 'Crie um currículo para iniciar.' }}
          </p>
        </v-card>
      </v-col>

      <v-col cols="12">
        <v-card rounded="xl" class="glass-card pa-4 mb-3">
          <v-row>
            <v-col cols="12" md="7">
              <v-text-field
                v-model="searchQuery"
                prepend-inner-icon="mdi-magnify"
                label="Buscar por título, cargo ou atualização"
                hide-details
                density="compact"
                variant="outlined"
              />
            </v-col>
            <v-col cols="12" md="5">
              <v-select
                v-model="selectedTemplate"
                :items="templateFilterOptions"
                item-title="title"
                item-value="value"
                label="Filtrar por template"
                hide-details
                density="compact"
                variant="outlined"
              />
            </v-col>
          </v-row>
        </v-card>

        <ResumeListPanel
          :records="filteredRecords"
          @create="goToCreate"
          @edit="goToEdit"
          @preview="goToPreview"
          @delete="deleteRecord"
          @duplicate="duplicateRecord"
        />
      </v-col>
    </v-row>

    <input
      ref="backupInput"
      type="file"
      accept="application/json,.json"
      class="d-none"
      @change="importBackup"
    />
  </v-container>
</template>
