<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import ResumeListPanel from '../components/resume/ResumeListPanel.vue'
import { useResumeManager } from '../composables/useResumeManager'
import { useUiFeedback } from '../composables/useUiFeedback'

const router = useRouter()
const manager = useResumeManager()
const feedback = useUiFeedback()

const recordsForList = computed(() =>
  manager.records.value.map((record) => {
    const role = record.data.personal.role?.trim() || 'Sem cargo definido'
    return {
      ...record,
      subtitle: `${role} - Atualizado em ${manager.formatRecordDateTime(record.updatedAt)}`,
    }
  }),
)

const totalRecords = computed(() => recordsForList.value.length)
const latestRecord = computed(() => recordsForList.value[0] ?? null)

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
            <v-btn color="white" class="text-primary font-weight-bold" prepend-icon="mdi-plus" @click="goToCreate">
              Novo currículo
            </v-btn>
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" md="4">
        <v-card rounded="xl" class="glass-card stat-card">
          <p class="text-caption text-medium-emphasis mb-1">Currículos salvos</p>
          <p class="text-h4 font-weight-bold mb-1">{{ totalRecords }}</p>
          <p class="text-caption text-medium-emphasis">Organizados no localStorage do navegador.</p>
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
        <ResumeListPanel
          :records="recordsForList"
          @create="goToCreate"
          @edit="goToEdit"
          @preview="goToPreview"
          @delete="deleteRecord"
          @duplicate="duplicateRecord"
        />
      </v-col>
    </v-row>
  </v-container>
</template>
