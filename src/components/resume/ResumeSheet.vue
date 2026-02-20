<script setup>
import { computed } from 'vue'

const props = defineProps({
  resumeData: {
    type: Object,
    required: true,
  },
  template: {
    type: String,
    default: 'classic',
  },
  paper: {
    type: String,
    default: 'a4',
  },
  accentColor: {
    type: String,
    default: '#0B4F6C',
  },
  fitLevel: {
    type: Number,
    default: 0,
  },
  showEmptyState: {
    type: Boolean,
    default: true,
  },
})

const monthLabels = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
]

const resume = computed(() => {
  const source = props.resumeData || {}
  return {
    personal: source.personal || {},
    summary: source.summary || '',
    experiences: Array.isArray(source.experiences) ? source.experiences : [],
    education: Array.isArray(source.education) ? source.education : [],
    projects: Array.isArray(source.projects) ? source.projects : [],
    skills: Array.isArray(source.skills) ? source.skills : [],
    languages: Array.isArray(source.languages) ? source.languages : [],
    certifications: Array.isArray(source.certifications) ? source.certifications : [],
    interests: source.interests || '',
  }
})

const formatMonth = (value) => {
  if (!value) return ''
  const [year, month] = value.split('-')
  const monthIndex = Number(month) - 1
  if (!year || monthIndex < 0 || monthIndex > 11) return value
  return `${monthLabels[monthIndex]}/${year}`
}

const formatPeriod = (start, end, current = false) => {
  const startLabel = formatMonth(start)
  const endLabel = current ? 'Atual' : formatMonth(end)
  if (startLabel && endLabel) return `${startLabel} - ${endLabel}`
  return startLabel || endLabel || ''
}

const splitLines = (text) =>
  (text || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

const normalizeUrl = (value, base = '') => {
  const clean = (value || '').trim()
  if (!clean) return ''
  if (/^https?:\/\//i.test(clean)) return clean
  return base ? `${base}${clean.replace(/^@/, '')}` : `https://${clean}`
}

const experiencesForPreview = computed(() =>
  resume.value.experiences.filter((item) =>
    [item.role, item.company, item.location, item.start, item.end, item.highlights].join('').trim()
  )
)

const educationForPreview = computed(() =>
  resume.value.education.filter((item) =>
    [item.degree, item.institution, item.location, item.start, item.end, item.notes].join('').trim()
  )
)

const projectsForPreview = computed(() =>
  resume.value.projects.filter((item) =>
    [item.name, item.role, item.link, item.description].join('').trim()
  )
)

const skillsForPreview = computed(() =>
  resume.value.skills.filter((item) => (item.name || '').trim())
)
const languagesForPreview = computed(() =>
  resume.value.languages.filter((item) => (item.name || '').trim())
)
const certificationsForPreview = computed(() =>
  resume.value.certifications.filter((item) => [item.name, item.issuer, item.year].join('').trim())
)

const hasMainPreviewContent = computed(
  () =>
    Boolean((resume.value.summary || '').trim()) ||
    experiencesForPreview.value.length > 0 ||
    educationForPreview.value.length > 0 ||
    projectsForPreview.value.length > 0
)

const contactItems = computed(() => {
  const personal = resume.value.personal || {}
  const contacts = []

  if ((personal.email || '').trim()) {
    contacts.push({
      id: 'email',
      icon: 'mdi-email-outline',
      label: personal.email.trim(),
      href: `mailto:${personal.email.trim()}`,
    })
  }

  if ((personal.phone || '').trim()) {
    contacts.push({
      id: 'phone',
      icon: 'mdi-phone-outline',
      label: personal.phone.trim(),
      href: `tel:${personal.phone.trim()}`,
    })
  }

  if ((personal.website || '').trim()) {
    contacts.push({
      id: 'website',
      icon: 'mdi-web',
      label: personal.website.trim(),
      href: normalizeUrl(personal.website),
    })
  }

  if ((personal.linkedin || '').trim()) {
    contacts.push({
      id: 'linkedin',
      icon: 'mdi-linkedin',
      label: 'LinkedIn',
      href: normalizeUrl(personal.linkedin, 'https://linkedin.com/in/'),
    })
  }

  if ((personal.github || '').trim()) {
    contacts.push({
      id: 'github',
      icon: 'mdi-github',
      label: 'GitHub',
      href: normalizeUrl(personal.github, 'https://github.com/'),
    })
  }

  return contacts
})

const photoPreviewSrc = computed(() => {
  const personal = resume.value.personal || {}
  const uploadedPhoto = (personal.photoData || '').trim()
  if (uploadedPhoto) return uploadedPhoto
  return (personal.photoUrl || '').trim()
})
</script>

<template>
  <article
    class="resume-sheet"
    :class="[`layout-${template}`, `paper-${paper}`, `fit-level-${fitLevel}`]"
    :style="{ '--accent-color': accentColor }"
  >
    <header class="resume-header">
      <div class="header-main">
        <h2 class="header-name">{{ resume.personal.fullName || 'Seu nome completo' }}</h2>
        <p class="header-role">{{ resume.personal.role || 'Cargo ou especialidade' }}</p>
        <p v-if="resume.personal.location" class="header-location">
          {{ resume.personal.location }}
        </p>
      </div>
      <img
        v-if="photoPreviewSrc"
        :src="photoPreviewSrc"
        alt="Foto profissional"
        class="profile-avatar"
      />
    </header>

    <div v-if="contactItems.length" class="quick-contacts">
      <a
        v-for="contact in contactItems"
        :key="contact.id"
        :href="contact.href"
        target="_blank"
        rel="noreferrer"
      >
        <span class="icon-dot">
          <v-icon :icon="contact.icon" size="12" />
        </span>
        <span>{{ contact.label }}</span>
      </a>
    </div>

    <div class="resume-body">
      <aside class="resume-aside">
        <section v-if="skillsForPreview.length" class="resume-section">
          <h3 class="section-title">Competências</h3>
          <div class="tag-list">
            <span v-for="skill in skillsForPreview" :key="skill.id" class="tag">
              {{ skill.name }}
              <small>{{ skill.level }}</small>
            </span>
          </div>
        </section>

        <section v-if="languagesForPreview.length" class="resume-section">
          <h3 class="section-title">Idiomas</h3>
          <div class="stack-list">
            <p v-for="language in languagesForPreview" :key="language.id" class="stack-item">
              <strong>{{ language.name }}</strong>
              <span>{{ language.level }}</span>
            </p>
          </div>
        </section>

        <section v-if="certificationsForPreview.length" class="resume-section">
          <h3 class="section-title">Certificações</h3>
          <article
            v-for="certification in certificationsForPreview"
            :key="certification.id"
            class="entry compact"
          >
            <h4 class="entry-title">{{ certification.name }}</h4>
            <p class="entry-subtitle">
              {{ certification.issuer }}
              <template v-if="certification.year"> - {{ certification.year }}</template>
            </p>
          </article>
        </section>

        <section v-if="resume.interests.trim()" class="resume-section">
          <h3 class="section-title">Interesses</h3>
          <p class="paragraph">{{ resume.interests }}</p>
        </section>
      </aside>

      <main class="resume-main">
        <section v-if="resume.summary.trim()" class="resume-section">
          <h3 class="section-title">Resumo</h3>
          <p class="paragraph">{{ resume.summary }}</p>
        </section>

        <section v-if="experiencesForPreview.length" class="resume-section">
          <h3 class="section-title">Experiência</h3>
          <article v-for="experience in experiencesForPreview" :key="experience.id" class="entry">
            <div class="entry-title-line">
              <h4 class="entry-title">{{ experience.role || 'Cargo' }}</h4>
              <span class="entry-date">{{
                formatPeriod(experience.start, experience.end, experience.current)
              }}</span>
            </div>
            <p class="entry-subtitle">
              {{ experience.company || 'Empresa' }}
              <template v-if="experience.location"> - {{ experience.location }}</template>
            </p>
            <ul v-if="splitLines(experience.highlights).length" class="entry-list">
              <li
                v-for="(line, lineIndex) in splitLines(experience.highlights)"
                :key="`exp-${experience.id}-${lineIndex}`"
              >
                {{ line }}
              </li>
            </ul>
          </article>
        </section>

        <section v-if="educationForPreview.length" class="resume-section">
          <h3 class="section-title">Formação</h3>
          <article v-for="education in educationForPreview" :key="education.id" class="entry">
            <div class="entry-title-line">
              <h4 class="entry-title">{{ education.degree || 'Curso' }}</h4>
              <span class="entry-date">{{
                formatPeriod(education.start, education.end, false)
              }}</span>
            </div>
            <p class="entry-subtitle">
              {{ education.institution || 'Instituição' }}
              <template v-if="education.location"> - {{ education.location }}</template>
            </p>
            <p v-if="education.notes" class="paragraph compact">{{ education.notes }}</p>
          </article>
        </section>

        <section v-if="projectsForPreview.length" class="resume-section">
          <h3 class="section-title">Projetos</h3>
          <article v-for="project in projectsForPreview" :key="project.id" class="entry">
            <div class="entry-title-line">
              <h4 class="entry-title">{{ project.name || 'Projeto' }}</h4>
              <a
                v-if="project.link"
                class="project-link"
                :href="normalizeUrl(project.link)"
                target="_blank"
                rel="noreferrer"
              >
                Ver projeto
              </a>
            </div>
            <p v-if="project.role" class="entry-subtitle">{{ project.role }}</p>
            <p v-if="project.description" class="paragraph compact">{{ project.description }}</p>
          </article>
        </section>

        <section
          v-if="showEmptyState && !hasMainPreviewContent"
          class="resume-section empty-preview"
        >
          <h3 class="section-title">Currículo em branco</h3>
          <p class="paragraph">Preencha os dados no editor para montar a versão final.</p>
        </section>
      </main>
    </div>
  </article>
</template>
