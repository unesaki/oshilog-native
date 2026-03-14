import { useState, useCallback } from 'react'

export function useToast() {
  const [toast, setToast] = useState<{ message: string; isError: boolean; visible: boolean }>({
    message: '',
    isError: false,
    visible: false,
  })

  const showToast = useCallback((message: string, isError = false) => {
    setToast({ message, isError, visible: true })
    setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }))
    }, 2500)
  }, [])

  return { toast, showToast }
}
