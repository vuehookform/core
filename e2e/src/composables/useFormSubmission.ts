import { ref, type Ref } from 'vue'
import { useToast } from 'primevue/usetoast'

export function useFormSubmission<T>() {
  const toast = useToast()
  const submittedData: Ref<T | null> = ref(null)

  const onSubmitSuccess = (data: T) => {
    submittedData.value = data
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Form submitted successfully!',
      life: 3000,
    })
  }

  const onSubmitError = () => {
    toast.add({
      severity: 'error',
      summary: 'Validation Error',
      detail: 'Please fix the errors above.',
      life: 3000,
    })
  }

  return { submittedData, onSubmitSuccess, onSubmitError }
}
