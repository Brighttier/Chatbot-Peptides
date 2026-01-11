import { useEffect, useRef, useCallback } from 'react';
import { markMessageAsRead } from '@/lib/firebase';

export function useMessageReadTracking(
  conversationId: string,
  userId: string,
  messages: Array<{ id: string; sender: string; readBy?: string[] }>
) {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const observedElementsRef = useRef<Set<string>>(new Set());

  const handleIntersection = useCallback(
    async (entries: IntersectionObserverEntry[]) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const messageId = entry.target.getAttribute('data-message-id');
          const messageSender = entry.target.getAttribute('data-message-sender');

          if (messageId && messageSender !== userId) {
            const message = messages.find(m => m.id === messageId);

            // Only mark as read if not already read by this user
            if (message && !message.readBy?.includes(userId)) {
              await markMessageAsRead(conversationId, messageId, userId);
              observedElementsRef.current.add(messageId);
            }
          }
        }
      }
    },
    [conversationId, userId, messages]
  );

  useEffect(() => {
    // Create intersection observer
    observerRef.current = new IntersectionObserver(handleIntersection, {
      root: null, // viewport
      rootMargin: '0px',
      threshold: 0.5, // 50% visible
    });

    return () => {
      observerRef.current?.disconnect();
    };
  }, [handleIntersection]);

  const observeMessage = useCallback((element: HTMLElement | null) => {
    if (element && observerRef.current) {
      observerRef.current.observe(element);
    }
  }, []);

  return { observeMessage };
}
