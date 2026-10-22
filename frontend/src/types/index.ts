/** Frontend TypeScript types for Fun Friday Activities Platform (aXtrLabs). */

export type UserRole = "admin" | "participant";

export interface UserProfile {
  id: number;
  username: string;
  display_name: string;
  email?: string | null;
  role: UserRole;
  is_active: boolean;
  is_logged_in: boolean;
  last_login_at?: string | null;
  team_id?: string | null;
  team_name?: string | null;
}

export interface RegisterPayload {
  username: string;
  display_name: string;
  password: string;
  email?: string;
}

export interface TeamMemberInfo {
  id: number;
  username: string;
  display_name: string;
}

export interface Team {
  id: string;
  team_name: string;
  team_code: string;
  tech_detective_score: number;
  lightning_talks_score: number;
  total_score: number;
  rank: number;
  members: TeamMemberInfo[];
}

export interface TechDetectiveClueImage {
  id: number;
  url: string;
  caption?: string;
}

export interface TechDetectiveQuestionAdmin {
  id: string;
  question_number: number;
  title: string;
  technology_name: string;
  images: TechDetectiveClueImage[];
  accepted_answers: string[];
  clue_description?: string;
  points: number;
  deduction: number;
  is_unlocked: boolean;
  unlocked_at?: string;
  is_completed: boolean;
}

export interface TechDetectiveQuestionParticipant {
  id: string;
  question_number: number;
  title: string;
  images: TechDetectiveClueImage[];
  points: number;
  is_unlocked: boolean;
}

export interface CreateQuestionPayload {
  question_number: number;
  title: string;
  technology_name: string;
  images: string[];
  accepted_answers?: string[];
  points?: number;
  deduction?: number;
}

export interface QuestionWiseTeamScore {
  team_id: string;
  team_name: string;
  question_scores: Record<string, number>;
  total_score: number;
}

export interface QuestionWiseScoreResponse {
  questions: Array<{
    id: string;
    question_number: number;
    title: string;
    points: number;
  }>;
  team_scores: QuestionWiseTeamScore[];
}

export interface BuzzerEntry {
  id: number;
  team_id: string;
  team_name: string;
  position: number;
  pressed_at: string;
}

export interface BuzzerQueue {
  question_id: string;
  is_buzzer_open: boolean;
  buzzers: BuzzerEntry[];
  current_answering_team_id?: string | null;
  current_answering_position?: number | null;
}

export interface TechDetectiveLeaderboardItem {
  rank: number;
  team_id: string;
  team_name: string;
  score: number;
}

export interface LightningTopicAdmin {
  id: string;
  topic_name: string;
  description?: string;
  prohibited_words: string[];
  assigned_user_id?: number | null;
  assigned_user_name?: string | null;
  assigned_team_id?: string | null;
  assigned_team_name?: string | null;
  is_unlocked: boolean;
  unlocked_at?: string | null;
  duration_seconds: number;
}

export interface ManualTopicAssignPayload {
  user_id: number;
  team_id: string;
  topic_name: string;
  description?: string;
  prohibited_words?: string[];
}

export interface CreateLightningTopicPayload {
  topic_name: string;
  description?: string;
  prohibited_words?: string[];
  assigned_user_id?: number | null;
  assigned_team_id?: string | null;
}

export interface LightningTopicParticipant {
  id: string;
  topic_name: string;
  description?: string;
  prohibited_words: string[];
  is_unlocked: boolean;
  duration_seconds: number;
}

export interface LightningLeaderboardItem {
  rank: number;
  team_id: string;
  team_name: string;
  score: number;
}

export interface FinalLeaderboardItem {
  rank: number;
  team_id: string;
  team_name: string;
  tech_detective_score: number;
  lightning_talks_score: number;
  total_score: number;
}

export interface GameTimer {
  total_duration: number;
  seconds_remaining: number;
  is_running: boolean;
  end_time: number | null;
  game: "all" | "tech-detective" | "lightning-talks" | string;
  current_game: string;
}

export interface GameTimerControlPayload {
  action: "start" | "pause" | "resume" | "reset" | "set_duration" | "add_time";
  duration_seconds?: number;
  game?: string;
}

export interface GameItem {
  id: string;
  game_code: string;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  game_type: string;
  icon: string;
  default_timer_seconds: number;
  rules: string[];
  is_active: boolean;
  order_index: number;
  question_count?: number;
  created_at: string;
}

export interface CreateGamePayload {
  title: string;
  subtitle?: string;
  description?: string;
  game_code?: string;
  game_type?: string;
  icon?: string;
  default_timer_seconds?: number;
  rules?: string[];
  is_active?: boolean;
}

export interface UpdateGamePayload {
  title?: string;
  subtitle?: string;
  description?: string;
  game_type?: string;
  icon?: string;
  default_timer_seconds?: number;
  rules?: string[];
  is_active?: boolean;
  order_index?: number;
}

export interface TeamGameScore {
  id: number;
  team_id: string;
  game_code: string;
  score: number;
  notes?: string | null;
  updated_at: string;
}

export interface AwardGameScorePayload {
  team_id: string;
  game_code: string;
  score: number;
  is_incremental?: boolean;
  notes?: string;
}

export interface GameQuestion {
  id: string;
  game_id: string;
  game_code: string;
  question_number: number;
  title: string;
  description?: string | null;
  question_type: string;
  options: string[];
  correct_answer?: string | null;
  accepted_answers: string[];
  image_url?: string | null;
  media_type?: "none" | "image" | "audio" | "video" | "youtube" | string;
  media_url?: string | null;
  points: number;
  deduction: number;
  time_limit_seconds?: number | null;
  is_unlocked: boolean;
  unlocked_at?: string | null;
  is_completed?: boolean;
  is_buzzer_open?: boolean;
  current_answering_team_id?: string | null;
  current_answering_position?: number | null;
  created_at: string;
}

export interface EvaluateCustomGameAnswerPayload {
  question_id: string;
  team_id: string;
  buzzer_position: number;
  is_correct: boolean;
  answer_text?: string;
}

export interface CreateGameQuestionPayload {
  title: string;
  question_number?: number;
  description?: string;
  question_type?: string;
  options?: string[];
  correct_answer?: string;
  accepted_answers?: string[];
  image_url?: string;
  media_type?: string;
  media_url?: string;
  points?: number;
  deduction?: number;
  time_limit_seconds?: number;
}



