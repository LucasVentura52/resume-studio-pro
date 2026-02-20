<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useDisplay } from 'vuetify'
import { useRoute, useRouter } from 'vue-router'
import ResumeSheet from '../components/resume/ResumeSheet.vue'
import { templateOptions } from '../constants/resumeOptions'
import { useResumeManager } from '../composables/useResumeManager'
import { useUiFeedback } from '../composables/useUiFeedback'
import { exportResumePdf } from '../services/pdfService'

const route = useRoute()
const router = useRouter()
const manager = useResumeManager()
const feedback = useUiFeedback()
const display = useDisplay()

const exportingPdf = ref(false)
const pdfTarget = ref(null)
const onePageMode = ref(true)
const fitting = ref(false)
const fitLevel = ref(0)
const overflowPx = ref(0)

const MAX_FIT_LEVEL = 3
const OVERFLOW_TOLERANCE_PX = 4

let fitRunId = 0
let resizeDebounce = null

const record = computed(() => {
  const id = typeof route.params.id === 'string' ? route.params.id : ''
  if (!id) return null
  return manager.getRecordById(id)
})

const templateLabel = computed(() => {
  if (!record.value) return ''
  return templateOptions.find((item) => item.value === record.value.template)?.title || record.value.template
})

const fitStatus = computed(() => {
  if (!record.value) return { color: 'default', label: 'Sem currículo selecionado' }
  if (fitting.value) return { color: 'info', label: 'Ajustando para 1 página...' }
  if (overflowPx.value <= OVERFLOW_TOLERANCE_PX) return { color: 'success', label: '1 página: OK' }
  return { color: 'warning', label: `Ainda excede ${Math.round(overflowPx.value)}px` }
})
const isMobile = computed(() => display.mdAndDown.value)
const controlDensity = computed(() => (display.smAndDown.value ? 'comfortable' : 'compact'))

const waitFrame = () =>
  new Promise((resolve) => {
    window.requestAnimationFrame(() => resolve())
  })

const mmToPx = (millimeters) => (millimeters * 96) / 25.4
const getPaperHeightPx = (paper) => mmToPx(paper === 'letter' ? 279 : 297)

const getSheetElement = () => {
  if (!pdfTarget.value) return null
  return pdfTarget.value.querySelector('.resume-sheet')
}

const measureOverflow = () => {
  const sheet = getSheetElement()
  if (!sheet || !record.value) return 0

  const targetHeight = getPaperHeightPx(record.value.paper)
  const contentHeight = sheet.scrollHeight

  return Math.max(0, contentHeight - targetHeight)
}

const applyOnePageFit = async () => {
  const runId = ++fitRunId

  fitting.value = true

  try {
    if (!record.value) {
      fitLevel.value = 0
      overflowPx.value = 0
      return
    }

    fitLevel.value = 0

    await nextTick()
    await waitFrame()
    if (runId !== fitRunId) return

    let overflow = measureOverflow()

    if (onePageMode.value) {
      while (overflow > OVERFLOW_TOLERANCE_PX && fitLevel.value < MAX_FIT_LEVEL) {
        fitLevel.value += 1
        await nextTick()
        await waitFrame()
        if (runId !== fitRunId) return
        overflow = measureOverflow()
      }
    }

    overflowPx.value = overflow
  } finally {
    if (runId === fitRunId) {
      fitting.value = false
    }
  }
}

const deleteCurrentRecord = async () => {
  if (!record.value) return

  const confirmed = await feedback.confirm({
    title: 'Excluir currículo',
    message: `Excluir "${record.value.title}"? Esta ação não pode ser desfeita.`,
    confirmText: 'Excluir',
    cancelText: 'Cancelar',
    color: 'error',
    icon: 'mdi-delete-alert-outline',
  })
  if (!confirmed) return

  const removed = manager.deleteRecord(record.value.id)
  if (!removed) {
    feedback.error({
      title: 'Falha ao excluir',
      message: 'Não foi possível remover o currículo selecionado.',
    })
    return
  }

  feedback.success({
    title: 'Currículo excluído',
    message: 'O registro foi removido com sucesso.',
  })

  router.push({ name: 'resumes-dashboard' })
}

const duplicateCurrentRecord = () => {
  if (!record.value) return
  const duplicated = manager.duplicateRecord(record.value.id)
  if (!duplicated) {
    feedback.error({
      title: 'Falha na duplicação',
      message: 'Não foi possível duplicar o currículo selecionado.',
    })
    return
  }

  feedback.success({
    title: 'Currículo duplicado',
    message: `"${duplicated.title}" foi criado e aberto para edição.`,
  })
  router.push({ name: 'resume-edit', params: { id: duplicated.id } })
}

const downloadPdf = async () => {
  const sheetElement = getSheetElement()
  if (!record.value || !sheetElement) return

  exportingPdf.value = true

  try {
    await exportResumePdf({
      element: sheetElement,
      title: record.value.title,
      paper: record.value.paper,
      fitToSinglePage: onePageMode.value,
    })
    feedback.success({
      title: 'PDF gerado',
      message: `Download iniciado para "${record.value.title}".`,
    })
  } catch (error) {
    console.error(error)
    feedback.error({
      title: 'Erro ao gerar PDF',
      message: 'Não foi possível gerar o PDF. Revise o currículo e tente novamente.',
    })
  } finally {
    exportingPdf.value = false
  }
}

const handleResize = () => {
  if (resizeDebounce) window.clearTimeout(resizeDebounce)
  resizeDebounce = window.setTimeout(() => {
    applyOnePageFit()
  }, 140)
}

watch(
  () => [record.value?.id, record.value?.updatedAt, onePageMode.value],
  () => {
    applyOnePageFit()
  },
  { immediate: true },
)

onMounted(() => {
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  if (resizeDebounce) window.clearTimeout(resizeDebounce)
})
</script>

<template>
  <v-container fluid class="page-shell preview-page-shell" :class="{ 'has-mobile-quick-actions': isMobile && !!record }">
    <v-row>
      <v-col cols="12">
        <div class="page-heading d-flex justify-space-between align-start flex-wrap ga-3">
          <div>
            <p class="text-overline text-primary font-weight-bold mb-1">Preview dedicado</p>
            <h1 class="text-h5 font-weight-bold mb-1">Visualização final do currículo</h1>
            <p class="text-body-2 text-medium-emphasis">Revise a versão selecionada e gere PDF real com um clique.</p>
          </div>
          <div class="d-flex flex-wrap ga-2">
            <v-btn variant="text" prepend-icon="mdi-arrow-left" @click="router.push({ name: 'resumes-dashboard' })">
              Voltar
            </v-btn>
            <v-btn
              v-if="record && !isMobile"
              color="primary"
              prepend-icon="mdi-pencil-outline"
              @click="router.push({ name: 'resume-edit', params: { id: record.id } })"
            >
              Editar
            </v-btn>
            <v-btn
              v-if="record && !isMobile"
              :loading="exportingPdf"
              color="secondary"
              variant="flat"
              prepend-icon="mdi-file-pdf-box"
              @click="downloadPdf"
            >
              Baixar PDF
            </v-btn>
          </div>
        </div>
      </v-col>

      <v-col v-if="!record" cols="12">
        <v-card rounded="xl" class="glass-card pa-6">
          <p class="text-subtitle-1 font-weight-bold mb-2">Currículo não encontrado</p>
          <p class="text-body-2 text-medium-emphasis mb-4">
            O registro pode ter sido removido. Volte para a lista e escolha outro currículo.
          </p>
          <v-btn color="primary" prepend-icon="mdi-arrow-left" @click="router.push({ name: 'resumes-dashboard' })">
            Ir para lista
          </v-btn>
        </v-card>
      </v-col>

      <template v-else>
        <v-col cols="12" lg="10" xl="9" class="preview-main-col">
          <div class="preview-stage preview-stage-single-card">
            <div ref="pdfTarget" class="pdf-canvas">
              <ResumeSheet
                :resume-data="record.data"
                :template="record.template"
                :paper="record.paper"
                :accent-color="record.accentColor"
                :fit-level="fitLevel"
              />
            </div>
          </div>
        </v-col>

        <v-col cols="12" lg="2" xl="3" class="preview-side-col">
          <v-card rounded="xl" class="glass-card sticky-side pa-4">
            <p class="text-subtitle-1 font-weight-bold mb-1">{{ record.title }}</p>
            <p class="text-caption text-medium-emphasis mb-3">
              Atualizado em {{ manager.formatRecordDateTime(record.updatedAt) }}
            </p>

            <v-chip color="primary" variant="tonal" class="mb-2">Template: {{ templateLabel }}</v-chip>
            <v-chip color="secondary" variant="flat" class="mb-4">Folha: {{ record.paper }}</v-chip>

            <v-switch
              v-model="onePageMode"
              color="primary"
              hide-details
              :density="controlDensity"
              inset
              class="mb-2"
              label="Modo 1 página automático"
            />

            <v-chip :color="fitStatus.color" variant="tonal" class="mb-2" role="status" aria-live="polite">
              {{ fitStatus.label }}
            </v-chip>

            <p class="text-caption text-medium-emphasis mb-4">
              Nível de compactação aplicado: {{ fitLevel }}/{{ MAX_FIT_LEVEL }}
            </p>

            <div class="d-flex flex-column ga-2">
              <v-btn color="secondary" variant="tonal" prepend-icon="mdi-content-copy" @click="duplicateCurrentRecord">
                Duplicar
              </v-btn>
              <v-btn color="error" variant="text" prepend-icon="mdi-delete-outline" @click="deleteCurrentRecord">
                Excluir
              </v-btn>
            </div>
          </v-card>
        </v-col>
      </template>
    </v-row>

    <div
      v-if="record && isMobile"
      class="mobile-quick-actions no-print"
      role="region"
      aria-label="Ações rápidas da visualização"
    >
      <v-btn
        color="primary"
        variant="flat"
        prepend-icon="mdi-pencil-outline"
        class="flex-grow-1"
        @click="router.push({ name: 'resume-edit', params: { id: record.id } })"
      >
        Editar
      </v-btn>
      <v-btn
        color="secondary"
        variant="flat"
        prepend-icon="mdi-file-pdf-box"
        :loading="exportingPdf"
        class="flex-grow-1"
        @click="downloadPdf"
      >
        PDF
      </v-btn>
    </div>
  </v-container>
</template>
