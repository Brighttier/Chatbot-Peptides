"use client";

import { CommissionDashboard } from "@/components/admin/settings/commission-dashboard";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function CommissionsPage() {
  const { hasRole, isLoading } = useAuth();
  const router = useRouter();
  const isSuperAdmin = hasRole(["super_admin"]);

  useEffect(() => {
    if (!isLoading && !isSuperAdmin) {
      router.replace("/admin/settings");
    }
  }, [isLoading, isSuperAdmin, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!isSuperAdmin) {
    return null;
  }

  return <CommissionDashboard />;
}
