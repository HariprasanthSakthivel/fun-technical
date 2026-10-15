/**
 * SessionsContext — provides shared game session state across
 * Live Sessions, Create Session Wizard, and Session Details.
 * Loads from backend SQLite API with seamless fallback to MOCK_SESSIONS.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { MOCK_SESSIONS } from "@/data/mockData";
import { toast } from "@/hooks/useToast";
import {
  apiCancelSession,
  apiCreateSession,
  apiGetSessions,
  apiSetSessionReady,
  apiStartSession,
  apiUpdateSession,
} from "@/services/api";
import type { GameSession, SessionStatus } from "@/types";

interface SessionsContextValue {
  sessions: GameSession[];
  isLoading: boolean;
  reloadSessions: () => Promise<void>;
  createSession: (session: Omit<GameSession, "id" | "code" | "createdAt" | "updatedAt"> & { code?: string }) => GameSession;
  updateSession: (id: string, updates: Partial<Omit<GameSession, "id" | "createdAt">>) => void;
  deleteSession: (id: string) => void;
  setSessionStatus: (id: string, status: SessionStatus) => void;
  generateUniqueSessionCode: (gameType: GameSession["gameType"]) => string;
}

const SessionsContext = createContext<SessionsContextValue | null>(null);

function generateId(existing: GameSession[]): string {
  const nums = existing
    .map((s) => parseInt(s.id.replace(/\D/g, ""), 10))
    .filter((n) => !isNaN(n));
  const max = nums.length ? Math.max(...nums) : 0;
  return `S${String(max + 1).padStart(2, "0")}`;
}

export function SessionsProvider({ children }: { children: ReactNode }) {
  const [sessions, setSessions] = useState<GameSession[]>(MOCK_SESSIONS);
  const [isLoading, setIsLoading] = useState(false);

  const reloadSessions = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await apiGetSessions();
      if (data && data.length > 0) {
        setSessions(data);
      }
    } catch {
      // Fallback quietly
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void reloadSessions();
  }, [reloadSessions]);

  const generateUniqueSessionCode = useCallback(
    (gameType: GameSession["gameType"]): string => {
      const prefix = gameType === "guess-tech" ? "TECH" : "EXPL";
      for (let i = 0; i < 50; i++) {
        const rand = Math.floor(1000 + Math.random() * 9000);
        const code = `${prefix}-${rand}`;
        if (!sessions.some((s) => s.code === code)) {
          return code;
        }
      }
      return `${prefix}-${Date.now().toString().slice(-4)}`;
    },
    [sessions],
  );

  const createSession = useCallback(
    (
      data: Omit<GameSession, "id" | "code" | "createdAt" | "updatedAt"> & { code?: string },
    ): GameSession => {
      const now = new Date().toISOString().split("T")[0];
      const code = data.code || generateUniqueSessionCode(data.gameType);
      const newSession: GameSession = {
        ...data,
        id: generateId(sessions),
        code,
        createdAt: now,
        updatedAt: now,
      };
      setSessions((prev) => [newSession, ...prev]);

      apiCreateSession(newSession).catch(() => {});
      return newSession;
    },
    [sessions, generateUniqueSessionCode],
  );

  const updateSession = useCallback(
    (id: string, updates: Partial<Omit<GameSession, "id" | "createdAt">>) => {
      const now = new Date().toISOString().split("T")[0];
      setSessions((prev) =>
        prev.map((s) => (s.id === id ? { ...s, ...updates, updatedAt: now } : s)),
      );

      apiUpdateSession(id, updates).catch(() => {});
    },
    [],
  );

  const deleteSession = useCallback((id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    toast.success("Session deleted successfully.");
  }, []);

  const setSessionStatus = useCallback((id: string, status: SessionStatus) => {
    const now = new Date().toISOString().split("T")[0];
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id === id) {
          const updates: Partial<GameSession> = { status, updatedAt: now };
          if (status === "live") {
            updates.startedAt = new Date().toISOString();
          } else if (status === "completed") {
            updates.completedAt = new Date().toISOString();
          }
          return { ...s, ...updates };
        }
        return s;
      }),
    );

    if (status === "ready") {
      apiSetSessionReady(id).catch(() => {});
    } else if (status === "live") {
      apiStartSession(id).catch(() => {});
    } else if (status === "cancelled") {
      apiCancelSession(id).catch(() => {});
    }
  }, []);

  return (
    <SessionsContext.Provider
      value={{
        sessions,
        isLoading,
        reloadSessions,
        createSession,
        updateSession,
        deleteSession,
        setSessionStatus,
        generateUniqueSessionCode,
      }}
    >
      {children}
    </SessionsContext.Provider>
  );
}

export function useSessions(): SessionsContextValue {
  const ctx = useContext(SessionsContext);
  if (!ctx) throw new Error("useSessions must be used inside <SessionsProvider>");
  return ctx;
}
