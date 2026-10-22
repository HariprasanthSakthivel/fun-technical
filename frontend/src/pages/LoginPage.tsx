import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { KeyRound, LogIn, ShieldAlert, User, UserPlus } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { loginUser, registerUser } from "@/services/api";

export function LoginPage() {
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError("Please fill in all required fields");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      if (mode === "register") {
        if (!displayName.trim()) {
          setError("Please enter your display name");
          setIsLoading(false);
          return;
        }
        const res = await registerUser({
          username: username.trim(),
          display_name: displayName.trim(),
          password,
        });
        await refreshProfile();
        navigate(res.role === "admin" ? "/admin" : "/team");
      } else {
        const res = await loginUser(username.trim(), password);
        await refreshProfile();
        navigate(res.role === "admin" ? "/admin" : "/team");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-zinc-800/20 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md space-y-6 relative z-10">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="flex justify-center mb-1">
            <BrandLogo size="lg" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            Fun Friday <span className="text-zinc-400">Activities</span>
          </h1>
          <p className="text-xs text-zinc-400">
            {mode === "login"
              ? "Sign in with your participant or administrator credentials"
              : "Register your real participant account to join the activity"}
          </p>
        </div>

        {/* Tab switch between Login & Register */}
        <div className="flex rounded-xl bg-zinc-900/90 p-1 border border-zinc-800">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setError(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              mode === "login"
                ? "bg-white text-black shadow-md"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("register");
              setError(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              mode === "register"
                ? "bg-white text-black shadow-md"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            Participant Register
          </button>
        </div>

        {/* Form Card */}
        <Card className="p-6 bg-zinc-950/90 border-zinc-800 shadow-2xl backdrop-blur-md">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{error}</span>
                </div>
                {(error.includes("already registered") || error.includes("already taken")) && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setMode("login");
                      setError(null);
                    }}
                    className="self-start text-[11px] h-7 border-rose-700 bg-rose-950/80 text-white hover:bg-rose-900"
                  >
                    Switch to Sign In &rarr;
                  </Button>
                )}
              </div>
            )}

            {mode === "register" && (
              <div className="space-y-1.5">
                <Label htmlFor="displayName" className="text-xs font-semibold text-zinc-300">
                  Full Name / Display Name
                </Label>
                <div className="relative">
                  <User className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                  <Input
                    id="displayName"
                    type="text"
                    placeholder="e.g. John Doe"
                    className="pl-9 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-white focus:ring-1 focus:ring-white"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="username" className="text-xs font-semibold text-zinc-300">
                Username
              </Label>
              <div className="relative">
                <User className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                <Input
                  id="username"
                  type="text"
                  placeholder={mode === "register" ? "Choose a username" : "admin or username"}
                  className="pl-9 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-white focus:ring-1 focus:ring-white"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-semibold text-zinc-300">
                Password
              </Label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="pl-9 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-white focus:ring-1 focus:ring-white"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-white hover:bg-zinc-200 text-black font-bold py-2.5 transition-colors shadow-lg shadow-white/5"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  {mode === "register" ? "Creating Account..." : "Authenticating..."}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  {mode === "register" ? <UserPlus className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
                  {mode === "register" ? "Join Activity" : "Sign In"}
                </span>
              )}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
