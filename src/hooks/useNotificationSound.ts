"use client";

import { useCallback, useRef } from "react";

/**
 * Hook to play notification sounds when new messages arrive.
 * Uses Web Audio API to generate a pleasant notification tone.
 */
export function useNotificationSound() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const lastPlayedRef = useRef<number>(0);

  const playNotificationSound = useCallback(() => {
    // Debounce: Don't play if last sound was less than 1 second ago
    const now = Date.now();
    if (now - lastPlayedRef.current < 1000) {
      return;
    }
    lastPlayedRef.current = now;

    try {
      // Create or reuse AudioContext
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }

      const audioContext = audioContextRef.current;

      // Resume context if suspended (required by browsers after user interaction)
      if (audioContext.state === "suspended") {
        audioContext.resume();
      }

      // Create a pleasant two-tone notification sound
      const now = audioContext.currentTime;

      // First tone (higher pitch)
      const osc1 = audioContext.createOscillator();
      const gain1 = audioContext.createGain();
      osc1.connect(gain1);
      gain1.connect(audioContext.destination);
      osc1.frequency.value = 880; // A5 note
      osc1.type = "sine";
      gain1.gain.setValueAtTime(0.3, now);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      osc1.start(now);
      osc1.stop(now + 0.15);

      // Second tone (slightly lower, delayed)
      const osc2 = audioContext.createOscillator();
      const gain2 = audioContext.createGain();
      osc2.connect(gain2);
      gain2.connect(audioContext.destination);
      osc2.frequency.value = 659.25; // E5 note
      osc2.type = "sine";
      gain2.gain.setValueAtTime(0, now);
      gain2.gain.setValueAtTime(0.25, now + 0.1);
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc2.start(now + 0.1);
      osc2.stop(now + 0.3);

    } catch (error) {
      // Silently fail if audio is not available
      console.warn("[useNotificationSound] Could not play notification sound:", error);
    }
  }, []);

  return { playNotificationSound };
}
