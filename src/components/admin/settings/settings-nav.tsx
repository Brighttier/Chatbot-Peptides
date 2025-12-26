"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, Plug, Palette, Code, MessageSquareText, DollarSign } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  superAdminOnly?: boolean;
  adminOnly?: boolean; // admin and super_admin only (not rep)
}

const navItems: NavItem[] = [
  {
    href: "/admin/settings/commissions",
    label: "Commissions",
    icon: <DollarSign className="h-4 w-4" />,
    superAdminOnly: true,
  },
  {
    href: "/admin/settings/users",
    label: "Users",
    icon: <Users className="h-4 w-4" />,
    superAdminOnly: true,
  },
  {
    href: "/admin/settings/integrations",
    label: "Integrations",
    icon: <Plug className="h-4 w-4" />,
    superAdminOnly: true,
  },
  {
    href: "/admin/settings/widget",
    label: "Widget",
    icon: <Palette className="h-4 w-4" />,
    adminOnly: true,
  },
  {
    href: "/admin/settings/embed",
    label: "Embed",
    icon: <Code className="h-4 w-4" />,
    adminOnly: true,
  },
  {
    href: "/admin/settings/canned-responses",
    label: "Canned Responses",
    icon: <MessageSquareText className="h-4 w-4" />,
  },
];

export function SettingsNav() {
  const pathname = usePathname();
  const { hasRole } = useAuth();
  const isSuperAdmin = hasRole(["super_admin"]);
  const isAdminOrAbove = hasRole(["super_admin", "admin"]);

  // Filter nav items based on role
  const visibleItems = navItems.filter((item) => {
    if (item.superAdminOnly && !isSuperAdmin) return false;
    if (item.adminOnly && !isAdminOrAbove) return false;
    return true;
  });

  return (
    <nav className="flex gap-1 overflow-x-auto pb-1">
      {visibleItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
              isActive
                ? "bg-blue-100 text-blue-700"
                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            }`}
          >
            {item.icon}
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
