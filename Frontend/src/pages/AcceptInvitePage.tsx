import { useState, type FormEvent, type ReactNode } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useInvitePreview, useAcceptInvite } from "@/hooks/useAcceptInvite";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function AcceptInvitePage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: invite, isLoading, isError } = useInvitePreview(token);
  const acceptInvite = useAcceptInvite(token);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (user) {
    return <Navigate to="/" replace />;
  }

  if (!token) {
    return (
      <CenteredCard title="Invalid link">
        <p className="text-sm text-muted-foreground">This invite link is missing its token.</p>
      </CenteredCard>
    );
  }

  if (isLoading) {
    return (
      <CenteredCard title="Loading invite…">
        <Skeleton className="h-24 w-full" />
      </CenteredCard>
    );
  }

  if (isError || !invite) {
    return (
      <CenteredCard title="Invite not found">
        <p className="text-sm text-muted-foreground">
          This invite is invalid, expired, or has already been used.
        </p>
      </CenteredCard>
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    try {
      await acceptInvite.mutateAsync(password);
      navigate("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    }
  }

  return (
    <CenteredCard title="Set your password">
      <p className="mb-4 text-sm text-muted-foreground">
        Joining <span className="font-medium text-foreground">{invite.org.name}</span> as{" "}
        <span className="font-medium text-foreground">{invite.email}</span>
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <Input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            minLength={8}
            required
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full" disabled={acceptInvite.isPending}>
          {acceptInvite.isPending ? "Setting up…" : "Set Password & Sign In"}
        </Button>
      </form>
    </CenteredCard>
  );
}

function CenteredCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex h-screen items-center justify-center bg-muted/40">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </div>
  );
}
