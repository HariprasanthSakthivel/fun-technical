/**
 * TeamsContext — provides shared team state across admin dashboard,
 * team list, session configuration, and participant joining.
 * Communicates with the SQLite backend with fallback to MOCK_TEAMS.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { MOCK_TEAMS } from "@/data/mockData";
import { toast } from "@/hooks/useToast";
import {
  apiCreateTeam,
  apiDeleteTeam,
  apiGetTeams,
  apiUpdateTeam,
} from "@/services/api";
import type { Team } from "@/types";

interface TeamsContextValue {
  teams: Team[];
  isLoading: boolean;
  reloadTeams: () => Promise<void>;
  registerTeam: (data: Omit<Team, "id" | "createdAt" | "updatedAt">) => Team;
  updateTeam: (id: string, updates: Partial<Omit<Team, "id" | "createdAt">>) => void;
  deleteTeam: (id: string) => boolean;
  toggleTeamStatus: (id: string) => void;
  generateUniqueCode: (name: string) => string;
}

const TeamsContext = createContext<TeamsContextValue | null>(null);

function generateId(existing: Team[]): string {
  const nums = existing
    .map((t) => parseInt(t.id.replace(/\D/g, ""), 10))
    .filter((n) => !isNaN(n));
  const max = nums.length ? Math.max(...nums) : 0;
  return `T${String(max + 1).padStart(2, "0")}`;
}

export function TeamsProvider({ children }: { children: ReactNode }) {
  const [teams, setTeams] = useState<Team[]>(MOCK_TEAMS);
  const [isLoading, setIsLoading] = useState(false);

  const reloadTeams = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await apiGetTeams();
      if (data && data.length > 0) {
        setTeams(data);
      }
    } catch {
      // Fallback quietly
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void reloadTeams();
  }, [reloadTeams]);

  const generateUniqueCode = useCallback(
    (name: string): string => {
      const clean = name.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
      let base = clean.slice(0, 5) || "TEAM";
      if (base.length < 3) base = base.padEnd(3, "X");

      // Check if base is already unique
      if (!teams.some((t) => t.code === base)) {
        return base;
      }

      // Generate random suffix
      for (let i = 0; i < 50; i++) {
        const rand = Math.floor(10 + Math.random() * 89); // 2 digits
        const candidate = `${base.slice(0, 4)}${rand}`;
        if (!teams.some((t) => t.code === candidate)) {
          return candidate;
        }
      }

      return `TM${Math.floor(1000 + Math.random() * 8999)}`;
    },
    [teams],
  );

  const registerTeam = useCallback(
    (data: Omit<Team, "id" | "createdAt" | "updatedAt">): Team => {
      const now = new Date().toISOString().split("T")[0];
      const newTeam: Team = {
        ...data,
        id: generateId(teams),
        createdAt: now,
        updatedAt: now,
        sessionsParticipated: 0,
        totalPoints: 0,
        correctAnswers: 0,
      };
      setTeams((prev) => [newTeam, ...prev]);

      apiCreateTeam(newTeam)
        .then(() => {
          toast.success(`Team "${newTeam.name}" (${newTeam.code}) registered successfully.`);
        })
        .catch((err) => {
          toast.warning(`Registered locally: ${err.message}`);
        });

      return newTeam;
    },
    [teams],
  );

  const updateTeam = useCallback(
    (id: string, updates: Partial<Omit<Team, "id" | "createdAt">>) => {
      const now = new Date().toISOString().split("T")[0];
      setTeams((prev) =>
        prev.map((t) => (t.id === id ? { ...t, ...updates, updatedAt: now } : t)),
      );

      apiUpdateTeam(id, updates)
        .then(() => {
          toast.success("Team details updated successfully.");
        })
        .catch(() => {
          toast.success("Team details updated locally.");
        });
    },
    [],
  );

  const deleteTeam = useCallback((id: string): boolean => {
    setTeams((prev) => prev.filter((t) => t.id !== id));
    apiDeleteTeam(id)
      .then(() => {
        toast.success("Team removed.");
      })
      .catch(() => {
        toast.success("Team removed locally.");
      });
    return true;
  }, []);

  const toggleTeamStatus = useCallback(
    (id: string) => {
      setTeams((prev) =>
        prev.map((t) => {
          if (t.id === id) {
            const nextStatus = t.status === "active" ? "inactive" : "active";
            apiUpdateTeam(id, { status: nextStatus }).catch(() => {});
            toast.info(`Team "${t.name}" marked as ${nextStatus}.`);
            return { ...t, status: nextStatus };
          }
          return t;
        }),
      );
    },
    [],
  );

  return (
    <TeamsContext.Provider
      value={{
        teams,
        isLoading,
        reloadTeams,
        registerTeam,
        updateTeam,
        deleteTeam,
        toggleTeamStatus,
        generateUniqueCode,
      }}
    >
      {children}
    </TeamsContext.Provider>
  );
}

export function useTeams(): TeamsContextValue {
  const ctx = useContext(TeamsContext);
  if (!ctx) throw new Error("useTeams must be used inside <TeamsProvider>");
  return ctx;
}
