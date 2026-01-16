"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import html2canvas from "html2canvas";

export async function captureFullScreen(): Promise<string> {
  // Hide any feedback-related elements during capture
  const feedbackElements = document.querySelectorAll('[data-feedback-ui="true"]');
  feedbackElements.forEach((el) => {
    (el as HTMLElement).style.visibility = "hidden";
  });

  try {
    const canvas = await html2canvas(document.body, {
      useCORS: true,
      allowTaint: true,
      logging: false,
      scale: 1, // Use 1 for smaller file size
      backgroundColor: null,
    });
    return canvas.toDataURL("image/png", 0.8); // 80% quality for smaller size
  } finally {
    // Restore visibility
    feedbackElements.forEach((el) => {
      (el as HTMLElement).style.visibility = "visible";
    });
  }
}

interface AreaRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export async function captureArea(rect: AreaRect): Promise<string> {
  // Hide any feedback-related elements during capture
  const feedbackElements = document.querySelectorAll('[data-feedback-ui="true"]');
  feedbackElements.forEach((el) => {
    (el as HTMLElement).style.visibility = "hidden";
  });

  try {
    const canvas = await html2canvas(document.body, {
      useCORS: true,
      allowTaint: true,
      logging: false,
      scale: 1,
      x: rect.x + window.scrollX,
      y: rect.y + window.scrollY,
      width: rect.width,
      height: rect.height,
      backgroundColor: null,
    });
    return canvas.toDataURL("image/png", 0.8);
  } finally {
    // Restore visibility
    feedbackElements.forEach((el) => {
      (el as HTMLElement).style.visibility = "visible";
    });
  }
}

interface AreaSelectorProps {
  onCapture: (dataUrl: string) => void;
  onCancel: () => void;
}

export function AreaSelector({ onCapture, onCancel }: AreaSelectorProps) {
  const [isSelecting, setIsSelecting] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 });
  const overlayRef = useRef<HTMLDivElement>(null);

  const getRect = useCallback((): AreaRect => {
    const x = Math.min(startPos.x, currentPos.x);
    const y = Math.min(startPos.y, currentPos.y);
    const width = Math.abs(currentPos.x - startPos.x);
    const height = Math.abs(currentPos.y - startPos.y);
    return { x, y, width, height };
  }, [startPos, currentPos]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsSelecting(true);
    setStartPos({ x: e.clientX, y: e.clientY });
    setCurrentPos({ x: e.clientX, y: e.clientY });
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isSelecting) {
        setCurrentPos({ x: e.clientX, y: e.clientY });
      }
    },
    [isSelecting]
  );

  const handleMouseUp = useCallback(async () => {
    if (!isSelecting) return;
    setIsSelecting(false);

    const rect = getRect();
    if (rect.width > 10 && rect.height > 10) {
      // Minimum size check
      try {
        const dataUrl = await captureArea(rect);
        onCapture(dataUrl);
      } catch (error) {
        console.error("Failed to capture area:", error);
        onCancel();
      }
    } else {
      onCancel();
    }
  }, [isSelecting, getRect, onCapture, onCancel]);

  // Handle escape key to cancel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCancel();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  const rect = getRect();

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[99999] cursor-crosshair"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.3)" }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      data-feedback-ui="true"
    >
      {/* Instructions */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/80 text-white px-4 py-2 rounded-lg text-sm">
        Click and drag to select an area. Press ESC to cancel.
      </div>

      {/* Selection rectangle */}
      {isSelecting && rect.width > 0 && rect.height > 0 && (
        <div
          className="absolute border-2 border-blue-500 bg-blue-500/10"
          style={{
            left: rect.x,
            top: rect.y,
            width: rect.width,
            height: rect.height,
          }}
        >
          {/* Size indicator */}
          <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-black/80 text-white px-2 py-1 rounded text-xs whitespace-nowrap">
            {Math.round(rect.width)} x {Math.round(rect.height)}
          </div>
        </div>
      )}
    </div>
  );
}
