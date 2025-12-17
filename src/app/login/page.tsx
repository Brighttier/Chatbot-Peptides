"use client";

import { LoginForm } from "@/components/admin/auth/login-form";
import { MessageSquare } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4">
      <div className="w-full max-w-md">
        {/* Logo and title */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 shadow-lg">
            <MessageSquare className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Protocol Chat</h1>
          <p className="mt-1 text-gray-500">Admin Dashboard</p>
        </div>

        {/* Login card */}
        <div className="rounded-xl bg-white p-8 shadow-lg">
          <h2 className="mb-6 text-center text-xl font-semibold text-gray-900">
            Sign in to your account
          </h2>
          <LoginForm />
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-sm text-gray-500">
          Contact your administrator if you need access
        </p>
      </div>
    </div>
  );
}
