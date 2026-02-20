import { h } from 'vue'
import { createVuetify } from 'vuetify'
import { VSvgIcon } from 'vuetify/components'
import { aliases } from 'vuetify/iconsets/mdi-svg'
import * as mdiIcons from '@mdi/js'

const isSvgPath = (value) => typeof value === 'string' && /^M[\d\s,.-]/.test(value.trim())

const toMdiKey = (value) => {
  if (typeof value !== 'string') return ''
  const raw = value.trim()
  if (!raw) return ''
  if (raw.startsWith('mdi-')) {
    return `mdi${raw
      .slice(4)
      .split('-')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join('')}`
  }
  if (raw.startsWith('mdi') && raw.length > 3) {
    return raw
  }
  return ''
}

const resolveMdiIcon = (icon) => {
  if (Array.isArray(icon)) return icon
  if (isSvgPath(icon)) return icon

  const key = toMdiKey(icon)
  if (!key) return null
  return mdiIcons[key] || null
}

const mdiCompatSet = {
  component: (props) => {
    const resolvedIcon = resolveMdiIcon(props.icon) || mdiIcons.mdiHelpCircleOutline
    return h(VSvgIcon, { ...props, icon: resolvedIcon })
  },
}

export default createVuetify({
  defaults: {
    VTextField: { density: 'compact' },
    VTextarea: { density: 'compact' },
    VSelect: { density: 'compact' },
    VFileInput: { density: 'compact' },
    VCheckbox: { density: 'compact' },
    VSwitch: { density: 'compact' },
    VAutocomplete: { density: 'compact' },
    VCombobox: { density: 'compact' },
    VRadioGroup: { density: 'compact' },
    VRadio: { density: 'compact' },
  },
  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: { mdi: mdiCompatSet },
  },
  theme: {
    defaultTheme: 'resumeTheme',
    themes: {
      resumeTheme: {
        dark: false,
        colors: {
          primary: '#0B4F6C',
          secondary: '#F4A259',
          background: '#EAF0F6',
          surface: '#FFFFFF',
        },
      },
    },
  },
})
