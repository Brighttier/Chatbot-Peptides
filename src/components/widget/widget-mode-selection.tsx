"use client";

import { Bot, User, MessageSquare, Sparkles } from "lucide-react";

type ChatMode = "AI" | "HUMAN";

interface WidgetModeSelectionProps {
  onSelectMode: (mode: ChatMode) => void;
}

export function WidgetModeSelection({ onSelectMode }: WidgetModeSelectionProps) {
  return (
    <div className="flex flex-col h-full p-4">
      <div className="text-center mb-4">
        <h2 className="text-lg font-semibold text-gray-900">How can we help?</h2>
        <p className="text-sm text-gray-500 mt-1">
          Choose your preferred way to connect
        </p>
      </div>

      <div className="flex-1 flex flex-col gap-3">
        {/* AI Chat Option */}
        <button
          onClick={() => onSelectMode("AI")}
          className="flex items-center gap-4 p-4 rounded-xl border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all group text-left"
        >
          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
            <Bot className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-blue-500" />
              AI Assistant
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Instant answers 24/7
            </p>
          </div>
        </button>

        {/* Human Chat Option */}
        <button
          onClick={() => onSelectMode("HUMAN")}
          className="flex items-center gap-4 p-4 rounded-xl border-2 border-gray-200 hover:border-green-500 hover:bg-green-50 transition-all group text-left"
        >
          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
            <User className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-green-500" />
              Live Human
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Chat with our team
            </p>
          </div>
        </button>
      </div>

      <p className="text-xs text-gray-400 text-center mt-4">
        Both options are free and confidential
      </p>
    </div>
  );
}
