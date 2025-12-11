"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, User } from "lucide-react";
import type { Conversation } from "@/types";

interface ConversationWithPreview extends Conversation {
  lastMessage?: {
    content: string;
    timestamp: Date;
    sender: string;
  };
}

interface ConversationListProps {
  conversations: ConversationWithPreview[];
  selectedId: string | null;
  onSelect: (conversation: ConversationWithPreview) => void;
}

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
}: ConversationListProps) {
  const formatTime = (date: Date | string) => {
    const d = typeof date === "string" ? new Date(date) : date;
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();

    if (isToday) {
      return d.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    }
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const truncate = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + "...";
  };

  return (
    <div className="flex h-full flex-col border-r bg-gray-50/50">
      {/* Header */}
      <div className="border-b bg-white px-4 py-4">
        <h2 className="text-xl font-semibold text-gray-900">Conversations</h2>
        <p className="text-sm text-gray-500">
          {conversations.length} active conversation{conversations.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Conversation List */}
      <ScrollArea className="flex-1">
        <div className="space-y-1 p-2">
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <MessageSquare className="h-12 w-12 mb-2 opacity-30" />
              <p className="text-sm">No conversations yet</p>
            </div>
          ) : (
            conversations.map((conversation) => (
              <button
                key={conversation.id}
                onClick={() => onSelect(conversation)}
                className={`w-full rounded-lg p-3 text-left transition-all ${
                  selectedId === conversation.id
                    ? "bg-blue-50 border border-blue-200"
                    : "hover:bg-gray-100 border border-transparent"
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                      selectedId === conversation.id
                        ? "bg-blue-500 text-white"
                        : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    <User className="h-5 w-5" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-gray-900 text-sm truncate">
                        {conversation.userMobileNumber}
                      </span>
                      {conversation.lastMessage && (
                        <span className="text-xs text-gray-400 whitespace-nowrap shrink-0">
                          {formatTime(conversation.lastMessage.timestamp)}
                        </span>
                      )}
                    </div>

                    {/* Last message preview */}
                    {conversation.lastMessage ? (
                      <p className="text-sm text-gray-500 truncate mt-0.5">
                        {conversation.lastMessage.sender === "ADMIN" && (
                          <span className="text-blue-500">You: </span>
                        )}
                        {truncate(conversation.lastMessage.content, 40)}
                      </p>
                    ) : (
                      <p className="text-sm text-gray-400 italic mt-0.5">
                        No messages
                      </p>
                    )}

                    {/* Status badge */}
                    <div className="flex items-center gap-2 mt-1.5">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          conversation.status === "active"
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {conversation.status}
                      </span>
                      <span className="text-xs text-gray-400">
                        {conversation.chatMode}
                      </span>
                    </div>
                  </div>

                  {/* Active indicator */}
                  {conversation.status === "active" && (
                    <div className="h-2 w-2 rounded-full bg-green-500 mt-2" />
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
