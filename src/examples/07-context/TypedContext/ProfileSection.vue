<template>
  <fieldset class="section">
    <legend class="section__title">Profile Settings</legend>

    <div class="field-group">
      <label class="label">Display Name *</label>
      <input
        type="text"
        placeholder="Your name"
        :class="['input', errors.displayName && 'input--error']"
        v-bind="register('profile.displayName')"
      />
      <span v-if="errors.displayName" class="error">
        {{ errors.displayName }}
      </span>
    </div>

    <div class="field-group">
      <label class="label">Bio</label>
      <textarea
        rows="3"
        maxlength="160"
        placeholder="Tell us about yourself..."
        :class="['input', errors.bio && 'input--error']"
        v-bind="bioBinding"
      />
      <span v-if="errors.bio" class="error">
        {{ errors.bio }}
      </span>
    </div>

    <div class="field-group">
      <label class="label">Avatar URL</label>
      <input
        type="url"
        placeholder="https://example.com/avatar.png"
        :class="['input', errors.avatarUrl && 'input--error']"
        v-bind="register('profile.avatarUrl')"
      />
      <span v-if="errors.avatarUrl" class="error">
        {{ errors.avatarUrl }}
      </span>
    </div>
  </fieldset>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useFormContext } from '../../../lib'
import type { SettingsSchema } from './schema'

// TYPED: Import the schema type from shared file for full autocomplete
// Try typing register('profile.') - you'll see displayName, bio, avatarUrl!
const { register, formState } = useFormContext<SettingsSchema>()

// Type-safe error access for nested fields
const errors = computed(() => {
  const profileErrors = formState.value.errors.profile
  if (typeof profileErrors === 'object' && profileErrors !== null) {
    return profileErrors as { displayName?: unknown; bio?: unknown; avatarUrl?: unknown }
  }
  return { displayName: undefined, bio: undefined, avatarUrl: undefined }
})

// Textarea binding (cast to avoid Vue template type inference issue)
const bioBinding = computed(() => register('profile.bio') as unknown as Record<string, unknown>)

// TypeScript knows these are valid:
// register('profile.displayName') ✓
// register('profile.bio') ✓
// register('profile.avatarUrl') ✓

// TypeScript would ERROR on these:
// register('profile.invalid') ✗
// register('notAField') ✗
</script>

<style scoped>
.section {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1.25rem;
  background: #fafafa;
}

.section__title {
  color: #42b883;
  font-weight: 600;
  font-size: 1rem;
  padding: 0 0.5rem;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  margin-bottom: 1rem;
}

.field-group:last-child {
  margin-bottom: 0;
}

.label {
  font-weight: 500;
  color: #374151;
  font-size: 0.9rem;
}

.input {
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 1rem;
  font-family: inherit;
  transition:
    border-color 0.2s,
    box-shadow 0.2s;
  resize: vertical;
}

.input:focus {
  outline: none;
  border-color: #42b883;
  box-shadow: 0 0 0 3px rgba(66, 184, 131, 0.1);
}

.input--error {
  border-color: #e74c3c;
}

.error {
  color: #e74c3c;
  font-size: 0.85rem;
}
</style>
