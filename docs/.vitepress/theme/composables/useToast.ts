import { ref, readonly } from 'vue'

export type ToastType = 'success' | 'error'

export interface ToastState {
  visible: boolean
  message: string
  type: ToastType
}

// Singleton state - shared across all useToast() calls
const state = ref<ToastState>({
  visible: false,
  message: '',
  type: 'success',
})

let hideTimeout: ReturnType<typeof setTimeout> | null = null

function show(message: string, type: ToastType = 'success', duration = 3000) {
  // Clear any existing timeout
  if (hideTimeout) {
    clearTimeout(hideTimeout)
    hideTimeout = null
  }

  state.value = {
    visible: true,
    message,
    type,
  }

  // Auto-dismiss
  if (duration > 0) {
    hideTimeout = setTimeout(() => {
      hide()
    }, duration)
  }
}

function hide() {
  if (hideTimeout) {
    clearTimeout(hideTimeout)
    hideTimeout = null
  }
  state.value.visible = false
}

function success(message: string) {
  show(message, 'success')
}

function error(message: string) {
  show(message, 'error')
}

export function useToast() {
  return {
    state: readonly(state),
    show,
    hide,
    success,
    error,
  }
}
