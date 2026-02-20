<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useDisplay } from 'vuetify'
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router'
import ResumeEditorForm from '../components/resume/ResumeEditorForm.vue'
import {
  accentOptions,
  languageLevelOptions,
  levelOptions,
  paperOptions,
  templateOptions,
} from '../constants/resumeOptions'
import { useResumeManager } from '../composables/useResumeManager'
import { useUiFeedback } from '../composables/useUiFeedback'
import { cloneResumeData, createEmptyResumeData, createSampleResumeData } from '../utils/resumeFactories'

const route = useRoute()
const router = useRouter()
const manager = useResumeManager()
const feedback = useUiFeedback()
const display = useDisplay()

const resumeTitle = ref('')
const selectedTemplate = ref('classic')
const selectedPaper = ref('a4')
const accentColor = ref('#0B4F6C')
const openPanels = ref([0])
const recordId = ref('')
const notFound = ref(false)
const baseline = ref('')
const savingFromQuickBar = ref(false)
const previewingFromQuickBar = ref(false)

const editorData = reactive(createEmptyResumeData())

const ensureRouteId = () => {
  const paramValue = route.params.id
  return typeof paramValue === 'string' ? paramValue : ''
}

const replaceEditorData = (nextData) => {
  for (const [key, value] of Object.entries(nextData)) {
    editorData[key] = value
  }
}

const buildSnapshot = () =>
  JSON.stringify({
    id: recordId.value,
    title: resumeTitle.value.trim(),
    template: selectedTemplate.value,
    paper: selectedPaper.value,
    accentColor: accentColor.value,
    data: editorData,
  })

const updateBaseline = () => {
  baseline.value = buildSnapshot()
}

const hasUnsavedChanges = computed(() => buildSnapshot() !== baseline.value)

const currentTemplateTitle = computed(
  () => templateOptions.find((item) => item.value === selectedTemplate.value)?.title ?? 'Clássico',
)

const currentPaperTitle = computed(
  () => paperOptions.find((item) => item.value === selectedPaper.value)?.title ?? 'A4',
)

const editorModeLabel = computed(() => (recordId.value ? 'Editando currículo salvo' : 'Novo currículo'))
const isMobile = computed(() => display.mdAndDown.value)
const fieldDensity = computed(() => (display.smAndDown.value ? 'comfortable' : 'compact'))
const templateChipSize = computed(() => (display.smAndDown.value ? 'default' : 'small'))

const applyEditorModel = (model) => {
  recordId.value = model.id || ''
  resumeTitle.value = model.title || ''
  selectedTemplate.value = model.template || 'classic'
  selectedPaper.value = model.paper || 'a4'
  accentColor.value = model.accentColor || '#0B4F6C'
  replaceEditorData(model.data)
  openPanels.value = [0]
  updateBaseline()
}

const loadFromRoute = () => {
  const routeId = ensureRouteId()

  if (!routeId) {
    notFound.value = false
    applyEditorModel(manager.createEditorModel())
    return
  }

  const existingRecord = manager.getRecordById(routeId)

  if (!existingRecord) {
    notFound.value = true
    applyEditorModel(manager.createEditorModel())
    return
  }

  notFound.value = false
  applyEditorModel(manager.createEditorModel(routeId))
}

const confirmDiscardChanges = async () => {
  if (!hasUnsavedChanges.value) return true
  return feedback.confirm({
    title: 'Alterações não salvas',
    message: 'Existem alterações não salvas. Deseja descartar e continuar?',
    confirmText: 'Descartar',
    cancelText: 'Continuar editando',
    color: 'warning',
    icon: 'mdi-alert-outline',
  })
}

const saveEditor = async ({ silent = false } = {}) => {
  const isEditing = Boolean(recordId.value)
  const savedRecord = manager.saveEditorModel({
    id: recordId.value,
    title: resumeTitle.value,
    template: selectedTemplate.value,
    paper: selectedPaper.value,
    accentColor: accentColor.value,
    data: cloneResumeData(editorData),
  })

  recordId.value = savedRecord.id
  resumeTitle.value = savedRecord.title
  updateBaseline()

  if (ensureRouteId() !== savedRecord.id) {
    await router.replace({ name: 'resume-edit', params: { id: savedRecord.id } })
  }

  if (!silent) {
    feedback.success({
      title: isEditing ? 'Currículo atualizado' : 'Currículo salvo',
      message: `"${savedRecord.title}" foi salvo no navegador.`,
    })
  }

  return savedRecord
}

const saveAndPreview = async () => {
  const savedRecord = await saveEditor({ silent: true })
  feedback.info({
    title: 'Abrindo pré-visualização',
    message: `Visualizando "${savedRecord.title}" em tela dedicada.`,
  })
  router.push({ name: 'resume-preview', params: { id: savedRecord.id } })
}

const saveFromQuickBar = async () => {
  if (savingFromQuickBar.value || previewingFromQuickBar.value) return
  savingFromQuickBar.value = true
  try {
    await saveEditor()
  } finally {
    savingFromQuickBar.value = false
  }
}

const saveAndPreviewFromQuickBar = async () => {
  if (savingFromQuickBar.value || previewingFromQuickBar.value) return
  previewingFromQuickBar.value = true
  try {
    await saveAndPreview()
  } finally {
    previewingFromQuickBar.value = false
  }
}

const goToDashboard = async () => {
  if (!(await confirmDiscardChanges())) return
  router.push({ name: 'resumes-dashboard' })
}

const clearEditor = async () => {
  const confirmed = await feedback.confirm({
    title: 'Limpar editor',
    message: 'Limpar os dados atuais do editor?',
    confirmText: 'Limpar',
    cancelText: 'Cancelar',
    color: 'error',
    icon: 'mdi-delete-sweep-outline',
  })
  if (!confirmed) return

  applyEditorModel(manager.createEditorModel())
  feedback.info({
    title: 'Editor limpo',
    message: 'Todos os campos foram redefinidos para um novo currículo.',
  })
}

const loadSampleData = async () => {
  if (!(await confirmDiscardChanges())) return

  recordId.value = ''
  resumeTitle.value = 'Modelo Ana Ribeiro Santos'
  selectedTemplate.value = 'sidebar'
  selectedPaper.value = 'a4'
  accentColor.value = '#2454A6'
  openPanels.value = [0, 2, 5]
  replaceEditorData(createSampleResumeData())
  feedback.info({
    title: 'Exemplo carregado',
    message: 'Dados de exemplo aplicados para acelerar o preenchimento.',
  })
}

const reloadFromSavedRecord = async () => {
  if (!recordId.value) return
  const source = manager.getRecordById(recordId.value)
  if (!source) {
    feedback.error({
      title: 'Registro indisponível',
      message: 'Não foi possível recarregar porque o currículo não existe mais.',
    })
    return
  }

  const confirmed = await feedback.confirm({
    title: 'Recarregar versão salva',
    message: 'Recarregar a versão salva e descartar alterações atuais?',
    confirmText: 'Recarregar',
    cancelText: 'Cancelar',
    color: 'warning',
    icon: 'mdi-refresh',
  })
  if (!confirmed) return

  applyEditorModel(manager.createEditorModel(recordId.value))
  feedback.info({
    title: 'Dados restaurados',
    message: 'O editor foi atualizado com a última versão salva.',
  })
}

onBeforeRouteLeave(async () => {
  if (!hasUnsavedChanges.value) {
    return true
  }

  return feedback.confirm({
    title: 'Sair sem salvar',
    message: 'Existem alterações não salvas. Deseja sair mesmo assim?',
    confirmText: 'Sair sem salvar',
    cancelText: 'Continuar editando',
    color: 'warning',
    icon: 'mdi-alert-outline',
  })
})

watch(
  () => route.params.id,
  () => {
    loadFromRoute()
  },
  { immediate: true },
)
</script>

<template>
  <v-container fluid class="page-shell" :class="{ 'has-mobile-quick-actions': isMobile && !notFound }">
    <v-row>
      <v-col cols="12">
        <div class="page-heading d-flex justify-space-between align-start flex-wrap ga-3">
          <div>
            <p class="text-overline text-primary font-weight-bold mb-1">Editor profissional</p>
            <h1 class="text-h5 font-weight-bold mb-1">Montagem detalhada de currículo</h1>
            <p class="text-body-2 text-medium-emphasis">
              Preencha os dados em seções e salve para abrir a visualização final em uma tela dedicada.
            </p>
          </div>
          <div class="d-flex flex-wrap ga-2 align-center">
            <v-chip color="primary" variant="tonal">{{ editorModeLabel }}</v-chip>
            <v-chip color="secondary" variant="flat">{{ currentTemplateTitle }} / {{ currentPaperTitle }}</v-chip>
          </div>
        </div>
      </v-col>

      <v-col v-if="notFound" cols="12">
        <v-alert type="warning" variant="tonal" class="mb-4">
          O currículo solicitado não foi encontrado. Inicie um novo ou volte para a lista.
        </v-alert>
        <v-btn color="primary" prepend-icon="mdi-arrow-left" @click="router.push({ name: 'resumes-dashboard' })">
          Voltar para lista
        </v-btn>
      </v-col>

      <template v-else>
        <v-col cols="12" lg="8">
          <v-card rounded="xl" class="glass-card editor-main-card">
            <div class="pa-4 pb-2 d-flex align-center justify-space-between flex-wrap ga-2">
              <div>
                <p class="text-subtitle-1 font-weight-bold mb-1">Conteúdo do currículo</p>
                <p class="text-caption text-medium-emphasis">Dados pessoais, experiência, formação e seções extras.</p>
              </div>
            </div>
            <v-divider />
            <div class="pa-4">
              <ResumeEditorForm
                :resume="editorData"
                :level-options="levelOptions"
                :language-level-options="languageLevelOptions"
                v-model:open-panels="openPanels"
              />
            </div>
          </v-card>
        </v-col>

        <v-col cols="12" lg="4">
          <v-card rounded="xl" class="glass-card sticky-side mobile-settings-card">
            <div class="pa-4">
              <p class="text-subtitle-1 font-weight-bold mb-2">Configurações e ação</p>

              <v-text-field
                v-model="resumeTitle"
                label="Nome interno do currículo"
                :density="fieldDensity"
                variant="outlined"
                class="mb-2"
              />

              <p class="text-caption text-medium-emphasis mb-1">Template</p>
              <div class="template-pills mb-3">
                <v-btn
                  v-for="template in templateOptions"
                  :key="template.value"
                  :size="templateChipSize"
                  :color="selectedTemplate === template.value ? 'primary' : undefined"
                  :variant="selectedTemplate === template.value ? 'flat' : 'outlined'"
                  class="template-pill"
                  @click="selectedTemplate = template.value"
                >
                  {{ template.title }}
                </v-btn>
              </div>

              <v-row :dense="!isMobile">
                <v-col cols="12" sm="6" lg="12">
                  <v-select
                    v-model="selectedPaper"
                    :items="paperOptions"
                    item-title="title"
                    item-value="value"
                    label="Tamanho da folha"
                    :density="fieldDensity"
                    variant="outlined"
                  />
                </v-col>
                <v-col cols="12" sm="6" lg="12">
                  <v-select
                    v-model="accentColor"
                    :items="accentOptions"
                    item-title="title"
                    item-value="value"
                    label="Cor principal"
                    :density="fieldDensity"
                    variant="outlined"
                  />
                </v-col>
              </v-row>

              <v-alert v-if="hasUnsavedChanges" type="warning" :density="fieldDensity" variant="tonal" class="mb-3">
                Existem alterações não salvas.
              </v-alert>

              <div class="d-flex flex-column ga-2">
                <v-btn color="primary" prepend-icon="mdi-content-save-outline" @click="saveEditor">Salvar currículo</v-btn>
                <v-btn color="secondary" variant="flat" prepend-icon="mdi-eye-outline" @click="saveAndPreview">
                  Salvar e visualizar
                </v-btn>
                <v-btn
                  :disabled="!recordId"
                  color="info"
                  variant="tonal"
                  prepend-icon="mdi-refresh"
                  @click="reloadFromSavedRecord"
                >
                  Recarregar versão salva
                </v-btn>
                <v-btn color="secondary" variant="text" prepend-icon="mdi-lightning-bolt" @click="loadSampleData">
                  Carregar exemplo
                </v-btn>
                <v-btn color="error" variant="text" prepend-icon="mdi-delete-sweep-outline" @click="clearEditor">
                  Limpar editor
                </v-btn>
                <v-btn color="default" variant="text" prepend-icon="mdi-arrow-left" @click="goToDashboard">
                  Voltar para lista
                </v-btn>
              </div>
            </div>
          </v-card>
        </v-col>
      </template>
    </v-row>

    <div
      v-if="!notFound && isMobile"
      class="mobile-quick-actions no-print"
      role="region"
      aria-label="Ações rápidas do editor"
    >
      <v-btn
        color="primary"
        variant="flat"
        prepend-icon="mdi-content-save-outline"
        :loading="savingFromQuickBar"
        class="flex-grow-1"
        @click="saveFromQuickBar"
      >
        Salvar
      </v-btn>
      <v-btn
        color="secondary"
        variant="flat"
        prepend-icon="mdi-eye-outline"
        :loading="previewingFromQuickBar"
        class="flex-grow-1"
        @click="saveAndPreviewFromQuickBar"
      >
        Visualizar
      </v-btn>
    </div>
  </v-container>
</template>
