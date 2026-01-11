"use client";

import { Check } from "lucide-react";

export type MessageStatus = "sent" | "delivered" | "read";

interface MessageStatusIconProps {
  status: MessageStatus;
  readAt?: Date | null;
  className?: string;
}

export function MessageStatusIcon({
  status,
  readAt,
  className = "",
}: MessageStatusIconProps) {
  const formatTime = (date: Date): string => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes.toString().padStart(2, "0");
    return `${displayHours}:${displayMinutes} ${ampm}`;
  };

  // Color based on status
  const colorClass =
    status === "read"
      ? "text-blue-500" // Blue for read
      : "text-gray-400"; // Gray for sent/delivered

  if (status === "sent") {
    // Single checkmark
    return (
      <div className={`inline-flex items-center ${className}`} title="Sent">
        <Check className={`w-4 h-4 ${colorClass}`} />
      </div>
    );
  }

  // Double checkmarks for delivered/read
  return (
    <div
      className={`inline-flex items-center group relative ${className}`}
      title={status === "read" && readAt ? `Read at ${formatTime(readAt)}` : status === "delivered" ? "Delivered" : ""}
    >
      <div className="relative w-4 h-4">
        {/* First checkmark */}
        <Check className={`w-4 h-4 absolute ${colorClass}`} style={{ left: "-2px" }} />
        {/* Second checkmark (overlapped) */}
        <Check className={`w-4 h-4 absolute ${colorClass}`} style={{ left: "2px" }} />
      </div>

      {/* Tooltip for read status with timestamp */}
      {status === "read" && readAt && (
        <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 text-xs text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
          Read at {formatTime(readAt)}
          <span className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900" />
        </span>
      )}
    </div>
  );
}
