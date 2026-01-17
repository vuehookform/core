import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: '/basic',
    },
    {
      path: '/basic',
      name: 'basic',
      component: () => import('../views/BasicFormView.vue'),
    },
    {
      path: '/controlled',
      name: 'controlled',
      component: () => import('../views/ControlledInputsView.vue'),
    },
    {
      path: '/validation-modes',
      name: 'validation-modes',
      component: () => import('../views/ValidationModesView.vue'),
    },
    {
      path: '/field-arrays',
      name: 'field-arrays',
      component: () => import('../views/FieldArraysView.vue'),
    },
    {
      path: '/nested',
      name: 'nested',
      component: () => import('../views/NestedFieldsView.vue'),
    },
    {
      path: '/use-controller',
      name: 'use-controller',
      component: () => import('../views/UseControllerView.vue'),
    },
    {
      path: '/form-context',
      name: 'form-context',
      component: () => import('../views/FormContextView.vue'),
    },
    {
      path: '/form-state',
      name: 'form-state',
      component: () => import('../views/FormStateView.vue'),
    },
    {
      path: '/reset-setvalue',
      name: 'reset-setvalue',
      component: () => import('../views/ResetSetValueView.vue'),
    },
    {
      path: '/prime-input-number',
      name: 'prime-input-number',
      component: () => import('../views/PrimeInputNumberView.vue'),
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/basic',
    },
  ],
})

export default router
