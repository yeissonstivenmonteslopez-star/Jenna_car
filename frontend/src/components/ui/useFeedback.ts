import { useCallback, useState } from 'react'
import type { FeedbackType } from './KeycapAlert'

/** Keep message severity at the action source, independent of its wording. */
export function useFeedback() {
  const [feedback, setFeedback] = useState<{ message: string; type: FeedbackType }>({ message: '', type: 'error' })
  const setMessage = useCallback((message: string, type: FeedbackType = 'error') => {
    setFeedback({ message, type })
  }, [])
  return [feedback.message, setMessage, feedback.type] as const
}
