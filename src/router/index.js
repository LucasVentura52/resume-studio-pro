import { createRouter, createWebHistory } from 'vue-router'

const ResumesDashboardView = () => import('../views/ResumesDashboardView.vue')
const ResumeEditorView = () => import('../views/ResumeEditorView.vue')
const ResumePreviewView = () => import('../views/ResumePreviewView.vue')

const routes = [
  {
    path: '/',
    redirect: '/curriculos',
  },
  {
    path: '/curriculos',
    name: 'resumes-dashboard',
    component: ResumesDashboardView,
  },
  {
    path: '/curriculos/novo',
    name: 'resume-create',
    component: ResumeEditorView,
  },
  {
    path: '/curriculos/:id/editar',
    name: 'resume-edit',
    component: ResumeEditorView,
  },
  {
    path: '/curriculos/:id/preview',
    name: 'resume-preview',
    component: ResumePreviewView,
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

export default router
