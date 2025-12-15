"use client";

import { useState, useRef, useEffect } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UnreadConversation {
  id: string;
  userMobileNumber: string;
  lastMessage?: {
    content: string;
    timestamp: Date;
  };
  customerInfo?: {
    firstName?: string;
    lastName?: string;
  };
}

interface NotificationBellProps {
  unreadCount: number;
  unreadConversations: UnreadConversation[];
  onConversationClick: (conversationId: string) => void;
}

export function NotificationBell({
  unreadCount,
  unreadConversations,
  onConversationClick,
}: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const formatTime = (date: Date | string) => {
    const d = typeof date === "string" ? new Date(date) : date;
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const truncate = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + "...";
  };

  const getDisplayName = (conv: UnreadConversation) => {
    if (conv.customerInfo?.firstName) {
      return `${conv.customerInfo.firstName} ${conv.customerInfo.lastName || ""}`.trim();
    }
    return conv.userMobileNumber;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        size="sm"
        className="relative p-2"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-medium animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b bg-gray-50">
            <h3 className="font-semibold text-gray-900">Notifications</h3>
            {unreadCount > 0 && (
              <p className="text-sm text-gray-500">{unreadCount} unread message{unreadCount !== 1 ? "s" : ""}</p>
            )}
          </div>

          {/* Notification List */}
          <div className="max-h-80 overflow-y-auto">
            {unreadConversations.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No new messages</p>
              </div>
            ) : (
              unreadConversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => {
                    onConversationClick(conv.id);
                    setIsOpen(false);
                  }}
                  className="w-full px-4 py-3 text-left hover:bg-blue-50 border-b last:border-b-0 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    {/* Unread indicator */}
                    <div className="mt-2 h-2 w-2 rounded-full bg-blue-500 flex-shrink-0" />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-gray-900 truncate">
                          {getDisplayName(conv)}
                        </span>
                        {conv.lastMessage?.timestamp && (
                          <span className="text-xs text-gray-500 flex-shrink-0">
                            {formatTime(conv.lastMessage.timestamp)}
                          </span>
                        )}
                      </div>
                      {conv.lastMessage?.content && (
                        <p className="text-sm text-gray-600 truncate mt-0.5">
                          {truncate(conv.lastMessage.content, 50)}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
