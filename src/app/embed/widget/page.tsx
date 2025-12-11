"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { WidgetContainer } from "@/components/widget/widget-container";
import { Loader2 } from "lucide-react";

interface WidgetSettings {
  colors?: {
    primary?: string;
    primaryForeground?: string;
    accent?: string;
    background?: string;
    foreground?: string;
  };
  position?: "bottom-right" | "bottom-left";
  size?: "compact" | "standard" | "large";
  borderRadius?: number;
  welcomeMessage?: string;
  autoExpand?: boolean;
  expandDelay?: number;
}

function WidgetContent() {
  const searchParams = useSearchParams();
  const repId = searchParams.get("repId") || "default";
  const [settings, setSettings] = useState<WidgetSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const response = await fetch("/api/widget/settings");
        if (response.ok) {
          const data = await response.json();
          setSettings(data.settings || {});
        }
      } catch (error) {
        console.error("Failed to fetch widget settings:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchSettings();
  }, []);

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <WidgetContainer
      repId={repId}
      position={settings?.position || "bottom-right"}
      primaryColor={settings?.colors?.primary || "#2563eb"}
      size={settings?.size || "standard"}
      borderRadius={settings?.borderRadius || 16}
      welcomeMessage={settings?.welcomeMessage || "Hi! How can I help you today?"}
      autoExpand={settings?.autoExpand || false}
      expandDelay={settings?.expandDelay || 3000}
    />
  );
}

export default function WidgetPage() {
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      }
    >
      <WidgetContent />
    </Suspense>
  );
}
