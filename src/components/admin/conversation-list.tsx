"use client";

import { useState, useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, User, Archive, Inbox, Merge, Loader2 } from "lucide-react";
import type { Conversation, MessageSender } from "@/types";

interface ConversationWithPreview extends Conversation {
  lastMessage?: {
    content: string;
    timestamp: Date;
    sender: MessageSender;
  };
  hasUnread?: boolean;
  directChatRepName?: string;
}

interface ConversationListProps {
  conversations: ConversationWithPreview[];
  selectedId: string | null;
  onSelect: (conversation: ConversationWithPreview) => void;
  onRefresh?: () => void;
}

type FilterType = "all" | "active" | "archived";

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
  onRefresh,
}: ConversationListProps) {
  const [filter, setFilter] = useState<FilterType>("all");
  const [isMerging, setIsMerging] = useState(false);
  const [mergeResult, setMergeResult] = useState<string | null>(null);

  // Count duplicate phone numbers
  const duplicateCount = useMemo(() => {
    const phoneNumbers = conversations.map(c => c.userMobileNumber);
    const uniquePhones = new Set(phoneNumbers);
    return phoneNumbers.length - uniquePhones.size;
  }, [conversations]);

  // Merge duplicate conversations
  const handleMerge = async () => {
    if (!confirm(`This will merge ${duplicateCount} duplicate conversation(s) into single threads per phone number. Continue?`)) {
      return;
    }

    setIsMerging(true);
    setMergeResult(null);

    try {
      const response = await fetch("/api/admin/merge-conversations", {
        method: "POST",
      });

      const data = await response.json();

      if (response.ok) {
        setMergeResult(`Merged ${data.mergedCount} group(s) successfully`);
        // Refresh the conversation list
        onRefresh?.();
      } else {
        setMergeResult(`Error: ${data.error}`);
      }
    } catch (error) {
      setMergeResult("Failed to merge conversations");
      console.error("Merge error:", error);
    } finally {
      setIsMerging(false);
      // Clear result after 3 seconds
      setTimeout(() => setMergeResult(null), 3000);
    }
  };

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

  // Filter conversations based on current filter
  const filteredConversations = useMemo(() => {
    return conversations
      .filter((conv) => {
        if (filter === "all") return true;
        if (filter === "active") return conv.status === "active";
        if (filter === "archived") return conv.status === "archived";
        return true;
      })
      .sort((a, b) => {
        // Sort by creation time (newest first) - stable sort that won't reshuffle when messages arrive
        const timeA = a.createdAt ? new Date(a.createdAt as unknown as string).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt as unknown as string).getTime() : 0;
        return timeB - timeA;
      });
  }, [conversations, filter]);

  // Count conversations by status
  const activeCount = conversations.filter((c) => c.status === "active").length;
  const archivedCount = conversations.filter((c) => c.status === "archived").length;

  // Render a single conversation item
  const renderConversationItem = (conversation: ConversationWithPreview) => (
    <button
      key={conversation.id}
      onClick={() => onSelect(conversation)}
      className={`w-full rounded-lg p-3 text-left transition-all ${
        selectedId === conversation.id
          ? "bg-blue-50 border border-blue-200"
          : conversation.status === "archived"
          ? "bg-amber-50/50 hover:bg-amber-50 border border-transparent"
          : "hover:bg-gray-100 border border-transparent"
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
            selectedId === conversation.id
              ? "bg-blue-500 text-white"
              : conversation.status === "archived"
              ? "bg-amber-200 text-amber-700"
              : "bg-gray-200 text-gray-600"
          }`}
        >
          {conversation.status === "archived" ? (
            <Archive className="h-5 w-5" />
          ) : (
            <User className="h-5 w-5" />
          )}
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
              {truncate(conversation.lastMessage.content, 35)}
            </p>
          ) : (
            <p className="text-sm text-gray-400 italic mt-0.5">
              No messages
            </p>
          )}

          {/* Status badge */}
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                conversation.status === "active"
                  ? "bg-green-100 text-green-700"
                  : conversation.status === "archived"
                  ? "bg-amber-100 text-amber-700"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {conversation.status}
            </span>
            <span className="text-xs text-gray-400">
              {conversation.chatMode}
            </span>
            {/* Purchase Intent badge - blinking for attention */}
            {conversation.customerInfo?.intakeAnswers?.interest?.includes("Purchasing Peptides") && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 animate-pulse">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                Purchase Intent
              </span>
            )}
            {/* Direct Chat badge - shows for Instagram-based direct link conversations */}
            {conversation.userMobileNumber.startsWith("instagram-") && (
              <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                Direct Chat{conversation.directChatRepName ? ` - ${conversation.directChatRepName}` : ""}
              </span>
            )}
          </div>
        </div>

        {/* Unread indicator - shows blue dot for unread messages */}
        {conversation.hasUnread ? (
          <div className="h-2.5 w-2.5 rounded-full bg-blue-500 mt-2 shrink-0 animate-pulse" />
        ) : conversation.status === "active" ? (
          <div className="h-2 w-2 rounded-full bg-green-500 mt-2 shrink-0" />
        ) : null}
      </div>
    </button>
  );

  return (
    <div className="flex h-full flex-col border-r bg-gray-50/50">
      {/* Header */}
      <div className="border-b bg-white px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Conversations</h2>
            <p className="text-sm text-gray-500">
              {activeCount} active, {archivedCount} archived
            </p>
          </div>
          {/* Merge button - only show if there are duplicates */}
          {duplicateCount > 0 && (
            <button
              onClick={handleMerge}
              disabled={isMerging}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-orange-100 text-orange-700 hover:bg-orange-200 transition-colors disabled:opacity-50"
              title={`Merge ${duplicateCount} duplicate conversation(s)`}
            >
              {isMerging ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Merge className="h-3.5 w-3.5" />
              )}
              Merge ({duplicateCount})
            </button>
          )}
        </div>
        {/* Merge result message */}
        {mergeResult && (
          <p className={`mt-2 text-xs font-medium ${mergeResult.includes("Error") ? "text-red-600" : "text-green-600"}`}>
            {mergeResult}
          </p>
        )}
      </div>

      {/* Filter tabs */}
      <div className="border-b bg-white px-2 py-2">
        <div className="flex gap-1">
          <button
            onClick={() => setFilter("all")}
            className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              filter === "all"
                ? "bg-blue-100 text-blue-700"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            All ({conversations.length})
          </button>
          <button
            onClick={() => setFilter("active")}
            className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center justify-center gap-1 ${
              filter === "active"
                ? "bg-green-100 text-green-700"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <Inbox className="h-3 w-3" />
            Active ({activeCount})
          </button>
          <button
            onClick={() => setFilter("archived")}
            className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center justify-center gap-1 ${
              filter === "archived"
                ? "bg-amber-100 text-amber-700"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <Archive className="h-3 w-3" />
            Archived ({archivedCount})
          </button>
        </div>
      </div>

      {/* Conversation List */}
      <ScrollArea className="flex-1">
        <div className="space-y-1 p-2">
          {filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <MessageSquare className="h-12 w-12 mb-2 opacity-30" />
              <p className="text-sm">
                {filter === "archived"
                  ? "No archived conversations"
                  : filter === "active"
                  ? "No active conversations"
                  : "No conversations yet"}
              </p>
            </div>
          ) : (
            filteredConversations.map((conversation) => renderConversationItem(conversation))
          )}
        </div>
      </ScrollArea>

      {/* Footer info */}
      {filteredConversations.length > 0 && (
        <div className="border-t bg-white px-4 py-2 text-xs text-gray-500 text-center">
          {filteredConversations.length} conversation{filteredConversations.length !== 1 ? "s" : ""}
        </div>
      )}
    </div>
  );
}
