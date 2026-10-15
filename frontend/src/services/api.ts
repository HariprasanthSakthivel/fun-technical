/**
 * Centralized API client for Fun & Technical Activity Platform.
 * Communicates with the FastAPI SQLite backend.
 */
import type { HealthResponse, Question, Team, GameSession } from "@/types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

// Auth token storage keys
const TOKEN_KEY = "fta_admin_token";
const USER_KEY = "fta_user_profile";
const PARTICIPANT_TOKEN_KEY = "fta_participant_token";

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

export function getParticipantToken(): string | null {
  return localStorage.getItem(PARTICIPANT_TOKEN_KEY);
}

export function setParticipantToken(token: string): void {
  localStorage.setItem(PARTICIPANT_TOKEN_KEY, token);
}

export function removeParticipantToken(): void {
  localStorage.removeItem(PARTICIPANT_TOKEN_KEY);
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

  const url = `${API_BASE_URL}${endpoint}`;
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

// ── Health API ────────────────────────────────────────────────────────────────
export async function fetchHealth(): Promise<HealthResponse> {
  return request<HealthResponse>("/api/health");
}

export function getApiBaseUrl(): string {
  return API_BASE_URL;
}

// ── Auth APIs ─────────────────────────────────────────────────────────────────
export interface LoginPayload {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: {
    id: number;
    username: string;
    email: string | null;
    role: string;
    is_active: boolean;
  };
}

export async function loginAdmin(credentials: LoginPayload): Promise<LoginResponse> {
  const data = await request<LoginResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
  setAuthToken(data.access_token);
  localStorage.setItem(USER_KEY, JSON.stringify(data.user));
  return data;
}

export async function getCurrentUserProfile(): Promise<LoginResponse["user"]> {
  return request<LoginResponse["user"]>("/api/auth/me");
}

// ── Questions APIs ─────────────────────────────────────────────────────────────
export async function apiGetQuestions(params?: {
  game_type?: string;
  status?: string;
  difficulty?: string;
  content_type?: string;
  search?: string;
}): Promise<Question[]> {
  const searchParams = new URLSearchParams();
  if (params?.game_type) searchParams.set("game_type", params.game_type);
  if (params?.status) searchParams.set("status", params.status);
  if (params?.difficulty) searchParams.set("difficulty", params.difficulty);
  if (params?.content_type) searchParams.set("content_type", params.content_type);
  if (params?.search) searchParams.set("search", params.search);

  const qs = searchParams.toString();
  const rawList = await request<any[]>(`/api/questions${qs ? `?${qs}` : ""}`);

  // Map backend snake_case to frontend camelCase Question model
  return rawList.map(mapBackendQuestionToFrontend);
}

export async function apiGetQuestion(id: string): Promise<Question> {
  const raw = await request<any>(`/api/questions/${id}`);
  return mapBackendQuestionToFrontend(raw);
}

export async function apiCreateQuestion(question: Partial<Question>): Promise<Question> {
  const payload = mapFrontendQuestionToBackend(question);
  const raw = await request<any>("/api/questions", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return mapBackendQuestionToFrontend(raw);
}

export async function apiUpdateQuestion(id: string, updates: Partial<Question>): Promise<Question> {
  const payload = mapFrontendQuestionToBackend(updates);
  const raw = await request<any>(`/api/questions/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return mapBackendQuestionToFrontend(raw);
}

export async function apiDeleteQuestion(id: string): Promise<void> {
  await request<void>(`/api/questions/${id}`, {
    method: "DELETE",
  });
}

// ── Teams APIs ────────────────────────────────────────────────────────────────
export async function apiGetTeams(params?: { status?: string; search?: string }): Promise<Team[]> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set("status", params.status);
  if (params?.search) searchParams.set("search", params.search);

  const qs = searchParams.toString();
  const rawList = await request<any[]>(`/api/teams${qs ? `?${qs}` : ""}`);
  return rawList.map(mapBackendTeamToFrontend);
}

export async function apiGetTeam(id: string): Promise<Team> {
  const raw = await request<any>(`/api/teams/${id}`);
  return mapBackendTeamToFrontend(raw);
}

export async function apiCreateTeam(team: Partial<Team>): Promise<Team> {
  const payload = {
    id: team.id,
    team_name: team.name,
    team_code: team.code,
    description: team.description,
    team_leader: team.leaderName,
    member_count: team.members || 1,
    status: team.status || "active",
    member_names: team.memberNames || [],
  };
  const raw = await request<any>("/api/teams", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return mapBackendTeamToFrontend(raw);
}

export async function apiUpdateTeam(id: string, updates: Partial<Team>): Promise<Team> {
  const payload: any = {};
  if (updates.name !== undefined) payload.team_name = updates.name;
  if (updates.code !== undefined) payload.team_code = updates.code;
  if (updates.description !== undefined) payload.description = updates.description;
  if (updates.leaderName !== undefined) payload.team_leader = updates.leaderName;
  if (updates.members !== undefined) payload.member_count = updates.members;
  if (updates.status !== undefined) payload.status = updates.status;
  if (updates.memberNames !== undefined) payload.member_names = updates.memberNames;

  const raw = await request<any>(`/api/teams/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return mapBackendTeamToFrontend(raw);
}

export async function apiDeleteTeam(id: string): Promise<void> {
  await request<void>(`/api/teams/${id}`, {
    method: "DELETE",
  });
}

// ── Sessions APIs ─────────────────────────────────────────────────────────────
export async function apiGetSessions(params?: { game_type?: string; status?: string }): Promise<GameSession[]> {
  const searchParams = new URLSearchParams();
  if (params?.game_type) searchParams.set("game_type", params.game_type);
  if (params?.status) searchParams.set("status", params.status);

  const qs = searchParams.toString();
  const rawList = await request<any[]>(`/api/sessions${qs ? `?${qs}` : ""}`);
  return rawList.map(mapBackendSessionToFrontend);
}

export async function apiCreateSession(session: Partial<GameSession>): Promise<GameSession> {
  const payload = {
    id: session.id,
    session_name: session.name,
    description: session.description,
    game_type: session.gameType,
    status: session.status || "draft",
    session_code: session.code,
    scheduled_date: session.scheduledDate,
    scheduled_time: session.scheduledTime,
    rules: session.rules,
    question_ids: session.questionIds || [],
    team_ids: session.teamIds || [],
  };
  const raw = await request<any>("/api/sessions", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return mapBackendSessionToFrontend(raw);
}

export async function apiUpdateSession(id: string, updates: Partial<GameSession>): Promise<GameSession> {
  const payload: any = {};
  if (updates.name !== undefined) payload.session_name = updates.name;
  if (updates.description !== undefined) payload.description = updates.description;
  if (updates.gameType !== undefined) payload.game_type = updates.gameType;
  if (updates.status !== undefined) payload.status = updates.status;
  if (updates.scheduledDate !== undefined) payload.scheduled_date = updates.scheduledDate;
  if (updates.scheduledTime !== undefined) payload.scheduled_time = updates.scheduledTime;
  if (updates.rules !== undefined) payload.rules = updates.rules;
  if (updates.questionIds !== undefined) payload.question_ids = updates.questionIds;
  if (updates.teamIds !== undefined) payload.team_ids = updates.teamIds;

  const raw = await request<any>(`/api/sessions/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return mapBackendSessionToFrontend(raw);
}

export async function apiSetSessionReady(id: string): Promise<GameSession> {
  const raw = await request<any>(`/api/sessions/${id}/ready`, { method: "POST" });
  return mapBackendSessionToFrontend(raw);
}

export async function apiStartSession(id: string): Promise<GameSession> {
  const raw = await request<any>(`/api/sessions/${id}/start`, { method: "POST" });
  return mapBackendSessionToFrontend(raw);
}

export async function apiCancelSession(id: string): Promise<GameSession> {
  const raw = await request<any>(`/api/sessions/${id}/cancel`, { method: "POST" });
  return mapBackendSessionToFrontend(raw);
}

// ── Participant APIs ──────────────────────────────────────────────────────────
export interface ParticipantJoinPayload {
  session_code: string;
  team_code: string;
}

export interface ParticipantJoinResponse {
  session_id: string;
  session_code: string;
  session_name: string;
  game_type: string;
  session_status: string;
  team_id: string;
  team_name: string;
  team_code: string;
  participant_token: string;
}

export async function apiJoinSession(payload: ParticipantJoinPayload): Promise<ParticipantJoinResponse> {
  const data = await request<ParticipantJoinResponse>("/api/participant/join", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  setParticipantToken(data.participant_token);
  return data;
}

export async function apiGetCurrentQuestion(sessionCode: string): Promise<any> {
  const pToken = getParticipantToken();
  const headers: Record<string, string> = {};
  if (pToken) {
    headers["Authorization"] = `Bearer ${pToken}`;
  }
  return request<any>(`/api/participant/sessions/${sessionCode}/current-question`, {
    headers,
  });
}

// ── Mappers ───────────────────────────────────────────────────────────────────
function mapBackendQuestionToFrontend(b: any): Question {
  return {
    id: b.id,
    gameType: b.game_type,
    title: b.title,
    instructions: b.instructions,
    contentType: b.content_type,
    textContent: b.text_content,
    images: b.images || [],
    technologyCategory: b.technology_category,
    secretTopic: b.secret_topic,
    topicDescription: b.topic_description,
    prohibitedWords: b.prohibited_words || [],
    adminInstructions: b.admin_instructions,
    estimatedTime: b.estimated_time,
    correctAnswer: b.correct_answer,
    acceptedAnswers: b.accepted_answers || [],
    explanation: b.explanation,
    difficulty: b.difficulty,
    order: b.question_order,
    status: b.status,
    createdAt: b.created_at ? b.created_at.split("T")[0] : "",
    updatedAt: b.updated_at ? b.updated_at.split("T")[0] : "",
  };
}

function mapFrontendQuestionToBackend(f: Partial<Question>): any {
  const b: any = {};
  if (f.id !== undefined) b.id = f.id;
  if (f.gameType !== undefined) b.game_type = f.gameType;
  if (f.title !== undefined) b.title = f.title;
  if (f.instructions !== undefined) b.instructions = f.instructions;
  if (f.contentType !== undefined) b.content_type = f.contentType;
  if (f.textContent !== undefined) b.text_content = f.textContent;
  if (f.images !== undefined) b.images = f.images;
  if (f.technologyCategory !== undefined) b.technology_category = f.technologyCategory;
  if (f.secretTopic !== undefined) b.secret_topic = f.secretTopic;
  if (f.topicDescription !== undefined) b.topic_description = f.topicDescription;
  if (f.prohibitedWords !== undefined) b.prohibited_words = f.prohibitedWords;
  if (f.adminInstructions !== undefined) b.admin_instructions = f.adminInstructions;
  if (f.estimatedTime !== undefined) b.estimated_time = f.estimatedTime;
  if (f.correctAnswer !== undefined) b.correct_answer = f.correctAnswer;
  if (f.acceptedAnswers !== undefined) b.accepted_answers = f.acceptedAnswers;
  if (f.explanation !== undefined) b.explanation = f.explanation;
  if (f.difficulty !== undefined) b.difficulty = f.difficulty;
  if (f.order !== undefined) b.question_order = f.order;
  if (f.status !== undefined) b.status = f.status;
  return b;
}

function mapBackendTeamToFrontend(b: any): Team {
  return {
    id: b.id,
    name: b.team_name,
    code: b.team_code,
    description: b.description,
    leaderName: b.team_leader,
    members: b.member_count,
    memberNames: b.member_names || [],
    status: b.status,
    sessionsParticipated: b.sessions_participated || 0,
    createdAt: b.created_at ? b.created_at.split("T")[0] : "",
    updatedAt: b.updated_at ? b.updated_at.split("T")[0] : "",
  };
}

function mapBackendSessionToFrontend(b: any): GameSession {
  return {
    id: b.id,
    code: b.session_code,
    name: b.session_name,
    description: b.description,
    gameType: b.game_type,
    status: b.status,
    questionIds: b.question_ids || [],
    teamIds: b.team_ids || [],
    rules: b.rules || {
      maxEligibleTeams: 3,
      answerSubmission: "eligible_only",
      correctAnswerReveal: "manual",
      questionProgression: "manual",
      scoreboardVisibility: "hidden",
      enableBuzzer: true,
    },
    scheduledDate: b.scheduled_date,
    scheduledTime: b.scheduled_time,
    totalQuestions: b.total_questions || (b.question_ids ? b.question_ids.length : 0),
    createdAt: b.created_at ? b.created_at.split("T")[0] : "",
    updatedAt: b.updated_at ? b.updated_at.split("T")[0] : "",
  };
}
