let idSeed = 1

const nextId = () => idSeed++

const parseKnownId = (value) => {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed <= 0) return null
  idSeed = Math.max(idSeed, parsed + 1)
  return parsed
}

const applyKnownId = (target, rawId) => {
  const knownId = parseKnownId(rawId)
  if (knownId !== null) target.id = knownId
  return target
}

const ensureString = (value) => (typeof value === 'string' ? value : '')
const ensureArray = (value) => (Array.isArray(value) ? value : [])
const ensureObject = (value) => (value && typeof value === 'object' ? value : {})

export const createExperience = (overrides = {}) => ({
  id: nextId(),
  role: '',
  company: '',
  location: '',
  start: '',
  end: '',
  current: false,
  highlights: '',
  ...overrides,
})

export const createEducation = (overrides = {}) => ({
  id: nextId(),
  degree: '',
  institution: '',
  location: '',
  start: '',
  end: '',
  notes: '',
  ...overrides,
})

export const createProject = (overrides = {}) => ({
  id: nextId(),
  name: '',
  role: '',
  link: '',
  description: '',
  ...overrides,
})

export const createSkill = (overrides = {}) => ({
  id: nextId(),
  name: '',
  level: 'Intermediario',
  ...overrides,
})

export const createLanguage = (overrides = {}) => ({
  id: nextId(),
  name: '',
  level: 'Intermediario',
  ...overrides,
})

export const createCertification = (overrides = {}) => ({
  id: nextId(),
  name: '',
  issuer: '',
  year: '',
  ...overrides,
})

export const createEmptyResumeData = () => ({
  personal: {
    fullName: '',
    role: '',
    email: '',
    phone: '',
    location: '',
    website: '',
    linkedin: '',
    github: '',
    photoUrl: '',
    photoData: '',
  },
  summary: '',
  experiences: [createExperience()],
  education: [createEducation()],
  projects: [createProject()],
  skills: [createSkill()],
  languages: [createLanguage()],
  certifications: [createCertification()],
  interests: '',
})

const normalizeExperience = (value = {}) =>
  applyKnownId(
    createExperience({
      role: ensureString(value.role),
      company: ensureString(value.company),
      location: ensureString(value.location),
      start: ensureString(value.start),
      end: ensureString(value.end),
      current: Boolean(value.current),
      highlights: ensureString(value.highlights),
    }),
    value.id,
  )

const normalizeEducation = (value = {}) =>
  applyKnownId(
    createEducation({
      degree: ensureString(value.degree),
      institution: ensureString(value.institution),
      location: ensureString(value.location),
      start: ensureString(value.start),
      end: ensureString(value.end),
      notes: ensureString(value.notes),
    }),
    value.id,
  )

const normalizeProject = (value = {}) =>
  applyKnownId(
    createProject({
      name: ensureString(value.name),
      role: ensureString(value.role),
      link: ensureString(value.link),
      description: ensureString(value.description),
    }),
    value.id,
  )

const normalizeSkill = (value = {}) =>
  applyKnownId(
    createSkill({
      name: ensureString(value.name),
      level: ensureString(value.level) || 'Intermediario',
    }),
    value.id,
  )

const normalizeLanguage = (value = {}) =>
  applyKnownId(
    createLanguage({
      name: ensureString(value.name),
      level: ensureString(value.level) || 'Intermediario',
    }),
    value.id,
  )

const normalizeCertification = (value = {}) =>
  applyKnownId(
    createCertification({
      name: ensureString(value.name),
      issuer: ensureString(value.issuer),
      year: ensureString(value.year),
    }),
    value.id,
  )

const normalizeCollection = (items, normalizer, fallbackFactory) => {
  const normalized = ensureArray(items).map((item) => normalizer(ensureObject(item)))
  return normalized.length ? normalized : [fallbackFactory()]
}

export const normalizeResumeData = (payload = {}) => {
  const source = ensureObject(payload)
  const personal = ensureObject(source.personal)

  return {
    personal: {
      fullName: ensureString(personal.fullName),
      role: ensureString(personal.role),
      email: ensureString(personal.email),
      phone: ensureString(personal.phone),
      location: ensureString(personal.location),
      website: ensureString(personal.website),
      linkedin: ensureString(personal.linkedin),
      github: ensureString(personal.github),
      photoUrl: ensureString(personal.photoUrl),
      photoData: ensureString(personal.photoData),
    },
    summary: ensureString(source.summary),
    experiences: normalizeCollection(source.experiences, normalizeExperience, createExperience),
    education: normalizeCollection(source.education, normalizeEducation, createEducation),
    projects: normalizeCollection(source.projects, normalizeProject, createProject),
    skills: normalizeCollection(source.skills, normalizeSkill, createSkill),
    languages: normalizeCollection(source.languages, normalizeLanguage, createLanguage),
    certifications: normalizeCollection(source.certifications, normalizeCertification, createCertification),
    interests: ensureString(source.interests),
  }
}

export const cloneResumeData = (value) => JSON.parse(JSON.stringify(value))

export const buildDefaultResumeTitle = (data) => {
  const name = ensureString(data?.personal?.fullName).trim()
  const role = ensureString(data?.personal?.role).trim()
  if (name && role) return `${name} - ${role}`
  return name || role || 'Curriculo sem nome'
}

export const createSampleResumeData = () => ({
  personal: {
    fullName: 'Ana Ribeiro Santos',
    role: 'Product Designer Senior',
    email: 'ana.ribeiro@email.com',
    phone: '+55 11 98765-4321',
    location: 'Sao Paulo, SP',
    website: 'anaribeiro.design',
    linkedin: 'ana-ribeiro-design',
    github: 'anaribeiro',
    photoUrl: '',
    photoData: '',
  },
  summary:
    'Designer de produto com 8 anos de experiencia em plataformas SaaS. Especialista em discovery, arquitetura de informacao e design system orientado a metricas de negocio.',
  experiences: [
    createExperience({
      role: 'Product Designer Senior',
      company: 'NexaPay',
      location: 'Remoto',
      start: '2022-03',
      current: true,
      end: '',
      highlights:
        'Liderei redesign do onboarding, reduzindo abandono em 32%.\\nCriei fluxo de automacao para clientes enterprise.\\nEstruturei biblioteca de componentes com handoff para engenharia.',
    }),
    createExperience({
      role: 'UX/UI Designer',
      company: 'Wave Tech',
      location: 'Sao Paulo, SP',
      start: '2019-01',
      end: '2022-02',
      current: false,
      highlights:
        'Modelei jornadas de venda consultiva para B2B.\\nCoordenei pesquisas quinzenais com clientes e equipe comercial.',
    }),
  ],
  education: [
    createEducation({
      degree: 'MBA em UX Design',
      institution: 'FIAP',
      location: 'Sao Paulo, SP',
      start: '2020-02',
      end: '2021-12',
      notes: 'Projeto final focado em acessibilidade para fintechs.',
    }),
    createEducation({
      degree: 'Bacharelado em Design Digital',
      institution: 'Mackenzie',
      location: 'Sao Paulo, SP',
      start: '2013-02',
      end: '2016-12',
      notes: '',
    }),
  ],
  projects: [
    createProject({
      name: 'Dashboard de Retencao',
      role: 'Lead Designer',
      link: 'https://dribbble.com',
      description:
        'Template analitico com foco em churn e health score. Entrega adotada por 4 squads de produto.',
    }),
    createProject({
      name: 'Kit de Design Ops',
      role: 'Criadora',
      link: '',
      description: 'Conjunto de rituais, templates e metricas para escalar produtividade do time de design.',
    }),
  ],
  skills: [
    createSkill({ name: 'Product Discovery', level: 'Especialista' }),
    createSkill({ name: 'Design System', level: 'Avancado' }),
    createSkill({ name: 'Figma', level: 'Especialista' }),
    createSkill({ name: 'Analise de dados', level: 'Intermediario' }),
  ],
  languages: [
    createLanguage({ name: 'Portugues', level: 'Nativo' }),
    createLanguage({ name: 'Ingles', level: 'Fluente' }),
    createLanguage({ name: 'Espanhol', level: 'Intermediario' }),
  ],
  certifications: [
    createCertification({ name: 'Google UX Design', issuer: 'Google', year: '2022' }),
    createCertification({ name: 'Design Leadership', issuer: 'PM3', year: '2023' }),
  ],
  interests: 'Mentoria para novos designers, escrita sobre carreira, trilhas e fotografia urbana.',
})
