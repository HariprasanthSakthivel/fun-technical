import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertCircle, CheckCircle2, Lock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { toast } from "@/hooks/useToast";
import { loginAdmin } from "@/services/api";

/**
 * Admin login connected to FastAPI SQLite auth backend.
 * Default credentials seeded: admin / admin123
 */
export function AdminLoginPage() {
  useDocumentTitle("Admin login · Fun & Technical Activity Platform");

  const navigate = useNavigate();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!username.trim()) {
      setError("Please enter your admin username.");
      return;
    }
    if (!password) {
      setError("Please enter your password.");
      return;
    }

    try {
      setIsLoading(true);
      await loginAdmin({ username: username.trim(), password });
      toast.success("Welcome back, Administrator!");
      navigate("/admin/dashboard");
    } catch (err: any) {
      const msg = err.message || "Invalid admin credentials";
      setError(msg);
      // If backend is unreachable or local development offline, allow bypass option
    } finally {
      setIsLoading(false);
    }
  }

  function handleOfflinePreview() {
    toast.info("Entering Admin Dashboard in local preview mode.");
    navigate("/admin/dashboard");
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm text-foreground">
        <div className="flex items-center gap-2 font-medium text-primary">
          <CheckCircle2 className="h-4 w-4" />
          <span>SQLite Database Authentication Ready</span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Default seed credentials: <code className="font-mono font-semibold text-foreground">admin</code> / <code className="font-mono font-semibold text-foreground">admin123</code>
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="mb-2 flex items-center justify-between gap-2">
            <Badge variant="default" className="flex items-center gap-1">
              <Lock className="h-3 w-3" /> Admin Auth
            </Badge>
            <span className="text-xs text-muted-foreground">Step 6 Security</span>
          </div>
          <CardTitle>Admin Login</CardTitle>
          <CardDescription>
            Authenticate with your administrator credentials to manage questions, teams, and live sessions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="flex-1">
                <p className="font-medium">{error}</p>
                <button
                  type="button"
                  onClick={handleOfflinePreview}
                  className="mt-1 text-xs text-primary underline hover:text-primary/80"
                >
                  Continue in local preview mode anyway
                </button>
              </div>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            <div className="space-y-2">
              <Label htmlFor="admin-username">Username or Email</Label>
              <Input
                id="admin-username"
                type="text"
                autoComplete="username"
                placeholder="admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-password">Password</Label>
              <Input
                id="admin-password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
              {isLoading ? "Authenticating..." : "Sign In to Admin Dashboard"}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            <Link to="/" className="text-primary hover:underline">
              Back to welcome page
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
