import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  fetchProfile,
  getAuthToken,
  getSavedUserProfile,
  logoutUser,
  removeAuthToken,
} from "@/services/api";
import type { UserProfile } from "@/types";

interface AuthContextValue {
  currentUser: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  isAdmin: boolean;
  isParticipant: boolean;
  refreshProfile: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(getSavedUserProfile);
  const [token, setToken] = useState<string | null>(getAuthToken);
  const [isLoading, setIsLoading] = useState(false);

  const refreshProfile = useCallback(async () => {
    const t = getAuthToken();
    if (!t) {
      setCurrentUser(null);
      setToken(null);
      return;
    }
    try {
      setIsLoading(true);
      const profile = await fetchProfile();
      setCurrentUser(profile);
      setToken(t);
    } catch {
      // If token is invalid or expired
      setCurrentUser(null);
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (getAuthToken()) {
      refreshProfile();
    }

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "ffa_auth_token" || e.key === "ffa_user_profile") {
        refreshProfile();
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [refreshProfile]);

  const logout = useCallback(async () => {
    try {
      await logoutUser();
    } catch {
      // Ignore
    } finally {
      removeAuthToken();
      setCurrentUser(null);
      setToken(null);
    }
  }, []);

  const isAdmin = currentUser?.role === "admin";
  const isParticipant = currentUser?.role === "participant";

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        token,
        isLoading,
        isAdmin,
        isParticipant,
        refreshProfile,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
