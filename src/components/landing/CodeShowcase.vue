<template>
  <section class="py-20 px-4">
    <div class="max-w-4xl mx-auto">
      <!-- Section Header -->
      <h2 class="text-3xl sm:text-4xl font-bold text-white text-center mb-4">Simple by Design</h2>
      <p class="text-white/70 text-center mb-10 max-w-2xl mx-auto">
        Get started in seconds. Define your schema, spread the register function, and you're done.
      </p>

      <!-- Code Block -->
      <div class="bg-gray-900 rounded-2xl overflow-hidden shadow-2xl border border-white/10">
        <!-- Header -->
        <div class="bg-gray-800 px-6 py-3 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <div class="flex gap-1.5">
              <div class="w-3 h-3 rounded-full bg-red-500" />
              <div class="w-3 h-3 rounded-full bg-yellow-500" />
              <div class="w-3 h-3 rounded-full bg-green-500" />
            </div>
            <span class="ml-3 text-gray-400 text-sm font-medium">example.vue</span>
          </div>
          <button
            class="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors text-sm"
            @click="copyCode"
          >
            <span class="material-symbols-outlined text-lg">
              {{ copied ? 'check' : 'content_copy' }}
            </span>
            {{ copied ? 'Copied!' : 'Copy' }}
          </button>
        </div>

        <!-- Code Content -->
        <div class="p-6 overflow-x-auto">
          <pre
            class="text-sm leading-relaxed"
          ><code class="text-gray-300"><span class="text-purple-400">import</span> { useForm } <span class="text-purple-400">from</span> <span class="text-emerald-400">'@vuehookform/core'</span>
<span class="text-purple-400">import</span> { z } <span class="text-purple-400">from</span> <span class="text-emerald-400">'zod'</span>

<span class="text-gray-500">// Define your schema - it's both types AND validation</span>
<span class="text-purple-400">const</span> schema = z.<span class="text-yellow-400">object</span>({
  email: z.<span class="text-yellow-400">string</span>().<span class="text-yellow-400">email</span>(),
  password: z.<span class="text-yellow-400">string</span>().<span class="text-yellow-400">min</span>(<span class="text-orange-400">8</span>)
})

<span class="text-gray-500">// Get form utilities with full type inference</span>
<span class="text-purple-400">const</span> { register, handleSubmit, formState } = <span class="text-yellow-400">useForm</span>({ schema })

<span class="text-gray-500">// In your template - just spread register()</span>
<span class="text-blue-400">&lt;input</span> <span class="text-yellow-400">v-bind</span>=<span class="text-emerald-400">"register('email')"</span> <span class="text-blue-400">/&gt;</span>
<span class="text-blue-400">&lt;input</span> <span class="text-yellow-400">v-bind</span>=<span class="text-emerald-400">"register('password')"</span> <span class="text-yellow-400">type</span>=<span class="text-emerald-400">"password"</span> <span class="text-blue-400">/&gt;</span></code></pre>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const copied = ref(false)

const codeText = `import { useForm } from '@vuehookform/core'
import { z } from 'zod'

const schema = z.object({
  email: z.email(),
  password: z.string().min(8)
})

const { register, handleSubmit, formState } = useForm({ schema })

<input v-bind="register('email')" />
<input v-bind="register('password')" type="password" />`

async function copyCode() {
  try {
    await navigator.clipboard.writeText(codeText)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch {
    // Clipboard API not available
  }
}
</script>
