/**
 * Questions context — provides question state across admin pages.
 * Loads from backend SQLite API with seamless fallback to MOCK_QUESTIONS.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { MOCK_QUESTIONS } from "@/data/mockData";
import { toast } from "@/hooks/useToast";
import {
  apiCreateQuestion,
  apiDeleteQuestion,
  apiGetQuestions,
  apiUpdateQuestion,
} from "@/services/api";
import type { Question } from "@/types";

interface QuestionsContextValue {
  questions: Question[];
  isLoading: boolean;
  reloadQuestions: () => Promise<void>;
  addQuestion: (q: Omit<Question, "id" | "createdAt" | "updatedAt">) => Question;
  updateQuestion: (id: string, updates: Partial<Omit<Question, "id" | "createdAt">>) => void;
  deleteQuestion: (id: string) => void;
  duplicateQuestion: (id: string) => Question | null;
  reorderQuestion: (id: string, direction: "up" | "down") => void;
}

const QuestionsContext = createContext<QuestionsContextValue | null>(null);

function generateId(existing: Question[]): string {
  const nums = existing
    .map((q) => parseInt(q.id.replace(/\D/g, ""), 10))
    .filter((n) => !isNaN(n));
  const max = nums.length ? Math.max(...nums) : 0;
  return `Q${String(max + 1).padStart(3, "0")}`;
}

function nextOrder(questions: Question[], gameType: Question["gameType"]): number {
  const orders = questions
    .filter((q) => q.gameType === gameType)
    .map((q) => q.order);
  return orders.length ? Math.max(...orders) + 1 : 1;
}

export function QuestionsProvider({ children }: { children: ReactNode }) {
  const [questions, setQuestions] = useState<Question[]>(MOCK_QUESTIONS);
  const [isLoading, setIsLoading] = useState(false);

  const reloadQuestions = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await apiGetQuestions();
      if (data && data.length > 0) {
        setQuestions(data);
      }
    } catch {
      // Backend not running or unauthenticated; fallback quietly to current state
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void reloadQuestions();
  }, [reloadQuestions]);

  const addQuestion = useCallback(
    (data: Omit<Question, "id" | "createdAt" | "updatedAt">): Question => {
      const now = new Date().toISOString().split("T")[0];
      const newQ: Question = {
        ...data,
        id: generateId(questions),
        createdAt: now,
        updatedAt: now,
      };
      setQuestions((prev) => [...prev, newQ]);

      // Fire async backend persist
      apiCreateQuestion(newQ).catch(() => {
        // Log or silent fallback
      });

      return newQ;
    },
    [questions],
  );

  const updateQuestion = useCallback(
    (id: string, updates: Partial<Omit<Question, "id" | "createdAt">>) => {
      const now = new Date().toISOString().split("T")[0];
      setQuestions((prev) =>
        prev.map((q) =>
          q.id === id ? { ...q, ...updates, updatedAt: now } : q,
        ),
      );

      apiUpdateQuestion(id, updates).catch(() => {
        // Fallback gracefully
      });
    },
    [],
  );

  const deleteQuestion = useCallback((id: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
    apiDeleteQuestion(id).catch(() => {
      // Fallback gracefully
    });
  }, []);

  const duplicateQuestion = useCallback(
    (id: string): Question | null => {
      const source = questions.find((q) => q.id === id);
      if (!source) return null;
      const now = new Date().toISOString().split("T")[0];
      const newQ: Question = {
        ...source,
        id: generateId(questions),
        title: `${source.title} (copy)`,
        status: "draft",
        order: nextOrder(questions, source.gameType),
        createdAt: now,
        updatedAt: now,
        images: source.images ? source.images.map((img) => ({ ...img })) : [],
      };
      setQuestions((prev) => [...prev, newQ]);
      apiCreateQuestion(newQ).catch(() => {});
      toast.success(`Question duplicated as "${newQ.title}"`);
      return newQ;
    },
    [questions],
  );

  const reorderQuestion = useCallback(
    (id: string, direction: "up" | "down") => {
      const q = questions.find((q) => q.id === id);
      if (!q) return;

      const peers = questions
        .filter((x) => x.gameType === q.gameType)
        .sort((a, b) => a.order - b.order);

      const idx = peers.findIndex((x) => x.id === id);
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= peers.length) return;

      const swapWith = peers[swapIdx];
      const tempOrder = q.order;

      setQuestions((prev) =>
        prev.map((x) => {
          if (x.id === id) return { ...x, order: swapWith.order };
          if (x.id === swapWith.id) return { ...x, order: tempOrder };
          return x;
        }),
      );

      apiUpdateQuestion(id, { order: swapWith.order }).catch(() => {});
      apiUpdateQuestion(swapWith.id, { order: tempOrder }).catch(() => {});
    },
    [questions],
  );

  return (
    <QuestionsContext.Provider
      value={{
        questions,
        isLoading,
        reloadQuestions,
        addQuestion,
        updateQuestion,
        deleteQuestion,
        duplicateQuestion,
        reorderQuestion,
      }}
    >
      {children}
    </QuestionsContext.Provider>
  );
}

export function useQuestions(): QuestionsContextValue {
  const ctx = useContext(QuestionsContext);
  if (!ctx) throw new Error("useQuestions must be used inside <QuestionsProvider>");
  return ctx;
}
