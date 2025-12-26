<template>
  <div class="min-h-screen bg-linear-to-br from-indigo-500 via-purple-500 to-purple-700">
    <div class="max-w-7xl mx-auto px-4 py-6 flex flex-col gap-6">
      <!-- Header -->
      <DocsHeader @toggle-drawer="drawerOpen = true" />

      <!-- Main Layout -->
      <div class="flex gap-6">
        <!-- Desktop Sidebar -->
        <aside class="hidden lg:block w-64 shrink-0">
          <div
            class="bg-white rounded-xl shadow-lg sticky top-15 max-h-[calc(100vh-3rem)] overflow-y-auto"
          >
            <DocsSidebar />
          </div>
        </aside>

        <!-- Mobile Drawer -->
        <MobileDrawer v-model:open="drawerOpen">
          <DocsSidebar @navigate="drawerOpen = false" />
        </MobileDrawer>

        <!-- Content -->
        <main class="flex-1 min-w-0">
          <div class="bg-white rounded-xl shadow-lg p-6 lg:p-8">
            <RouterView v-slot="{ Component }">
              <Transition name="fade" mode="out-in">
                <component :is="Component" :key="$route.fullPath" />
              </Transition>
            </RouterView>
          </div>
        </main>
      </div>

      <!-- Footer -->
      <footer class="text-center text-white/80 text-sm py-4">
        <p>{{ totalExamples }} interactive examples | Built with Vue 3 + TypeScript + Zod</p>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { RouterView } from 'vue-router'
import { totalExamples } from '@/data/categories'
import DocsHeader from '@/components/docs/DocsHeader.vue'
import DocsSidebar from '@/components/docs/DocsSidebar.vue'
import MobileDrawer from '@/components/docs/MobileDrawer.vue'

const drawerOpen = ref(false)
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 150ms ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
