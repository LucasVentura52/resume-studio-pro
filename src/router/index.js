import { createRouter, createWebHistory } from 'vue-router'

const loadDashboardView = () => import('../views/ResumesDashboardView.vue')
const loadEditorView = () => import('../views/ResumeEditorView.vue')
const loadPreviewView = () => import('../views/ResumePreviewView.vue')

const routes = [
  {
    path: '/',
    redirect: '/curriculos',
  },
  {
    path: '/curriculos',
    name: 'resumes-dashboard',
    component: loadDashboardView,
  },
  {
    path: '/curriculos/novo',
    name: 'resume-create',
    component: loadEditorView,
  },
  {
    path: '/curriculos/:id/editar',
    name: 'resume-edit',
    component: loadEditorView,
  },
  {
    path: '/curriculos/:id/preview',
    name: 'resume-preview',
    component: loadPreviewView,
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/curriculos',
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})

export const warmupRouteChunks = () => {
  if (typeof window === 'undefined') return

  const runSoon = window.requestIdleCallback
    ? (callback) => window.requestIdleCallback(callback, { timeout: 1400 })
    : (callback) => window.setTimeout(callback, 350)

  runSoon(() => {
    // Precarrega telas mais usadas para reduzir latência na primeira navegação.
    loadEditorView()
    loadPreviewView()
  })
}

export default router
