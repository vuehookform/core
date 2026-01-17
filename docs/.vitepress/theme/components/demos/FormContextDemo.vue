<template>
  <div class="demo-form">
    <form @submit="form.handleSubmit(onSubmit)">
      <div class="field">
        <label for="parentField">Parent Field (direct register)</label>
        <input
          id="parentField"
          v-bind="form.register('parentField')"
          placeholder="Parent input"
          :class="{ 'has-error': form.formState.value.errors.parentField }"
        />
        <span v-if="form.formState.value.errors.parentField" class="error-message">
          {{ form.formState.value.errors.parentField }}
        </span>
      </div>

      <div class="demo-nested">
        <h4>Child Component</h4>
        <ChildField />
      </div>

      <div class="demo-nested">
        <h4>Grandchild Component (2 levels deep)</h4>
        <GrandchildField />
      </div>

      <button type="submit" :disabled="form.formState.value.isSubmitting">Submit</button>
    </form>

    <div v-if="submittedData" class="demo-result">
      <h4>Submitted Data:</h4>
      <pre>{{ JSON.stringify(submittedData, null, 2) }}</pre>
    </div>

    <div class="demo-state">
      <ul>
        <li>
          isDirty: <code>{{ form.formState.value.isDirty }}</code>
        </li>
        <li>
          isValid: <code>{{ form.formState.value.isValid }}</code>
        </li>
        <li>
          Error Count: <code>{{ Object.keys(form.formState.value.errors).length }}</code>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, defineComponent, h, computed } from 'vue'
import { useForm, provideForm, useFormContext } from '@vuehookform/core'
import { z } from 'zod'

const schema = z.object({
  parentField: z.string().min(2, 'Parent field must be at least 2 characters'),
  childField: z.string().min(2, 'Child field must be at least 2 characters'),
  grandchildField: z.string().min(2, 'Grandchild field must be at least 2 characters'),
})

type FormValues = z.infer<typeof schema>

// Provide form to child components
const form = useForm({
  schema,
  mode: 'onBlur',
  defaultValues: {
    parentField: '',
    childField: '',
    grandchildField: '',
  },
})
provideForm(form)

const submittedData = ref<FormValues | null>(null)

const onSubmit = (data: FormValues) => {
  submittedData.value = data
}

// Child component using useFormContext
const ChildField = defineComponent({
  name: 'ChildField',
  setup() {
    const { register, formState } = useFormContext<typeof schema>()
    const error = computed(() => {
      const err = formState.value.errors.childField
      return typeof err === 'string' ? err : err?.message
    })

    return () =>
      h('div', { class: 'field' }, [
        h('label', { for: 'childField' }, 'Child Field (via useFormContext)'),
        h('input', {
          id: 'childField',
          placeholder: 'Child input',
          class: error.value ? 'has-error' : '',
          ...register('childField'),
        }),
        error.value ? h('span', { class: 'error-message' }, error.value) : null,
      ])
  },
})

// Grandchild component using useFormContext
const GrandchildField = defineComponent({
  name: 'GrandchildField',
  setup() {
    const { register, formState } = useFormContext<typeof schema>()
    const error = computed(() => {
      const err = formState.value.errors.grandchildField
      return typeof err === 'string' ? err : err?.message
    })

    return () =>
      h('div', { class: 'field' }, [
        h('label', { for: 'grandchildField' }, 'Grandchild Field (via useFormContext)'),
        h('input', {
          id: 'grandchildField',
          placeholder: 'Grandchild input',
          class: error.value ? 'has-error' : '',
          ...register('grandchildField'),
        }),
        error.value ? h('span', { class: 'error-message' }, error.value) : null,
      ])
  },
})
</script>
