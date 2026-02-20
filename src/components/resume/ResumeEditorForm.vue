<script setup>
import { computed } from 'vue'
import { useDisplay } from 'vuetify'
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
    default: () => ['Basico', 'Intermediario', 'Avancado', 'Especialista'],
  },
  languageLevelOptions: {
    type: Array,
    default: () => ['Basico', 'Intermediario', 'Avancado', 'Fluente', 'Nativo'],
  },
})

const emit = defineEmits(['update:openPanels'])
const feedback = useUiFeedback()
const display = useDisplay()

const openPanelsModel = computed({
  get: () => props.openPanels,
  set: (value) => emit('update:openPanels', value),
})
const fieldDensity = computed(() => (display.smAndDown.value ? 'comfortable' : 'compact'))

const addItem = (collection, factory) => {
  collection.push(factory())
}

const removeItem = (collection, index) => {
  if (collection.length === 1) return
  collection.splice(index, 1)
}

const splitLines = (text) =>
  (text || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

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
    title: 'Experiencia',
    icon: 'mdi-briefcase-outline',
    done: experiencesForPreview.value.length > 0,
  },
  {
    index: 3,
    title: 'Formacao',
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

const handlePhotoUpload = async (payload) => {
  const file = Array.isArray(payload) ? payload[0] : payload

  if (!file) {
    props.resume.personal.photoData = ''
    return
  }

  if (!file.type.startsWith('image/')) {
    feedback.warning({
      title: 'Formato invalido',
      message: 'Selecione uma imagem PNG, JPG ou WEBP para a foto.',
    })
    return
  }

  try {
    props.resume.personal.photoData = await fileToDataUrl(file)
  } catch (error) {
    console.error(error)
    feedback.error({
      title: 'Falha ao carregar foto',
      message: 'Nao foi possivel ler a imagem selecionada. Tente outro arquivo.',
    })
  }
}

const clearPhoto = () => {
  props.resume.personal.photoData = ''
  props.resume.personal.photoUrl = ''
  feedback.info({
    title: 'Foto removida',
    message: 'A foto do curriculo foi removida.',
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
        :aria-label="`Ir para secao ${section.title}`"
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
            <v-text-field v-model="resume.personal.fullName" label="Nome completo" :density="fieldDensity" variant="outlined" />
          </v-col>
          <v-col cols="12">
            <v-text-field v-model="resume.personal.role" label="Cargo ou objetivo" :density="fieldDensity" variant="outlined" />
          </v-col>
          <v-col cols="12" sm="6">
            <v-text-field v-model="resume.personal.email" label="Email" :density="fieldDensity" variant="outlined" />
          </v-col>
          <v-col cols="12" sm="6">
            <v-text-field v-model="resume.personal.phone" label="Telefone" :density="fieldDensity" variant="outlined" />
          </v-col>
          <v-col cols="12">
            <v-text-field v-model="resume.personal.location" label="Localizacao" :density="fieldDensity" variant="outlined" />
          </v-col>
          <v-col cols="12" sm="6">
            <v-text-field v-model="resume.personal.website" label="Site/Portfolio" :density="fieldDensity" variant="outlined" />
          </v-col>
          <v-col cols="12" sm="6">
            <v-text-field
              v-model="resume.personal.linkedin"
              label="LinkedIn (url ou usuario)"
              :density="fieldDensity"
              variant="outlined"
            />
          </v-col>
          <v-col cols="12" sm="6">
            <v-text-field v-model="resume.personal.github" label="GitHub (url ou usuario)" :density="fieldDensity" variant="outlined" />
          </v-col>
          <v-col cols="12" sm="6">
            <v-file-input
              accept="image/png, image/jpeg, image/webp"
              label="Enviar foto (PNG, JPG, WEBP)"
              :density="fieldDensity"
              variant="outlined"
              prepend-icon="mdi-camera-outline"
              show-size
              clearable
              @update:model-value="handlePhotoUpload"
            />
          </v-col>
          <v-col cols="12" sm="6">
            <v-text-field
              v-model="resume.personal.photoUrl"
              label="ou URL da foto (opcional)"
              :density="fieldDensity"
              variant="outlined"
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
              <span class="text-caption text-medium-emphasis">A foto enviada tem prioridade sobre a URL.</span>
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
          :density="fieldDensity"
          variant="outlined"
          label="Conte em 3-4 linhas seus principais diferenciais"
        />
      </v-expansion-panel-text>
    </v-expansion-panel>

    <v-expansion-panel title="Experiencia profissional">
      <v-expansion-panel-text>
        <div class="d-flex justify-space-between align-center mb-3">
          <p class="text-subtitle-2 font-weight-medium">Historico profissional</p>
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
            <p class="text-caption text-medium-emphasis">Experiencia {{ index + 1 }}</p>
            <v-tooltip text="Remover experiencia" location="top">
              <template #activator="{ props: tooltipProps }">
                <v-btn
                  v-bind="tooltipProps"
                  icon="mdi-delete-outline"
                  size="small"
                  color="error"
                  variant="text"
                  :aria-label="`Remover experiencia ${index + 1}`"
                  :disabled="resume.experiences.length === 1"
                  @click="removeItem(resume.experiences, index)"
                />
              </template>
            </v-tooltip>
          </div>
          <v-row>
            <v-col cols="12" sm="6">
              <v-text-field v-model="experience.role" label="Cargo" :density="fieldDensity" variant="outlined" />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field v-model="experience.company" label="Empresa" :density="fieldDensity" variant="outlined" />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field v-model="experience.location" label="Local" :density="fieldDensity" variant="outlined" />
            </v-col>
            <v-col cols="6" sm="3">
              <v-text-field v-model="experience.start" label="Inicio" type="month" :density="fieldDensity" variant="outlined" />
            </v-col>
            <v-col cols="6" sm="3">
              <v-text-field
                v-model="experience.end"
                label="Fim"
                type="month"
                :density="fieldDensity"
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
                :density="fieldDensity"
                variant="outlined"
              />
            </v-col>
          </v-row>
        </v-sheet>
      </v-expansion-panel-text>
    </v-expansion-panel>

    <v-expansion-panel title="Formacao academica">
      <v-expansion-panel-text>
        <div class="d-flex justify-space-between align-center mb-3">
          <p class="text-subtitle-2 font-weight-medium">Formacao</p>
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
            <p class="text-caption text-medium-emphasis">Formacao {{ index + 1 }}</p>
            <v-tooltip text="Remover formacao" location="top">
              <template #activator="{ props: tooltipProps }">
                <v-btn
                  v-bind="tooltipProps"
                  icon="mdi-delete-outline"
                  size="small"
                  color="error"
                  variant="text"
                  :aria-label="`Remover formacao ${index + 1}`"
                  :disabled="resume.education.length === 1"
                  @click="removeItem(resume.education, index)"
                />
              </template>
            </v-tooltip>
          </div>
          <v-row>
            <v-col cols="12" sm="6">
              <v-text-field v-model="education.degree" label="Curso/Titulo" :density="fieldDensity" variant="outlined" />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field v-model="education.institution" label="Instituicao" :density="fieldDensity" variant="outlined" />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field v-model="education.location" label="Local" :density="fieldDensity" variant="outlined" />
            </v-col>
            <v-col cols="6" sm="3">
              <v-text-field v-model="education.start" label="Inicio" type="month" :density="fieldDensity" variant="outlined" />
            </v-col>
            <v-col cols="6" sm="3">
              <v-text-field v-model="education.end" label="Fim" type="month" :density="fieldDensity" variant="outlined" />
            </v-col>
            <v-col cols="12">
              <v-textarea
                v-model="education.notes"
                label="Observacoes relevantes"
                rows="2"
                auto-grow
                :density="fieldDensity"
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
          <v-row>
            <v-col cols="12" sm="6">
              <v-text-field v-model="project.name" label="Nome do projeto" :density="fieldDensity" variant="outlined" />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field v-model="project.role" label="Papel" :density="fieldDensity" variant="outlined" />
            </v-col>
            <v-col cols="12">
              <v-text-field v-model="project.link" label="Link (opcional)" :density="fieldDensity" variant="outlined" />
            </v-col>
            <v-col cols="12">
              <v-textarea
                v-model="project.description"
                label="Descricao e impacto"
                rows="2"
                auto-grow
                :density="fieldDensity"
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
          <p class="text-subtitle-2 font-weight-medium">Competencias</p>
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
                label="Competencia"
                hide-details
                :density="fieldDensity"
                variant="outlined"
                class="flex-grow-1"
              />
              <v-select
                v-model="skill.level"
                :items="levelOptions"
                label="Nivel"
                hide-details
                :density="fieldDensity"
                variant="outlined"
                class="level-select"
              />
              <v-tooltip text="Remover competencia" location="top">
                <template #activator="{ props: tooltipProps }">
                  <v-btn
                    v-bind="tooltipProps"
                    icon="mdi-delete-outline"
                    size="small"
                    color="error"
                    variant="text"
                    :aria-label="`Remover competencia ${index + 1}`"
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
                :density="fieldDensity"
                variant="outlined"
                class="flex-grow-1"
              />
              <v-select
                v-model="language.level"
                :items="languageLevelOptions"
                label="Nivel"
                hide-details
                :density="fieldDensity"
                variant="outlined"
                class="level-select"
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

    <v-expansion-panel title="Certificacoes e interesses">
      <v-expansion-panel-text>
        <div class="d-flex justify-space-between align-center mb-3">
          <p class="text-subtitle-2 font-weight-medium">Certificacoes</p>
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
            <p class="text-caption text-medium-emphasis">Certificacao {{ index + 1 }}</p>
            <v-tooltip text="Remover certificacao" location="top">
              <template #activator="{ props: tooltipProps }">
                <v-btn
                  v-bind="tooltipProps"
                  icon="mdi-delete-outline"
                  size="small"
                  color="error"
                  variant="text"
                  :aria-label="`Remover certificacao ${index + 1}`"
                  :disabled="resume.certifications.length === 1"
                  @click="removeItem(resume.certifications, index)"
                />
              </template>
            </v-tooltip>
          </div>
          <v-row>
            <v-col cols="12" sm="5">
              <v-text-field v-model="certification.name" label="Nome" :density="fieldDensity" variant="outlined" />
            </v-col>
            <v-col cols="12" sm="5">
              <v-text-field v-model="certification.issuer" label="Instituicao" :density="fieldDensity" variant="outlined" />
            </v-col>
            <v-col cols="12" sm="2">
              <v-text-field v-model="certification.year" label="Ano" :density="fieldDensity" variant="outlined" />
            </v-col>
          </v-row>
        </v-sheet>

        <v-textarea
          v-model="resume.interests"
          label="Interesses (opcional)"
          rows="2"
          auto-grow
          :density="fieldDensity"
          variant="outlined"
        />
      </v-expansion-panel-text>
    </v-expansion-panel>
  </v-expansion-panels>
</template>
