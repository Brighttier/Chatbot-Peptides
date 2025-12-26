"use client";

import { useAuth } from "@/contexts/auth-context";
import { redirect } from "next/navigation";
import { useEffect } from "react";

export default function SettingsPage() {
  const { hasRole, isLoading } = useAuth();
  const isSuperAdmin = hasRole(["super_admin"]);
  const isAdmin = hasRole(["admin"]);

  useEffect(() => {
    if (!isLoading) {
      // Redirect to the first accessible tab based on role
      if (isSuperAdmin) {
        redirect("/admin/settings/commissions");
      } else if (isAdmin) {
        redirect("/admin/settings/widget");
      } else {
        // Reps go directly to canned responses
        redirect("/admin/settings/canned-responses");
      }
    }
  }, [isLoading, isSuperAdmin, isAdmin]);

  return null;
}
