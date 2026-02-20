<script setup>
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
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
const hasUnsavedChanges = ref(false)
const savingFromQuickBar = ref(false)
const previewingFromQuickBar = ref(false)
let suspendDirtyTracking = false
let stopDirtyWatcher = null
let draftAutoSaveTimer = null
let lastDraftSignature = ''
let routeLoadToken = 0

const DRAFT_AUTO_SAVE_INTERVAL_MS = 1600

const editorData = reactive(createEmptyResumeData())

const atsChecklist = computed(() => {
  const summaryLength = (editorData.summary || '').trim().length
  const experiences = Array.isArray(editorData.experiences) ? editorData.experiences : []
  const experiencesWithBullets = experiences.filter((experience) => {
    const highlights = String(experience?.highlights || '')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
    return highlights.length >= 2
  }).length
  const skillsCount = (Array.isArray(editorData.skills) ? editorData.skills : []).filter((skill) =>
    String(skill?.name || '').trim(),
  ).length
  const hasProject = (Array.isArray(editorData.projects) ? editorData.projects : []).some((project) =>
    [project?.name, project?.description].join('').trim(),
  )
  const hasCertification = (Array.isArray(editorData.certifications) ? editorData.certifications : []).some((item) =>
    [item?.name, item?.issuer].join('').trim(),
  )

  return [
    {
      id: 'identity',
      label: 'Nome e objetivo profissional preenchidos',
      ok: Boolean(editorData.personal.fullName.trim()) && Boolean(editorData.personal.role.trim()),
    },
    {
      id: 'contact',
      label: 'Contato principal (e-mail e telefone)',
      ok: Boolean(editorData.personal.email.trim()) && Boolean(editorData.personal.phone.trim()),
    },
    {
      id: 'summary',
      label: 'Resumo com pelo menos 120 caracteres',
      ok: summaryLength >= 120,
    },
    {
      id: 'experience',
      label: 'Experiência com resultados (2+ bullets)',
      ok: experiencesWithBullets > 0,
    },
    {
      id: 'skills',
      label: 'Pelo menos 5 competências relevantes',
      ok: skillsCount >= 5,
    },
    {
      id: 'content',
      label: 'Projeto ou certificação adicionados',
      ok: hasProject || hasCertification,
    },
  ]
})
const atsScore = computed(() => {
  const total = atsChecklist.value.length
  const done = atsChecklist.value.filter((item) => item.ok).length
  return total ? Math.round((done / total) * 100) : 0
})
const atsScoreColor = computed(() => {
  if (atsScore.value >= 85) return 'success'
  if (atsScore.value >= 60) return 'warning'
  return 'error'
})
const versionHistory = computed(() => (recordId.value ? manager.getRecordHistory(recordId.value) : []))
const visibleVersionHistory = computed(() => versionHistory.value.slice(0, 5))

const ensureRouteId = () => {
  const paramValue = route.params.id
  return typeof paramValue === 'string' ? paramValue : ''
}

const replaceEditorData = (nextData) => {
  for (const [key, value] of Object.entries(nextData)) {
    editorData[key] = value
  }
}

const runWithoutDirtyTracking = (callback) => {
  suspendDirtyTracking = true
  try {
    callback()
  } finally {
    suspendDirtyTracking = false
  }
}

const stopDirtyTracker = () => {
  if (!stopDirtyWatcher) return
  stopDirtyWatcher()
  stopDirtyWatcher = null
}

const startDirtyTracker = () => {
  stopDirtyTracker()
  stopDirtyWatcher = watch(
    [resumeTitle, selectedTemplate, selectedPaper, accentColor, editorData],
    () => {
      if (suspendDirtyTracking) return
      hasUnsavedChanges.value = true
      stopDirtyTracker()
    },
    {
      deep: true,
      flush: 'post',
    },
  )
}

const markClean = () => {
  hasUnsavedChanges.value = false
  startDirtyTracker()
}

const notifyStorageWarning = () => {
  const message = manager.consumeStorageWarning()
  if (!message) return
  feedback.warning({
    title: 'Armazenamento local',
    message,
  })
}

const buildEditorPayload = () => ({
  title: resumeTitle.value,
  template: selectedTemplate.value,
  paper: selectedPaper.value,
  accentColor: accentColor.value,
  data: cloneResumeData(editorData),
})

const buildPayloadSignature = (payload) =>
  JSON.stringify({
    title: String(payload?.title || '').trim(),
    template: payload?.template || '',
    paper: payload?.paper || '',
    accentColor: payload?.accentColor || '',
    data: payload?.data || {},
  })

const resolveDraftTarget = () => ensureRouteId() || recordId.value || 'new'

const stopDraftAutosave = () => {
  if (!draftAutoSaveTimer) return
  window.clearInterval(draftAutoSaveTimer)
  draftAutoSaveTimer = null
}

const persistDraftIfNeeded = () => {
  if (!hasUnsavedChanges.value) return

  const payload = buildEditorPayload()
  const signature = buildPayloadSignature(payload)
  if (signature === lastDraftSignature) return

  manager.saveEditorDraft(resolveDraftTarget(), payload)
  lastDraftSignature = signature
  notifyStorageWarning()
}

const startDraftAutosave = () => {
  if (draftAutoSaveTimer) return
  draftAutoSaveTimer = window.setInterval(() => {
    persistDraftIfNeeded()
  }, DRAFT_AUTO_SAVE_INTERVAL_MS)
}

const applyDraftModel = (draft) => {
  runWithoutDirtyTracking(() => {
    resumeTitle.value = draft.title || ''
    selectedTemplate.value = draft.template || 'classic'
    selectedPaper.value = draft.paper || 'a4'
    accentColor.value = draft.accentColor || '#0B4F6C'
    replaceEditorData(draft.data || createEmptyResumeData())
  })
  hasUnsavedChanges.value = true
  stopDirtyTracker()
}

const maybeRestoreDraft = async ({ targetId, recordUpdatedAt = '' }) => {
  const draft = manager.getEditorDraft(targetId)
  if (!draft) return

  const currentSignature = buildPayloadSignature(buildEditorPayload())
  const draftSignature = buildPayloadSignature(draft)
  if (currentSignature === draftSignature) return

  const draftTime = new Date(draft.updatedAt).getTime()
  const recordTime = new Date(recordUpdatedAt).getTime()
  const draftIsRecent = Number.isNaN(recordTime) || (!Number.isNaN(draftTime) && draftTime >= recordTime)

  if (!draftIsRecent) return

  const confirmed = await feedback.confirm({
    title: 'Rascunho automático encontrado',
    message: 'Foi encontrado um rascunho mais recente para este currículo. Deseja restaurar?',
    confirmText: 'Restaurar rascunho',
    cancelText: 'Manter versão atual',
    color: 'info',
    icon: 'mdi-history',
  })
  if (!confirmed) return

  applyDraftModel(draft)
  feedback.info({
    title: 'Rascunho restaurado',
    message: 'As alterações do rascunho automático foram aplicadas no editor.',
  })
}

const currentTemplateTitle = computed(
  () => templateOptions.find((item) => item.value === selectedTemplate.value)?.title ?? 'Clássico',
)

const currentPaperTitle = computed(
  () => paperOptions.find((item) => item.value === selectedPaper.value)?.title ?? 'A4',
)

const editorModeLabel = computed(() => (recordId.value ? 'Editando currículo salvo' : 'Novo currículo'))
const isMobile = computed(() => display.mdAndDown.value)
const templateChipSize = computed(() => (display.smAndDown.value ? 'default' : 'small'))

const applyEditorModel = (model) => {
  runWithoutDirtyTracking(() => {
    recordId.value = model.id || ''
    resumeTitle.value = model.title || ''
    selectedTemplate.value = model.template || 'classic'
    selectedPaper.value = model.paper || 'a4'
    accentColor.value = model.accentColor || '#0B4F6C'
    replaceEditorData(model.data)
    openPanels.value = [0]
  })
  markClean()
}

const loadFromRoute = async () => {
  const loadToken = ++routeLoadToken
  const routeId = ensureRouteId()

  if (!routeId) {
    notFound.value = false
    applyEditorModel(manager.createEditorModel())
    if (loadToken === routeLoadToken) {
      await maybeRestoreDraft({ targetId: 'new' })
    }
    return
  }

  const existingRecord = manager.getRecordById(routeId)

  if (!existingRecord) {
    notFound.value = true
    applyEditorModel(manager.createEditorModel())
    if (loadToken === routeLoadToken) {
      await maybeRestoreDraft({ targetId: routeId })
    }
    return
  }

  notFound.value = false
  applyEditorModel(manager.createEditorModel(routeId))
  if (loadToken === routeLoadToken) {
    await maybeRestoreDraft({
      targetId: routeId,
      recordUpdatedAt: existingRecord.updatedAt,
    })
  }
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
  let savedRecord = null
  try {
    savedRecord = manager.saveEditorModel({
      id: recordId.value,
      title: resumeTitle.value,
      template: selectedTemplate.value,
      paper: selectedPaper.value,
      accentColor: accentColor.value,
      data: cloneResumeData(editorData),
    })
  } catch (error) {
    console.error(error)
    feedback.error({
      title: 'Falha ao salvar',
      message: 'Não foi possível salvar o currículo. Tente novamente.',
    })
    notifyStorageWarning()
    return null
  }

  if (!savedRecord?.id) {
    feedback.error({
      title: 'Falha ao salvar',
      message: 'Não foi possível salvar o currículo. Tente novamente.',
    })
    notifyStorageWarning()
    return null
  }

  runWithoutDirtyTracking(() => {
    recordId.value = savedRecord.id
    resumeTitle.value = savedRecord.title
  })
  markClean()
  lastDraftSignature = ''
  manager.clearEditorDraft('new')
  manager.clearEditorDraft(savedRecord.id)

  if (ensureRouteId() !== savedRecord.id) {
    await router.replace({ name: 'resume-edit', params: { id: savedRecord.id } })
  }

  if (!silent) {
    feedback.success({
      title: isEditing ? 'Currículo atualizado' : 'Currículo salvo',
      message: `"${savedRecord.title}" foi salvo no navegador.`,
    })
  }

  notifyStorageWarning()

  return savedRecord
}

const saveAndPreview = async () => {
  const savedRecord = await saveEditor({ silent: true })
  if (!savedRecord?.id) return
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
  manager.clearEditorDraft('new')
  lastDraftSignature = ''
  feedback.info({
    title: 'Editor limpo',
    message: 'Todos os campos foram redefinidos para um novo currículo.',
  })
  notifyStorageWarning()
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

const restoreVersion = async (versionId) => {
  if (!recordId.value || !versionId) return

  const confirmed = await feedback.confirm({
    title: 'Restaurar versão',
    message: 'Restaurar esta versão e substituir o conteúdo atual do editor?',
    confirmText: 'Restaurar',
    cancelText: 'Cancelar',
    color: 'warning',
    icon: 'mdi-history',
  })
  if (!confirmed) return

  const restored = manager.restoreRecordVersion(recordId.value, versionId)
  if (!restored) {
    feedback.error({
      title: 'Falha na restauração',
      message: 'Não foi possível restaurar a versão selecionada.',
    })
    return
  }

  applyEditorModel(manager.createEditorModel(recordId.value))
  feedback.success({
    title: 'Versão restaurada',
    message: 'A versão selecionada foi aplicada ao currículo.',
  })
  notifyStorageWarning()
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
  async () => {
    await loadFromRoute()
  },
  { immediate: true },
)

watch(
  () => hasUnsavedChanges.value,
  (dirty) => {
    if (!dirty) {
      stopDraftAutosave()
      return
    }

    persistDraftIfNeeded()
    startDraftAutosave()
  },
  { immediate: true },
)

watch(
  () => manager.storageWarning.value,
  (value) => {
    if (!value) return
    notifyStorageWarning()
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  stopDirtyTracker()
  stopDraftAutosave()
})
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
                density="compact"
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
                    density="compact"
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
                    density="compact"
                    variant="outlined"
                  />
                </v-col>
              </v-row>

              <v-sheet rounded="lg" class="mb-3 pa-3" border>
                <div class="d-flex justify-space-between align-center mb-2">
                  <p class="text-caption font-weight-bold mb-0">Score ATS</p>
                  <v-chip :color="atsScoreColor" size="small" variant="tonal">{{ atsScore }}%</v-chip>
                </div>
                <v-progress-linear :model-value="atsScore" :color="atsScoreColor" height="8" rounded class="mb-3" />
                <div class="d-flex flex-column ga-1">
                  <p
                    v-for="item in atsChecklist"
                    :key="item.id"
                    class="text-caption mb-0 d-flex align-center ga-2"
                    :class="item.ok ? 'text-success' : 'text-medium-emphasis'"
                  >
                    <v-icon :icon="item.ok ? 'mdi-check-circle' : 'mdi-circle-outline'" size="14" />
                    <span>{{ item.label }}</span>
                  </p>
                </div>
              </v-sheet>

              <v-sheet v-if="recordId" rounded="lg" class="mb-3 pa-3" border>
                <p class="text-caption font-weight-bold mb-2">Histórico de versões</p>
                <v-list density="compact" class="bg-transparent pa-0">
                  <v-list-item v-for="version in visibleVersionHistory" :key="version.id" class="px-0">
                    <template #title>
                      <span class="text-caption font-weight-medium">{{ version.title }}</span>
                    </template>
                    <template #subtitle>
                      <span class="text-caption text-medium-emphasis">
                        {{ manager.formatRecordDateTime(version.timestamp) }}
                      </span>
                    </template>
                    <template #append>
                      <v-btn
                        size="x-small"
                        variant="tonal"
                        prepend-icon="mdi-history"
                        @click="restoreVersion(version.id)"
                      >
                        Restaurar
                      </v-btn>
                    </template>
                  </v-list-item>
                </v-list>
                <p v-if="!visibleVersionHistory.length" class="text-caption text-medium-emphasis mb-0">
                  Nenhuma versão anterior disponível.
                </p>
              </v-sheet>

              <v-alert v-if="hasUnsavedChanges" type="warning" density="compact" variant="tonal" class="mb-3">
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
