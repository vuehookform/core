import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { categories, getDefaultRoute } from '@/data/categories'

// Generate example routes as children of DocsLayout
const docsChildRoutes: RouteRecordRaw[] = categories.flatMap((category) =>
  category.examples.map((example) => ({
    path: `${category.id}/${example.id}`,
    name: `docs-${category.id}-${example.id}`,
    component: example.component,
    meta: {
      categoryId: category.id,
      exampleId: example.id,
    },
  })),
)

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior(to, from, savedPosition) {
    // Back/forward navigation: restore saved position
    if (savedPosition) {
      return savedPosition
    }

    // Always scroll to top
    return { top: 0 }
  },
  routes: [
    // Docs section with layout wrapper
    {
      path: '/docs',
      component: () => import('@/layouts/DocsLayout.vue'),
      children: [
        // Redirect /docs to first example
        {
          path: '',
          redirect: () => {
            const { category, example } = getDefaultRoute()
            return `/docs/${category}/${example}`
          },
        },
        // All example routes as children
        ...docsChildRoutes,
      ],
    },

    // Legacy redirect: /examples/:cat/:ex -> /docs/:cat/:ex
    {
      path: '/examples/:category/:example',
      redirect: (to) => `/docs/${to.params.category}/${to.params.example}`,
    },

    // Catch-all redirect
    {
      path: '/:pathMatch(.*)*',
      redirect: '/docs',
    },
  ],
})

export default router
