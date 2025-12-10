import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Bot, MessageSquare, User, ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-background">
      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center space-y-6 mb-16">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            Peptide Chat
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Connect with our team through AI-powered chat or direct human support.
            Your conversation history is preserved across all sessions.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto mb-16">
          <Card className="p-6 space-y-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Bot className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold">AI Assistant</h3>
            <p className="text-sm text-muted-foreground">
              Get instant answers from our AI-powered assistant, available 24/7
              with HeyGen video avatar support.
            </p>
          </Card>

          <Card className="p-6 space-y-4">
            <div className="h-12 w-12 rounded-full bg-accent/50 flex items-center justify-center">
              <User className="h-6 w-6 text-accent-foreground" />
            </div>
            <h3 className="text-lg font-semibold">Human Support</h3>
            <p className="text-sm text-muted-foreground">
              Connect directly with our expert representatives via SMS-anchored
              chat for personalized assistance.
            </p>
          </Card>

          <Card className="p-6 space-y-4">
            <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
              <MessageSquare className="h-6 w-6 text-green-500" />
            </div>
            <h3 className="text-lg font-semibold">Persistent History</h3>
            <p className="text-sm text-muted-foreground">
              Your conversation history is saved and accessible across sessions,
              anchored by your mobile number.
            </p>
          </Card>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link href="/chat/new">
            <Button size="lg" className="gap-2">
              Start Human Chat
              <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
          <Link href="/embed/chat/new">
            <Button size="lg" variant="outline" className="gap-2">
              Choose Chat Mode
              <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
        </div>

        {/* Integration Info */}
        <div className="mt-16 text-center space-y-4">
          <h2 className="text-2xl font-semibold">Integration Points</h2>
          <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
            <code className="bg-muted px-3 py-1 rounded">/chat/new?repId=xxx</code>
            <code className="bg-muted px-3 py-1 rounded">/embed/chat/new?repId=xxx</code>
            <code className="bg-muted px-3 py-1 rounded">/chat/[id]</code>
          </div>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto">
            Use the standalone link for Instagram/direct access (defaults to human chat),
            or the embed link for website integration with mode selection.
          </p>
        </div>
      </div>
    </div>
  );
}
