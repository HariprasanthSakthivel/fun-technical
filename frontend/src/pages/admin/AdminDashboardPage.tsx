import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  BarChart3,
  Bell,
  CheckCircle2,
  ChevronRight,
  Clock,
  Edit2,
  Gamepad2,
  Hash,
  Image as ImageIcon,
  Layers,
  Lock,
  LogOut,
  Mic,
  Play,
  Plus,
  Save,
  Shuffle,
  Sparkles,
  Trash2,
  Trophy,
  Unlock,
  Upload,
  Users,
  XCircle,
  Zap,
} from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { GameTimerWidget } from "@/components/GameTimerWidget";
import { MediaViewer } from "@/components/MediaViewer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import {
  activateGame,
  awardGameScore,
  controlGameTimer,
  createGame,
  createGameQuestion,
  createLightningTopic,
  createTechDetectiveQuestion,
  deleteGame,
  deleteGameQuestion,
  deleteLightningTopic,
  deleteTechDetectiveQuestion,
  editFinalScore,
  editLightningScore,
  editTechDetectiveScore,
  evaluateCustomGameAnswer,
  evaluateLightningGuess,
  evaluateLightningSpeech,
  evaluateTechDetectiveAnswer,
  fetchActiveGameQuestion,
  fetchBuzzerQueue,
  fetchCustomGameBuzzerQueue,
  fetchFinalLeaderboard,
  fetchGameQuestions,
  fetchGameScores,
  fetchGames,
  fetchGameTimer,
  fetchLightningBuzzerQueue,
  fetchLightningLeaderboard,
  fetchLightningTopicsAdmin,
  fetchLoggedInUsers,
  fetchTeams,
  fetchTechDetectiveLeaderboard,
  fetchTechDetectiveQuestionsAdmin,
  fetchTechDetectiveScoreBreakdown,
  manualAssignLightningTopic,
  openLightningBuzzer,
  randomizeTeams,
  resetCustomGameBuzzer,
  resetDatabase,
  resetLightningBuzzer,
  transitionToGame2,
  unlockGameQuestion,
  unlockLightningTopic,
  unlockTechDetectiveQuestion,
  updateTeamName,
  uploadMediaFile,
} from "@/services/api";
import type {
  BuzzerQueue,
  FinalLeaderboardItem,
  GameItem,
  GameQuestion,
  GameTimer,
  LightningLeaderboardItem,
  LightningTopicAdmin,
  QuestionWiseScoreResponse,
  Team,
  TeamGameScore,
  TechDetectiveLeaderboardItem,
  TechDetectiveQuestionAdmin,
  UserProfile,
} from "@/types";

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();

  const [activeTab, setActiveTab] = useState<"teams" | "games" | "game1" | "game2" | "final" | string>("teams");

  // State: Tab 1 (Participants & Teams)
  const [loggedInUsers, setLoggedInUsers] = useState<UserProfile[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [isRandomizing, setIsRandomizing] = useState(false);
  const [selectedTeamSize, setSelectedTeamSize] = useState<number>(2);
  const [editTeamModal, setEditTeamModal] = useState<Team | null>(null);
  const [editTeamNameInput, setEditTeamNameInput] = useState("");

  // State: Tab 2 (Games Hub - Dynamic Activities & Scoring)
  const [gamesList, setGamesList] = useState<GameItem[]>([]);
  const [customGameScores, setCustomGameScores] = useState<TeamGameScore[]>([]);
  const [createGameModalOpen, setCreateGameModalOpen] = useState(false);
  const [newGameTitle, setNewGameTitle] = useState("");
  const [newGameDescription, setNewGameDescription] = useState("");
  const [newGameRulesInput, setNewGameRulesInput] = useState("");
  const [isCreatingGame, setIsCreatingGame] = useState(false);

  // Dynamic Custom Game Console & Question Bank
  const [selectedCustomGame, setSelectedCustomGame] = useState<GameItem | null>(null);
  const [customGameQuestions, setCustomGameQuestions] = useState<GameQuestion[]>([]);
  const [activeCustomQuestion, setActiveCustomQuestion] = useState<GameQuestion | null>(null);
  const [customBuzzerQueue, setCustomBuzzerQueue] = useState<BuzzerQueue | null>(null);
  const [isEvaluatingCustom, setIsEvaluatingCustom] = useState(false);
  const [createCustomQuestionOpen, setCreateCustomQuestionOpen] = useState(false);
  const [newCustomQTitle, setNewCustomQTitle] = useState("");
  const [newCustomQCorrect, setNewCustomQCorrect] = useState("");
  const [newCustomQMediaType, setNewCustomQMediaType] = useState<string>("none");
  const [newCustomQMediaUrl, setNewCustomQMediaUrl] = useState("");
  const [isUploadingCustomMedia, setIsUploadingCustomMedia] = useState(false);
  const [mediaInputMode, setMediaInputMode] = useState<"none" | "upload" | "url" | "youtube">("none");
  const [isSavingCustomQuestion, setIsSavingCustomQuestion] = useState(false);

  // Score Editing for Custom Games (Same as Game 1 & Game 2)
  const [editCustomScoreModal, setEditCustomScoreModal] = useState<{
    team_id: string;
    team_name: string;
    game_code: string;
    game_title: string;
    score: number;
  } | null>(null);
  const [editCustomScoreValue, setEditCustomScoreValue] = useState<number>(0);

  // State: Tab 3 (Game 1 - Tech Detective)
  const [tdQuestions, setTdQuestions] = useState<TechDetectiveQuestionAdmin[]>([]);
  const [activeTdQuestion, setActiveTdQuestion] = useState<TechDetectiveQuestionAdmin | null>(null);
  const [buzzerQueue, setBuzzerQueue] = useState<BuzzerQueue | null>(null);
  const [tdLeaderboard, setTdLeaderboard] = useState<TechDetectiveLeaderboardItem[]>([]);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [editTdScoreModal, setEditTdScoreModal] = useState<TechDetectiveLeaderboardItem | null>(null);
  const [editTdScoreValue, setEditTdScoreValue] = useState<number>(0);

  // Question Creator / Image Uploader Modal
  const [createQuestionOpen, setCreateQuestionOpen] = useState(false);
  const [newQNumber, setNewQNumber] = useState<number>(1);
  const [newQTitle, setNewQTitle] = useState("");
  const [newQTech, setNewQTech] = useState("");
  const [newQPoints, setNewQPoints] = useState<number>(10);
  const [newQDeduction, setNewQDeduction] = useState<number>(2);
  const [newQSynonyms, setNewQSynonyms] = useState("");
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isCreatingQuestion, setIsCreatingQuestion] = useState(false);
  const [modalQuestionError, setModalQuestionError] = useState<string | null>(null);
  const [imageTab, setImageTab] = useState<"upload" | "url">("upload");
  const [imageUrlDraft, setImageUrlDraft] = useState("");

  // Question-Wise Score Matrix Modal
  const [scoreBreakdownOpen, setScoreBreakdownOpen] = useState(false);
  const [scoreBreakdownData, setScoreBreakdownData] = useState<QuestionWiseScoreResponse | null>(null);
  const [isLoadingBreakdown, setIsLoadingBreakdown] = useState(false);

  // State: Tab 4 (Game 2 - Lightning Talks)
  const [ltTopics, setLtTopics] = useState<LightningTopicAdmin[]>([]);
  const [ltLeaderboard, setLtLeaderboard] = useState<LightningLeaderboardItem[]>([]);
  const [evaluatingTopic, setEvaluatingTopic] = useState<LightningTopicAdmin | null>(null);
  const [timeScore, setTimeScore] = useState<number>(8);
  const [wordsScore, setWordsScore] = useState<number>(8);
  const [understandScore, setUnderstandScore] = useState<number>(8);
  const [evalNotes, setEvalNotes] = useState<string>("");
  const [isSubmittingSpeech, setIsSubmittingSpeech] = useState(false);
  const [editLtScoreModal, setEditLtScoreModal] = useState<LightningLeaderboardItem | null>(null);
  const [editLtScoreValue, setEditLtScoreValue] = useState<number>(0);
  const [ltBuzzerQueue, setLtBuzzerQueue] = useState<BuzzerQueue | null>(null);
  const [isEvaluatingLtGuess, setIsEvaluatingLtGuess] = useState(false);

  // State: Topic Creator for Game 2
  const [createTopicModalOpen, setCreateTopicModalOpen] = useState(false);
  const [newTopicName, setNewTopicName] = useState("");
  const [newTopicDescription, setNewTopicDescription] = useState("");
  const [newTopicProhibited, setNewTopicProhibited] = useState("");
  const [newTopicAssignUserId, setNewTopicAssignUserId] = useState<string>("");
  const [isCreatingTopic, setIsCreatingTopic] = useState(false);

  // Manual topic draft state: userId -> topicName
  const [topicDrafts, setTopicDrafts] = useState<Record<number, string>>({});
  const [savingTopicUserId, setSavingTopicUserId] = useState<number | null>(null);

  // State: Tab 5 (Final Leaderboard)
  const [finalLeaderboard, setFinalLeaderboard] = useState<FinalLeaderboardItem[]>([]);
  const [editFinalModal, setEditFinalModal] = useState<FinalLeaderboardItem | null>(null);
  const [editFinalG1, setEditFinalG1] = useState<number>(0);
  const [editFinalG2, setEditFinalG2] = useState<number>(0);

  // Synchronized Dynamic Timer State
  const [gameTimer, setGameTimer] = useState<GameTimer | null>(null);

  const [notification, setNotification] = useState<string | null>(null);
  const [resetDbModalOpen, setResetDbModalOpen] = useState(false);
  const [isResettingDb, setIsResettingDb] = useState(false);

  const showNotice = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  // Sync Data
  const syncDashboardData = async () => {
    try {
      const [u, t, tm, gms] = await Promise.all([
        fetchLoggedInUsers(),
        fetchTeams(),
        fetchGameTimer(),
        fetchGames(),
      ]);
      setLoggedInUsers(u);
      setTeams(t);
      setGameTimer(tm);
      setGamesList(gms);

      if (activeTab === "games") {
        const scores = await fetchGameScores();
        setCustomGameScores(scores);
      } else if (activeTab === "game1") {
        const [qs, lb] = await Promise.all([
          fetchTechDetectiveQuestionsAdmin(),
          fetchTechDetectiveLeaderboard(),
        ]);
        setTdQuestions(qs);
        setTdLeaderboard(lb);

        const unlocked = qs.find((q) => q.is_unlocked);
        setActiveTdQuestion(unlocked || null);
        if (unlocked) {
          const bq = await fetchBuzzerQueue(unlocked.id);
          setBuzzerQueue(bq);
        } else {
          setBuzzerQueue(null);
        }
      } else if (activeTab === "game2") {
        const [tops, lb] = await Promise.all([
          fetchLightningTopicsAdmin(),
          fetchLightningLeaderboard(),
        ]);
        setLtTopics(tops);
        setLtLeaderboard(lb);

        const unlocked = tops.find((t) => t.is_unlocked);
        if (unlocked) {
          const bq = await fetchLightningBuzzerQueue(unlocked.id).catch(() => null);
          setLtBuzzerQueue(bq);
        } else {
          setLtBuzzerQueue(null);
        }
      } else if (activeTab === "final") {
        const flb = await fetchFinalLeaderboard();
        setFinalLeaderboard(flb);
      } else {
        // Custom dynamic game tab (Game 3, Game 4, etc.)
        const customGame =
          gamesList.find((g) => g.id === activeTab || g.game_code === activeTab) ||
          selectedCustomGame;
        if (customGame) {
          const [qs, actQ, scores] = await Promise.all([
            fetchGameQuestions(customGame.id),
            fetchActiveGameQuestion(customGame.id),
            fetchGameScores(customGame.game_code),
          ]);
          setCustomGameQuestions(qs);
          setActiveCustomQuestion(actQ);
          setCustomGameScores(scores);

          if (actQ) {
            const bq = await fetchCustomGameBuzzerQueue(customGame.id, actQ.id).catch(() => null);
            setCustomBuzzerQueue(bq);
          } else {
            setCustomBuzzerQueue(null);
          }
        }
      }
    } catch {
      // Quiet fallback
    }
  };

  useEffect(() => {
    syncDashboardData();
    const interval = setInterval(syncDashboardData, 2500);
    return () => clearInterval(interval);
  }, [activeTab]);

  // Handle Team Randomization
  const handleRandomizeTeams = async () => {
    try {
      setIsRandomizing(true);
      const res = await randomizeTeams(selectedTeamSize, true);
      setTeams(res);
      showNotice(
        `Successfully formed ${res.length} teams (target: ${selectedTeamSize} members per team)!`
      );
      const u = await fetchLoggedInUsers();
      setLoggedInUsers(u);
    } catch (err: unknown) {
      showNotice(err instanceof Error ? err.message : "Failed to randomize teams");
    } finally {
      setIsRandomizing(false);
    }
  };

  // Handle Team Name Edit
  const handleSaveTeamName = async () => {
    if (!editTeamModal || !editTeamNameInput.trim()) return;
    try {
      const updated = await updateTeamName(editTeamModal.id, editTeamNameInput.trim());
      setTeams((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setEditTeamModal(null);
      showNotice(`Team name updated to "${updated.team_name}"`);
    } catch (err: unknown) {
      showNotice(err instanceof Error ? err.message : "Failed to update team name");
    }
  };

  // Dynamic Games Handlers
  const handleCreateGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGameTitle.trim()) {
      showNotice("Please enter a game title");
      return;
    }
    try {
      setIsCreatingGame(true);
      const parsedRules = newGameRulesInput
        .split("\n")
        .map((r) => r.trim())
        .filter(Boolean);

      const created = await createGame({
        title: newGameTitle.trim(),
        description: newGameDescription.trim() || undefined,
        game_type: "activity",
        icon: "gamepad",
        default_timer_seconds: 60,
        rules: parsedRules,
        is_active: true,
      });

      setGamesList((prev) => [...prev, created]);
      setCreateGameModalOpen(false);
      setNewGameTitle("");
      setNewGameDescription("");
      setNewGameRulesInput("");
      showNotice(`Successfully added "${created.title}" to Games Catalog!`);
    } catch (err: unknown) {
      showNotice(err instanceof Error ? err.message : "Failed to create game");
    } finally {
      setIsCreatingGame(false);
    }
  };

  const handleActivateGame = async (game: GameItem) => {
    try {
      await activateGame(game.id);
      setGamesList((prev) =>
        prev.map((g) => ({
          ...g,
          is_active: g.id === game.id,
        }))
      );
      if (game.default_timer_seconds) {
        await controlGameTimer({
          action: "set_duration",
          duration_seconds: game.default_timer_seconds,
          game: game.game_code,
        });
      }
      showNotice(`Activated "${game.title}" as current active activity!`);
      syncDashboardData();
    } catch (err: unknown) {
      showNotice(err instanceof Error ? err.message : "Failed to activate game");
    }
  };

  const handleDeleteGame = async (game: GameItem) => {
    if (!confirm(`Are you sure you want to remove "${game.title}"?`)) return;
    try {
      await deleteGame(game.id);
      setGamesList((prev) => prev.filter((g) => g.id !== game.id));
      showNotice(`Removed "${game.title}" from catalog.`);
    } catch (err: unknown) {
      showNotice(err instanceof Error ? err.message : "Failed to delete game");
    }
  };

  const handleSaveCustomScore = async () => {
    if (!editCustomScoreModal) return;
    try {
      await awardGameScore({
        team_id: editCustomScoreModal.team_id,
        game_code: editCustomScoreModal.game_code,
        score: editCustomScoreValue,
        is_incremental: false,
        notes: `Admin override for ${editCustomScoreModal.game_title}`,
      });
      showNotice(
        `Score for ${editCustomScoreModal.team_name} in ${editCustomScoreModal.game_title} updated to ${editCustomScoreValue} pts`
      );
      setEditCustomScoreModal(null);
      await syncDashboardData();
    } catch (err: unknown) {
      showNotice(err instanceof Error ? err.message : "Failed to edit score");
    }
  };

  const getCustomGameLeaderboard = (gameCode: string) => {
    return teams
      .map((team) => ({
        team_id: team.id,
        team_name: team.team_name,
        score: getGameScoreForTeam(team.id, gameCode),
      }))
      .sort((a, b) => b.score - a.score || a.team_name.localeCompare(b.team_name))
      .map((item, idx) => ({
        ...item,
        rank: idx + 1,
      }));
  };

  const getGameScoreForTeam = (teamId: string, gameCode: string): number => {
    if (gameCode === "tech-detective") {
      const t = teams.find((item) => item.id === teamId);
      return t ? t.tech_detective_score : 0;
    }
    if (gameCode === "lightning-talks") {
      const t = teams.find((item) => item.id === teamId);
      return t ? t.lightning_talks_score : 0;
    }
    const found = customGameScores.find(
      (s) => s.team_id === teamId && s.game_code === gameCode
    );
    return found ? found.score : 0;
  };


  // Open Custom Game Console & Question Bank
  const handleOpenCustomGame = async (game: GameItem) => {
    setSelectedCustomGame(game);
    setActiveTab(game.id);
    try {
      const [qs, actQ] = await Promise.all([
        fetchGameQuestions(game.id),
        fetchActiveGameQuestion(game.id),
      ]);
      setCustomGameQuestions(qs);
      setActiveCustomQuestion(actQ);
      if (actQ) {
        const bq = await fetchCustomGameBuzzerQueue(game.id, actQ.id).catch(() => null);
        setCustomBuzzerQueue(bq);
      } else {
        setCustomBuzzerQueue(null);
      }
    } catch {
      // Quiet fallback
    }
  };

  const handleOpenAddCustomQuestionModal = () => {
    const nextNum =
      customGameQuestions.length > 0
        ? Math.max(...customGameQuestions.map((q) => q.question_number)) + 1
        : 1;
    setNewCustomQTitle(`Question ${nextNum}`);
    setNewCustomQCorrect("");
    setNewCustomQMediaUrl("");
    setNewCustomQMediaType("none");
    setMediaInputMode("none");
    setCreateCustomQuestionOpen(true);
  };

  const handleCustomMediaFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploadingCustomMedia(true);
      const res = await uploadMediaFile(file);
      setNewCustomQMediaUrl(res.url);
      setNewCustomQMediaType(res.media_type);
      showNotice(`Uploaded ${file.name} successfully (${res.media_type})!`);
    } catch (err: unknown) {
      showNotice(err instanceof Error ? err.message : "Media upload failed");
    } finally {
      setIsUploadingCustomMedia(false);
      e.target.value = "";
    }
  };

  const handleCreateCustomQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomGame) return;
    if (!newCustomQTitle.trim()) {
      showNotice("Please enter a question title / prompt");
      return;
    }
    if (!newCustomQCorrect.trim()) {
      showNotice("Please enter the correct answer");
      return;
    }
    try {
      setIsSavingCustomQuestion(true);
      const nextNum =
        customGameQuestions.length > 0
          ? Math.max(...customGameQuestions.map((q) => q.question_number)) + 1
          : 1;

      const created = await createGameQuestion(selectedCustomGame.id, {
        title: newCustomQTitle.trim(),
        question_number: nextNum,
        correct_answer: newCustomQCorrect.trim(),
        accepted_answers: [newCustomQCorrect.trim().toLowerCase()],
        media_type: newCustomQMediaType !== "none" ? newCustomQMediaType : undefined,
        media_url: newCustomQMediaUrl.trim() || undefined,
        image_url: newCustomQMediaUrl.trim() || undefined,
        points: 10,
        deduction: 0,
        time_limit_seconds: selectedCustomGame.default_timer_seconds || 60,
      });

      setCustomGameQuestions((prev) => [...prev, created]);
      setCreateCustomQuestionOpen(false);
      showNotice(`Question added to ${selectedCustomGame.title}!`);
      setGamesList((prev) =>
        prev.map((g) =>
          g.id === selectedCustomGame.id
            ? { ...g, question_count: (g.question_count || 0) + 1 }
            : g
        )
      );
    } catch (err: unknown) {
      showNotice(err instanceof Error ? err.message : "Failed to add question");
    } finally {
      setIsSavingCustomQuestion(false);
    }
  };

  const handleUnlockCustomQuestion = async (q: GameQuestion) => {
    try {
      const updated = await unlockGameQuestion(q.id);
      setActiveCustomQuestion(updated);
      setCustomGameQuestions((prev) =>
        prev.map((item) => ({
          ...item,
          is_unlocked: item.id === q.id,
        }))
      );
      if (q.time_limit_seconds) {
        await controlGameTimer({
          action: "set_duration",
          duration_seconds: q.time_limit_seconds,
          game: q.game_code,
        });
      }
      showNotice(`Question #${q.question_number} unlocked for participants!`);
      const bq = await fetchCustomGameBuzzerQueue(q.game_id, q.id).catch(() => null);
      setCustomBuzzerQueue(bq);
      syncDashboardData();
    } catch (err: unknown) {
      showNotice(err instanceof Error ? err.message : "Failed to unlock question");
    }
  };

  const handleEvaluateCustomGameAnswer = async (
    teamId: string,
    position: number,
    isCorrect: boolean
  ) => {
    if (!selectedCustomGame || !activeCustomQuestion) return;
    try {
      setIsEvaluatingCustom(true);
      const res = await evaluateCustomGameAnswer(selectedCustomGame.id, {
        question_id: activeCustomQuestion.id,
        team_id: teamId,
        buzzer_position: position,
        is_correct: isCorrect,
      });
      showNotice(res.message);
      syncDashboardData();
    } catch (err: unknown) {
      showNotice(err instanceof Error ? err.message : "Evaluation failed");
    } finally {
      setIsEvaluatingCustom(false);
    }
  };

  const handleResetCustomGameBuzzer = async () => {
    if (!selectedCustomGame || !activeCustomQuestion) return;
    try {
      const res = await resetCustomGameBuzzer(selectedCustomGame.id, activeCustomQuestion.id);
      showNotice(res.message);
      syncDashboardData();
    } catch (err: unknown) {
      showNotice(err instanceof Error ? err.message : "Failed to reset buzzer");
    }
  };

  const handleDeleteCustomQuestion = async (q: GameQuestion) => {
    if (!confirm(`Are you sure you want to remove Question #${q.question_number}?`)) return;
    try {
      await deleteGameQuestion(q.id);
      setCustomGameQuestions((prev) => prev.filter((item) => item.id !== q.id));
      if (activeCustomQuestion?.id === q.id) {
        setActiveCustomQuestion(null);
      }
      setGamesList((prev) =>
        prev.map((g) =>
          g.id === q.game_id
            ? { ...g, question_count: Math.max(0, (g.question_count || 1) - 1) }
            : g
        )
      );
      showNotice(`Question deleted.`);
    } catch (err: unknown) {
      showNotice(err instanceof Error ? err.message : "Failed to delete question");
    }
  };

  // Open Question Creator / Editor Modal
  const openCreateQuestionModal = (editExisting?: TechDetectiveQuestionAdmin) => {
    if (editExisting) {
      setNewQNumber(editExisting.question_number);
      setNewQTitle(editExisting.title);
      setNewQTech(editExisting.technology_name);
      setNewQPoints(editExisting.points);
      setNewQDeduction(editExisting.deduction);
      setNewQSynonyms(editExisting.accepted_answers.join(", "));
      setUploadedImage(editExisting.images?.[0]?.url || null);
    } else {
      const nextNum =
        tdQuestions.length > 0
          ? Math.max(...tdQuestions.map((q) => q.question_number)) + 1
          : 1;
      setNewQNumber(nextNum);
      setNewQTitle(`Question ${nextNum}`);
      setNewQTech("");
      setNewQPoints(10);
      setNewQDeduction(2);
      setNewQSynonyms("");
      setUploadedImage(null);
    }
    setImageUrlDraft("");
    setImageTab("upload");
    setModalQuestionError(null);
    setCreateQuestionOpen(true);
  };

  // Handle Single Image File Selection with auto-compression (max 1200px)
  const handleImageFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setModalQuestionError(null);

    // If SVG, read directly as data URL
    if (file.type === "image/svg+xml") {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setUploadedImage(reader.result);
        }
      };
      reader.readAsDataURL(file);
      e.target.value = "";
      return;
    }

    // Auto-compress large camera / raster photos to ~100KB for fast saving
    const reader = new FileReader();
    reader.onload = (event) => {
      const rawUrl = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_SIZE = 1200;
        let w = img.width;
        let h = img.height;
        if (w > h && w > MAX_SIZE) {
          h = Math.round((h * MAX_SIZE) / w);
          w = MAX_SIZE;
        } else if (h > MAX_SIZE) {
          w = Math.round((w * MAX_SIZE) / h);
          h = MAX_SIZE;
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, w, h);
        const compressed = canvas.toDataURL("image/jpeg", 0.85);
        setUploadedImage(compressed);
      };
      img.onerror = () => {
        setUploadedImage(rawUrl);
      };
      img.src = rawUrl;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleApplyImageUrl = () => {
    if (!imageUrlDraft.trim()) {
      setModalQuestionError("Please enter an image URL.");
      return;
    }
    setUploadedImage(imageUrlDraft.trim());
    setImageUrlDraft("");
    setModalQuestionError(null);
  };

  const removeUploadedImage = () => {
    setUploadedImage(null);
  };

  // Create or Update Tech Detective Question
  const handleCreateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalQuestionError(null);

    if (!newQTitle.trim()) {
      setModalQuestionError("Please enter a question title.");
      return;
    }
    if (!newQTech.trim()) {
      setModalQuestionError("Please enter the correct answer / technology name.");
      return;
    }
    if (!uploadedImage) {
      setModalQuestionError("Please upload or provide 1 clue image before saving.");
      return;
    }

    try {
      setIsCreatingQuestion(true);
      const synonyms = newQSynonyms
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
      if (!synonyms.includes(newQTech.trim().toLowerCase())) {
        synonyms.push(newQTech.trim().toLowerCase());
      }

      const created = await createTechDetectiveQuestion({
        question_number: Number(newQNumber) || 1,
        title: newQTitle.trim(),
        technology_name: newQTech.trim(),
        images: [uploadedImage],
        points: Number(newQPoints) || 10,
        deduction: Number(newQDeduction) || 2,
        accepted_answers: synonyms,
      });

      setTdQuestions((prev) => {
        const filtered = prev.filter((q) => q.question_number !== created.question_number);
        return [...filtered, created].sort((a, b) => a.question_number - b.question_number);
      });
      showNotice(`Question #${created.question_number} saved successfully!`);

      // Reset form
      setCreateQuestionOpen(false);
      setNewQTitle("");
      setNewQTech("");
      setNewQSynonyms("");
      setUploadedImage(null);
      setModalQuestionError(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save question";
      setModalQuestionError(msg);
      showNotice(msg);
    } finally {
      setIsCreatingQuestion(false);
    }
  };

  // Delete Question
  const handleDeleteQuestion = async (qid: string, qnum: number) => {
    if (!confirm(`Are you sure you want to delete Question #${qnum}?`)) return;
    try {
      await deleteTechDetectiveQuestion(qid);
      setTdQuestions((prev) => prev.filter((q) => q.id !== qid));
      if (activeTdQuestion?.id === qid) {
        setActiveTdQuestion(null);
        setBuzzerQueue(null);
      }
      showNotice(`Question #${qnum} deleted successfully.`);
    } catch (err: unknown) {
      showNotice(err instanceof Error ? err.message : "Failed to delete question");
    }
  };

  // Open Score Breakdown Matrix
  const handleOpenScoreBreakdown = async () => {
    try {
      setIsLoadingBreakdown(true);
      setScoreBreakdownOpen(true);
      const data = await fetchTechDetectiveScoreBreakdown();
      setScoreBreakdownData(data);
    } catch (err: unknown) {
      showNotice(err instanceof Error ? err.message : "Failed to load score breakdown");
    } finally {
      setIsLoadingBreakdown(false);
    }
  };

  // Unlock Tech Detective Question
  const handleUnlockQuestion = async (questionId: string) => {
    try {
      const res = await unlockTechDetectiveQuestion(questionId);
      showNotice(res.message);
      syncDashboardData();
    } catch (err: unknown) {
      showNotice(err instanceof Error ? err.message : "Failed to unlock question");
    }
  };

  // Evaluate Tech Detective Answer
  const handleEvaluateAnswer = async (teamId: string, position: number, isCorrect: boolean) => {
    try {
      setIsEvaluating(true);
      const res = await evaluateTechDetectiveAnswer({
        team_id: teamId,
        buzzer_position: position,
        is_correct: isCorrect,
      });

      const outcome = isCorrect
        ? `Correct! +${res.points_awarded} awarded to ${res.team_name}`
        : `Incorrect! ${res.points_awarded} deduction for ${res.team_name}`;
      showNotice(outcome);
      syncDashboardData();
    } catch (err: unknown) {
      showNotice(err instanceof Error ? err.message : "Evaluation failed");
    } finally {
      setIsEvaluating(false);
    }
  };

  // Edit Tech Detective Leaderboard Score
  const handleSaveTdScore = async () => {
    if (!editTdScoreModal) return;
    try {
      const updated = await editTechDetectiveScore(editTdScoreModal.team_id, editTdScoreValue);
      setTdLeaderboard((prev) =>
        prev.map((i) => (i.team_id === updated.team_id ? updated : i))
      );
      setEditTdScoreModal(null);
      showNotice(`Score for ${updated.team_name} updated to ${updated.score} pts`);
    } catch (err: unknown) {
      showNotice(err instanceof Error ? err.message : "Failed to edit score");
    }
  };

  // Transition to Game 2
  const handleTransitionToGame2 = async () => {
    if (!confirm("Are you sure you want to finish Game 1 and transition to Game 2 (Lightning Talks)?")) {
      return;
    }
    try {
      await transitionToGame2();
      setActiveTab("game2");
      showNotice("Transitioned to Game 2: Lightning Talks!");
    } catch (err: unknown) {
      showNotice(err instanceof Error ? err.message : "Failed to transition to Game 2");
    }
  };

  // Manual Topic Assignment for a Member
  const handleSaveManualTopic = async (userId: number, teamId: string) => {
    const topicText = topicDrafts[userId]?.trim();
    if (!topicText) {
      showNotice("Please enter a topic title for this member");
      return;
    }

    try {
      setSavingTopicUserId(userId);
      const res = await manualAssignLightningTopic({
        user_id: userId,
        team_id: teamId,
        topic_name: topicText,
      });

      setLtTopics((prev) => {
        const exists = prev.some((t) => t.id === res.id);
        if (exists) {
          return prev.map((t) => (t.id === res.id ? res : t));
        }
        return [...prev, res];
      });

      showNotice(`Assigned topic "${res.topic_name}" to ${res.assigned_user_name}`);
    } catch (err: unknown) {
      showNotice(err instanceof Error ? err.message : "Failed to assign topic");
    } finally {
      setSavingTopicUserId(null);
    }
  };

  // Create Lightning Talks Topic (for Topic Pool or assigned)
  const handleCreateTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopicName.trim()) {
      showNotice("Please enter a topic name.");
      return;
    }

    try {
      setIsCreatingTopic(true);
      const prohibitedWords = newTopicProhibited
        .split(",")
        .map((w) => w.trim())
        .filter(Boolean);

      let targetUserId: number | null = null;
      let targetTeamId: string | null = null;

      if (newTopicAssignUserId) {
        const uid = parseInt(newTopicAssignUserId);
        targetUserId = uid;
        const foundTeam = teams.find((t) => t.members.some((m) => m.id === uid));
        if (foundTeam) {
          targetTeamId = foundTeam.id;
        }
      }

      const created = await createLightningTopic({
        topic_name: newTopicName.trim(),
        description: newTopicDescription.trim() || undefined,
        prohibited_words: prohibitedWords,
        assigned_user_id: targetUserId,
        assigned_team_id: targetTeamId,
      });

      setLtTopics((prev) => [...prev, created]);
      showNotice(`Topic "${created.topic_name}" added successfully!`);

      setCreateTopicModalOpen(false);
      setNewTopicName("");
      setNewTopicDescription("");
      setNewTopicProhibited("");
      setNewTopicAssignUserId("");
    } catch (err: unknown) {
      showNotice(err instanceof Error ? err.message : "Failed to add topic");
    } finally {
      setIsCreatingTopic(false);
    }
  };

  // Delete Lightning Talks Topic
  const handleDeleteTopic = async (topicId: string, topicName: string) => {
    if (!confirm(`Are you sure you want to delete topic "${topicName}"?`)) return;
    try {
      await deleteLightningTopic(topicId);
      setLtTopics((prev) => prev.filter((t) => t.id !== topicId));
      showNotice(`Topic "${topicName}" deleted.`);
    } catch (err: unknown) {
      showNotice(err instanceof Error ? err.message : "Failed to delete topic");
    }
  };

  // Unlock Lightning Talks Topic for a Speaker
  const handleUnlockTopic = async (topicId: string) => {
    try {
      const res = await unlockLightningTopic(topicId);
      showNotice(res.message);
      syncDashboardData();
    } catch (err: unknown) {
      showNotice(err instanceof Error ? err.message : "Failed to unlock topic");
    }
  };

  // Submit Lightning Speech Evaluation
  const handleSubmitSpeechEvaluation = async () => {
    if (!evaluatingTopic || !evaluatingTopic.assigned_user_id || !evaluatingTopic.assigned_team_id) {
      return;
    }

    try {
      setIsSubmittingSpeech(true);
      const res = await evaluateLightningSpeech({
        user_id: evaluatingTopic.assigned_user_id,
        team_id: evaluatingTopic.assigned_team_id,
        topic_id: evaluatingTopic.id,
        time_management_score: timeScore,
        words_used_score: wordsScore,
        understandability_score: understandScore,
        admin_notes: evalNotes,
      });

      showNotice(
        `Evaluation recorded! ${evaluatingTopic.assigned_user_name} scored ${res.total_speech_score} pts for ${res.team_name}`
      );
      setEvaluatingTopic(null);
      syncDashboardData();
    } catch (err: unknown) {
      showNotice(err instanceof Error ? err.message : "Evaluation failed");
    } finally {
      setIsSubmittingSpeech(false);
    }
  };

  // Edit Lightning Talks Score
  const handleSaveLtScore = async () => {
    if (!editLtScoreModal) return;
    try {
      const updated = await editLightningScore(editLtScoreModal.team_id, editLtScoreValue);
      setLtLeaderboard((prev) =>
        prev.map((i) => (i.team_id === updated.team_id ? updated : i))
      );
      setEditLtScoreModal(null);
      showNotice(`Score updated to ${updated.score} pts`);
    } catch (err: unknown) {
      showNotice(err instanceof Error ? err.message : "Failed to edit score");
    }
  };

  // Open Game 2 Buzzer for Audience Topic Guessing
  const handleOpenLightningBuzzer = async (topicId: string) => {
    try {
      const res = await openLightningBuzzer(topicId);
      showNotice(res.message);
      syncDashboardData();
    } catch (err: unknown) {
      showNotice(err instanceof Error ? err.message : "Failed to open buzzer");
    }
  };

  // Evaluate Game 2 Guess attempt (+10 for Correct, -5 for Incorrect)
  const handleEvaluateLightningGuess = async (
    topicId: string,
    teamId: string,
    position: number,
    isCorrect: boolean
  ) => {
    try {
      setIsEvaluatingLtGuess(true);
      const res = await evaluateLightningGuess({
        topic_id: topicId,
        team_id: teamId,
        buzzer_position: position,
        is_correct: isCorrect,
      });
      showNotice(res.message);
      syncDashboardData();
    } catch (err: unknown) {
      showNotice(err instanceof Error ? err.message : "Evaluation failed");
    } finally {
      setIsEvaluatingLtGuess(false);
    }
  };

  // Reset Game 2 Buzzer Queue
  const handleResetLightningBuzzer = async (topicId: string) => {
    try {
      const res = await resetLightningBuzzer(topicId);
      showNotice(res.message);
      syncDashboardData();
    } catch (err: unknown) {
      showNotice(err instanceof Error ? err.message : "Failed to reset buzzer");
    }
  };

  // Edit Final Score
  const handleSaveFinalScore = async () => {
    if (!editFinalModal) return;
    try {
      const updated = await editFinalScore(editFinalModal.team_id, {
        tech_detective_score: editFinalG1,
        lightning_talks_score: editFinalG2,
      });
      setFinalLeaderboard((prev) =>
        prev.map((i) => (i.team_id === updated.team_id ? updated : i))
      );
      setEditFinalModal(null);
      showNotice(`Final scores updated for ${updated.team_name}`);
    } catch (err: unknown) {
      showNotice(err instanceof Error ? err.message : "Failed to edit final score");
    }
  };

  const handleConfirmResetDb = async () => {
    try {
      setIsResettingDb(true);
      const res = await resetDatabase();
      showNotice(res.message);
      setResetDbModalOpen(false);
      await syncDashboardData();
    } catch (err: unknown) {
      showNotice(err instanceof Error ? err.message : "Failed to reset database");
    } finally {
      setIsResettingDb(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      navigate("/login", { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans selection:bg-white/20">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-5 right-5 z-50 animate-in slide-in-from-top duration-300">
          <div className="bg-zinc-900 border border-zinc-700 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>{notification}</span>
          </div>
        </div>
      )}

      {/* Role Warning Banner if user is logged in as participant */}
      {currentUser && currentUser.role !== "admin" && (
        <div className="bg-amber-950/95 border-b border-amber-600/90 px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs text-amber-100 z-40 sticky top-0 shadow-lg animate-in slide-in-from-top">
          <div className="flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              Signed in as Participant: <strong>{currentUser.display_name}</strong> (@{currentUser.username}). Admin actions (creating questions, forming teams) require logging in as <strong>Admin</strong>.
            </span>
          </div>
          <Button
            size="sm"
            onClick={handleLogout}
            className="bg-amber-400 hover:bg-amber-300 text-black font-extrabold text-xs h-7 px-3 shadow"
          >
            Switch to Admin (admin / admin123) &rarr;
          </Button>
        </div>
      )}

      {/* Top Navigation Bar */}
      <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-30 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BrandLogo size="md" />
          <div className="h-5 w-px bg-zinc-800" />
          <span className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-bold bg-zinc-900 px-2.5 py-1 rounded-md border border-zinc-800">
            Admin Console
          </span>
          {currentUser && (
            <span
              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                currentUser.role === "admin"
                  ? "bg-emerald-950/80 text-emerald-400 border-emerald-800"
                  : "bg-rose-950/80 text-rose-300 border-rose-800"
              }`}
            >
              @{currentUser.username} ({currentUser.role})
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/leaderboard")}
            className="text-xs text-zinc-300 hover:text-white hover:bg-zinc-900 border border-zinc-800"
          >
            Public Leaderboard
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setResetDbModalOpen(true)}
            className="text-xs text-rose-400 hover:text-white hover:bg-rose-950/60 border border-rose-900/60 gap-1.5"
            title="Clear all participants, teams, questions, and topics"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Reset DB
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-xs text-zinc-400 hover:text-white hover:bg-zinc-900 gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            Logout
          </Button>
        </div>
      </header>

      {/* Navigation Tabs Bar */}
      <div className="border-b border-zinc-800 bg-black/90 px-6 py-2">
        <div className="max-w-6xl mx-auto flex items-center gap-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab("teams")}
            className={`px-4 py-2 rounded-lg font-bold text-xs tracking-tight transition-all flex items-center gap-2 ${
              activeTab === "teams"
                ? "bg-white text-black font-extrabold shadow-md"
                : "text-zinc-400 hover:text-white hover:bg-zinc-900"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            1. Participants & Teams ({loggedInUsers.length})
          </button>

          <button
            onClick={() => setActiveTab("games")}
            className={`px-4 py-2 rounded-lg font-bold text-xs tracking-tight transition-all flex items-center gap-2 ${
              activeTab === "games"
                ? "bg-white text-black font-extrabold shadow-md"
                : "text-zinc-400 hover:text-white hover:bg-zinc-900"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            2. Games Hub ({gamesList.length} Games)
          </button>

          <button
            onClick={() => setActiveTab("game1")}
            className={`px-4 py-2 rounded-lg font-bold text-xs tracking-tight transition-all flex items-center gap-2 ${
              activeTab === "game1"
                ? "bg-white text-black font-extrabold shadow-md"
                : "text-zinc-400 hover:text-white hover:bg-zinc-900"
            }`}
          >
            <Gamepad2 className="w-3.5 h-3.5" />
            3. Game 1: Tech Detective ({tdQuestions.length} Questions)
          </button>

          <button
            onClick={() => setActiveTab("game2")}
            className={`px-4 py-2 rounded-lg font-bold text-xs tracking-tight transition-all flex items-center gap-2 ${
              activeTab === "game2"
                ? "bg-white text-black font-extrabold shadow-md"
                : "text-zinc-400 hover:text-white hover:bg-zinc-900"
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            4. Game 2: Lightning Talks (Manual Topics)
          </button>

          {/* DYNAMIC TABS FOR ANY ADDED GAMES (Game 3, Game 4, etc.) */}
          {gamesList
            .filter((g) => g.id !== "G01" && g.id !== "G02")
            .map((game, idx) => {
              const isSelected = activeTab === game.id;
              return (
                <button
                  key={game.id}
                  onClick={() => handleOpenCustomGame(game)}
                  className={`px-4 py-2 rounded-lg font-bold text-xs tracking-tight transition-all flex items-center gap-2 whitespace-nowrap border ${
                    isSelected
                      ? "bg-amber-400 text-black font-extrabold shadow-md border-amber-300"
                      : "text-zinc-300 hover:text-white hover:bg-zinc-900 border-zinc-800"
                  }`}
                >
                  {game.icon === "mic" ? (
                    <Mic className="w-3.5 h-3.5" />
                  ) : game.icon === "zap" ? (
                    <Zap className="w-3.5 h-3.5" />
                  ) : game.icon === "code" ? (
                    <Hash className="w-3.5 h-3.5" />
                  ) : (
                    <Gamepad2 className="w-3.5 h-3.5" />
                  )}
                  {idx + 5}. {game.title} ({game.question_count ?? 0} Questions)
                </button>
              );
            })}

          <button
            onClick={() => setActiveTab("final")}
            className={`px-4 py-2 rounded-lg font-bold text-xs tracking-tight transition-all flex items-center gap-2 ${
              activeTab === "final"
                ? "bg-white text-black font-extrabold shadow-md"
                : "text-zinc-400 hover:text-white hover:bg-zinc-900"
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            {gamesList.filter((g) => g.id !== "G01" && g.id !== "G02").length + 5}. Final Combined Leaderboard
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 space-y-6">
        {/* SYNCHRONIZED GAME TIMER CONSOLE - ONLY SHOWN IN SPECIFIED GAMES */}
        {(activeTab === "game1" ||
          activeTab === "game2" ||
          gamesList.some((g) => g.id === activeTab)) && (
          <GameTimerWidget
            timer={gameTimer}
            onTimerChange={(updated) => setGameTimer(updated)}
            isAdmin={true}
            currentGameContext={
              activeTab === "game1"
                ? "tech-detective"
                : activeTab === "game2"
                ? "lightning-talks"
                : gamesList.find((g) => g.id === activeTab)?.game_code || "all"
            }
          />
        )}

        {/* TAB 1: PARTICIPANTS & RANDOM TEAM FORMATION */}
        {activeTab === "teams" && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Dynamic Team Size Controls Banner */}
            <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 shadow-xl space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                    <Users className="w-5 h-5 text-white" />
                    Participant Management & Team Division
                  </h2>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Configure your preferred team size (e.g. 2, 3, 4, 5+ members). The system partitions all participants into balanced teams.
                  </p>
                </div>

                {/* Team Size Selector & Action */}
                <div className="flex flex-wrap items-center gap-3">
                  {/* Preset team size pills */}
                  <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-xl border border-zinc-800">
                    {[2, 3, 4, 5].map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setSelectedTeamSize(size)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                          selectedTeamSize === size
                            ? "bg-white text-black font-extrabold shadow"
                            : "text-zinc-400 hover:text-white"
                        }`}
                      >
                        {size} / team
                      </button>
                    ))}
                  </div>

                  {/* Manual Stepper for custom team size */}
                  <div className="flex items-center gap-1.5 bg-zinc-900 px-3 py-1 rounded-xl border border-zinc-800">
                    <span className="text-[11px] font-bold text-zinc-400 uppercase">Size:</span>
                    <button
                      type="button"
                      onClick={() => setSelectedTeamSize((s) => Math.max(2, s - 1))}
                      className="w-6 h-6 rounded bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs flex items-center justify-center transition-colors"
                      title="Decrease team size"
                    >
                      -
                    </button>
                    <span className="font-mono font-black text-sm text-white px-1.5">
                      {selectedTeamSize}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedTeamSize((s) => Math.min(20, s + 1))}
                      className="w-6 h-6 rounded bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs flex items-center justify-center transition-colors"
                      title="Increase team size"
                    >
                      +
                    </button>
                  </div>

                  {/* Action Button */}
                  <Button
                    onClick={handleRandomizeTeams}
                    disabled={isRandomizing || loggedInUsers.length < 2}
                    className="bg-white hover:bg-zinc-200 text-black font-extrabold text-xs px-4 py-2 gap-2 shadow-lg"
                  >
                    <Shuffle className={`w-4 h-4 ${isRandomizing ? "animate-spin" : ""}`} />
                    {isRandomizing
                      ? "Forming Teams..."
                      : `Form Teams (${selectedTeamSize} per team)`}
                  </Button>
                </div>
              </div>

              {/* Partition Preview Banner */}
              {(() => {
                const poolCount = loggedInUsers.length;
                const calculatedTeams = poolCount >= 2 ? Math.min(poolCount, Math.max(2, Math.round(poolCount / selectedTeamSize))) : 1;

                return (
                  <div className="pt-3 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-400">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-zinc-400" />
                      <span>
                        Available Participants:{" "}
                        <strong className="text-white">{poolCount}</strong>
                      </span>
                    </div>

                    {poolCount >= 2 ? (
                      <span className="font-mono text-[11px] text-zinc-300 bg-zinc-900 px-2.5 py-1 rounded-md border border-zinc-800">
                        Will form{" "}
                        <strong className="text-emerald-400">
                          {calculatedTeams} teams
                        </strong>{" "}
                        (target: {selectedTeamSize} members each)
                      </span>
                    ) : (
                      <span className="text-amber-400 text-[11px]">
                        Need at least 2 participants to form teams
                      </span>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Participants List */}
            <Card className="p-6 bg-zinc-950 border-zinc-800 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-zinc-400" />
                  Participants ({loggedInUsers.length} Total)
                </h3>
                <span className="text-xs text-zinc-500">
                  Participant profiles & team assignments
                </span>
              </div>

              {loggedInUsers.length === 0 ? (
                <div className="p-8 text-center text-zinc-400 text-xs space-y-2">
                  <p className="font-semibold text-white">Fresh Database: No participants registered yet</p>
                  <p className="text-zinc-500">
                    Share the login page URL. Participants can register with their real names using the "Participant Register" tab.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {loggedInUsers.map((user) => (
                    <div
                      key={user.id}
                      className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between gap-3 shadow-md"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-sm text-white shrink-0">
                          {user.display_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-white truncate">
                            {user.display_name}
                          </p>
                          <p className="text-[10px] text-zinc-400 truncate">
                            @{user.username} · {user.team_name ? (
                              <span className="text-white font-semibold">{user.team_name}</span>
                            ) : (
                              <span className="text-zinc-500">No team</span>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Formed Teams Cards */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white tracking-tight">
                  Formed Teams ({teams.length} Teams)
                </h3>
                <span className="text-xs text-zinc-400">
                  Team names are editable by admin or team members
                </span>
              </div>

              {teams.length === 0 ? (
                <Card className="p-12 text-center bg-zinc-950/60 border-zinc-800 text-zinc-500 text-xs">
                  No teams formed yet. Click "Randomly Form Teams" above once participants have signed in.
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {teams.map((t) => (
                    <Card
                      key={t.id}
                      className="p-5 bg-zinc-950 border-zinc-800 hover:border-zinc-600 transition-colors shadow-lg space-y-4 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <span className="text-[10px] font-mono font-bold bg-zinc-900 border border-zinc-800 text-zinc-300 px-2 py-0.5 rounded">
                            {t.id} · {t.team_code}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditTeamModal(t);
                              setEditTeamNameInput(t.team_name);
                            }}
                            className="h-7 px-2 text-xs text-zinc-400 hover:text-white gap-1"
                          >
                            <Edit2 className="w-3 h-3" />
                            Edit
                          </Button>
                        </div>
                        <h4 className="text-lg font-extrabold text-white tracking-tight">
                          {t.team_name}
                        </h4>
                      </div>

                      <div className="space-y-2 pt-2 border-t border-zinc-800">
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                          Members ({t.members.length}):
                        </p>
                        <div className="space-y-1">
                          {t.members.map((m) => (
                            <div
                              key={m.id}
                              className="text-xs text-zinc-200 bg-zinc-900 px-2.5 py-1.5 rounded-md border border-zinc-800 flex items-center justify-between"
                            >
                              <span className="font-medium">{m.display_name}</span>
                              <span className="text-[10px] text-zinc-400 font-mono">@{m.username}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB: GAMES HUB & DYNAMIC ACTIVITIES CATALOG */}
        {activeTab === "games" && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Dynamic Games Hero Header */}
            <div className="p-6 rounded-2xl bg-zinc-950 border border-zinc-800 shadow-xl space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                    <Sparkles className="w-6 h-6 text-amber-400" />
                    Games Catalog & Activity Hub
                  </h2>
                  <p className="text-xs text-zinc-400 mt-1 max-w-3xl">
                    Create and launch new technical activities (e.g. Code Relay, Tech Trivia, Bug Bounty, System Design).
                    Seamlessly link each game to the synchronized countdown timer, award scores, and watch team points automatically aggregate into the Leaderboard.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    onClick={() => setCreateGameModalOpen(true)}
                    className="bg-white hover:bg-zinc-200 text-black font-extrabold text-xs gap-1.5 shadow"
                  >
                    <Plus className="w-4 h-4" />
                    + Add New Game
                  </Button>
                </div>
              </div>

              {/* Fast Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-zinc-900">
                <div className="bg-zinc-900/60 p-3 rounded-xl border border-zinc-800/80">
                  <span className="text-[10px] uppercase font-bold text-zinc-500 block">Total Activities</span>
                  <span className="text-lg font-black text-white">{gamesList.length} Games</span>
                </div>
                <div className="bg-zinc-900/60 p-3 rounded-xl border border-zinc-800/80">
                  <span className="text-[10px] uppercase font-bold text-zinc-500 block">Formed Teams</span>
                  <span className="text-lg font-black text-white">{teams.length} Teams</span>
                </div>
              </div>
            </div>

            {/* Catalog of Games Cards */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-zinc-400" />
                  Available Games & Technical Challenges ({gamesList.length})
                </h3>
                <span className="text-[11px] text-zinc-500">
                  Click "Open Game" on any activity to manage rounds and scores
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {gamesList.map((game) => {
                  const isBuiltin = game.id === "G01" || game.id === "G02";
                  return (
                    <Card
                      key={game.id}
                      className={`p-5 rounded-2xl flex flex-col justify-between transition-all border ${
                        game.is_active
                          ? "bg-zinc-950 border-emerald-900/60 hover:border-emerald-600"
                          : "bg-zinc-950 border-zinc-800 hover:border-zinc-700"
                      }`}
                    >
                      <div className="space-y-3">
                        {/* Card Top Row: Badges */}
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800">
                            {game.id} · {game.game_code}
                          </span>
                          <div className="flex items-center gap-1.5">
                            {game.is_active ? (
                              <Badge className="bg-emerald-950 text-emerald-400 border-emerald-800 text-[10px] font-bold">
                                ● ACTIVE
                              </Badge>
                            ) : (
                              <span className="text-[10px] font-mono text-zinc-500 bg-zinc-900/80 px-2 py-0.5 rounded border border-zinc-800">
                                READY
                              </span>
                            )}
                            {game.game_type && game.game_type.toLowerCase() !== "custom" && (
                              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-zinc-900 text-zinc-300 border border-zinc-800">
                                {game.game_type}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Title and Subtitle */}
                        <div>
                          <h4 className="text-lg font-black text-white flex items-center gap-2">
                            {game.icon === "mic" ? (
                              <Mic className="w-4 h-4 text-indigo-400" />
                            ) : game.icon === "zap" ? (
                              <Zap className="w-4 h-4 text-amber-400" />
                            ) : game.icon === "code" ? (
                              <Hash className="w-4 h-4 text-cyan-400" />
                            ) : (
                              <Gamepad2 className="w-4 h-4 text-emerald-400" />
                            )}
                            {game.title}
                          </h4>
                          {game.subtitle && (
                            <p className="text-xs text-zinc-400 font-medium mt-0.5">
                              {game.subtitle}
                            </p>
                          )}
                        </div>

                        {/* Description */}
                        {game.description && (
                          <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2">
                            {game.description}
                          </p>
                        )}

                        {/* Rules Preview */}
                        {game.rules && game.rules.length > 0 && (
                          <div className="p-2.5 rounded-xl bg-zinc-900/70 border border-zinc-800/80 text-[11px] text-zinc-300 space-y-1">
                            <span className="text-[10px] font-bold uppercase text-zinc-500 tracking-wider block">
                              Rules Summary
                            </span>
                            <ul className="list-disc list-inside space-y-0.5 text-zinc-400">
                              {game.rules.slice(0, 2).map((rule, idx) => (
                                <li key={idx} className="line-clamp-1">{rule}</li>
                              ))}
                              {game.rules.length > 2 && (
                                <li className="text-[10px] text-zinc-500 italic">
                                  +{game.rules.length - 2} more guidelines
                                </li>
                              )}
                            </ul>
                          </div>
                        )}
                      </div>

                      {/* Card Footer Actions */}
                      <div className="pt-4 mt-3 border-t border-zinc-900 flex items-center justify-between gap-2">
                        <Button
                          size="sm"
                          onClick={() => {
                            if (game.id === "G01") {
                              setActiveTab("game1");
                            } else if (game.id === "G02") {
                              setActiveTab("game2");
                            } else {
                              handleOpenCustomGame(game);
                            }
                          }}
                          className="text-xs bg-white text-black hover:bg-zinc-200 font-bold gap-1.5 h-8 px-3"
                        >
                          Open Game
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Button>

                        {!isBuiltin && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteGame(game)}
                            className="text-rose-400 hover:text-rose-200 hover:bg-rose-950/60 h-8 w-8 p-0"
                            title="Delete this game"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: GAME 1 - TECH DETECTIVE */}
        {activeTab === "game1" && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Header Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                  <Gamepad2 className="w-6 h-6 text-white" />
                  Game 1: Tech Detective Control Center
                </h2>
                <p className="text-xs text-zinc-400">
                  Upload custom questions with 2–4 images, set question-wise marks, evaluate buzzers (+marks, -deduction), and review scores.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  onClick={() => openCreateQuestionModal()}
                  className="bg-white hover:bg-zinc-200 text-black font-bold text-xs gap-1.5 shadow"
                >
                  <Plus className="w-4 h-4" />
                  Upload Question
                </Button>

                <Button
                  onClick={handleOpenScoreBreakdown}
                  variant="outline"
                  className="border-zinc-700 bg-zinc-900 text-white hover:bg-zinc-800 text-xs gap-1.5"
                >
                  <BarChart3 className="w-4 h-4 text-emerald-400" />
                  Question-Wise Score Matrix
                </Button>

                <Button
                  onClick={handleTransitionToGame2}
                  className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs gap-1.5 border border-zinc-700"
                >
                  Finish Game 1
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Active Question & Buzzer Answering Queue */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Question Showcase */}
              <Card className="lg:col-span-2 p-6 bg-zinc-950 border-zinc-800 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <div className="flex items-center gap-2">
                    {activeTdQuestion ? (
                      <span className="text-xs font-mono font-bold bg-emerald-950 text-emerald-400 border border-emerald-800 px-2.5 py-1 rounded">
                        Question #{activeTdQuestion.question_number} ({activeTdQuestion.points} Marks)
                      </span>
                    ) : (
                      <span className="text-xs font-mono text-zinc-500 bg-zinc-900 px-2.5 py-1 rounded border border-zinc-800">
                        No Question Currently Unlocked
                      </span>
                    )}
                  </div>
                  {activeTdQuestion && (
                    <span className="text-xs font-mono text-white font-bold">
                      Answer: <span className="text-emerald-400 underline">{activeTdQuestion.technology_name}</span>
                    </span>
                  )}
                </div>

                {!activeTdQuestion ? (
                  <div className="py-12 text-center text-zinc-500 text-xs space-y-2">
                    <Lock className="w-8 h-8 mx-auto text-zinc-600" />
                    <p className="font-semibold text-white">Select a question below to unlock for all participants.</p>
                    <p>Or click "Upload Question" to add new image sets.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <h3 className="text-xl font-bold text-white">
                      {activeTdQuestion.title}
                    </h3>

                    {/* Uploaded Question Image (1 image) */}
                    {activeTdQuestion.images && activeTdQuestion.images.length > 0 && (
                      <div className="flex justify-center pt-1">
                        <div className="rounded-2xl overflow-hidden border border-zinc-800 bg-black p-2 max-h-[340px] max-w-xl w-full flex items-center justify-center shadow-xl">
                          <img
                            src={activeTdQuestion.images[0].url}
                            alt="Question Image"
                            className="max-h-[320px] w-full object-contain rounded-xl"
                          />
                        </div>
                      </div>
                    )}

                    <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 text-xs space-y-1">
                      <p className="text-zinc-400">
                        <strong className="text-white">Marks for Correct Answer:</strong> +{activeTdQuestion.points} pts
                        {" · "}<strong className="text-white">Deduction for Wrong:</strong> -{activeTdQuestion.deduction} pts
                      </p>
                      {activeTdQuestion.accepted_answers.length > 0 && (
                        <p className="text-zinc-400">
                          <strong className="text-white">Accepted Synonyms:</strong> {activeTdQuestion.accepted_answers.join(", ")}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </Card>

              {/* Buzzer Queue & Answer Evaluation Panel */}
              <Card className="p-6 bg-zinc-950 border-zinc-800 shadow-xl space-y-5">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Bell className="w-4 h-4 text-amber-400" />
                    Buzzer Queue (Top 3)
                  </h3>
                  <Badge variant={buzzerQueue?.is_buzzer_open ? "success" : "muted"} className="text-[10px]">
                    {buzzerQueue?.is_buzzer_open ? "Buzzer Open" : "Locked"}
                  </Badge>
                </div>

                {!buzzerQueue || buzzerQueue.buzzers.length === 0 ? (
                  <p className="text-xs text-zinc-500 text-center py-8">
                    No teams in queue. Unlock a question to open the buzzer.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {buzzerQueue.buzzers.map((b) => {
                      const isCurrentAnswering = b.position === buzzerQueue.current_answering_position;
                      const qPts = activeTdQuestion?.points ?? 10;
                      const pointsForCorrect = b.position === 1 ? qPts : Math.max(1, qPts - (b.position - 1));
                      const penalty = activeTdQuestion?.deduction ?? 2;

                      return (
                        <div
                          key={b.id}
                          className={`p-3 rounded-xl border space-y-2 transition-all ${
                            isCurrentAnswering
                              ? "bg-zinc-900 border-white shadow-lg shadow-white/5"
                              : "bg-zinc-900/40 border-zinc-800"
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-white text-xs">
                                #{b.position}
                              </span>
                              <strong className="text-white">{b.team_name}</strong>
                            </div>
                            {isCurrentAnswering && (
                              <Badge variant="warning" className="text-[9px] uppercase font-bold">
                                Turn to Answer
                              </Badge>
                            )}
                          </div>

                          {/* Evaluation Action Buttons */}
                          {isCurrentAnswering && (
                            <div className="flex items-center gap-2 pt-1">
                              <Button
                                size="sm"
                                disabled={isEvaluating}
                                onClick={() => handleEvaluateAnswer(b.team_id, b.position, true)}
                                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-black font-black text-xs gap-1"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Correct (+{pointsForCorrect})
                              </Button>
                              <Button
                                size="sm"
                                variant="danger"
                                disabled={isEvaluating}
                                onClick={() => handleEvaluateAnswer(b.team_id, b.position, false)}
                                className="flex-1 text-xs font-bold gap-1"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                Incorrect (-{penalty})
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            </div>

            {/* Question Catalog List */}
            <Card className="p-6 bg-zinc-950 border-zinc-800 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Question Bank ({tdQuestions.length} Questions)
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Each question displays 1 image with question-wise marks.
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => openCreateQuestionModal()}
                  className="bg-white hover:bg-zinc-200 text-black font-bold text-xs gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Question
                </Button>
              </div>

              {tdQuestions.length === 0 ? (
                <div className="text-center py-10 text-zinc-500 text-xs space-y-2">
                  <ImageIcon className="w-8 h-8 mx-auto text-zinc-600" />
                  <p className="font-semibold text-white">No questions uploaded yet</p>
                  <p>Click "Add Question" to upload your first question with 1 image!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {tdQuestions.map((q) => (
                    <div
                      key={q.id}
                      className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between ${
                        q.is_unlocked
                          ? "bg-zinc-900 border-white ring-1 ring-white/30"
                          : q.is_completed
                          ? "bg-zinc-950 border-zinc-800 opacity-60"
                          : "bg-zinc-900/60 border-zinc-800 hover:border-zinc-700"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-bold text-zinc-400 font-mono">#{q.question_number}</span>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-zinc-400 font-mono">
                              +{q.points} pts
                            </span>
                            {q.is_unlocked ? (
                              <Badge variant="purple" className="text-[9px]">ACTIVE</Badge>
                            ) : q.is_completed ? (
                              <Badge variant="muted" className="text-[9px]">Done</Badge>
                            ) : (
                              <Badge variant="muted" className="text-[9px]">Locked</Badge>
                            )}
                          </div>
                        </div>
                        <p className="text-xs font-bold text-white line-clamp-1">{q.title}</p>
                        <p className="text-[11px] text-emerald-400 font-semibold mt-0.5">
                          {q.technology_name}
                        </p>
                      </div>

                      <div className="mt-3 pt-2 border-t border-zinc-800 flex items-center justify-between">
                        <span className="text-[10px] text-zinc-500">1 image</span>
                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openCreateQuestionModal(q)}
                            className="h-7 w-7 p-0 text-zinc-500 hover:text-white"
                            title="Edit Question"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteQuestion(q.id, q.question_number)}
                            className="h-7 w-7 p-0 text-zinc-500 hover:text-rose-400"
                            title="Delete Question"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant={q.is_unlocked ? "secondary" : "outline"}
                            onClick={() => handleUnlockQuestion(q.id)}
                            className="h-7 text-xs px-2.5 gap-1 border-zinc-700"
                          >
                            <Unlock className="w-3 h-3" />
                            {q.is_unlocked ? "Active" : "Unlock"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Game 1 Leaderboard with Admin Edit */}
            <Card className="p-6 bg-zinc-950 border-zinc-800 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  Tech Detective Leaderboard (Admin Editable)
                </h3>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleOpenScoreBreakdown}
                  className="text-xs border-zinc-700 text-zinc-300"
                >
                  View Question-Wise Breakdown
                </Button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-400 uppercase font-bold">
                      <th className="py-2.5 px-3">Rank</th>
                      <th className="py-2.5 px-3">Team Name</th>
                      <th className="py-2.5 px-3 text-center">Score</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {tdLeaderboard.map((item) => (
                      <tr key={item.team_id} className="hover:bg-zinc-900/60">
                        <td className="py-2.5 px-3 font-mono font-bold">#{item.rank}</td>
                        <td className="py-2.5 px-3 font-bold text-white">{item.team_name}</td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-white">
                          {item.score} pts
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditTdScoreModal(item);
                              setEditTdScoreValue(item.score);
                            }}
                            className="h-7 text-xs text-zinc-400 hover:text-white"
                          >
                            <Edit2 className="w-3 h-3 mr-1" />
                            Edit
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* TAB 3: GAME 2 - LIGHTNING TALKS (MANUAL TOPIC ASSIGNMENT) */}
        {activeTab === "game2" && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Controls Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                  <Mic className="w-6 h-6 text-white" />
                  Game 2: Lightning Talks
                </h2>
                <p className="text-xs text-zinc-400">
                  Admin adds topics and assigns to teams & participants. 1-Minute speech evaluated on Time, Words, and Understandability.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setCreateTopicModalOpen(true)}
                  className="bg-white hover:bg-zinc-200 text-black font-extrabold text-xs gap-1.5 shadow"
                >
                  <Plus className="w-4 h-4" />
                  Add Topic
                </Button>

                <Button
                  onClick={() => setActiveTab("final")}
                  className="bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-700 font-extrabold text-xs gap-1.5 shadow"
                >
                  View Final Leaderboard
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Active Speaker & Topic Guessing Buzzer Console */}
            {(() => {
              const activeLtTopic = ltTopics.find((t) => t.is_unlocked);
              if (!activeLtTopic) {
                return (
                  <Card className="p-6 bg-zinc-950 border-zinc-800 shadow-xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500">
                        <Mic className="w-5 h-5 text-zinc-400" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">No Speaker Currently On Air</h3>
                        <p className="text-xs text-zinc-400">
                          Click "Unlock" next to any participant below to put them on air, start their timer, and open topic guessing buzzer.
                        </p>
                      </div>
                    </div>
                  </Card>
                );
              }

              const answeringTeam = teams.find((t) => t.id === activeLtTopic.current_answering_team_id);

              return (
                <Card className="p-6 bg-zinc-950 border-zinc-700 shadow-2xl relative overflow-hidden space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-emerald-950 text-emerald-400 border-emerald-800 text-xs font-bold">
                          ● ON AIR SPEAKER
                        </Badge>
                        <span className="text-xs font-mono text-zinc-400">
                          {activeLtTopic.id}
                        </span>
                      </div>
                      <h3 className="text-xl font-black text-white mt-1">
                        Speaker: {activeLtTopic.assigned_user_name || "Assigned User"}
                        {activeLtTopic.assigned_team_name ? (
                          <span className="text-zinc-400 text-sm font-medium ml-2">({activeLtTopic.assigned_team_name})</span>
                        ) : null}
                      </h3>
                      <p className="text-sm font-bold text-emerald-400 mt-0.5">
                        Topic: <span className="text-white underline">{activeLtTopic.topic_name}</span>
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {!activeLtTopic.is_buzzer_open ? (
                        <Button
                          onClick={() => handleOpenLightningBuzzer(activeLtTopic.id)}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs gap-1.5 shadow"
                        >
                          <Zap className="w-4 h-4 fill-white" />
                          Open Buzzer for Topic Guessing
                        </Button>
                      ) : (
                        <Badge className="bg-rose-950 text-rose-300 border-rose-800 text-xs font-bold animate-pulse px-3 py-1.5">
                          🚨 BUZZER OPEN FOR GUESSING (MAX 3)
                        </Badge>
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleResetLightningBuzzer(activeLtTopic.id)}
                        className="text-xs border-zinc-700 bg-zinc-900 text-zinc-300 hover:text-white"
                      >
                        Reset Buzzer Queue
                      </Button>
                    </div>
                  </div>

                  {/* Prohibited words reminder */}
                  {activeLtTopic.prohibited_words && activeLtTopic.prohibited_words.length > 0 && (
                    <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center gap-2 text-xs">
                      <span className="font-bold text-rose-400">Prohibited Words:</span>
                      <span className="text-zinc-300 font-mono">{activeLtTopic.prohibited_words.join(", ")}</span>
                    </div>
                  )}

                  {/* Buzzer Race & Grading Queue */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
                    {/* Live Buzzer Queue */}
                    <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-3">
                      <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center justify-between">
                        <span>Live Buzzer Queue (Top 3)</span>
                        <span className="font-mono text-zinc-400">
                          {ltBuzzerQueue?.buzzers?.length || 0} / 3 Teams
                        </span>
                      </h4>

                      {!ltBuzzerQueue || ltBuzzerQueue.buzzers.length === 0 ? (
                        <p className="text-xs text-zinc-500 py-4 text-center">
                          {activeLtTopic.is_buzzer_open
                            ? "Waiting for audience teams to press their buzzer..."
                            : "Click 'Open Buzzer for Topic Guessing' when speaker finishes their talk."}
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {ltBuzzerQueue.buzzers.map((b) => (
                            <div
                              key={b.id}
                              className={`p-2.5 rounded-lg border flex items-center justify-between text-xs ${
                                activeLtTopic.current_answering_position === b.position
                                  ? "bg-amber-950/40 border-amber-500/80 text-white font-bold"
                                  : "bg-zinc-900 border-zinc-800 text-zinc-300"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className={`w-6 h-6 rounded-full flex items-center justify-center font-mono font-bold text-xs ${
                                  b.position === 1 ? "bg-amber-400 text-black" : b.position === 2 ? "bg-zinc-300 text-black" : "bg-amber-800 text-white"
                                }`}>
                                  #{b.position}
                                </span>
                                <span>{b.team_name}</span>
                              </div>
                              {activeLtTopic.current_answering_position === b.position ? (
                                <Badge className="bg-amber-400 text-black text-[10px] font-extrabold">
                                  Current Turn
                                </Badge>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Active Answering Opportunity & Scoring Controls */}
                    <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 flex flex-col justify-between space-y-3">
                      <div>
                        <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                          Guess Evaluation (+10 Correct / -5 Incorrect)
                        </h4>

                        {activeLtTopic.current_answering_team_id && answeringTeam ? (
                          <div className="mt-3 p-3 rounded-lg bg-zinc-950 border border-zinc-800 space-y-2">
                            <p className="text-xs text-zinc-400">
                              Currently Answering:{" "}
                              <strong className="text-white text-sm">
                                {answeringTeam.team_name} (Position #{activeLtTopic.current_answering_position})
                              </strong>
                            </p>
                            <p className="text-[11px] text-zinc-400">
                              Listen to the team's guessed technical topic name.
                            </p>
                          </div>
                        ) : (
                          <p className="text-xs text-zinc-500 mt-4">
                            No team is currently at the answering stage.
                          </p>
                        )}
                      </div>

                      {activeLtTopic.current_answering_team_id && activeLtTopic.current_answering_position ? (
                        <div className="flex items-center gap-3 pt-2">
                          <Button
                            disabled={isEvaluatingLtGuess}
                            onClick={() =>
                              handleEvaluateLightningGuess(
                                activeLtTopic.id,
                                activeLtTopic.current_answering_team_id!,
                                activeLtTopic.current_answering_position!,
                                true
                              )
                            }
                            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs gap-1 shadow"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            Correct (+10 pts)
                          </Button>

                          <Button
                            disabled={isEvaluatingLtGuess}
                            onClick={() =>
                              handleEvaluateLightningGuess(
                                activeLtTopic.id,
                                activeLtTopic.current_answering_team_id!,
                                activeLtTopic.current_answering_position!,
                                false
                              )
                            }
                            className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs gap-1 shadow"
                          >
                            <XCircle className="w-4 h-4" />
                            Incorrect (-5 pts)
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </Card>
              );
            })()}

            {/* Created Topics & Topic Pool Section */}
            <Card className="p-6 bg-zinc-950 border-zinc-800 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Mic className="w-4 h-4 text-white" />
                    Topic Pool ({ltTopics.length} Topics Created)
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Create topics here ahead of time or assign them directly to speakers.
                  </p>
                </div>

                <Button
                  size="sm"
                  onClick={() => setCreateTopicModalOpen(true)}
                  className="bg-white hover:bg-zinc-200 text-black font-bold text-xs gap-1.5 shadow"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Topic
                </Button>
              </div>

              {ltTopics.length === 0 ? (
                <div className="py-8 text-center text-zinc-500 text-xs space-y-2">
                  <Mic className="w-8 h-8 mx-auto text-zinc-600" />
                  <p className="font-semibold text-white">No topics created yet.</p>
                  <p>Click "Add Topic" to create speaking topics for Game 2.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {ltTopics.map((topic) => (
                    <div
                      key={topic.id}
                      className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 flex flex-col justify-between space-y-2"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono text-zinc-400 font-bold bg-zinc-800 px-2 py-0.5 rounded">
                            {topic.id}
                          </span>
                          {topic.assigned_user_id ? (
                            <Badge variant="purple" className="text-[10px]">
                              Assigned
                            </Badge>
                          ) : (
                            <Badge variant="muted" className="text-[10px]">
                              Available in Pool
                            </Badge>
                          )}
                        </div>

                        <h4 className="text-sm font-bold text-white mt-1.5">{topic.topic_name}</h4>
                        {topic.description && (
                          <p className="text-[11px] text-zinc-400 mt-1 line-clamp-2">
                            {topic.description}
                          </p>
                        )}
                        {topic.prohibited_words && topic.prohibited_words.length > 0 && (
                          <p className="text-[10px] text-zinc-400 mt-1 font-mono">
                            Prohibited: {topic.prohibited_words.join(", ")}
                          </p>
                        )}
                        {topic.assigned_user_name && (
                          <p className="text-[11px] text-white font-medium mt-1">
                            Speaker: <strong className="text-white">{topic.assigned_user_name}</strong>
                            {topic.assigned_team_name ? ` (${topic.assigned_team_name})` : ""}
                          </p>
                        )}
                      </div>

                      <div className="pt-2 border-t border-zinc-800 flex items-center justify-between">
                        {topic.assigned_user_id ? (
                          <Button
                            size="sm"
                            variant={topic.is_unlocked ? "secondary" : "outline"}
                            onClick={() => handleUnlockTopic(topic.id)}
                            className="h-7 text-xs px-2 gap-1 border-zinc-700"
                          >
                            <Unlock className="w-3 h-3" />
                            {topic.is_unlocked ? "On Air" : "Unlock"}
                          </Button>
                        ) : (
                          <span className="text-[10px] text-zinc-500 italic">Available in Pool</span>
                        )}

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteTopic(topic.id, topic.topic_name)}
                          className="h-7 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 p-1"
                          title="Delete topic"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Teams and Manual Topic Inputs */}
            <div className="space-y-6">
              {teams.length === 0 ? (
                <Card className="p-12 text-center bg-zinc-950 border-zinc-800 text-zinc-500 text-xs">
                  No teams formed yet. Please form teams in Tab 1 first before assigning topics.
                </Card>
              ) : (
                teams.map((team) => (
                  <Card key={team.id} className="p-6 bg-zinc-950 border-zinc-800 shadow-xl space-y-4">
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                      <div>
                        <span className="text-[10px] font-mono font-bold bg-zinc-900 border border-zinc-800 text-zinc-400 px-2 py-0.5 rounded">
                          {team.id} · {team.team_code}
                        </span>
                        <h3 className="text-lg font-black text-white mt-1">
                          {team.team_name}
                        </h3>
                      </div>
                      <span className="text-xs text-zinc-400 font-mono">
                        {team.members.length} Members
                      </span>
                    </div>

                    {/* Member Topic Assigners */}
                    <div className="space-y-3">
                      {team.members.map((member) => {
                        // Find assigned topic if exists
                        const assignedTopic = ltTopics.find(
                          (t) => t.assigned_user_id === member.id
                        );
                        const draftValue =
                          topicDrafts[member.id] !== undefined
                            ? topicDrafts[member.id]
                            : assignedTopic?.topic_name || "";

                        const unassignedTopics = ltTopics.filter((t) => !t.assigned_user_id);

                        return (
                          <div
                            key={member.id}
                            className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-3"
                          >
                            {/* Member info */}
                            <div className="min-w-[180px]">
                              <p className="text-xs font-bold text-white">{member.display_name}</p>
                              <p className="text-[10px] text-zinc-500 font-mono">@{member.username}</p>
                            </div>

                            {/* Manual Topic Input & Pool Selector */}
                            <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                              <Input
                                type="text"
                                placeholder="Type topic manually or select from pool below..."
                                value={draftValue}
                                onChange={(e) =>
                                  setTopicDrafts((prev) => ({
                                    ...prev,
                                    [member.id]: e.target.value,
                                  }))
                                }
                                className="bg-black border-zinc-800 text-xs text-white placeholder:text-zinc-600 focus:border-white flex-1"
                              />

                              {unassignedTopics.length > 0 && (
                                <select
                                  onChange={(e) => {
                                    if (e.target.value) {
                                      setTopicDrafts((prev) => ({
                                        ...prev,
                                        [member.id]: e.target.value,
                                      }));
                                    }
                                  }}
                                  defaultValue=""
                                  className="h-9 px-2 text-xs bg-zinc-950 border border-zinc-800 rounded-md text-zinc-300 focus:border-white shrink-0"
                                >
                                  <option value="" disabled>
                                    Pick from pool ({unassignedTopics.length})...
                                  </option>
                                  {unassignedTopics.map((t) => (
                                    <option key={t.id} value={t.topic_name}>
                                      {t.topic_name}
                                    </option>
                                  ))}
                                </select>
                              )}

                              <Button
                                size="sm"
                                disabled={savingTopicUserId === member.id || !draftValue.trim()}
                                onClick={() => handleSaveManualTopic(member.id, team.id)}
                                className="h-9 px-3 text-xs bg-white text-black hover:bg-zinc-200 font-bold shrink-0 gap-1"
                              >
                                <Save className="w-3.5 h-3.5" />
                                Save
                              </Button>
                            </div>

                            {/* Unlock & Evaluate controls */}
                            <div className="flex items-center gap-2 shrink-0">
                              {assignedTopic ? (
                                <>
                                  <Button
                                    size="sm"
                                    variant={assignedTopic.is_unlocked ? "secondary" : "outline"}
                                    onClick={() => handleUnlockTopic(assignedTopic.id)}
                                    className="h-8 text-xs px-2.5 gap-1 border-zinc-700"
                                  >
                                    <Unlock className="w-3 h-3" />
                                    {assignedTopic.is_unlocked ? "On Air" : "Unlock"}
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      setEvaluatingTopic(assignedTopic);
                                      setTimeScore(8);
                                      setWordsScore(8);
                                      setUnderstandScore(8);
                                      setEvalNotes("");
                                    }}
                                    className="h-8 text-xs px-2.5 bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 font-bold"
                                  >
                                    Evaluate
                                  </Button>
                                </>
                              ) : (
                                <span className="text-[11px] text-zinc-500 italic">Save topic first</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                ))
              )}
            </div>

            {/* Game 2 Leaderboard */}
            <Card className="p-6 bg-zinc-950 border-zinc-800 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  Lightning Talks Leaderboard (Admin Editable)
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-400 uppercase font-bold">
                      <th className="py-2.5 px-3">Rank</th>
                      <th className="py-2.5 px-3">Team Name</th>
                      <th className="py-2.5 px-3 text-center">Score</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {ltLeaderboard.map((item) => (
                      <tr key={item.team_id} className="hover:bg-zinc-900/60">
                        <td className="py-2.5 px-3 font-mono font-bold">#{item.rank}</td>
                        <td className="py-2.5 px-3 font-bold text-white">{item.team_name}</td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-white">
                          {item.score} pts
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditLtScoreModal(item);
                              setEditLtScoreValue(item.score);
                            }}
                            className="h-7 text-xs text-zinc-400 hover:text-white"
                          >
                            <Edit2 className="w-3 h-3 mr-1" />
                            Edit
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* DYNAMIC GAME CONSOLE & QUESTION BANK (FOR ANY ADDED GAME: GAME 3, GAME 4, ETC.) */}
        {activeTab !== "teams" &&
          activeTab !== "games" &&
          activeTab !== "game1" &&
          activeTab !== "game2" &&
          activeTab !== "final" &&
          (() => {
            const currentGame =
              gamesList.find((g) => g.id === activeTab || g.game_code === activeTab) ||
              selectedCustomGame;
            if (!currentGame) return null;

            return (
              <div className="space-y-8 animate-in fade-in duration-300">
                {/* Header Banner */}
                <div className="p-6 rounded-2xl bg-zinc-950 border border-zinc-800 shadow-xl space-y-4">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800">
                          {currentGame.id} · {currentGame.game_code}
                        </span>
                        {currentGame.game_type && currentGame.game_type.toLowerCase() !== "custom" && (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-950/80 text-amber-400 border border-amber-800">
                            {currentGame.game_type}
                          </span>
                        )}
                        {currentGame.is_active ? (
                          <Badge className="bg-emerald-950 text-emerald-400 border-emerald-800 text-[10px] font-bold">
                            ● ACTIVE GAME
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleActivateGame(currentGame)}
                            className="h-6 text-[11px] bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-1 px-2.5 py-0 rounded shadow"
                          >
                            <Play className="w-3 h-3 fill-white" />
                            Set as Active Game
                          </Button>
                        )}
                      </div>

                      <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2 mt-2">
                        {currentGame.icon === "mic" ? (
                          <Mic className="w-6 h-6 text-indigo-400" />
                        ) : currentGame.icon === "zap" ? (
                          <Zap className="w-6 h-6 text-amber-400" />
                        ) : currentGame.icon === "code" ? (
                          <Hash className="w-6 h-6 text-cyan-400" />
                        ) : (
                          <Gamepad2 className="w-6 h-6 text-emerald-400" />
                        )}
                        {currentGame.title} Control Center
                      </h2>
                      {currentGame.subtitle && (
                        <p className="text-xs text-zinc-300 font-medium mt-0.5">
                          {currentGame.subtitle}
                        </p>
                      )}
                      {currentGame.description && (
                        <p className="text-xs text-zinc-400 mt-1 max-w-3xl">
                          {currentGame.description}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        onClick={handleOpenAddCustomQuestionModal}
                        className="bg-white hover:bg-zinc-200 text-black font-extrabold text-xs gap-1.5 shadow"
                      >
                        <Plus className="w-4 h-4" />
                        + Add Question / Challenge
                      </Button>

                      <Button
                        onClick={() =>
                          controlGameTimer({
                            action: "set_duration",
                            duration_seconds: currentGame.default_timer_seconds,
                            game: currentGame.game_code,
                          }).then((t) => {
                            setGameTimer(t);
                            showNotice(
                              `Timer duration set to ${currentGame.default_timer_seconds}s for ${currentGame.title}`
                            );
                          })
                        }
                        variant="outline"
                        className="text-xs border-zinc-700 bg-zinc-900 text-white gap-1.5"
                      >
                        <Clock className="w-4 h-4 text-amber-400" />
                        Set Timer ({currentGame.default_timer_seconds}s)
                      </Button>

                      <Button
                        onClick={() => setActiveTab("games")}
                        variant="ghost"
                        className="text-xs text-zinc-400 hover:text-white"
                      >
                        Back to Games Hub →
                      </Button>
                    </div>
                  </div>

                  {/* Rules preview */}
                  {currentGame.rules && currentGame.rules.length > 0 && (
                    <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 text-xs space-y-1">
                      <span className="text-[10px] font-bold uppercase text-zinc-500 tracking-wider">
                        Rules & Evaluation Criteria
                      </span>
                      <ul className="list-disc list-inside space-y-0.5 text-zinc-300">
                        {currentGame.rules.map((rule, idx) => (
                          <li key={idx}>{rule}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Active Question Showcase & Buzzer Queue */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 space-y-6">
                    <Card className="p-6 bg-zinc-950 border-zinc-800 shadow-xl space-y-4">
                      <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                        <div className="flex items-center gap-2">
                          {activeCustomQuestion ? (
                            <span className="text-xs font-mono font-bold bg-emerald-950 text-emerald-400 border border-emerald-800 px-2.5 py-1 rounded">
                              Question #{activeCustomQuestion.question_number} (+{activeCustomQuestion.points} pts)
                            </span>
                          ) : (
                            <span className="text-xs font-mono text-zinc-500 bg-zinc-900 px-2.5 py-1 rounded border border-zinc-800">
                              No Question Currently Unlocked
                            </span>
                          )}
                          {activeCustomQuestion?.question_type && activeCustomQuestion.question_type.toLowerCase() !== "custom" && (
                            <span className="text-[10px] uppercase font-bold text-zinc-500 px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800">
                              {activeCustomQuestion.question_type}
                            </span>
                          )}
                        </div>
                        {activeCustomQuestion?.correct_answer && (
                          <span className="text-xs font-mono text-white font-bold">
                            Answer: <span className="text-emerald-400 underline">{activeCustomQuestion.correct_answer}</span>
                          </span>
                        )}
                      </div>

                      {!activeCustomQuestion ? (
                        <div className="py-12 text-center text-zinc-500 text-xs space-y-2">
                          <Lock className="w-8 h-8 mx-auto text-zinc-600" />
                          <p className="font-semibold text-white">Select a question below to unlock for all participants.</p>
                          <p>Or click "+ Add Question / Challenge" to create new questions.</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <h3 className="text-xl font-bold text-white">
                            {activeCustomQuestion.title}
                          </h3>

                          {activeCustomQuestion.description && (
                            <p className="text-xs text-zinc-300 leading-relaxed bg-zinc-900/60 p-3 rounded-xl border border-zinc-800 whitespace-pre-wrap font-mono">
                              {activeCustomQuestion.description}
                            </p>
                          )}

                          {(activeCustomQuestion.media_url || activeCustomQuestion.image_url) && (
                            <div className="pt-2">
                              <MediaViewer
                                mediaUrl={activeCustomQuestion.media_url || activeCustomQuestion.image_url}
                                mediaType={activeCustomQuestion.media_type}
                                title={activeCustomQuestion.title}
                              />
                            </div>
                          )}

                          {activeCustomQuestion.options && activeCustomQuestion.options.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                              {activeCustomQuestion.options.map((opt, idx) => (
                                <div
                                  key={idx}
                                  className={`p-3 rounded-xl border text-xs font-medium flex items-center justify-between ${
                                    opt === activeCustomQuestion.correct_answer
                                      ? "bg-emerald-950/60 border-emerald-700 text-emerald-300"
                                      : "bg-zinc-900 border-zinc-800 text-zinc-300"
                                  }`}
                                >
                                  <span>{opt}</span>
                                  {opt === activeCustomQuestion.correct_answer && (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 text-xs flex items-center justify-between">
                            <span className="text-zinc-400">
                              <strong className="text-white">Marks:</strong> +{activeCustomQuestion.points} pts
                              {" · "}
                              <strong className="text-white">Deduction:</strong> -{activeCustomQuestion.deduction} pts
                            </span>
                            <span className="text-zinc-400 font-mono">
                              Time: {activeCustomQuestion.time_limit_seconds || currentGame.default_timer_seconds}s
                            </span>
                          </div>
                        </div>
                      )}
                    </Card>

                    {/* Buzzer Queue & Answer Evaluation Panel */}
                    <Card className="p-6 bg-zinc-950 border-zinc-800 shadow-xl space-y-4">
                      <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                        <div className="flex items-center gap-2">
                          <Bell className="w-4 h-4 text-amber-400" />
                          <h3 className="text-sm font-bold text-white">
                            Buzzer Queue (Top 3)
                          </h3>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={customBuzzerQueue?.is_buzzer_open ? "success" : "muted"}
                            className="text-[10px]"
                          >
                            {customBuzzerQueue?.is_buzzer_open ? "Buzzer Open" : "Locked"}
                          </Badge>
                          {activeCustomQuestion && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleResetCustomGameBuzzer}
                              className="h-6 text-[10px] px-2 border-zinc-700 bg-zinc-900 text-zinc-300 hover:text-white"
                            >
                              Reset Buzzer
                            </Button>
                          )}
                        </div>
                      </div>

                      {!customBuzzerQueue || customBuzzerQueue.buzzers.length === 0 ? (
                        <p className="text-xs text-zinc-500 text-center py-6">
                          No teams have buzzed yet. Participants will see the "BUZZ NOW" button when a question is active.
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {customBuzzerQueue.buzzers.map((b) => {
                            const isCurrentAnswering =
                              b.position === customBuzzerQueue.current_answering_position;
                            const qPts = activeCustomQuestion?.points ?? 10;
                            const pointsForCorrect =
                              b.position === 1 ? qPts : Math.max(1, qPts - (b.position - 1));
                            const penalty = activeCustomQuestion?.deduction ?? 2;

                            return (
                              <div
                                key={b.id}
                                className={`p-3 rounded-xl border space-y-2 transition-all ${
                                  isCurrentAnswering
                                    ? "bg-zinc-900 border-white shadow-lg shadow-white/5"
                                    : "bg-zinc-900/40 border-zinc-800"
                                }`}
                              >
                                <div className="flex items-center justify-between text-xs">
                                  <div className="flex items-center gap-2">
                                    <span className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-white text-xs">
                                      #{b.position}
                                    </span>
                                    <strong className="text-white">{b.team_name}</strong>
                                  </div>
                                  {isCurrentAnswering ? (
                                    <Badge variant="warning" className="text-[9px] uppercase font-bold animate-pulse">
                                      Turn to Answer
                                    </Badge>
                                  ) : (
                                    <span className="text-[10px] text-zinc-500 font-mono">
                                      {new Date(b.pressed_at).toLocaleTimeString([], {
                                        minute: "2-digit",
                                        second: "2-digit",
                                      })}
                                    </span>
                                  )}
                                </div>

                                {/* Evaluation Action Buttons */}
                                {isCurrentAnswering && (
                                  <div className="flex items-center gap-2 pt-1">
                                    <Button
                                      size="sm"
                                      disabled={isEvaluatingCustom}
                                      onClick={() =>
                                        handleEvaluateCustomGameAnswer(b.team_id, b.position, true)
                                      }
                                      className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-black font-black text-xs gap-1"
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      Correct (+{pointsForCorrect})
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="danger"
                                      disabled={isEvaluatingCustom}
                                      onClick={() =>
                                        handleEvaluateCustomGameAnswer(b.team_id, b.position, false)
                                      }
                                      className="flex-1 text-xs font-bold gap-1"
                                    >
                                      <XCircle className="w-3.5 h-3.5" />
                                      Incorrect (-{penalty})
                                    </Button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </Card>
                  </div>

                  {/* Fast Question Bank Sidebar */}
                  <Card className="p-5 bg-zinc-950 border-zinc-800 shadow-xl space-y-4 flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                        <h4 className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-bold">
                          Question Pool ({customGameQuestions.length})
                        </h4>
                        <Button
                          size="sm"
                          onClick={handleOpenAddCustomQuestionModal}
                          className="h-7 px-2 text-[11px] bg-white text-black hover:bg-zinc-200 font-bold"
                        >
                          + Add
                        </Button>
                      </div>

                      {customGameQuestions.length === 0 ? (
                        <div className="py-8 text-center text-zinc-500 text-xs">
                          No questions added yet. Click "+ Add" to create your first question for {currentGame.title}.
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                          {customGameQuestions.map((q) => (
                            <div
                              key={q.id}
                              className={`p-3 rounded-xl border text-xs transition-all space-y-1.5 ${
                                q.is_unlocked
                                  ? "bg-emerald-950/40 border-emerald-700/80 shadow"
                                  : "bg-zinc-900 border-zinc-800 hover:border-zinc-700"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-bold text-white truncate">
                                  #{q.question_number} {q.title}
                                </span>
                                {q.is_unlocked ? (
                                  <Badge className="bg-emerald-950 text-emerald-400 border-emerald-800 text-[9px] font-bold">
                                    ACTIVE
                                  </Badge>
                                ) : (
                                  <Button
                                    size="sm"
                                    onClick={() => handleUnlockCustomQuestion(q)}
                                    className="h-6 px-2 text-[10px] bg-zinc-800 hover:bg-emerald-900 text-white font-bold"
                                  >
                                    <Unlock className="w-2.5 h-2.5 mr-1" />
                                    Unlock
                                  </Button>
                                )}
                              </div>

                              <div className="flex items-center justify-between text-[10px] text-zinc-400">
                                <span>+{q.points} pts</span>
                                <button
                                  onClick={() => handleDeleteCustomQuestion(q)}
                                  className="text-rose-400 hover:text-rose-300 p-1"
                                  title="Delete question"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </Card>
                </div>

                {/* Leaderboard with Admin Edit (Matches Game 1 & Game 2) */}
                <Card className="p-6 bg-zinc-950 border-zinc-800 shadow-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-amber-400" />
                      {currentGame.title} Leaderboard (Admin Editable)
                    </h3>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-zinc-800 text-zinc-400 uppercase font-bold">
                          <th className="py-2.5 px-3">Rank</th>
                          <th className="py-2.5 px-3">Team Name</th>
                          <th className="py-2.5 px-3 text-center">Score</th>
                          <th className="py-2.5 px-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/60">
                        {getCustomGameLeaderboard(currentGame.game_code).map((item) => (
                          <tr key={item.team_id} className="hover:bg-zinc-900/60">
                            <td className="py-2.5 px-3 font-mono font-bold">#{item.rank}</td>
                            <td className="py-2.5 px-3 font-bold text-white">{item.team_name}</td>
                            <td className="py-2.5 px-3 text-center font-mono font-bold text-white">
                              {item.score} pts
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditCustomScoreModal({
                                    team_id: item.team_id,
                                    team_name: item.team_name,
                                    game_code: currentGame.game_code,
                                    game_title: currentGame.title,
                                    score: item.score,
                                  });
                                  setEditCustomScoreValue(item.score);
                                }}
                                className="h-7 text-xs text-zinc-400 hover:text-white"
                              >
                                <Edit2 className="w-3 h-3 mr-1" />
                                Edit
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            );
          })()}

        {/* TAB 4: FINAL COMBINED LEADERBOARD */}
        {activeTab === "final" && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                  <Trophy className="w-6 h-6 text-amber-400" />
                  Final Combined Leaderboard
                </h2>
                <p className="text-xs text-zinc-400">
                  Total Score = Game 1 (Tech Detective) + Game 2 (Lightning Talks). Admin has full permission to edit and override scores.
                </p>
              </div>

              <Button
                onClick={() => navigate("/leaderboard")}
                variant="outline"
                className="text-xs border-zinc-700 bg-zinc-900 text-white gap-1.5"
              >
                View Public Presentation Screen
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            <Card className="p-6 bg-zinc-950 border-zinc-800 shadow-2xl space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-400 uppercase font-bold">
                      <th className="py-3 px-3">Rank</th>
                      <th className="py-3 px-3">Team</th>
                      <th className="py-3 px-3 text-center">Game 1: Tech Detective</th>
                      <th className="py-3 px-3 text-center">Game 2: Lightning Talks</th>
                      <th className="py-3 px-3 text-center font-black">Total Score</th>
                      <th className="py-3 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {finalLeaderboard.map((item) => (
                      <tr key={item.team_id} className="hover:bg-zinc-900/60">
                        <td className="py-3 px-3 font-mono font-bold">#{item.rank}</td>
                        <td className="py-3 px-3 font-bold text-white">{item.team_name}</td>
                        <td className="py-3 px-3 text-center font-mono text-zinc-300">
                          {item.tech_detective_score} pts
                        </td>
                        <td className="py-3 px-3 text-center font-mono text-zinc-300">
                          {item.lightning_talks_score} pts
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-black text-white text-sm">
                          {item.total_score} pts
                        </td>
                        <td className="py-3 px-3 text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditFinalModal(item);
                              setEditFinalG1(item.tech_detective_score);
                              setEditFinalG2(item.lightning_talks_score);
                            }}
                            className="h-7 text-xs text-zinc-400 hover:text-white"
                          >
                            <Edit2 className="w-3 h-3 mr-1" />
                            Edit
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}
      </main>

      {/* MODAL 1: Upload / Create Question (Tech Detective) */}
      <Dialog open={createQuestionOpen} onOpenChange={setCreateQuestionOpen}>
        <DialogContent className="max-w-2xl bg-zinc-950 border-zinc-800 text-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Upload className="w-5 h-5 text-white" />
              Upload Question (Tech Detective)
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Provide question details and upload 1 clue image. No text clues will be shown to participants.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateQuestion} className="space-y-4 py-2">
            {modalQuestionError && (
              <div className="p-3.5 rounded-xl bg-rose-950/90 border border-rose-700 text-rose-200 text-xs flex flex-col gap-2 animate-in fade-in shadow-xl">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span className="font-semibold">{modalQuestionError}</span>
                </div>
                {modalQuestionError.toLowerCase().includes("administrative") && (
                  <div className="pt-2 border-t border-rose-800/70 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] text-zinc-300">
                      Currently logged in as: <strong>@{currentUser?.username || "participant"}</strong> ({currentUser?.role})
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleLogout}
                      className="bg-white text-black hover:bg-zinc-200 font-bold text-xs h-7 px-3 shadow"
                    >
                      Sign In as Admin (admin / admin123) &rarr;
                    </Button>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-zinc-300 font-semibold">Question Number</Label>
                  {tdQuestions.some((q) => q.question_number === Number(newQNumber)) ? (
                    <span className="text-[10px] text-amber-400 font-mono font-semibold">
                      (Updates existing #{newQNumber})
                    </span>
                  ) : (
                    <span className="text-[10px] text-emerald-400 font-mono font-semibold">
                      (New Question #{newQNumber})
                    </span>
                  )}
                </div>
                <Input
                  type="number"
                  min={1}
                  value={newQNumber}
                  onChange={(e) => {
                    setNewQNumber(parseInt(e.target.value) || 1);
                    setModalQuestionError(null);
                  }}
                  className="bg-zinc-900 border-zinc-800 text-white font-mono"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-300 font-semibold">Question Title</Label>
                <Input
                  type="text"
                  placeholder="e.g. Question 2"
                  value={newQTitle}
                  onChange={(e) => {
                    setNewQTitle(e.target.value);
                    setModalQuestionError(null);
                  }}
                  className="bg-zinc-900 border-zinc-800 text-white"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-300 font-semibold">Correct Answer / Technology</Label>
                <Input
                  type="text"
                  placeholder="e.g. Docker, Python"
                  value={newQTech}
                  onChange={(e) => {
                    setNewQTech(e.target.value);
                    setModalQuestionError(null);
                  }}
                  className="bg-zinc-900 border-zinc-800 text-white"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-300 font-semibold">Question Marks</Label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={newQPoints}
                  onChange={(e) => setNewQPoints(parseInt(e.target.value) || 10)}
                  className="bg-zinc-900 border-zinc-800 text-white"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-300 font-semibold">Deduction (Wrong)</Label>
                <Input
                  type="number"
                  min={0}
                  max={50}
                  value={newQDeduction}
                  onChange={(e) => setNewQDeduction(parseInt(e.target.value) || 2)}
                  className="bg-zinc-900 border-zinc-800 text-white"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-300 font-semibold">
                Accepted Synonyms (optional, comma-separated)
              </Label>
              <Input
                type="text"
                placeholder="e.g. docker, docker container, dockerfile"
                value={newQSynonyms}
                onChange={(e) => setNewQSynonyms(e.target.value)}
                className="bg-zinc-900 border-zinc-800 text-white"
              />
            </div>

            {/* Single Image Uploader */}
            <div className="space-y-2 pt-2 border-t border-zinc-800">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-white font-bold flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-emerald-400" />
                  Clue Image (1 Image Required)
                </Label>
                <span className="text-[11px] font-mono text-zinc-400">
                  {uploadedImage ? (
                    <span className="text-emerald-400 font-semibold">✓ 1 / 1 Image Ready</span>
                  ) : (
                    <span className="text-rose-400 font-semibold">0 / 1 Image Selected</span>
                  )}
                </span>
              </div>

              {/* Image Input Options */}
              {!uploadedImage ? (
                <div className="space-y-3">
                  <div className="flex rounded-lg bg-zinc-900 p-1 border border-zinc-800 max-w-xs">
                    <button
                      type="button"
                      onClick={() => setImageTab("upload")}
                      className={`flex-1 py-1 text-xs font-semibold rounded-md transition-all ${
                        imageTab === "upload"
                          ? "bg-white text-black shadow"
                          : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      Upload File
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageTab("url")}
                      className={`flex-1 py-1 text-xs font-semibold rounded-md transition-all ${
                        imageTab === "url"
                          ? "bg-white text-black shadow"
                          : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      Paste Image URL
                    </button>
                  </div>

                  {imageTab === "upload" ? (
                    <label className="border-2 border-dashed border-zinc-700 hover:border-zinc-500 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer bg-zinc-900/50 hover:bg-zinc-900 transition-colors">
                      <Upload className="w-7 h-7 text-zinc-400 mb-2" />
                      <span className="text-xs font-semibold text-white">Click to Select Question Image</span>
                      <span className="text-[10px] text-zinc-500 mt-1">PNG, JPG, WEBP, SVG (Auto-compressed to ~100KB)</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageFileSelected}
                        className="hidden"
                      />
                    </label>
                  ) : (
                    <div className="flex gap-2">
                      <Input
                        type="url"
                        placeholder="https://example.com/technology-logo.png"
                        value={imageUrlDraft}
                        onChange={(e) => {
                          setImageUrlDraft(e.target.value);
                          setModalQuestionError(null);
                        }}
                        className="bg-zinc-900 border-zinc-800 text-white text-xs"
                      />
                      <Button
                        type="button"
                        onClick={handleApplyImageUrl}
                        className="bg-white text-black hover:bg-zinc-200 text-xs font-bold"
                      >
                        Apply URL
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="relative rounded-xl overflow-hidden border border-zinc-700 bg-black p-3 flex flex-col items-center group">
                  <img
                    src={uploadedImage}
                    alt="Question Preview"
                    className="max-h-52 w-full object-contain rounded"
                  />
                  <div className="mt-3 flex gap-2">
                    <label className="text-[11px] font-semibold bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-1.5 rounded cursor-pointer border border-zinc-600 transition-colors">
                      Change Image
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageFileSelected}
                        className="hidden"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={removeUploadedImage}
                      className="text-[11px] font-semibold bg-rose-950/80 hover:bg-rose-900 text-rose-300 px-3 py-1.5 rounded border border-rose-800 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="pt-4 border-t border-zinc-800">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setCreateQuestionOpen(false)}
                className="text-zinc-400 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isCreatingQuestion}
                className="bg-white text-black hover:bg-zinc-200 font-bold"
              >
                {isCreatingQuestion ? "Saving..." : "Create & Save Question"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: Question-Wise Score Matrix */}
      <Dialog open={scoreBreakdownOpen} onOpenChange={setScoreBreakdownOpen}>
        <DialogContent className="max-w-4xl bg-zinc-950 border-zinc-800 text-white max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-400" />
              Tech Detective: Question-Wise Score Matrix
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Question-by-question breakdown of marks awarded to each team.
            </DialogDescription>
          </DialogHeader>

          {isLoadingBreakdown ? (
            <div className="py-12 text-center text-xs text-zinc-400">Loading breakdown matrix...</div>
          ) : !scoreBreakdownData || scoreBreakdownData.questions.length === 0 ? (
            <div className="py-12 text-center text-xs text-zinc-500">
              No questions or scores available yet.
            </div>
          ) : (
            <div className="overflow-x-auto py-2">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-400 uppercase font-bold">
                    <th className="py-2.5 px-3">Team</th>
                    {scoreBreakdownData.questions.map((q) => (
                      <th key={q.id} className="py-2.5 px-2 text-center font-mono">
                        Q{q.question_number}
                        <div className="text-[9px] text-zinc-500 font-normal">({q.points}p)</div>
                      </th>
                    ))}
                    <th className="py-2.5 px-3 text-right font-black text-white">Total Marks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {scoreBreakdownData.team_scores.map((t) => (
                    <tr key={t.team_id} className="hover:bg-zinc-900/60">
                      <td className="py-2.5 px-3 font-bold text-white">{t.team_name}</td>
                      {scoreBreakdownData.questions.map((q) => {
                        const score = t.question_scores[String(q.question_number)] ?? 0;
                        return (
                          <td
                            key={q.id}
                            className={`py-2.5 px-2 text-center font-mono font-semibold ${
                              score > 0
                                ? "text-emerald-400"
                                : score < 0
                                ? "text-rose-400"
                                : "text-zinc-600"
                            }`}
                          >
                            {score > 0 ? `+${score}` : score === 0 ? "-" : `${score}`}
                          </td>
                        );
                      })}
                      <td className="py-2.5 px-3 text-right font-mono font-black text-white">
                        {t.total_score} pts
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setScoreBreakdownOpen(false)}
              className="text-xs border-zinc-700 text-white"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: Evaluate Lightning Speech */}
      <Dialog open={!!evaluatingTopic} onOpenChange={(open) => !open && setEvaluatingTopic(null)}>
        <DialogContent className="max-w-md bg-zinc-950 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Mic className="w-5 h-5 text-white" />
              Evaluate Speech
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Evaluate {evaluatingTopic?.assigned_user_name} on the 3 official criteria (0-10 each).
            </DialogDescription>
          </DialogHeader>

          {evaluatingTopic && (
            <div className="space-y-4 py-2">
              <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 text-xs">
                <p className="text-zinc-400">
                  <strong className="text-white">Topic:</strong> {evaluatingTopic.topic_name}
                </p>
                <p className="text-zinc-400">
                  <strong className="text-white">Speaker:</strong> {evaluatingTopic.assigned_user_name} (
                  {evaluatingTopic.assigned_team_name})
                </p>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-zinc-300">1. Delivery & Presentation</span>
                    <span className="font-mono font-bold text-white">{timeScore} / 10</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={10}
                    value={timeScore}
                    onChange={(e) => setTimeScore(parseInt(e.target.value))}
                    className="w-full accent-white"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-zinc-300">2. Words Used & Taboo Avoidance</span>
                    <span className="font-mono font-bold text-white">{wordsScore} / 10</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={10}
                    value={wordsScore}
                    onChange={(e) => setWordsScore(parseInt(e.target.value))}
                    className="w-full accent-white"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-zinc-300">3. Understandability & Clarity</span>
                    <span className="font-mono font-bold text-white">{understandScore} / 10</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={10}
                    value={understandScore}
                    onChange={(e) => setUnderstandScore(parseInt(e.target.value))}
                    className="w-full accent-white"
                  />
                </div>
              </div>

              <div className="p-3 rounded-lg bg-black border border-zinc-800 flex items-center justify-between text-xs">
                <span className="font-bold text-zinc-400">Total Awarded Points:</span>
                <span className="font-mono font-black text-white text-base">
                  {timeScore + wordsScore + understandScore} / 30 pts
                </span>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setEvaluatingTopic(null)} className="text-zinc-400">
              Cancel
            </Button>
            <Button
              onClick={handleSubmitSpeechEvaluation}
              disabled={isSubmittingSpeech}
              className="bg-white text-black hover:bg-zinc-200 font-bold"
            >
              {isSubmittingSpeech ? "Submitting..." : "Submit Speech Score"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 4: Edit Team Name */}
      <Dialog open={!!editTeamModal} onOpenChange={(open) => !open && setEditTeamModal(null)}>
        <DialogContent className="max-w-md bg-zinc-950 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Edit Team Name</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Label className="text-xs text-zinc-400">New Team Name</Label>
            <Input
              value={editTeamNameInput}
              onChange={(e) => setEditTeamNameInput(e.target.value)}
              className="mt-1.5 bg-zinc-900 border-zinc-800 text-white"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditTeamModal(null)} className="text-zinc-400">
              Cancel
            </Button>
            <Button onClick={handleSaveTeamName} className="bg-white text-black hover:bg-zinc-200 font-bold">
              Save Name
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 5: Edit Tech Detective Score */}
      <Dialog open={!!editTdScoreModal} onOpenChange={(open) => !open && setEditTdScoreModal(null)}>
        <DialogContent className="max-w-md bg-zinc-950 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Override Tech Detective Score</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-2">
            <p className="text-xs text-zinc-400">Team: {editTdScoreModal?.team_name}</p>
            <Input
              type="number"
              value={editTdScoreValue}
              onChange={(e) => setEditTdScoreValue(parseInt(e.target.value) || 0)}
              className="bg-zinc-900 border-zinc-800 text-white"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditTdScoreModal(null)} className="text-zinc-400">
              Cancel
            </Button>
            <Button onClick={handleSaveTdScore} className="bg-white text-black hover:bg-zinc-200 font-bold">
              Update Score
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 6: Edit Lightning Talks Score */}
      <Dialog open={!!editLtScoreModal} onOpenChange={(open) => !open && setEditLtScoreModal(null)}>
        <DialogContent className="max-w-md bg-zinc-950 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Override Lightning Talks Score</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-2">
            <p className="text-xs text-zinc-400">Team: {editLtScoreModal?.team_name}</p>
            <Input
              type="number"
              value={editLtScoreValue}
              onChange={(e) => setEditLtScoreValue(parseInt(e.target.value) || 0)}
              className="bg-zinc-900 border-zinc-800 text-white"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditLtScoreModal(null)} className="text-zinc-400">
              Cancel
            </Button>
            <Button onClick={handleSaveLtScore} className="bg-white text-black hover:bg-zinc-200 font-bold">
              Update Score
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 7: Edit Final Score */}
      <Dialog open={!!editFinalModal} onOpenChange={(open) => !open && setEditFinalModal(null)}>
        <DialogContent className="max-w-md bg-zinc-950 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Override Final Leaderboard Scores</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <p className="text-xs text-zinc-400">Team: {editFinalModal?.team_name}</p>
            <div className="space-y-1">
              <Label className="text-xs text-zinc-400">Game 1: Tech Detective Score</Label>
              <Input
                type="number"
                value={editFinalG1}
                onChange={(e) => setEditFinalG1(parseInt(e.target.value) || 0)}
                className="bg-zinc-900 border-zinc-800 text-white"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-zinc-400">Game 2: Lightning Talks Score</Label>
              <Input
                type="number"
                value={editFinalG2}
                onChange={(e) => setEditFinalG2(parseInt(e.target.value) || 0)}
                className="bg-zinc-900 border-zinc-800 text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditFinalModal(null)} className="text-zinc-400">
              Cancel
            </Button>
            <Button onClick={handleSaveFinalScore} className="bg-white text-black hover:bg-zinc-200 font-bold">
              Save Scores
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 6: Add Topic for Game 2: Lightning Talks */}
      <Dialog open={createTopicModalOpen} onOpenChange={setCreateTopicModalOpen}>
        <DialogContent className="max-w-md bg-zinc-950 border-zinc-800 text-white shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Mic className="w-5 h-5 text-white" />
              Add Topic (Game 2: Lightning Talks)
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Create a speaking topic. You can add it to the general topic pool or assign it directly to a participant.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateTopic} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-300 font-semibold">Topic Title</Label>
              <Input
                type="text"
                placeholder="e.g. Microservices vs Monoliths, Rust in Production, Zero Trust"
                value={newTopicName}
                onChange={(e) => setNewTopicName(e.target.value)}
                className="bg-zinc-900 border-zinc-800 text-white"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-300 font-semibold">Description / Guidelines (Optional)</Label>
              <Input
                type="text"
                placeholder="e.g. 1-minute overview of architecture, trade-offs, and benefits"
                value={newTopicDescription}
                onChange={(e) => setNewTopicDescription(e.target.value)}
                className="bg-zinc-900 border-zinc-800 text-white"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-300 font-semibold">Prohibited Words (Optional, comma-separated)</Label>
              <Input
                type="text"
                placeholder="e.g. cloud, server, scale"
                value={newTopicProhibited}
                onChange={(e) => setNewTopicProhibited(e.target.value)}
                className="bg-zinc-900 border-zinc-800 text-white"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-300 font-semibold">Assign Directly To Participant (Optional)</Label>
              <select
                value={newTopicAssignUserId}
                onChange={(e) => setNewTopicAssignUserId(e.target.value)}
                className="w-full h-9 px-3 text-xs bg-zinc-900 border border-zinc-800 rounded-md text-white focus:border-white"
              >
                <option value="">Keep in Topic Pool (Unassigned)</option>
                {teams.flatMap((t) =>
                  t.members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.display_name} ({t.team_name})
                    </option>
                  ))
                )}
              </select>
            </div>

            <DialogFooter className="pt-4 border-t border-zinc-800">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setCreateTopicModalOpen(false)}
                className="text-zinc-400 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isCreatingTopic || !newTopicName.trim()}
                className="bg-white text-black hover:bg-zinc-200 font-bold"
              >
                {isCreatingTopic ? "Saving..." : "Save Topic"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: Create New Game / Activity */}
      <Dialog open={createGameModalOpen} onOpenChange={setCreateGameModalOpen}>
        <DialogContent className="max-w-lg bg-zinc-950 border-zinc-800 text-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              Add New Game / Technical Activity
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Configure a new technical game for future sessions or current events.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateGame} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-300 font-semibold">Game Title *</Label>
              <Input
                type="text"
                placeholder="e.g. Bug Bounty Speedrun, Code Relay, Tech Trivia"
                value={newGameTitle}
                onChange={(e) => setNewGameTitle(e.target.value)}
                className="bg-zinc-900 border-zinc-800 text-white"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-300 font-semibold">Description</Label>
              <Input
                type="text"
                placeholder="Short summary of what teams will do in this activity"
                value={newGameDescription}
                onChange={(e) => setNewGameDescription(e.target.value)}
                className="bg-zinc-900 border-zinc-800 text-white"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-300 font-semibold">
                Rules & Guidelines (One per line)
              </Label>
              <textarea
                rows={3}
                placeholder={"Teams have 3 minutes to solve the prompt\nPassing all unit tests earns +20 pts\nCleanest code architecture receives +5 bonus pts"}
                value={newGameRulesInput}
                onChange={(e) => setNewGameRulesInput(e.target.value)}
                className="w-full p-2.5 text-xs bg-zinc-900 border border-zinc-800 rounded-md text-white focus:border-white font-mono"
              />
            </div>

            <DialogFooter className="pt-4 border-t border-zinc-800">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setCreateGameModalOpen(false)}
                className="text-zinc-400 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isCreatingGame || !newGameTitle.trim()}
                className="bg-white text-black hover:bg-zinc-200 font-bold"
              >
                {isCreatingGame ? "Saving..." : "Save & Add to Catalog"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: Edit Custom Game Score (Matches Game 1 & Game 2) */}
      <Dialog
        open={!!editCustomScoreModal}
        onOpenChange={(open) => !open && setEditCustomScoreModal(null)}
      >
        <DialogContent className="max-w-md bg-zinc-950 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              Override {editCustomScoreModal?.game_title} Score
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-2">
            <p className="text-xs text-zinc-400">Team: {editCustomScoreModal?.team_name}</p>
            <Input
              type="number"
              value={editCustomScoreValue}
              onChange={(e) => setEditCustomScoreValue(parseInt(e.target.value) || 0)}
              className="bg-zinc-900 border-zinc-800 text-white font-mono text-base font-bold"
            />
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setEditCustomScoreModal(null)}
              className="text-zinc-400"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveCustomScore}
              className="bg-white text-black hover:bg-zinc-200 font-bold"
            >
              Update Score
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: Confirm Reset Database */}
      <Dialog open={resetDbModalOpen} onOpenChange={setResetDbModalOpen}>
        <DialogContent className="max-w-md bg-zinc-950 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-rose-400 flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-rose-500" />
              Reset Database & Clean Slate
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400 space-y-2 pt-1">
              <p>Are you sure you want to clear all data? This will permanently remove:</p>
              <ul className="list-disc list-inside space-y-1 text-zinc-300 font-mono text-[11px] bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800">
                <li>All registered participants & online sessions</li>
                <li>All formed teams and team scores</li>
                <li>All uploaded Tech Detective questions & clue images</li>
                <li>All Lightning Talks topics & speech scores</li>
              </ul>
              <p className="text-zinc-500 text-[11px]">
                The administrator account (<strong>admin / admin123</strong>) remains active.
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-3 border-t border-zinc-800">
            <Button
              variant="ghost"
              onClick={() => setResetDbModalOpen(false)}
              className="text-zinc-400 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmResetDb}
              disabled={isResettingDb}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {isResettingDb ? "Resetting..." : "Yes, Clear Database"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: Create Question / Challenge for Custom Game */}
      <Dialog open={createCustomQuestionOpen} onOpenChange={setCreateCustomQuestionOpen}>
        <DialogContent className="max-w-lg bg-zinc-950 border-zinc-800 text-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Plus className="w-5 h-5 text-amber-400" />
              Add Question / Challenge ({selectedCustomGame?.title})
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Create a new question, quiz, or challenge for participants to solve.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateCustomQuestion} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-300 font-semibold">Question Title / Prompt *</Label>
              <Input
                type="text"
                placeholder="e.g. What is the time complexity of binary search?"
                value={newCustomQTitle}
                onChange={(e) => setNewCustomQTitle(e.target.value)}
                className="bg-zinc-900 border-zinc-800 text-white"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-300 font-semibold">Correct Answer *</Label>
              <Input
                type="text"
                placeholder="e.g. Python, Docker, PostgreSQL, React"
                value={newCustomQCorrect}
                onChange={(e) => setNewCustomQCorrect(e.target.value)}
                className="bg-zinc-900 border-zinc-800 text-white font-mono"
                required
              />
            </div>

            {/* Multimedia Clue Section */}
            <div className="space-y-2.5 p-3.5 bg-zinc-900/60 rounded-xl border border-zinc-800">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-zinc-300 font-semibold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Multimedia Clue / Challenge Asset (Optional)
                </Label>
                {newCustomQMediaType !== "none" && (
                  <Badge variant="muted" className="text-[10px] uppercase font-mono text-amber-400 border-amber-800/80">
                    {newCustomQMediaType}
                  </Badge>
                )}
              </div>

              {/* Media Mode Tabs */}
              <div className="grid grid-cols-4 gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setMediaInputMode("none");
                    setNewCustomQMediaType("none");
                    setNewCustomQMediaUrl("");
                  }}
                  className={`py-1.5 px-2 rounded-lg font-medium text-center transition-all ${
                    mediaInputMode === "none"
                      ? "bg-zinc-800 text-white border border-zinc-700"
                      : "bg-black/40 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  None
                </button>
                <button
                  type="button"
                  onClick={() => setMediaInputMode("upload")}
                  className={`py-1.5 px-2 rounded-lg font-medium text-center transition-all ${
                    mediaInputMode === "upload"
                      ? "bg-amber-950/80 text-amber-300 border border-amber-800"
                      : "bg-black/40 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  Upload File
                </button>
                <button
                  type="button"
                  onClick={() => setMediaInputMode("url")}
                  className={`py-1.5 px-2 rounded-lg font-medium text-center transition-all ${
                    mediaInputMode === "url"
                      ? "bg-blue-950/80 text-blue-300 border border-blue-800"
                      : "bg-black/40 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  Web URL
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMediaInputMode("youtube");
                    setNewCustomQMediaType("youtube");
                  }}
                  className={`py-1.5 px-2 rounded-lg font-medium text-center transition-all ${
                    mediaInputMode === "youtube"
                      ? "bg-red-950/80 text-red-300 border border-red-800"
                      : "bg-black/40 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  YouTube
                </button>
              </div>

              {mediaInputMode === "upload" && (
                <div className="space-y-2 pt-1">
                  <label className="flex flex-col items-center justify-center p-4 border border-dashed border-zinc-700 rounded-xl bg-black/40 hover:bg-black/70 cursor-pointer transition-colors text-center group">
                    <Upload className="w-5 h-5 text-zinc-400 group-hover:text-amber-400 mb-1 transition-colors" />
                    <span className="text-xs font-semibold text-zinc-300">
                      {isUploadingCustomMedia ? "Uploading Media..." : "Choose Image, Audio (MP3/WAV), or Video (MP4)"}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono mt-0.5">
                      JPG, PNG, GIF, MP3, WAV, MP4 up to 50MB
                    </span>
                    <input
                      type="file"
                      accept="image/*,audio/*,video/*"
                      onChange={handleCustomMediaFileUpload}
                      disabled={isUploadingCustomMedia}
                      className="hidden"
                    />
                  </label>
                  {newCustomQMediaUrl && (
                    <p className="text-[11px] text-emerald-400 font-mono flex items-center gap-1 truncate">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> Loaded: {newCustomQMediaUrl}
                    </p>
                  )}
                </div>
              )}

              {mediaInputMode === "url" && (
                <div className="space-y-2 pt-1">
                  <Input
                    type="url"
                    placeholder="https://example.com/asset.mp3, .png, or .mp4"
                    value={newCustomQMediaUrl}
                    onChange={(e) => {
                      setNewCustomQMediaUrl(e.target.value);
                    }}
                    className="bg-black/80 border-zinc-700 text-white font-mono text-xs"
                  />
                  <p className="text-[10px] text-zinc-500 font-mono">
                    Paste direct URL to an image, MP3/WAV sound clip, or MP4 video file.
                  </p>
                </div>
              )}

              {mediaInputMode === "youtube" && (
                <div className="space-y-2 pt-1">
                  <Input
                    type="url"
                    placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
                    value={newCustomQMediaUrl}
                    onChange={(e) => {
                      setNewCustomQMediaUrl(e.target.value);
                      setNewCustomQMediaType("youtube");
                    }}
                    className="bg-black/80 border-zinc-700 text-white font-mono text-xs"
                  />
                  <p className="text-[10px] text-zinc-500 font-mono">
                    Paste any YouTube video link to embed directly into the question view.
                  </p>
                </div>
              )}

              {/* Preview if media exists */}
              {newCustomQMediaUrl && (
                <div className="pt-2 border-t border-zinc-800">
                  <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 mb-1.5">
                    Preview:
                  </p>
                  <MediaViewer
                    mediaUrl={newCustomQMediaUrl}
                    mediaType={newCustomQMediaType}
                    compact
                  />
                </div>
              )}
            </div>

            <DialogFooter className="pt-4 border-t border-zinc-800">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setCreateCustomQuestionOpen(false)}
                className="text-zinc-400 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSavingCustomQuestion || !newCustomQTitle.trim()}
                className="bg-white text-black hover:bg-zinc-200 font-bold"
              >
                {isSavingCustomQuestion ? "Saving..." : "Save Question"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
