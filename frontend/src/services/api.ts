/**
 * Centralized API client for Fun Friday Activities Platform (aXtrLabs).
 * Communicates with the FastAPI SQLite backend.
 */
import type {
  BuzzerQueue,
  CreateLightningTopicPayload,
  CreateQuestionPayload,
  FinalLeaderboardItem,
  LightningLeaderboardItem,
  LightningTopicAdmin,
  LightningTopicParticipant,
  ManualTopicAssignPayload,
  EvaluateLightningGuessPayload,
  QuestionWiseScoreResponse,
  RegisterPayload,
  Team,
  TechDetectiveLeaderboardItem,
  TechDetectiveQuestionAdmin,
  TechDetectiveQuestionParticipant,
  UserProfile,
  GameTimer,
  GameTimerControlPayload,
  GameItem,
  CreateGamePayload,
  UpdateGamePayload,
  TeamGameScore,
  AwardGameScorePayload,
  GameQuestion,
  CreateGameQuestionPayload,
  EvaluateCustomGameAnswerPayload,
} from "@/types";
const getBaseUrl = (): string => {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL.trim();
  }
  if (typeof window !== "undefined" && window.location.hostname) {
    return `http://${window.location.hostname}:8000`;
  }
  return "http://localhost:8000";
};
const API_BASE_URL: string = getBaseUrl().replace(/\/+$/, "");
const TOKEN_KEY = "ffa_auth_token";
const USER_KEY = "ffa_user_profile";

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeAuthToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getSavedUserProfile(): UserProfile | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setSavedUserProfile(profile: UserProfile): void {
  localStorage.setItem(USER_KEY, JSON.stringify(profile));
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers(options.headers ?? {});

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const url = `${API_BASE_URL}${cleanEndpoint}`;
  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 204) {
    return {} as T;
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMsg = data?.error?.message || data?.detail || `API request failed with status ${response.status}`;
    throw new Error(errorMsg);
  }

  return data as T;
}

// ── Auth APIs ─────────────────────────────────────────────────────────────────

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user_id: number;
  username: string;
  display_name: string;
  role: "admin" | "participant";
  team_id?: string | null;
  team_name?: string | null;
}

export async function loginUser(username: string, password: string): Promise<LoginResponse> {
  const res = await request<LoginResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  setAuthToken(res.access_token);
  setSavedUserProfile({
    id: res.user_id,
    username: res.username,
    display_name: res.display_name,
    role: res.role,
    is_active: true,
    is_logged_in: true,
    team_id: res.team_id,
    team_name: res.team_name,
  });
  return res;
}

export async function registerUser(payload: RegisterPayload): Promise<LoginResponse> {
  const res = await request<LoginResponse>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  setAuthToken(res.access_token);
  setSavedUserProfile({
    id: res.user_id,
    username: res.username,
    display_name: res.display_name,
    role: res.role,
    is_active: true,
    is_logged_in: true,
    team_id: res.team_id,
    team_name: res.team_name,
  });
  return res;
}

export async function logoutUser(): Promise<void> {
  try {
    await request("/api/auth/logout", { method: "POST" });
  } catch {
    // Silent catch
  } finally {
    removeAuthToken();
  }
}

export async function fetchProfile(): Promise<UserProfile> {
  const profile = await request<UserProfile>("/api/auth/me");
  setSavedUserProfile(profile);
  return profile;
}

export async function fetchLoggedInUsers(): Promise<UserProfile[]> {
  return request<UserProfile[]>("/api/auth/logged-in-users?all_users=true");
}

export async function fetchAllParticipants(): Promise<UserProfile[]> {
  return request<UserProfile[]>("/api/auth/all-participants");
}

export async function resetDatabase(target: "users" | "questions" | "all" = "all"): Promise<{ message: string; target?: string }> {
  return request<{ message: string; target?: string }>("/api/auth/reset-database", {
    method: "POST",
    body: JSON.stringify({ target }),
  });
}

export async function resetUsers(): Promise<{ message: string; target?: string }> {
  return request<{ message: string; target?: string }>("/api/auth/reset-users", {
    method: "POST",
  });
}

export async function resetQuestions(): Promise<{ message: string; target?: string }> {
  return request<{ message: string; target?: string }>("/api/auth/reset-questions", {
    method: "POST",
  });
}

// ── Teams APIs ────────────────────────────────────────────────────────────────

export async function fetchTeams(): Promise<Team[]> {
  return request<Team[]>("/api/teams");
}

export async function fetchMyTeam(): Promise<Team> {
  return request<Team>("/api/teams/my-team");
}

export async function randomizeTeams(teamSize: number = 2, includeAll: boolean = true): Promise<Team[]> {
  return request<Team[]>("/api/teams/randomize", {
    method: "POST",
    body: JSON.stringify({ team_size: teamSize, include_all: includeAll }),
  });
}

export async function updateTeamName(teamId: string, teamName: string): Promise<Team> {
  return request<Team>(`/api/teams/${teamId}/name`, {
    method: "PUT",
    body: JSON.stringify({ team_name: teamName }),
  });
}

// ── Game 1: Tech Detective APIs ───────────────────────────────────────────────

export async function fetchTechDetectiveQuestionsAdmin(): Promise<TechDetectiveQuestionAdmin[]> {
  return request<TechDetectiveQuestionAdmin[]>("/api/tech-detective/questions/admin");
}

export async function createTechDetectiveQuestion(
  payload: CreateQuestionPayload
): Promise<TechDetectiveQuestionAdmin> {
  return request<TechDetectiveQuestionAdmin>("/api/tech-detective/questions", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function deleteTechDetectiveQuestion(questionId: string): Promise<{ message: string }> {
  return request(`/api/tech-detective/questions/${questionId}`, {
    method: "DELETE",
  });
}

export async function fetchTechDetectiveActiveQuestion(): Promise<TechDetectiveQuestionParticipant | null> {
  return request<TechDetectiveQuestionParticipant | null>("/api/tech-detective/active-question");
}

export async function fetchTechDetectiveScoreBreakdown(): Promise<QuestionWiseScoreResponse> {
  return request<QuestionWiseScoreResponse>("/api/tech-detective/score-breakdown");
}

export async function unlockTechDetectiveQuestion(
  questionId: string
): Promise<{ message: string; question_id: string; question_number: number }> {
  return request(`/api/tech-detective/unlock/${questionId}`, {
    method: "POST",
  });
}

export async function pressBuzzer(): Promise<{ message: string; position: number; team_id: string }> {
  return request("/api/tech-detective/buzz", {
    method: "POST",
  });
}

export async function fetchBuzzerQueue(questionId: string): Promise<BuzzerQueue> {
  return request<BuzzerQueue>(`/api/tech-detective/buzzer-queue/${questionId}`);
}

export async function evaluateTechDetectiveAnswer(payload: {
  team_id: string;
  buzzer_position: number;
  is_correct: boolean;
  answer_text?: string;
}): Promise<{
  success: boolean;
  team_id: string;
  team_name: string;
  buzzer_position: number;
  is_correct: boolean;
  points_awarded: number;
  new_score: number;
  next_team_id?: string | null;
  next_position?: number | null;
  is_question_completed: boolean;
}> {
  return request("/api/tech-detective/evaluate", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchTechDetectiveLeaderboard(): Promise<TechDetectiveLeaderboardItem[]> {
  return request<TechDetectiveLeaderboardItem[]>("/api/tech-detective/leaderboard");
}

export async function editTechDetectiveScore(teamId: string, score: number): Promise<TechDetectiveLeaderboardItem> {
  return request<TechDetectiveLeaderboardItem>(`/api/tech-detective/leaderboard/${teamId}`, {
    method: "PUT",
    body: JSON.stringify({ score }),
  });
}

export async function transitionToGame2(): Promise<{ message: string }> {
  return request("/api/tech-detective/transition-to-game2", {
    method: "POST",
  });
}

// ── Game 2: Lightning Talks APIs ──────────────────────────────────────────────

export async function fetchLightningTopicsAdmin(): Promise<LightningTopicAdmin[]> {
  return request<LightningTopicAdmin[]>("/api/lightning-talks/topics/admin");
}

export async function fetchMyActiveLightningTopic(): Promise<LightningTopicParticipant | null> {
  return request<LightningTopicParticipant | null>("/api/lightning-talks/active-topic");
}

export async function createLightningTopic(
  payload: CreateLightningTopicPayload
): Promise<LightningTopicAdmin> {
  return request<LightningTopicAdmin>("/api/lightning-talks/topics", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function deleteLightningTopic(topicId: string): Promise<{ message: string }> {
  return request(`/api/lightning-talks/topics/${topicId}`, {
    method: "DELETE",
  });
}

export async function manualAssignLightningTopic(
  payload: ManualTopicAssignPayload
): Promise<LightningTopicAdmin> {
  return request<LightningTopicAdmin>("/api/lightning-talks/manual-assign", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function unlockLightningTopic(topicId: string): Promise<{
  message: string;
  topic_id: string;
  topic_name: string;
  assigned_user_id: number;
  duration_seconds: number;
}> {
  return request(`/api/lightning-talks/unlock/${topicId}`, {
    method: "POST",
  });
}

export async function evaluateLightningSpeech(payload: {
  user_id: number;
  team_id: string;
  topic_id: string;
  time_management_score: number;
  words_used_score: number;
  understandability_score: number;
  admin_notes?: string;
}): Promise<{
  success: boolean;
  team_id: string;
  team_name: string;
  total_speech_score: number;
  new_lightning_score: number;
  new_total_score: number;
}> {
  return request("/api/lightning-talks/evaluate", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchLightningLeaderboard(): Promise<LightningLeaderboardItem[]> {
  return request<LightningLeaderboardItem[]>("/api/lightning-talks/scores");
}

export async function editLightningScore(teamId: string, score: number): Promise<LightningLeaderboardItem> {
  return request<LightningLeaderboardItem>(`/api/lightning-talks/scores/${teamId}`, {
    method: "PUT",
    body: JSON.stringify({ score }),
  });
}

export async function openLightningBuzzer(topicId: string): Promise<{ message: string; topic_id: string; is_buzzer_open: boolean }> {
  return request(`/api/lightning-talks/open-buzzer/${topicId}`, {
    method: "POST",
  });
}

export async function lockLightningBuzzer(topicId: string): Promise<{ message: string; topic_id: string; is_buzzer_open: boolean }> {
  return request(`/api/lightning-talks/lock-buzzer/${topicId}`, {
    method: "POST",
  });
}

export async function pressLightningBuzzer(): Promise<{ message: string; position: number; team_id: string }> {
  return request("/api/lightning-talks/buzz", {
    method: "POST",
  });
}

export async function fetchLightningBuzzerQueue(topicId: string): Promise<BuzzerQueue> {
  return request<BuzzerQueue>(`/api/lightning-talks/buzzer-queue/${topicId}`);
}

export async function evaluateLightningGuess(payload: EvaluateLightningGuessPayload): Promise<{
  success: boolean;
  team_id: string;
  team_name: string;
  buzzer_position: number;
  is_correct: boolean;
  points_awarded: number;
  new_score: number;
  next_team_id?: string | null;
  next_position?: number | null;
  is_completed: boolean;
  message: string;
}> {
  return request("/api/lightning-talks/evaluate-guess", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function resetLightningBuzzer(topicId: string): Promise<{ message: string }> {
  return request(`/api/lightning-talks/reset-buzzer/${topicId}`, {
    method: "POST",
  });
}

// ── Final Combined Leaderboard APIs ───────────────────────────────────────────

export async function fetchFinalLeaderboard(): Promise<FinalLeaderboardItem[]> {
  return request<FinalLeaderboardItem[]>("/api/leaderboard/final");
}

export async function editFinalScore(
  teamId: string,
  scores: { tech_detective_score?: number; lightning_talks_score?: number }
): Promise<FinalLeaderboardItem> {
  return request<FinalLeaderboardItem>(`/api/leaderboard/edit/${teamId}`, {
    method: "PUT",
    body: JSON.stringify(scores),
  });
}

// ── Dynamic Synchronized Game Timer APIs ──────────────────────────────────────

export async function fetchGameTimer(): Promise<GameTimer> {
  return request<GameTimer>("/api/timer");
}

export async function controlGameTimer(payload: GameTimerControlPayload): Promise<GameTimer> {
  return request<GameTimer>("/api/timer/control", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ── Dynamic Games Catalog & Custom Activities APIs ──────────────────────────

export async function fetchGames(): Promise<GameItem[]> {
  return request<GameItem[]>("/api/games");
}

export async function createGame(payload: CreateGamePayload): Promise<GameItem> {
  return request<GameItem>("/api/games", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateGame(gameId: string, payload: UpdateGamePayload): Promise<GameItem> {
  return request<GameItem>(`/api/games/${gameId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteGame(gameId: string): Promise<{ message: string; game_id: string }> {
  return request(`/api/games/${gameId}`, {
    method: "DELETE",
  });
}

export async function activateGame(gameId: string): Promise<{ message: string; game: GameItem }> {
  return request(`/api/games/${gameId}/activate`, {
    method: "POST",
  });
}

export async function awardGameScore(payload: AwardGameScorePayload): Promise<TeamGameScore> {
  return request<TeamGameScore>("/api/games/scores", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchGameScores(gameCode?: string): Promise<TeamGameScore[]> {
  const query = gameCode ? `?game_code=${encodeURIComponent(gameCode)}` : "";
  return request<TeamGameScore[]>(`/api/games/scores${query}`);
}

export async function fetchGameQuestions(gameIdOrCode: string): Promise<GameQuestion[]> {
  return request<GameQuestion[]>(`/api/games/${encodeURIComponent(gameIdOrCode)}/questions`);
}

export async function createGameQuestion(
  gameIdOrCode: string,
  payload: CreateGameQuestionPayload
): Promise<GameQuestion> {
  return request<GameQuestion>(`/api/games/${encodeURIComponent(gameIdOrCode)}/questions`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function deleteGameQuestion(
  questionId: string
): Promise<{ message: string; question_id: string }> {
  return request(`/api/games/questions/${encodeURIComponent(questionId)}`, {
    method: "DELETE",
  });
}

export async function unlockGameQuestion(questionId: string): Promise<GameQuestion> {
  return request<GameQuestion>(`/api/games/questions/${encodeURIComponent(questionId)}/unlock`, {
    method: "POST",
  });
}

export async function fetchActiveGameQuestion(gameIdOrCode: string): Promise<GameQuestion | null> {
  return request<GameQuestion | null>(`/api/games/${encodeURIComponent(gameIdOrCode)}/active-question`);
}

export async function uploadMediaFile(
  file: File
): Promise<{ url: string; media_type: string; filename: string }> {
  const formData = new FormData();
  formData.append("file", file);
  return request<{ url: string; media_type: string; filename: string }>(
    "/api/games/upload-media",
    {
      method: "POST",
      body: formData,
    }
  );
}

export function getFullMediaUrl(url?: string | null): string {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
    return url;
  }
  const clean = url.startsWith("/") ? url : `/${url}`;
  return `${API_BASE_URL}${clean}`;
}

export async function pressCustomGameBuzzer(
  gameIdOrCode: string
): Promise<{ message: string; position: number; team_id: string }> {
  return request<{ message: string; position: number; team_id: string }>(
    `/api/games/${encodeURIComponent(gameIdOrCode)}/buzz`,
    {
      method: "POST",
    }
  );
}

export async function fetchCustomGameBuzzerQueue(
  gameIdOrCode: string,
  questionId: string
): Promise<BuzzerQueue> {
  return request<BuzzerQueue>(
    `/api/games/${encodeURIComponent(gameIdOrCode)}/buzzer-queue/${encodeURIComponent(questionId)}`
  );
}

export async function evaluateCustomGameAnswer(
  gameIdOrCode: string,
  payload: EvaluateCustomGameAnswerPayload
): Promise<{
  message: string;
  is_correct: boolean;
  points_awarded: number;
  next_answering_team_id?: string | null;
  next_answering_position?: number | null;
  is_completed?: boolean;
}> {
  return request(
    `/api/games/${encodeURIComponent(gameIdOrCode)}/evaluate`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
}

export async function resetCustomGameBuzzer(
  gameIdOrCode: string,
  questionId: string
): Promise<{ message: string; question_id: string }> {
  return request(
    `/api/games/${encodeURIComponent(gameIdOrCode)}/reset-buzzer/${encodeURIComponent(questionId)}`,
    {
      method: "POST",
    }
  );
}



