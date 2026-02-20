import { computed, reactive } from 'vue'
import { accentOptions, paperOptions, templateOptions } from '../constants/resumeOptions'
import {
  buildDefaultResumeTitle,
  cloneResumeData,
  createEmptyResumeData,
  normalizeResumeData,
} from '../utils/resumeFactories'

const STORAGE_KEY = 'resume-manager.records.v2'

const state = reactive({
  records: [],
  hydrated: false,
})

const normalizeTemplateValue = (value) =>
  templateOptions.some((item) => item.value === value) ? value : 'classic'

const normalizePaperValue = (value) => (paperOptions.some((item) => item.value === value) ? value : 'a4')

const normalizeAccentValue = (value) =>
  accentOptions.some((item) => item.value === value) ? value : '#0B4F6C'

const ensureString = (value) => (typeof value === 'string' ? value : '')

const createStorageId = () => `cv_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

const sortByUpdatedDesc = (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
const sortRecordsInPlace = () => {
  state.records.sort(sortByUpdatedDesc)
}
const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' })

const normalizeRecord = (raw = {}) => {
  const data = normalizeResumeData(raw.data)
  const now = new Date().toISOString()
  const createdAt = ensureString(raw.createdAt).trim() || now
  const updatedAt = ensureString(raw.updatedAt).trim() || createdAt

  return {
    id: ensureString(raw.id).trim() || createStorageId(),
    title: ensureString(raw.title).trim() || buildDefaultResumeTitle(data),
    template: normalizeTemplateValue(raw.template),
    paper: normalizePaperValue(raw.paper),
    accentColor: normalizeAccentValue(raw.accentColor),
    data,
    createdAt,
    updatedAt,
  }
}

const persist = () => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state.records))
}

const hydrate = () => {
  if (state.hydrated) return

  if (typeof window === 'undefined') {
    state.records = []
    state.hydrated = true
    return
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    state.records = Array.isArray(parsed) ? parsed.map((item) => normalizeRecord(item)) : []
    sortRecordsInPlace()
  } catch (error) {
    console.error(error)
    state.records = []
  }

  state.hydrated = true
}

const records = computed(() => state.records)

const getRecordById = (recordId) => state.records.find((record) => record.id === recordId) ?? null

const createEditorModel = (recordId = '') => {
  const record = recordId ? getRecordById(recordId) : null

  if (!record) {
    return {
      id: '',
      title: '',
      template: 'classic',
      paper: 'a4',
      accentColor: '#0B4F6C',
      data: createEmptyResumeData(),
    }
  }

  return {
    id: record.id,
    title: record.title,
    template: record.template,
    paper: record.paper,
    accentColor: record.accentColor,
    data: cloneResumeData(record.data),
  }
}

const saveEditorModel = (model) => {
  const now = new Date().toISOString()
  const normalizedData = normalizeResumeData(cloneResumeData(model.data))
  const title = ensureString(model.title).trim() || buildDefaultResumeTitle(normalizedData)
  const id = ensureString(model.id).trim()

  if (id) {
    const index = state.records.findIndex((item) => item.id === id)

    if (index >= 0) {
      const current = state.records[index]
      state.records[index] = {
        ...current,
        title,
        template: normalizeTemplateValue(model.template),
        paper: normalizePaperValue(model.paper),
        accentColor: normalizeAccentValue(model.accentColor),
        data: normalizedData,
        updatedAt: now,
      }
      sortRecordsInPlace()
      persist()
      return state.records.find((item) => item.id === id) || null
    }
  }

  const created = {
    id: createStorageId(),
    title,
    template: normalizeTemplateValue(model.template),
    paper: normalizePaperValue(model.paper),
    accentColor: normalizeAccentValue(model.accentColor),
    data: normalizedData,
    createdAt: now,
    updatedAt: now,
  }

  state.records.push(created)
  sortRecordsInPlace()
  persist()
  return created
}

const deleteRecord = (recordId) => {
  const previousLength = state.records.length
  state.records = state.records.filter((item) => item.id !== recordId)

  if (state.records.length !== previousLength) {
    persist()
    return true
  }

  return false
}

const duplicateRecord = (recordId) => {
  const source = getRecordById(recordId)
  if (!source) return null

  const now = new Date().toISOString()
  const duplicated = {
    ...source,
    id: createStorageId(),
    title: `${source.title} (Copia)`,
    data: cloneResumeData(source.data),
    createdAt: now,
    updatedAt: now,
  }

  state.records.push(duplicated)
  sortRecordsInPlace()
  persist()
  return duplicated
}

const formatRecordDateTime = (value) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'data inválida'
  return dateTimeFormatter.format(date)
}

export const useResumeManager = () => {
  hydrate()

  return {
    records,
    getRecordById,
    createEditorModel,
    saveEditorModel,
    deleteRecord,
    duplicateRecord,
    formatRecordDateTime,
  }
}
