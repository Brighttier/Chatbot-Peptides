"use client";

import { useAuth } from "@/contexts/auth-context";
import { redirect } from "next/navigation";
import { useEffect } from "react";

export default function SettingsPage() {
  const { hasRole, isLoading } = useAuth();
  const isSuperAdmin = hasRole(["super_admin"]);

  useEffect(() => {
    if (!isLoading) {
      // Redirect to the first accessible tab
      if (isSuperAdmin) {
        redirect("/admin/settings/users");
      } else {
        redirect("/admin/settings/widget");
      }
    }
  }, [isLoading, isSuperAdmin]);

  return null;
}
