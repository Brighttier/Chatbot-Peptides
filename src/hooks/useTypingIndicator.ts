import { useEffect, useCallback, useRef } from 'react';
import { setTypingStatus } from '@/lib/firebase';

const TYPING_TIMEOUT = 3000; // Clear typing after 3s of inactivity
const DEBOUNCE_DELAY = 500; // Debounce typing updates

export function useTypingIndicator(conversationId: string, userId: string) {
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);

  const clearTypingStatus = useCallback(async () => {
    if (isTypingRef.current) {
      await setTypingStatus(conversationId, userId, false);
      isTypingRef.current = false;
    }
  }, [conversationId, userId]);

  const handleTyping = useCallback(() => {
    // Clear existing timeouts
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Debounce the typing status update
    debounceTimeoutRef.current = setTimeout(async () => {
      if (!isTypingRef.current) {
        await setTypingStatus(conversationId, userId, true);
        isTypingRef.current = true;
      }
    }, DEBOUNCE_DELAY);

    // Auto-clear typing after inactivity
    typingTimeoutRef.current = setTimeout(() => {
      clearTypingStatus();
    }, TYPING_TIMEOUT);
  }, [conversationId, userId, clearTypingStatus]);

  // Clear on unmount
  useEffect(() => {
    return () => {
      clearTypingStatus();
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [clearTypingStatus]);

  return {
    handleTyping,
    clearTypingStatus,
  };
}
