"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import type { SessionUser, UserRole } from "@/types";
import { getCurrentUser, login as authLogin, signOut } from "@/lib/auth";

interface AuthContextType {
  user: SessionUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  hasRole: (roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // Fetch current user from session
  const fetchUser = useCallback(async () => {
    try {
      const sessionUser = await getCurrentUser();
      setUser(sessionUser);
    } catch (error) {
      console.error("Error fetching user:", error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // Login function
  const login = useCallback(
    async (email: string, password: string) => {
      setIsLoading(true);
      try {
        const sessionUser = await authLogin(email, password);
        setUser(sessionUser);
        router.push("/admin");
      } catch (error) {
        setIsLoading(false);
        throw error;
      }
      setIsLoading(false);
    },
    [router]
  );

  // Logout function
  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await signOut();
      setUser(null);
      router.push("/login");
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  // Refresh user data
  const refreshUser = useCallback(async () => {
    await fetchUser();
  }, [fetchUser]);

  // Check if user has one of the required roles
  const hasRole = useCallback(
    (roles: UserRole[]) => {
      if (!user) return false;
      return roles.includes(user.role);
    },
    [user]
  );

  // Redirect logic for protected routes
  useEffect(() => {
    if (isLoading) return;

    const isAdminRoute = pathname?.startsWith("/admin");
    const isLoginPage = pathname === "/login";

    // If on admin route and not authenticated, redirect to login
    if (isAdminRoute && !user) {
      router.push("/login");
      return;
    }

    // If on login page and authenticated, redirect to admin
    if (isLoginPage && user) {
      router.push("/admin");
      return;
    }
  }, [user, isLoading, pathname, router]);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    refreshUser,
    hasRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Custom hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// HOC for protecting components that require specific roles
export function withRoleProtection<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  allowedRoles: UserRole[]
) {
  return function ProtectedComponent(props: P) {
    const { user, isLoading, hasRole } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (!isLoading && !hasRole(allowedRoles)) {
        router.push("/admin");
      }
    }, [isLoading, hasRole, router]);

    if (isLoading) {
      return (
        <div className="flex h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
        </div>
      );
    }

    if (!user || !hasRole(allowedRoles)) {
      return null;
    }

    return <WrappedComponent {...props} />;
  };
}
