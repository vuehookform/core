import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import { useRoute } from 'vitepress'
import { defineAsyncComponent, h, nextTick, onMounted, watch } from 'vue'
import './custom.css'

// Demo components (lazy-loaded, only used on /examples/)
const DemoContainer = defineAsyncComponent(() => import('./components/DemoContainer.vue'))
const BasicFormDemo = defineAsyncComponent(() => import('./components/demos/BasicFormDemo.vue'))
const ControlledInputDemo = defineAsyncComponent(
  () => import('./components/demos/ControlledInputDemo.vue'),
)
const ValidationModesDemo = defineAsyncComponent(
  () => import('./components/demos/ValidationModesDemo.vue'),
)
const FieldArrayDemo = defineAsyncComponent(() => import('./components/demos/FieldArrayDemo.vue'))
const UseControllerDemo = defineAsyncComponent(
  () => import('./components/demos/UseControllerDemo.vue'),
)
const FormContextDemo = defineAsyncComponent(() => import('./components/demos/FormContextDemo.vue'))
const DemoToast = defineAsyncComponent(() => import('./components/DemoToast.vue'))

const MainLandmark = {
  setup() {
    const route = useRoute()
    const update = () => {
      nextTick(() => {
        const el = document.getElementById('VPContent')
        if (!el) return
        if (!el.querySelector('main')) {
          el.setAttribute('role', 'main')
        } else {
          el.removeAttribute('role')
        }
      })
    }
    onMounted(update)
    watch(() => route.path, update)
    return () => null
  },
}

export default {
  extends: DefaultTheme,
  Layout() {
    return h(DefaultTheme.Layout, null, {
      'layout-top': () => h(MainLandmark),
      'layout-bottom': () => h(DemoToast),
    })
  },
  enhanceApp({ app }) {
    app.component('DemoContainer', DemoContainer)
    app.component('BasicFormDemo', BasicFormDemo)
    app.component('ControlledInputDemo', ControlledInputDemo)
    app.component('ValidationModesDemo', ValidationModesDemo)
    app.component('FieldArrayDemo', FieldArrayDemo)
    app.component('UseControllerDemo', UseControllerDemo)
    app.component('FormContextDemo', FormContextDemo)
  },
} satisfies Theme
