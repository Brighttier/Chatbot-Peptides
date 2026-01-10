"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  MessageCircle,
  ExternalLink,
  Copy,
  Check,
  Monitor,
  Smartphone,
  Code,
} from "lucide-react";

export default function DemoPage() {
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop");
  const [showCode, setShowCode] = useState(false);

  const embedCode = `<!-- Peptide Chat Widget -->
<script>
  (function(w,d,s,o,f,js,fjs){
    w['PeptideChat']=o;w[o]=w[o]||function(){
      (w[o].q=w[o].q||[]).push(arguments)
    };
    js=d.createElement(s);fjs=d.getElementsByTagName(s)[0];
    js.src=f;js.async=1;fjs.parentNode.insertBefore(js,fjs);
  })(window,document,'script','peptideChat','${typeof window !== 'undefined' ? window.location.origin : ''}/widget.js');
  peptideChat('init', { repId: 'demo' });
</script>`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Widget Demo - Peptide Chat
              </h1>
              <p className="text-sm text-gray-500">
                Preview how the chat widget appears on external websites
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* View Mode Toggle */}
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode("desktop")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    viewMode === "desktop"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <Monitor className="w-4 h-4" />
                  Desktop
                </button>
                <button
                  onClick={() => setViewMode("mobile")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    viewMode === "mobile"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <Smartphone className="w-4 h-4" />
                  Mobile
                </button>
              </div>

              {/* Show Code Toggle */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCode(!showCode)}
                className="gap-2"
              >
                <Code className="w-4 h-4" />
                {showCode ? "Hide Code" : "View Code"}
              </Button>

              {/* Back to Admin */}
              <a
                href="/admin"
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                <ExternalLink className="w-4 h-4" />
                Admin Panel
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Code Panel */}
      {showCode && (
        <div className="bg-gray-900 border-b">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-400">
                Add this code to your website to embed the chat widget:
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 mr-1 text-green-400" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-1" />
                    Copy Code
                  </>
                )}
              </Button>
            </div>
            <pre className="bg-gray-800 rounded-lg p-4 overflow-x-auto text-sm text-gray-300">
              <code>{embedCode}</code>
            </pre>
          </div>
        </div>
      )}

      {/* Demo Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Browser Frame */}
        <div
          className={`bg-white rounded-xl shadow-2xl overflow-hidden mx-auto transition-all duration-300 ${
            viewMode === "mobile" ? "max-w-[375px]" : "max-w-full"
          }`}
        >
          {/* Browser Chrome */}
          <div className="bg-gray-200 px-4 py-3 flex items-center gap-3 border-b">
            <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-yellow-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
            </div>
            <div className="flex-1 bg-white rounded-lg px-4 py-1.5 text-sm text-gray-600 flex items-center">
              <span className="text-green-600 mr-1">🔒</span>
              peptide-supplements.com
            </div>
          </div>

          {/* Fake Website Content */}
          <div className="relative min-h-[600px] bg-gradient-to-b from-blue-50 to-white">
            {/* Hero Section */}
            <div className="px-8 py-16 text-center">
              <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                Premium Quality Peptides
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                Research-Grade Peptides
              </h1>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
                High-quality peptides for research purposes. Lab-tested for
                purity and potency.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <button className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
                  Shop Now
                </button>
                <button className="px-6 py-3 bg-white text-gray-700 rounded-lg font-medium border hover:bg-gray-50 transition-colors">
                  Learn More
                </button>
              </div>
            </div>

            {/* Product Cards */}
            <div className="px-8 pb-16">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
                Popular Products
              </h2>
              <div
                className={`grid gap-6 ${
                  viewMode === "mobile" ? "grid-cols-1" : "md:grid-cols-3"
                }`}
              >
                {[
                  { name: "BPC-157", price: "$49.99", tag: "Best Seller" },
                  { name: "TB-500", price: "$59.99", tag: "Popular" },
                  { name: "GHK-Cu", price: "$39.99", tag: "New" },
                ].map((product) => (
                  <div
                    key={product.name}
                    className="bg-white rounded-xl p-6 border shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="w-full h-32 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg mb-4 flex items-center justify-center">
                      <span className="text-4xl">🧪</span>
                    </div>
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-gray-900">
                        {product.name}
                      </h3>
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                        {product.tag}
                      </span>
                    </div>
                    <p className="text-gray-500 text-sm mb-3">
                      High purity research peptide
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-gray-900">
                        {product.price}
                      </span>
                      <button className="text-blue-600 text-sm font-medium hover:text-blue-700">
                        Add to Cart
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* FAQ Section */}
            <div className="bg-gray-50 px-8 py-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
                Have Questions?
              </h2>
              <p className="text-center text-gray-600 mb-6">
                Our team is here to help! Click the chat button to speak with
                our AI assistant or a live representative.
              </p>
              <div className="flex justify-center">
                <div className="flex items-center gap-2 text-gray-500">
                  <MessageCircle className="w-5 h-5" />
                  <span>Chat widget in the bottom-right corner</span>
                  <span className="animate-bounce">👇</span>
                </div>
              </div>
            </div>

            {/* Embedded Widget Iframe */}
            <iframe
              src="/embed/widget?repId=demo"
              className="absolute inset-0 w-full h-full border-none pointer-events-auto"
              style={{ zIndex: 50 }}
              title="Peptide Chat Widget"
            />
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="mt-12 grid md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
              <MessageCircle className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">
              Medical Disclaimer
            </h3>
            <p className="text-gray-600 text-sm">
              Widget shows a medical disclaimer before users can start chatting,
              ensuring compliance.
            </p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
              <span className="text-2xl">🤖</span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">
              AI Chat Option
            </h3>
            <p className="text-gray-600 text-sm">
              Users can choose to chat with an AI assistant powered by Gemini
              for instant, intelligent responses.
            </p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4">
              <span className="text-2xl">👤</span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">
              Human Support
            </h3>
            <p className="text-gray-600 text-sm">
              Option to connect with a real human representative via SMS for
              personalized assistance.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-12">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <p className="text-center text-gray-500 text-sm">
            This is a demo page to showcase the embeddable chat widget. In
            production, the widget would be embedded on your actual website.
          </p>
        </div>
      </footer>
    </div>
  );
}
