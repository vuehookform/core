<template>
  <ExampleLayout
    title="Reusable Form Field Component"
    description="Build a generic, reusable form field component using useFormContext(). Works with any form schema and includes features like error display, character counting, and input type switching."
    :features="[
      'Generic component',
      'useFormContext<ZodType>()',
      'Error display',
      'Character counter',
      'Input/Textarea',
    ]"
    :code-snippets="codeSnippets"
  >
    <form @submit.prevent="handleSubmit(onSubmit)" class="form">
      <!-- Using our reusable ContextInput component -->
      <ContextInput name="username" label="Username" required placeholder="johndoe" />

      <ContextInput
        name="email"
        label="Email Address"
        type="email"
        required
        placeholder="john@example.com"
      />

      <ContextInput
        name="bio"
        label="Bio"
        multiline
        :rows="4"
        :max-length="200"
        placeholder="Tell us about yourself..."
      />

      <ContextInput name="website" label="Website" type="url" placeholder="https://yoursite.com" />

      <FormStateDebug :form-state="formState" />

      <button type="submit" :disabled="formState.isSubmitting" class="submit-btn">
        {{ formState.isSubmitting ? 'Saving...' : 'Save Profile' }}
      </button>
    </form>
  </ExampleLayout>
</template>

<script setup lang="ts">
import { useForm, provideForm } from '../../../lib'
import { FormStateDebug } from '../../../components/form'
import { ExampleLayout } from '../../../components/showcase'
import ContextInput from './ContextInput.vue'
import { z } from 'zod'

// Profile schema
const profileSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  email: z.string().email('Please enter a valid email'),
  bio: z.string().max(200, 'Bio cannot exceed 200 characters').optional(),
  website: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
})

type ProfileForm = z.infer<typeof profileSchema>

// Initialize form
const form = useForm({
  schema: profileSchema,
  defaultValues: {
    username: '',
    email: '',
    bio: '',
    website: '',
  },
  mode: 'onBlur',
})

provideForm(form)

const { handleSubmit, formState } = form

const onSubmit = (data: ProfileForm) => {
  console.log('Profile saved:', data)
  alert(`Profile saved for ${data.username}!`)
}

const codeSnippets = [
  {
    title: 'Reusable Component',
    language: 'typescript' as const,
    code: `// Reusable form input - works with ANY form schema
const ContextInput = defineComponent({
  props: {
    name: { type: String, required: true },
    label: { type: String, required: true },
    type: { type: String, default: 'text' },
    maxLength: { type: Number },
    // ... more props
  },
  setup(props) {
    // Use ZodType generic for maximum flexibility
    const { register, formState, watch } = useFormContext<ZodType>()

    const field = computed(() => register(props.name as never))

    // Get nested errors using path utility
    const error = computed(() => {
      const errors = formState.value.errors
      return get(errors, props.name)
    })

    // Character counter using watch()
    const currentLength = ref(0)
    if (props.maxLength) {
      const watched = watch(props.name as never)
      watch(watched, (val) => {
        currentLength.value = typeof val === 'string' ? val.length : 0
      }, { immediate: true })
    }

    return () => h('div', { ... })
  },
})`,
  },
  {
    title: 'Usage',
    language: 'vue' as const,
    code: `<!-- Clean, declarative form fields -->
<form @submit.prevent="handleSubmit(onSubmit)">
  <ContextInput name="username" label="Username" required />
  <ContextInput name="email" label="Email" type="email" required />
  <ContextInput name="bio" label="Bio" multiline :max-length="200" />
  <ContextInput name="website" label="Website" type="url" />

  <button type="submit">Save Profile</button>
</form>`,
  },
  {
    title: 'Parent Setup',
    language: 'typescript' as const,
    code: `// Parent still needs to create and provide the form
const profileSchema = z.object({
  username: z.string().min(3),
  email: z.email(),
  bio: z.string().max(200).optional(),
  website: z.string().url().optional(),
})

const form = useForm({
  schema: profileSchema,
  defaultValues: { username: '', email: '', bio: '', website: '' },
})

provideForm(form)  // Make available to ContextInput`,
  },
]
</script>

<style scoped>
.form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.submit-btn {
  padding: 1rem;
  background: #42b883;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
  margin-top: 0.5rem;
}

.submit-btn:hover:not(:disabled) {
  background: #35a372;
}

.submit-btn:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}
</style>
