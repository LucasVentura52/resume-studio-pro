import { reactive } from 'vue'

const typeStyles = {
  success: { color: 'success', icon: 'mdi-check-circle-outline' },
  error: { color: 'error', icon: 'mdi-alert-circle-outline' },
  warning: { color: 'warning', icon: 'mdi-alert-outline' },
  info: { color: 'info', icon: 'mdi-information-outline' },
}

const state = reactive({
  snackbar: {
    open: false,
    title: '',
    message: '',
    color: 'info',
    icon: 'mdi-information-outline',
    timeout: 3600,
  },
  confirm: {
    open: false,
    title: 'Confirmar ação',
    message: '',
    confirmText: 'Confirmar',
    cancelText: 'Cancelar',
    color: 'primary',
    icon: 'mdi-help-circle-outline',
    persistent: false,
    resolve: null,
  },
})

const snackbarQueue = []

const openNextSnackbar = () => {
  if (state.snackbar.open || snackbarQueue.length === 0) return

  const next = snackbarQueue.shift()
  Object.assign(state.snackbar, next, { open: true })
}

const enqueueSnackbar = (payload) => {
  snackbarQueue.push(payload)
  openNextSnackbar()
}

const setSnackbarVisible = (visible) => {
  state.snackbar.open = visible

  if (!visible) {
    window.setTimeout(() => {
      openNextSnackbar()
    }, 80)
  }
}

const notify = ({ message = '', title = '', type = 'info', timeout = 3600, icon = '' } = {}) => {
  const cleanMessage = String(message || '').trim()
  if (!cleanMessage) return

  const visual = typeStyles[type] || typeStyles.info

  enqueueSnackbar({
    title: String(title || '').trim(),
    message: cleanMessage,
    color: visual.color,
    icon: icon || visual.icon,
    timeout,
  })
}

const success = (payload) => notify({ ...(payload || {}), type: 'success' })
const error = (payload) => notify({ ...(payload || {}), type: 'error' })
const warning = (payload) => notify({ ...(payload || {}), type: 'warning' })
const info = (payload) => notify({ ...(payload || {}), type: 'info' })

const closeConfirm = (decision) => {
  const resolver = state.confirm.resolve

  Object.assign(state.confirm, {
    open: false,
    title: 'Confirmar ação',
    message: '',
    confirmText: 'Confirmar',
    cancelText: 'Cancelar',
    color: 'primary',
    icon: 'mdi-help-circle-outline',
    persistent: false,
    resolve: null,
  })

  if (typeof resolver === 'function') {
    resolver(Boolean(decision))
  }
}

const confirm = ({
  title = 'Confirmar ação',
  message = 'Deseja continuar?',
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  color = 'primary',
  icon = 'mdi-help-circle-outline',
  persistent = false,
} = {}) =>
  new Promise((resolve) => {
    if (state.confirm.open && typeof state.confirm.resolve === 'function') {
      state.confirm.resolve(false)
    }

    Object.assign(state.confirm, {
      open: true,
      title: String(title || '').trim() || 'Confirmar ação',
      message: String(message || '').trim() || 'Deseja continuar?',
      confirmText: String(confirmText || '').trim() || 'Confirmar',
      cancelText: String(cancelText || '').trim() || 'Cancelar',
      color,
      icon,
      persistent,
      resolve,
    })
  })

const acceptConfirm = () => closeConfirm(true)
const cancelConfirm = () => closeConfirm(false)

export const useUiFeedback = () => ({
  state,
  notify,
  success,
  error,
  warning,
  info,
  confirm,
  setSnackbarVisible,
  acceptConfirm,
  cancelConfirm,
})
