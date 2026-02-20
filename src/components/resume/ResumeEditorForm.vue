<script setup>
import { computed } from 'vue'
import {
  createCertification,
  createEducation,
  createExperience,
  createLanguage,
  createProject,
  createSkill,
} from '../../utils/resumeFactories'
import { useUiFeedback } from '../../composables/useUiFeedback'

const props = defineProps({
  resume: {
    type: Object,
    required: true,
  },
  openPanels: {
    type: Array,
    default: () => [0],
  },
  levelOptions: {
    type: Array,
    default: () => ['Básico', 'Intermediário', 'Avançado', 'Especialista'],
  },
  languageLevelOptions: {
    type: Array,
    default: () => ['Básico', 'Intermediário', 'Avançado', 'Fluente', 'Nativo'],
  },
})

const emit = defineEmits(['update:openPanels'])
const feedback = useUiFeedback()

const openPanelsModel = computed({
  get: () => props.openPanels,
  set: (value) => emit('update:openPanels', value),
})
const MAX_PHOTO_DIMENSION = 560
const PHOTO_EXPORT_MIME = 'image/jpeg'
const PHOTO_EXPORT_QUALITY = 0.86

const addItem = (collection, factory) => {
  collection.push(factory())
}

const removeItem = (collection, index) => {
  if (collection.length === 1) return
  collection.splice(index, 1)
}

const moveItem = (collection, index, direction) => {
  const targetIndex = index + direction
  if (targetIndex < 0 || targetIndex >= collection.length) return

  const [item] = collection.splice(index, 1)
  collection.splice(targetIndex, 0, item)
}

const experiencesForPreview = computed(() =>
  props.resume.experiences.filter((item) =>
    [item.role, item.company, item.location, item.start, item.end, item.highlights].join('').trim(),
  ),
)

const educationForPreview = computed(() =>
  props.resume.education.filter((item) =>
    [item.degree, item.institution, item.location, item.start, item.end, item.notes].join('').trim(),
  ),
)

const projectsForPreview = computed(() =>
  props.resume.projects.filter((item) => [item.name, item.role, item.link, item.description].join('').trim()),
)

const skillsForPreview = computed(() => props.resume.skills.filter((item) => item.name.trim()))
const languagesForPreview = computed(() => props.resume.languages.filter((item) => item.name.trim()))
const certificationsForPreview = computed(() =>
  props.resume.certifications.filter((item) => [item.name, item.issuer, item.year].join('').trim()),
)

const contactItems = computed(() => {
  const personal = props.resume.personal
  const contacts = []

  if (personal.email.trim()) contacts.push('email')
  if (personal.phone.trim()) contacts.push('phone')
  if (personal.website.trim()) contacts.push('website')
  if (personal.linkedin.trim()) contacts.push('linkedin')
  if (personal.github.trim()) contacts.push('github')

  return contacts
})

const sectionShortcuts = computed(() => [
  {
    index: 0,
    title: 'Dados',
    icon: 'mdi-account-circle-outline',
    done:
      Boolean(props.resume.personal.fullName.trim()) &&
      Boolean(props.resume.personal.role.trim()) &&
      contactItems.value.length > 0,
  },
  {
    index: 1,
    title: 'Resumo',
    icon: 'mdi-text-box-outline',
    done: Boolean(props.resume.summary.trim()),
  },
  {
    index: 2,
    title: 'Experiência',
    icon: 'mdi-briefcase-outline',
    done: experiencesForPreview.value.length > 0,
  },
  {
    index: 3,
    title: 'Formação',
    icon: 'mdi-school-outline',
    done: educationForPreview.value.length > 0,
  },
  {
    index: 4,
    title: 'Projetos',
    icon: 'mdi-folder-star-outline',
    done: projectsForPreview.value.length > 0,
  },
  {
    index: 5,
    title: 'Skills',
    icon: 'mdi-lightbulb-on-outline',
    done: skillsForPreview.value.length > 0 && languagesForPreview.value.length > 0,
  },
  {
    index: 6,
    title: 'Extras',
    icon: 'mdi-certificate-outline',
    done: certificationsForPreview.value.length > 0 || Boolean(props.resume.interests.trim()),
  },
])

const completedSections = computed(() => sectionShortcuts.value.filter((section) => section.done).length)
const completionValue = computed(() =>
  Math.round((completedSections.value / sectionShortcuts.value.length) * 100),
)

const goToSection = (index) => {
  openPanelsModel.value = [index]
}

const photoPreviewSrc = computed(() => {
  const uploadedPhoto = (props.resume.personal.photoData || '').trim()
  if (uploadedPhoto) return uploadedPhoto
  return (props.resume.personal.photoUrl || '').trim()
})

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Falha ao ler arquivo de imagem'))
    reader.readAsDataURL(file)
  })

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Falha ao processar imagem'))
    image.src = src
  })

const optimizeImageDataUrl = async (dataUrl) => {
  const image = await loadImage(dataUrl)
  const longestSide = Math.max(image.naturalWidth || 0, image.naturalHeight || 0)
  if (!longestSide) return dataUrl

  const scale = longestSide > MAX_PHOTO_DIMENSION ? MAX_PHOTO_DIMENSION / longestSide : 1
  const width = Math.max(1, Math.round((image.naturalWidth || 1) * scale))
  const height = Math.max(1, Math.round((image.naturalHeight || 1) * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d')
  if (!context) return dataUrl

  context.drawImage(image, 0, 0, width, height)
  return canvas.toDataURL(PHOTO_EXPORT_MIME, PHOTO_EXPORT_QUALITY)
}

const handlePhotoUpload = async (payload) => {
  const file = Array.isArray(payload) ? payload[0] : payload

  if (!file) {
    props.resume.personal.photoData = ''
    return
  }

  if (!file.type.startsWith('image/')) {
    feedback.warning({
      title: 'Formato inválido',
      message: 'Selecione uma imagem PNG, JPG ou WEBP para a foto.',
    })
    return
  }

  try {
    const rawDataUrl = await fileToDataUrl(file)
    props.resume.personal.photoData = await optimizeImageDataUrl(rawDataUrl)
  } catch (error) {
    console.error(error)
    feedback.error({
      title: 'Falha ao carregar foto',
      message: 'Não foi possível ler a imagem selecionada. Tente outro arquivo.',
    })
  }
}

const clearPhoto = () => {
  props.resume.personal.photoData = ''
  props.resume.personal.photoUrl = ''
  feedback.info({
    title: 'Foto removida',
    message: 'A foto do currículo foi removida.',
  })
}
</script>

<template>
  <section class="editor-progress mb-4">
    <div class="d-flex align-center justify-space-between mb-2">
      <p class="text-subtitle-2 font-weight-bold">Progresso de preenchimento</p>
      <v-chip size="small" color="primary" variant="outlined">{{ completionValue }}%</v-chip>
    </div>

    <v-progress-linear :model-value="completionValue" rounded color="secondary" height="8" class="mb-3" />

    <div class="d-flex flex-wrap ga-2">
      <v-chip
        v-for="section in sectionShortcuts"
        :key="section.index"
        :color="section.done ? 'primary' : undefined"
        :variant="section.done ? 'flat' : 'outlined'"
        size="small"
        class="nav-chip"
        :aria-label="`Ir para seção ${section.title}`"
        @click="goToSection(section.index)"
      >
        <v-icon start size="14" :icon="section.done ? 'mdi-check-circle' : section.icon" />
        {{ section.title }}
      </v-chip>
    </div>
  </section>

  <v-expansion-panels v-model="openPanelsModel" multiple variant="accordion" class="panel-group">
    <v-expansion-panel title="Dados pessoais">
      <v-expansion-panel-text>
        <v-row>
          <v-col cols="12">
            <v-text-field v-model="resume.personal.fullName" label="Nome completo" density="compact" variant="outlined" />
          </v-col>
          <v-col cols="12">
            <v-text-field v-model="resume.personal.role" label="Cargo ou objetivo" density="compact" variant="outlined" />
          </v-col>
          <v-col cols="12" sm="6">
            <v-text-field v-model="resume.personal.email" label="Email" density="compact" variant="outlined" />
          </v-col>
          <v-col cols="12" sm="6">
            <v-text-field v-model="resume.personal.phone" label="Telefone" density="compact" variant="outlined" />
          </v-col>
          <v-col cols="12">
            <v-text-field v-model="resume.personal.location" label="Localização" density="compact" variant="outlined" />
          </v-col>
          <v-col cols="12" sm="6">
            <v-text-field v-model="resume.personal.website" label="Site/Portfólio" density="compact" variant="outlined" />
          </v-col>
          <v-col cols="12" sm="6">
            <v-text-field
              v-model="resume.personal.linkedin"
              label="LinkedIn (URL ou usuário)"
              density="compact"
              variant="outlined"
            />
          </v-col>
          <v-col cols="12" sm="6">
            <v-text-field v-model="resume.personal.github" label="GitHub (URL ou usuário)" density="compact" variant="outlined" />
          </v-col>
          <v-col cols="12">
            <v-file-input
              accept="image/png, image/jpeg, image/webp"
              label="Enviar foto (PNG, JPG, WEBP)"
              density="compact"
              variant="outlined"
              prepend-icon="mdi-camera-outline"
              show-size
              clearable
              @update:model-value="handlePhotoUpload"
            />
          </v-col>
          <v-col cols="12">
            <div class="d-flex align-center ga-2">
              <v-btn
                size="small"
                color="error"
                variant="text"
                prepend-icon="mdi-image-remove-outline"
                :disabled="!photoPreviewSrc"
                @click="clearPhoto"
              >
                Remover foto
              </v-btn>
              <span class="text-caption text-medium-emphasis">Use uma imagem profissional em PNG, JPG ou WEBP.</span>
            </div>
          </v-col>
        </v-row>
      </v-expansion-panel-text>
    </v-expansion-panel>

    <v-expansion-panel title="Resumo profissional">
      <v-expansion-panel-text>
        <v-textarea
          v-model="resume.summary"
          rows="4"
          auto-grow
          density="compact"
          variant="outlined"
          label="Conte em 3-4 linhas seus principais diferenciais"
        />
      </v-expansion-panel-text>
    </v-expansion-panel>

    <v-expansion-panel title="Experiência profissional">
      <v-expansion-panel-text>
        <div class="d-flex justify-space-between align-center mb-3">
          <p class="text-subtitle-2 font-weight-medium">Histórico profissional</p>
          <v-btn
            size="small"
            color="primary"
            variant="text"
            prepend-icon="mdi-plus"
            @click="addItem(resume.experiences, createExperience)"
          >
            Adicionar
          </v-btn>
        </div>

        <v-sheet v-for="(experience, index) in resume.experiences" :key="experience.id" class="entry-form mb-3 pa-3" rounded="lg">
          <div class="d-flex justify-space-between align-center mb-2">
            <p class="text-caption text-medium-emphasis">Experiência {{ index + 1 }}</p>
            <div class="d-flex align-center ga-1">
              <v-btn
                icon="mdi-arrow-up"
                size="small"
                variant="text"
                :aria-label="`Subir experiência ${index + 1}`"
                :disabled="index === 0"
                @click="moveItem(resume.experiences, index, -1)"
              />
              <v-btn
                icon="mdi-arrow-down"
                size="small"
                variant="text"
                :aria-label="`Descer experiência ${index + 1}`"
                :disabled="index === resume.experiences.length - 1"
                @click="moveItem(resume.experiences, index, 1)"
              />
              <v-tooltip text="Remover experiência" location="top">
                <template #activator="{ props: tooltipProps }">
                  <v-btn
                    v-bind="tooltipProps"
                    icon="mdi-delete-outline"
                    size="small"
                    color="error"
                    variant="text"
                    :aria-label="`Remover experiência ${index + 1}`"
                    :disabled="resume.experiences.length === 1"
                    @click="removeItem(resume.experiences, index)"
                  />
                </template>
              </v-tooltip>
            </div>
          </div>
          <v-row>
            <v-col cols="12" sm="6">
              <v-text-field v-model="experience.role" label="Cargo" density="compact" variant="outlined" />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field v-model="experience.company" label="Empresa" density="compact" variant="outlined" />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field v-model="experience.location" label="Local" density="compact" variant="outlined" />
            </v-col>
            <v-col cols="12" sm="3">
              <v-text-field v-model="experience.start" label="Início" type="month" density="compact" variant="outlined" />
            </v-col>
            <v-col cols="12" sm="3">
              <v-text-field
                v-model="experience.end"
                label="Fim"
                type="month"
                density="compact"
                variant="outlined"
                :disabled="experience.current"
              />
            </v-col>
            <v-col cols="12">
              <v-checkbox v-model="experience.current" label="Atuo atualmente neste cargo" hide-details />
            </v-col>
            <v-col cols="12">
              <v-textarea
                v-model="experience.highlights"
                label="Resultados e responsabilidades (uma linha por item)"
                auto-grow
                rows="3"
                density="compact"
                variant="outlined"
              />
            </v-col>
          </v-row>
        </v-sheet>
      </v-expansion-panel-text>
    </v-expansion-panel>

    <v-expansion-panel title="Formação acadêmica">
      <v-expansion-panel-text>
        <div class="d-flex justify-space-between align-center mb-3">
          <p class="text-subtitle-2 font-weight-medium">Formação</p>
          <v-btn
            size="small"
            color="primary"
            variant="text"
            prepend-icon="mdi-plus"
            @click="addItem(resume.education, createEducation)"
          >
            Adicionar
          </v-btn>
        </div>

        <v-sheet v-for="(education, index) in resume.education" :key="education.id" class="entry-form mb-3 pa-3" rounded="lg">
          <div class="d-flex justify-space-between align-center mb-2">
            <p class="text-caption text-medium-emphasis">Formação {{ index + 1 }}</p>
            <div class="d-flex align-center ga-1">
              <v-btn
                icon="mdi-arrow-up"
                size="small"
                variant="text"
                :aria-label="`Subir formação ${index + 1}`"
                :disabled="index === 0"
                @click="moveItem(resume.education, index, -1)"
              />
              <v-btn
                icon="mdi-arrow-down"
                size="small"
                variant="text"
                :aria-label="`Descer formação ${index + 1}`"
                :disabled="index === resume.education.length - 1"
                @click="moveItem(resume.education, index, 1)"
              />
              <v-tooltip text="Remover formação" location="top">
                <template #activator="{ props: tooltipProps }">
                  <v-btn
                    v-bind="tooltipProps"
                    icon="mdi-delete-outline"
                    size="small"
                    color="error"
                    variant="text"
                    :aria-label="`Remover formação ${index + 1}`"
                    :disabled="resume.education.length === 1"
                    @click="removeItem(resume.education, index)"
                  />
                </template>
              </v-tooltip>
            </div>
          </div>
          <v-row>
            <v-col cols="12" sm="6">
              <v-text-field v-model="education.degree" label="Curso/Título" density="compact" variant="outlined" />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field v-model="education.institution" label="Instituição" density="compact" variant="outlined" />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field v-model="education.location" label="Local" density="compact" variant="outlined" />
            </v-col>
            <v-col cols="12" sm="3">
              <v-text-field v-model="education.start" label="Início" type="month" density="compact" variant="outlined" />
            </v-col>
            <v-col cols="12" sm="3">
              <v-text-field v-model="education.end" label="Fim" type="month" density="compact" variant="outlined" />
            </v-col>
            <v-col cols="12">
              <v-textarea
                v-model="education.notes"
                label="Observações relevantes"
                rows="2"
                auto-grow
                density="compact"
                variant="outlined"
              />
            </v-col>
          </v-row>
        </v-sheet>
      </v-expansion-panel-text>
    </v-expansion-panel>

    <v-expansion-panel title="Projetos">
      <v-expansion-panel-text>
        <div class="d-flex justify-space-between align-center mb-3">
          <p class="text-subtitle-2 font-weight-medium">Projetos em destaque</p>
          <v-btn
            size="small"
            color="primary"
            variant="text"
            prepend-icon="mdi-plus"
            @click="addItem(resume.projects, createProject)"
          >
            Adicionar
          </v-btn>
        </div>

        <v-sheet v-for="(project, index) in resume.projects" :key="project.id" class="entry-form mb-3 pa-3" rounded="lg">
          <div class="d-flex justify-space-between align-center mb-2">
            <p class="text-caption text-medium-emphasis">Projeto {{ index + 1 }}</p>
            <div class="d-flex align-center ga-1">
              <v-btn
                icon="mdi-arrow-up"
                size="small"
                variant="text"
                :aria-label="`Subir projeto ${index + 1}`"
                :disabled="index === 0"
                @click="moveItem(resume.projects, index, -1)"
              />
              <v-btn
                icon="mdi-arrow-down"
                size="small"
                variant="text"
                :aria-label="`Descer projeto ${index + 1}`"
                :disabled="index === resume.projects.length - 1"
                @click="moveItem(resume.projects, index, 1)"
              />
              <v-tooltip text="Remover projeto" location="top">
                <template #activator="{ props: tooltipProps }">
                  <v-btn
                    v-bind="tooltipProps"
                    icon="mdi-delete-outline"
                    size="small"
                    color="error"
                    variant="text"
                    :aria-label="`Remover projeto ${index + 1}`"
                    :disabled="resume.projects.length === 1"
                    @click="removeItem(resume.projects, index)"
                  />
                </template>
              </v-tooltip>
            </div>
          </div>
          <v-row>
            <v-col cols="12" sm="6">
              <v-text-field v-model="project.name" label="Nome do projeto" density="compact" variant="outlined" />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field v-model="project.role" label="Papel" density="compact" variant="outlined" />
            </v-col>
            <v-col cols="12">
              <v-text-field v-model="project.link" label="Link (opcional)" density="compact" variant="outlined" />
            </v-col>
            <v-col cols="12">
              <v-textarea
                v-model="project.description"
                label="Descrição e impacto"
                rows="2"
                auto-grow
                density="compact"
                variant="outlined"
              />
            </v-col>
          </v-row>
        </v-sheet>
      </v-expansion-panel-text>
    </v-expansion-panel>

    <v-expansion-panel title="Skills e idiomas">
      <v-expansion-panel-text>
        <div class="d-flex justify-space-between align-center mb-2">
          <p class="text-subtitle-2 font-weight-medium">Competências</p>
          <v-btn
            size="small"
            color="primary"
            variant="text"
            prepend-icon="mdi-plus"
            @click="addItem(resume.skills, createSkill)"
          >
            Adicionar
          </v-btn>
        </div>
        <v-row class="mb-4">
          <v-col v-for="(skill, index) in resume.skills" :key="skill.id" cols="12" class="entry-form py-2 px-3">
            <div class="d-flex flex-wrap ga-2 align-center">
              <v-text-field
                v-model="skill.name"
                label="Competência"
                hide-details
                density="compact"
                variant="outlined"
                class="flex-grow-1"
              />
              <v-select
                v-model="skill.level"
                :items="levelOptions"
                label="Nível"
                hide-details
                density="compact"
                variant="outlined"
                class="level-select"
              />
              <v-btn
                icon="mdi-arrow-up"
                size="small"
                variant="text"
                :aria-label="`Subir competência ${index + 1}`"
                :disabled="index === 0"
                @click="moveItem(resume.skills, index, -1)"
              />
              <v-btn
                icon="mdi-arrow-down"
                size="small"
                variant="text"
                :aria-label="`Descer competência ${index + 1}`"
                :disabled="index === resume.skills.length - 1"
                @click="moveItem(resume.skills, index, 1)"
              />
              <v-tooltip text="Remover competência" location="top">
                <template #activator="{ props: tooltipProps }">
                  <v-btn
                    v-bind="tooltipProps"
                    icon="mdi-delete-outline"
                    size="small"
                    color="error"
                    variant="text"
                    :aria-label="`Remover competência ${index + 1}`"
                    :disabled="resume.skills.length === 1"
                    @click="removeItem(resume.skills, index)"
                  />
                </template>
              </v-tooltip>
            </div>
          </v-col>
        </v-row>

        <div class="d-flex justify-space-between align-center mb-2">
          <p class="text-subtitle-2 font-weight-medium">Idiomas</p>
          <v-btn
            size="small"
            color="primary"
            variant="text"
            prepend-icon="mdi-plus"
            @click="addItem(resume.languages, createLanguage)"
          >
            Adicionar
          </v-btn>
        </div>
        <v-row>
          <v-col v-for="(language, index) in resume.languages" :key="language.id" cols="12" class="entry-form py-2 px-3">
            <div class="d-flex flex-wrap ga-2 align-center">
              <v-text-field
                v-model="language.name"
                label="Idioma"
                hide-details
                density="compact"
                variant="outlined"
                class="flex-grow-1"
              />
              <v-select
                v-model="language.level"
                :items="languageLevelOptions"
                label="Nível"
                hide-details
                density="compact"
                variant="outlined"
                class="level-select"
              />
              <v-btn
                icon="mdi-arrow-up"
                size="small"
                variant="text"
                :aria-label="`Subir idioma ${index + 1}`"
                :disabled="index === 0"
                @click="moveItem(resume.languages, index, -1)"
              />
              <v-btn
                icon="mdi-arrow-down"
                size="small"
                variant="text"
                :aria-label="`Descer idioma ${index + 1}`"
                :disabled="index === resume.languages.length - 1"
                @click="moveItem(resume.languages, index, 1)"
              />
              <v-tooltip text="Remover idioma" location="top">
                <template #activator="{ props: tooltipProps }">
                  <v-btn
                    v-bind="tooltipProps"
                    icon="mdi-delete-outline"
                    size="small"
                    color="error"
                    variant="text"
                    :aria-label="`Remover idioma ${index + 1}`"
                    :disabled="resume.languages.length === 1"
                    @click="removeItem(resume.languages, index)"
                  />
                </template>
              </v-tooltip>
            </div>
          </v-col>
        </v-row>
      </v-expansion-panel-text>
    </v-expansion-panel>

    <v-expansion-panel title="Certificações e interesses">
      <v-expansion-panel-text>
        <div class="d-flex justify-space-between align-center mb-3">
          <p class="text-subtitle-2 font-weight-medium">Certificações</p>
          <v-btn
            size="small"
            color="primary"
            variant="text"
            prepend-icon="mdi-plus"
            @click="addItem(resume.certifications, createCertification)"
          >
            Adicionar
          </v-btn>
        </div>

        <v-sheet
          v-for="(certification, index) in resume.certifications"
          :key="certification.id"
          class="entry-form mb-3 pa-3"
          rounded="lg"
        >
          <div class="d-flex justify-space-between align-center mb-2">
            <p class="text-caption text-medium-emphasis">Certificação {{ index + 1 }}</p>
            <div class="d-flex align-center ga-1">
              <v-btn
                icon="mdi-arrow-up"
                size="small"
                variant="text"
                :aria-label="`Subir certificação ${index + 1}`"
                :disabled="index === 0"
                @click="moveItem(resume.certifications, index, -1)"
              />
              <v-btn
                icon="mdi-arrow-down"
                size="small"
                variant="text"
                :aria-label="`Descer certificação ${index + 1}`"
                :disabled="index === resume.certifications.length - 1"
                @click="moveItem(resume.certifications, index, 1)"
              />
              <v-tooltip text="Remover certificação" location="top">
                <template #activator="{ props: tooltipProps }">
                  <v-btn
                    v-bind="tooltipProps"
                    icon="mdi-delete-outline"
                    size="small"
                    color="error"
                    variant="text"
                    :aria-label="`Remover certificação ${index + 1}`"
                    :disabled="resume.certifications.length === 1"
                    @click="removeItem(resume.certifications, index)"
                  />
                </template>
              </v-tooltip>
            </div>
          </div>
          <v-row>
            <v-col cols="12" sm="5">
              <v-text-field v-model="certification.name" label="Nome" density="compact" variant="outlined" />
            </v-col>
            <v-col cols="12" sm="5">
              <v-text-field v-model="certification.issuer" label="Instituição" density="compact" variant="outlined" />
            </v-col>
            <v-col cols="12" sm="2">
              <v-text-field v-model="certification.year" label="Ano" density="compact" variant="outlined" />
            </v-col>
          </v-row>
        </v-sheet>

        <v-textarea
          v-model="resume.interests"
          label="Interesses (opcional)"
          rows="2"
          auto-grow
          density="compact"
          variant="outlined"
        />
      </v-expansion-panel-text>
    </v-expansion-panel>
  </v-expansion-panels>
</template>
