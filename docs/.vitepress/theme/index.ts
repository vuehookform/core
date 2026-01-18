import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import { h } from 'vue'
import './custom.css'

// Demo components
import DemoContainer from './components/DemoContainer.vue'
import BasicFormDemo from './components/demos/BasicFormDemo.vue'
import ControlledInputDemo from './components/demos/ControlledInputDemo.vue'
import ValidationModesDemo from './components/demos/ValidationModesDemo.vue'
import FieldArrayDemo from './components/demos/FieldArrayDemo.vue'
import UseControllerDemo from './components/demos/UseControllerDemo.vue'
import FormContextDemo from './components/demos/FormContextDemo.vue'
import DemoToast from './components/DemoToast.vue'

export default {
  extends: DefaultTheme,
  Layout() {
    return h(DefaultTheme.Layout, null, {
      'layout-bottom': () => h(DemoToast),
    })
  },
  enhanceApp({ app }) {
    // Register demo components globally
    app.component('DemoContainer', DemoContainer)
    app.component('BasicFormDemo', BasicFormDemo)
    app.component('ControlledInputDemo', ControlledInputDemo)
    app.component('ValidationModesDemo', ValidationModesDemo)
    app.component('FieldArrayDemo', FieldArrayDemo)
    app.component('UseControllerDemo', UseControllerDemo)
    app.component('FormContextDemo', FormContextDemo)
  },
} satisfies Theme
