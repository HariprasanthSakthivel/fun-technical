/**
 * ParticipantContext — manages the local participant session state
 * during gameplay, including joined session, authenticated team identity,
 * buzzer status, unlocked question index, and submitted answers.
 *
 * NOTE: Frontend state is temporary demonstration session state;
 * real access control & buzzer concurrency will be enforced by WebSockets/Backend in a later step.
 */
import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

import type { GameSession, Team } from "@/types";

export type BuzzerState =
  | "waiting_for_question"
  | "ready_to_buzz"
  | "buzzer_pressed"
  | "position_secured"
  | "not_eligible"
  | "answering"
  | "answer_submitted"
  | "question_closed";

export interface ParticipantSessionData {
  session: GameSession;
  team: Team;
  joinedAt: string;
}

interface ParticipantContextValue {
  currentParticipant: ParticipantSessionData | null;
  pendingJoin: { session: GameSession; team: Team } | null;
  buzzerState: BuzzerState;
  unlockedQuestionIndex: number;
  submittedAnswer: string;
  isEligibleToAnswer: boolean;
  setPendingJoin: (data: { session: GameSession; team: Team } | null) => void;
  confirmJoin: () => void;
  leaveSession: () => void;
  pressBuzzer: () => void;
  submitAnswer: (answer: string) => void;
  setUnlockedQuestionIndex: (idx: number) => void;
  setIsEligibleToAnswer: (eligible: boolean) => void;
  setBuzzerState: (state: BuzzerState) => void;
}

const ParticipantContext = createContext<ParticipantContextValue | null>(null);

const STORAGE_KEY_PARTICIPANT = "fta_participant_session";
const STORAGE_KEY_PENDING = "fta_pending_join";

export function ParticipantProvider({ children }: { children: ReactNode }) {
  const [currentParticipant, setCurrentParticipant] = useState<ParticipantSessionData | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PARTICIPANT);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [pendingJoin, setPendingJoinState] = useState<{ session: GameSession; team: Team } | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PENDING);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [buzzerState, setBuzzerState] = useState<BuzzerState>("ready_to_buzz");
  const [unlockedQuestionIndex, setUnlockedQuestionIndex] = useState<number>(0);
  const [submittedAnswer, setSubmittedAnswer] = useState<string>("");
  const [isEligibleToAnswer, setIsEligibleToAnswer] = useState<boolean>(false);

  const setPendingJoin = useCallback((data: { session: GameSession; team: Team } | null) => {
    setPendingJoinState(data);
    if (data) {
      localStorage.setItem(STORAGE_KEY_PENDING, JSON.stringify(data));
    } else {
      localStorage.removeItem(STORAGE_KEY_PENDING);
    }
  }, []);

  const confirmJoin = useCallback(() => {
    if (!pendingJoin) return;
    const participantData: ParticipantSessionData = {
      session: pendingJoin.session,
      team: pendingJoin.team,
      joinedAt: new Date().toISOString(),
    };
    setCurrentParticipant(participantData);
    localStorage.setItem(STORAGE_KEY_PARTICIPANT, JSON.stringify(participantData));
    localStorage.removeItem(STORAGE_KEY_PENDING);
    setPendingJoinState(null);
    setBuzzerState("ready_to_buzz");
    setSubmittedAnswer("");
    setIsEligibleToAnswer(false);
  }, [pendingJoin]);

  const leaveSession = useCallback(() => {
    setCurrentParticipant(null);
    setPendingJoinState(null);
    localStorage.removeItem(STORAGE_KEY_PARTICIPANT);
    localStorage.removeItem(STORAGE_KEY_PENDING);
    setBuzzerState("waiting_for_question");
    setSubmittedAnswer("");
    setIsEligibleToAnswer(false);
  }, []);

  const pressBuzzer = useCallback(() => {
    // Demonstration frontend simulation of pressing the buzzer
    setBuzzerState("buzzer_pressed");
  }, []);

  const submitAnswer = useCallback((ans: string) => {
    setSubmittedAnswer(ans);
    setBuzzerState("answer_submitted");
    setIsEligibleToAnswer(false);
  }, []);

  return (
    <ParticipantContext.Provider
      value={{
        currentParticipant,
        pendingJoin,
        buzzerState,
        unlockedQuestionIndex,
        submittedAnswer,
        isEligibleToAnswer,
        setPendingJoin,
        confirmJoin,
        leaveSession,
        pressBuzzer,
        submitAnswer,
        setUnlockedQuestionIndex,
        setIsEligibleToAnswer,
        setBuzzerState,
      }}
    >
      {children}
    </ParticipantContext.Provider>
  );
}

export function useParticipant(): ParticipantContextValue {
  const ctx = useContext(ParticipantContext);
  if (!ctx) throw new Error("useParticipant must be used inside <ParticipantProvider>");
  return ctx;
}
