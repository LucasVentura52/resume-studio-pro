import { computed, reactive } from 'vue'
import { accentOptions, paperOptions, templateOptions } from '../constants/resumeOptions'
import {
  buildDefaultResumeTitle,
  cloneResumeData,
  createEmptyResumeData,
  normalizeResumeData,
} from '../utils/resumeFactories'

const STORAGE_KEY = 'resume-manager.records.v2'
const DRAFT_STORAGE_KEY = 'resume-manager.editor-drafts.v1'
const BACKUP_SCHEMA_VERSION = '1'
const HISTORY_LIMIT = 20

const state = reactive({
  records: [],
  hydrated: false,
  storageWarning: '',
  recordIndexById: new Map(),
})

const normalizeTemplateValue = (value) =>
  templateOptions.some((item) => item.value === value) ? value : 'classic'

const normalizePaperValue = (value) => (paperOptions.some((item) => item.value === value) ? value : 'a4')

const normalizeAccentValue = (value) =>
  accentOptions.some((item) => item.value === value) ? value : '#0B4F6C'

const ensureString = (value) => (typeof value === 'string' ? value : '')

const createStorageId = () => `cv_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
const createHistoryId = () => `ver_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

const sortByUpdatedDesc = (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
const rebuildRecordIndex = () => {
  state.recordIndexById.clear()
  state.records.forEach((record, index) => {
    state.recordIndexById.set(record.id, index)
  })
}
const sortRecordsInPlace = () => {
  state.records.sort(sortByUpdatedDesc)
  rebuildRecordIndex()
}
const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
const setStorageWarning = (message) => {
  state.storageWarning = String(message || '').trim()
}
const clearStorageWarning = () => {
  state.storageWarning = ''
}

const createHistorySnapshot = (source, timestamp = new Date().toISOString()) => ({
  id: createHistoryId(),
  timestamp,
  title: ensureString(source?.title).trim() || buildDefaultResumeTitle(source?.data),
  template: normalizeTemplateValue(source?.template),
  paper: normalizePaperValue(source?.paper),
  accentColor: normalizeAccentValue(source?.accentColor),
  data: normalizeResumeData(cloneResumeData(source?.data || createEmptyResumeData())),
})

const normalizeHistoryEntry = (entry = {}) => {
  const source = entry && typeof entry === 'object' ? entry : {}
  const timestamp = ensureString(source.timestamp).trim() || new Date().toISOString()

  return {
    id: ensureString(source.id).trim() || createHistoryId(),
    timestamp,
    title: ensureString(source.title).trim() || buildDefaultResumeTitle(source.data),
    template: normalizeTemplateValue(source.template),
    paper: normalizePaperValue(source.paper),
    accentColor: normalizeAccentValue(source.accentColor),
    data: normalizeResumeData(cloneResumeData(source.data || createEmptyResumeData())),
  }
}

const normalizeHistory = (history) =>
  (Array.isArray(history) ? history : [])
    .map((entry) => normalizeHistoryEntry(entry))
    .sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime())
    .slice(0, HISTORY_LIMIT)

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
    history: normalizeHistory(raw.history),
    createdAt,
    updatedAt,
  }
}

const persist = () => {
  if (typeof window === 'undefined') return true
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state.records))
    clearStorageWarning()
    return true
  } catch (error) {
    console.error(error)
    setStorageWarning(
      'Não foi possível salvar no navegador. Libere espaço no dispositivo e tente novamente.',
    )
    return false
  }
}

const readDraftStore = () => {
  if (typeof window === 'undefined') return {}

  try {
    const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch (error) {
    console.error(error)
    setStorageWarning('Não foi possível carregar os rascunhos automáticos do navegador.')
    return {}
  }
}

const writeDraftStore = (store) => {
  if (typeof window === 'undefined') return true
  try {
    window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(store))
    clearStorageWarning()
    return true
  } catch (error) {
    console.error(error)
    setStorageWarning(
      'Não foi possível salvar o rascunho automático. Libere espaço no dispositivo e tente novamente.',
    )
    return false
  }
}

const normalizeDraftTarget = (targetId = '') => ensureString(targetId).trim() || 'new'

const hydrate = () => {
  if (state.hydrated) return

  if (typeof window === 'undefined') {
    state.records = []
    rebuildRecordIndex()
    state.hydrated = true
    return
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    state.records = Array.isArray(parsed) ? parsed.map((item) => normalizeRecord(item)) : []
    sortRecordsInPlace()
    clearStorageWarning()
  } catch (error) {
    console.error(error)
    state.records = []
    rebuildRecordIndex()
    setStorageWarning(
      'Não foi possível carregar os currículos salvos. O armazenamento local pode estar corrompido.',
    )
  }

  state.hydrated = true
}

const records = computed(() => state.records)

const getRecordById = (recordId) => {
  const index = state.recordIndexById.get(recordId)
  if (typeof index !== 'number') return null
  return state.records[index] ?? null
}

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
    const index = state.recordIndexById.get(id)
    if (typeof index === 'number') {
      const current = state.records[index]
      const currentSnapshot = createHistorySnapshot(current, now)
      state.records[index] = {
        ...current,
        title,
        template: normalizeTemplateValue(model.template),
        paper: normalizePaperValue(model.paper),
        accentColor: normalizeAccentValue(model.accentColor),
        data: normalizedData,
        history: [currentSnapshot, ...(Array.isArray(current.history) ? current.history : [])].slice(
          0,
          HISTORY_LIMIT,
        ),
        updatedAt: now,
      }
      sortRecordsInPlace()
      persist()
      return getRecordById(id)
    }
  }

  const created = {
    id: createStorageId(),
    title,
    template: normalizeTemplateValue(model.template),
    paper: normalizePaperValue(model.paper),
    accentColor: normalizeAccentValue(model.accentColor),
    data: normalizedData,
    history: [],
    createdAt: now,
    updatedAt: now,
  }

  state.records.push(created)
  sortRecordsInPlace()
  persist()
  return getRecordById(created.id)
}

const deleteRecord = (recordId) => {
  const index = state.recordIndexById.get(recordId)
  if (typeof index !== 'number') return false

  state.records.splice(index, 1)
  rebuildRecordIndex()
  persist()
  return true
}

const duplicateRecord = (recordId) => {
  const source = getRecordById(recordId)
  if (!source) return null

  const now = new Date().toISOString()
  const duplicated = {
    ...source,
    id: createStorageId(),
    title: `${source.title} (Cópia)`,
    data: cloneResumeData(source.data),
    history: [],
    createdAt: now,
    updatedAt: now,
  }

  state.records.push(duplicated)
  sortRecordsInPlace()
  persist()
  return duplicated
}

const getRecordHistory = (recordId) => {
  const record = getRecordById(recordId)
  if (!record) return []
  return cloneResumeData(Array.isArray(record.history) ? record.history : [])
}

const restoreRecordVersion = (recordId, versionId) => {
  const index = state.recordIndexById.get(recordId)
  if (typeof index !== 'number') return null

  const current = state.records[index]
  const history = Array.isArray(current.history) ? current.history : []
  const version = history.find((entry) => entry.id === versionId)
  if (!version) return null

  const now = new Date().toISOString()
  const currentSnapshot = createHistorySnapshot(current, now)

  state.records[index] = {
    ...current,
    title: ensureString(version.title).trim() || current.title,
    template: normalizeTemplateValue(version.template),
    paper: normalizePaperValue(version.paper),
    accentColor: normalizeAccentValue(version.accentColor),
    data: normalizeResumeData(cloneResumeData(version.data)),
    history: [currentSnapshot, ...history.filter((entry) => entry.id !== versionId)].slice(
      0,
      HISTORY_LIMIT,
    ),
    updatedAt: now,
  }

  sortRecordsInPlace()
  persist()

  return getRecordById(recordId)
}

const exportBackup = () => ({
  schema: BACKUP_SCHEMA_VERSION,
  exportedAt: new Date().toISOString(),
  records: cloneResumeData(state.records),
})

const importBackup = (payload, { mode = 'merge' } = {}) => {
  const source = payload && typeof payload === 'object' ? payload : null
  const rawRecords = Array.isArray(source?.records) ? source.records : Array.isArray(source) ? source : null

  if (!rawRecords) {
    throw new Error('Arquivo de backup inválido.')
  }

  const imported = rawRecords.map((entry) => normalizeRecord(entry))

  if (mode === 'replace') {
    state.records = imported
  } else {
    const merged = new Map(state.records.map((record) => [record.id, record]))

    imported.forEach((entry) => {
      const existing = merged.get(entry.id)
      if (!existing) {
        merged.set(entry.id, entry)
        return
      }

      const existingTime = new Date(existing.updatedAt).getTime()
      const importedTime = new Date(entry.updatedAt).getTime()
      if (Number.isNaN(importedTime) || (!Number.isNaN(existingTime) && importedTime < existingTime)) {
        return
      }

      merged.set(entry.id, entry)
    })

    state.records = Array.from(merged.values())
  }

  sortRecordsInPlace()
  persist()

  return {
    imported: imported.length,
    total: state.records.length,
  }
}

const saveEditorDraft = (targetId, model) => {
  const draftTarget = normalizeDraftTarget(targetId)
  const source = model && typeof model === 'object' ? model : {}

  const draftStore = readDraftStore()
  draftStore[draftTarget] = {
    targetId: draftTarget,
    updatedAt: new Date().toISOString(),
    title: ensureString(source.title),
    template: normalizeTemplateValue(source.template),
    paper: normalizePaperValue(source.paper),
    accentColor: normalizeAccentValue(source.accentColor),
    data: normalizeResumeData(cloneResumeData(source.data || createEmptyResumeData())),
  }

  return writeDraftStore(draftStore)
}

const getEditorDraft = (targetId) => {
  const draftTarget = normalizeDraftTarget(targetId)
  const draftStore = readDraftStore()
  const source = draftStore[draftTarget]

  if (!source || typeof source !== 'object') return null

  return {
    targetId: draftTarget,
    updatedAt: ensureString(source.updatedAt).trim() || new Date().toISOString(),
    title: ensureString(source.title),
    template: normalizeTemplateValue(source.template),
    paper: normalizePaperValue(source.paper),
    accentColor: normalizeAccentValue(source.accentColor),
    data: normalizeResumeData(cloneResumeData(source.data || createEmptyResumeData())),
  }
}

const clearEditorDraft = (targetId) => {
  const draftTarget = normalizeDraftTarget(targetId)
  const draftStore = readDraftStore()

  if (!Object.prototype.hasOwnProperty.call(draftStore, draftTarget)) {
    return true
  }

  delete draftStore[draftTarget]
  return writeDraftStore(draftStore)
}

const formatRecordDateTime = (value) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'data inválida'
  return dateTimeFormatter.format(date)
}

const consumeStorageWarning = () => {
  const current = state.storageWarning
  clearStorageWarning()
  return current
}

export const useResumeManager = () => {
  hydrate()

  return {
    records,
    storageWarning: computed(() => state.storageWarning),
    consumeStorageWarning,
    getRecordById,
    getRecordHistory,
    createEditorModel,
    saveEditorModel,
    deleteRecord,
    duplicateRecord,
    restoreRecordVersion,
    exportBackup,
    importBackup,
    saveEditorDraft,
    getEditorDraft,
    clearEditorDraft,
    formatRecordDateTime,
  }
}
