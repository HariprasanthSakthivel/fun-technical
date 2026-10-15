/** Shared frontend types — Steps 1, 2, and 3. */

export type UserRole = "admin" | "participant";

export interface HealthResponse {
  status: string;
  service: string;
  environment: string;
  success: boolean;
}

export interface PlaceholderStat {
  id: string;
  label: string;
  value: string | number;
  hint: string;
}

export interface GameSummary {
  id: string;
  name: string;
  description: string;
}

// ── Core enum types ────────────────────────────────────────────────────────────

export type GameType = "guess-tech" | "explain-without-naming";
export type Difficulty = "easy" | "medium" | "hard";
/** ready = published and usable in a session; draft = work-in-progress; archived = retired */
export type QuestionStatus = "ready" | "draft" | "archived";
export type ContentType = "text" | "image" | "multiple-images" | "text-images";
export type SessionStatus = "draft" | "ready" | "live" | "completed" | "cancelled" | "upcoming" | "active";
export type TeamStatus = "active" | "inactive" | "registered" | "pending";

export interface TeamMember {
  id: string;
  name: string;
  role?: string;
}

export interface Team {
  id: string;
  name: string;
  code: string;
  leaderName?: string;
  members: number;
  memberNames?: string[];
  status: TeamStatus;
  description?: string;
  sessionsParticipated?: number;
  totalPoints?: number;
  correctAnswers?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface GameRules {
  maxEligibleTeams: number; // default 3
  answerSubmission: "eligible_only"; // default eligible only
  correctAnswerReveal: "manual"; // default manual
  questionProgression: "manual"; // default manual
  scoreboardVisibility: "hidden" | "visible"; // default hidden
  questionTimerSeconds?: number; // optional, e.g. 30, 60, or undefined
  enableBuzzer: boolean; // default true
}

export interface SessionQuestion {
  questionId: string;
  order: number;
}

// ── Enriched question types (Step 3) ──────────────────────────────────────────

/** A local image stored as a base64 data-URL (browser-session only; no server upload yet). */
export interface QuestionImage {
  id: string;
  name: string;
  dataUrl: string;
  size: number;
  mimeType: string;
  caption?: string;
}

export interface Question {
  id: string;
  gameType: GameType;
  title: string;
  instructions?: string;
  contentType: ContentType;

  // ── Guess the Technology ──────────────────────────────────────────────────
  textContent?: string;
  images?: QuestionImage[];
  technologyCategory?: string;

  // ── Explain Without Naming ────────────────────────────────────────────────
  secretTopic?: string;
  topicDescription?: string;         // admin-only notes about the topic
  prohibitedWords?: string[];
  adminInstructions?: string;
  estimatedTime?: number;            // seconds (explanation / answer time)

  // ── Answer fields (admin-only; never sent to participant preview) ──────────
  correctAnswer: string;
  acceptedAnswers?: string[];        // comma-separated alternatives
  explanation?: string;

  // ── Metadata ──────────────────────────────────────────────────────────────
  difficulty: Difficulty;
  order: number;
  status: QuestionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Game {
  id: string;
  name: string;
  type: GameType;
  description: string;
  questionCount: number;
  status: "active" | "inactive";
}

export interface SessionTeam {
  teamId: string;
  joinedAt?: string;
}

export interface GameSession {
  id: string;
  code: string; // readable unique code e.g. TECH-7824
  name: string;
  description?: string;
  gameType: GameType;
  status: SessionStatus;
  questionIds: string[]; // ordered question IDs
  teamIds: string[]; // selected active team IDs
  rules: GameRules;
  scheduledDate?: string; // YYYY-MM-DD
  scheduledTime?: string; // HH:mm
  totalQuestions: number;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
}

/** Legacy compatibility alias if needed */
export type Session = GameSession;

export interface ScoreEntry {
  rank: number;
  teamId: string;
  teamName: string;
  totalPoints: number;
  correctAnswers: number;
  incorrectAnswers: number;
  questionsAttempted: number;
}

export interface ActivityItem {
  id: string;
  type: "question_added" | "team_registered" | "session_created" | "game_updated";
  message: string;
  timestamp: string;
}

export interface Settings {
  maxEligibleTeams: number;
  requireManualApproval: boolean;
  scoreboardVisibleToParticipants: boolean;
}
