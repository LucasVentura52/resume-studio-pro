import { createVuetify } from 'vuetify'

export default createVuetify({
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
