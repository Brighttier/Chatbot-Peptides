"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Script from "next/script";

function TestWidgetContent() {
  const searchParams = useSearchParams();
  const repId = searchParams.get("repId") || "rep1";
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mock Website Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg">
                P
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Peptide Protocols</h1>
                <p className="text-xs text-gray-500">Test Website</p>
              </div>
            </div>
            <nav className="hidden md:flex gap-6 text-sm">
              <a href="#" className="text-gray-600 hover:text-gray-900">Home</a>
              <a href="#" className="text-gray-600 hover:text-gray-900">Products</a>
              <a href="#" className="text-gray-600 hover:text-gray-900">About</a>
              <a href="#" className="text-gray-600 hover:text-gray-900">Contact</a>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 to-indigo-100 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Widget Embedding Test Page
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            This page simulates an external website with the Peptide Chat widget embedded.
            The chat bubble should appear in the bottom-right corner.
          </p>
          <div className="flex gap-4 justify-center">
            <div className="px-6 py-3 bg-white rounded-lg shadow-sm border">
              <p className="text-sm text-gray-500">Current Rep ID</p>
              <p className="font-mono font-bold text-blue-600">{repId}</p>
            </div>
            <div className="px-6 py-3 bg-white rounded-lg shadow-sm border">
              <p className="text-sm text-gray-500">Base URL</p>
              <p className="font-mono text-xs text-gray-700">{baseUrl}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Testing Instructions
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-6 bg-gray-50 rounded-lg">
              <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xl mb-4">
                1
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Check Widget Appears
              </h3>
              <p className="text-gray-600 text-sm">
                Look for the pulsing chat bubble in the bottom-right corner of the page.
                It should be visible and clickable.
              </p>
            </div>

            <div className="p-6 bg-gray-50 rounded-lg">
              <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center text-green-600 font-bold text-xl mb-4">
                2
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Test Interaction
              </h3>
              <p className="text-gray-600 text-sm">
                Click the chat bubble to expand the widget. You should see mode selection
                (AI or Human chat).
              </p>
            </div>

            <div className="p-6 bg-gray-50 rounded-lg">
              <div className="h-12 w-12 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-xl mb-4">
                3
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Check Console
              </h3>
              <p className="text-gray-600 text-sm">
                Open browser dev tools (F12) and check the Console tab. There should be
                no CORS errors or 404s.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Debug Info */}
      <section className="py-12 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Debug Information</h3>
            <div className="space-y-2 text-sm font-mono">
              <p>
                <span className="text-gray-500">Widget Script URL:</span>{" "}
                <a href={`${baseUrl}/widget.js`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  {baseUrl}/widget.js
                </a>
              </p>
              <p>
                <span className="text-gray-500">Embed Page URL:</span>{" "}
                <a href={`${baseUrl}/embed/widget?repId=${repId}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  {baseUrl}/embed/widget?repId={repId}
                </a>
              </p>
              <p>
                <span className="text-gray-500">Settings API:</span>{" "}
                <a href={`${baseUrl}/api/widget/settings`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  {baseUrl}/api/widget/settings
                </a>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-400 text-sm">
            This is a test page to verify widget embedding functionality.
          </p>
        </div>
      </footer>

      {/* Embedded Widget Script */}
      <Script id="peptide-chat-widget" strategy="afterInteractive">
        {`
          (function(w,d,s,o,f,js,fjs){
            w['PeptideChat']=o;w[o]=w[o]||function(){
              (w[o].q=w[o].q||[]).push(arguments)
            };
            js=d.createElement(s);fjs=d.getElementsByTagName(s)[0];
            js.src=f;js.async=1;fjs.parentNode.insertBefore(js,fjs);
          })(window,document,'script','peptideChat','${baseUrl}/widget.js');
          peptideChat('init', { repId: '${repId}' });
        `}
      </Script>
    </div>
  );
}

export default function TestWidgetPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <TestWidgetContent />
    </Suspense>
  );
}
