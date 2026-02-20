<script setup>
import { computed } from 'vue'
import { useDisplay } from 'vuetify'
import { useRoute, useRouter } from 'vue-router'
import UiFeedbackHost from './components/app/UiFeedbackHost.vue'

const route = useRoute()
const router = useRouter()
const display = useDisplay()

const navItems = [
  {
    label: 'Currículos',
    icon: 'mdi-folder-account-outline',
    to: '/curriculos',
  },
  {
    label: 'Novo',
    icon: 'mdi-file-document-plus-outline',
    to: '/curriculos/novo',
  },
]

const isMobileNav = computed(() => display.mdAndDown.value)
const navPaths = navItems.map((item) => item.to)

const resolveNavPath = (value) => {
  if (typeof value !== 'string') return ''
  return navPaths.includes(value) ? value : ''
}

const activeNavPath = computed(() => {
  const exact = navItems.find((item) => route.path === item.to)
  if (exact) return exact.to

  const byPrefix = [...navItems]
    .sort((left, right) => right.to.length - left.to.length)
    .find((item) => route.path.startsWith(`${item.to}/`) || route.path === item.to)

  return byPrefix?.to || '/curriculos'
})

const activeNavLabel = computed(() => navItems.find((item) => item.to === activeNavPath.value)?.label || 'Currículos')
const topBarHeight = computed(() => (isMobileNav.value ? 64 : 70))

const isActive = (itemPath) => activeNavPath.value === itemPath

const navigate = (path) => {
  const targetPath = resolveNavPath(path)
  if (!targetPath || route.path === targetPath) return
  router.push(targetPath)
}
</script>

<template>
  <v-app>
    <v-app-bar flat class="app-topbar no-print" :height="topBarHeight">
      <v-container fluid class="d-flex align-center justify-space-between ga-3 px-4">
        <div class="d-flex align-center ga-3 brand-lockup">
          <v-avatar size="34" color="primary" variant="flat">
            <v-icon icon="mdi-briefcase-account-outline" size="18" />
          </v-avatar>
          <div>
            <p class="text-subtitle-2 font-weight-bold mb-0">Resume Studio Pro</p>
            <p class="text-caption text-medium-emphasis mb-0">Gestão, edição e exportação PDF</p>
          </div>
        </div>

        <div v-if="!isMobileNav" class="d-flex align-center ga-2">
          <v-btn
            v-for="item in navItems"
            :key="item.to"
            :color="isActive(item.to) ? 'primary' : undefined"
            :variant="isActive(item.to) ? 'flat' : 'text'"
            size="small"
            :prepend-icon="item.icon"
            :aria-current="isActive(item.to) ? 'page' : undefined"
            @click="navigate(item.to)"
          >
            {{ item.label }}
          </v-btn>
        </div>

        <v-chip v-else color="primary" variant="tonal" size="small" class="font-weight-medium">
          {{ activeNavLabel }}
        </v-chip>
      </v-container>
    </v-app-bar>

    <v-main :class="{ 'main-with-mobile-nav': isMobileNav }">
      <router-view />
    </v-main>

    <v-bottom-navigation
      v-if="isMobileNav"
      class="mobile-bottom-nav no-print"
      :model-value="activeNavPath"
      @update:model-value="navigate"
      mandatory
      grow
      height="66"
    >
      <v-btn v-for="item in navItems" :key="`mobile-${item.to}`" :value="item.to" :aria-current="isActive(item.to) ? 'page' : undefined">
        <v-icon :icon="item.icon" />
        <span>{{ item.label }}</span>
      </v-btn>
    </v-bottom-navigation>

    <UiFeedbackHost />
  </v-app>
</template>
