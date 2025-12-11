"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bot, User, MessageSquare, Sparkles } from "lucide-react";

type ChatMode = "AI" | "HUMAN";

interface ModeSelectionProps {
  onSelectHuman?: () => void;
  onSelectAI?: () => void;
  onSelectMode?: (mode: ChatMode) => void;
}

export function ModeSelection({ onSelectHuman, onSelectAI, onSelectMode }: ModeSelectionProps) {
  const handleSelectAI = () => {
    if (onSelectMode) {
      onSelectMode("AI");
    } else if (onSelectAI) {
      onSelectAI();
    }
  };

  const handleSelectHuman = () => {
    if (onSelectMode) {
      onSelectMode("HUMAN");
    } else if (onSelectHuman) {
      onSelectHuman();
    }
  };
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-accent/5 to-background p-4">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Welcome!</h1>
          <p className="text-muted-foreground">
            Choose how you&apos;d like to connect with us
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {/* AI Chat Option */}
          <Card
            className="p-6 cursor-pointer hover:border-primary transition-all hover:shadow-lg group"
            onClick={handleSelectAI}
          >
            <div className="space-y-4 text-center">
              <div className="mx-auto h-16 w-16 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Bot className="h-8 w-8 text-primary-foreground" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-semibold flex items-center justify-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  AI Assistant
                </h2>
                <p className="text-sm text-muted-foreground">
                  Get instant answers from our AI-powered assistant available 24/7
                </p>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>Instant responses</li>
                <li>Available anytime</li>
                <li>Quick answers to common questions</li>
              </ul>
              <Button className="w-full" variant="default">
                Chat with AI
              </Button>
            </div>
          </Card>

          {/* Human Chat Option */}
          <Card
            className="p-6 cursor-pointer hover:border-primary transition-all hover:shadow-lg group"
            onClick={handleSelectHuman}
          >
            <div className="space-y-4 text-center">
              <div className="mx-auto h-16 w-16 rounded-full bg-gradient-to-br from-accent to-accent/60 flex items-center justify-center group-hover:scale-110 transition-transform">
                <User className="h-8 w-8 text-accent-foreground" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-semibold flex items-center justify-center gap-2">
                  <MessageSquare className="h-5 w-5 text-accent-foreground" />
                  Human Support
                </h2>
                <p className="text-sm text-muted-foreground">
                  Connect directly with one of our expert representatives
                </p>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>Personalized assistance</li>
                <li>Expert product knowledge</li>
                <li>Complex inquiries welcome</li>
              </ul>
              <Button className="w-full" variant="outline">
                Chat with Human
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
