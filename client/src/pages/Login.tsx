import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/_core/hooks/useAuth";
import { ShieldCheck, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Redirect } from "wouter";

export default function Login() {
  const { isAuthenticated, login, loading, error } = useAuth();
  const [userName, setUserName] = useState("");
  const [accessCode, setAccessCode] = useState("");

  if (isAuthenticated) {
    return <Redirect to="/" />;
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!userName.trim()) {
      return toast.error("Enter your name to continue.");
    }
    try {
      await login(userName.trim(), accessCode.trim());
      toast.success("Welcome in!");
    } catch (loginError: unknown) {
      toast.error(loginError instanceof Error ? loginError.message : "Sign-in failed. Please try again.");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f4f7f2] px-4 py-10">
      <Card className="w-full max-w-md border-[#dce4de] shadow-[0_18px_45px_rgba(9,40,36,0.10)]">
        <CardHeader className="space-y-2">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0a2825]">
            <ShieldCheck className="h-6 w-6 text-[#dceba6]" />
          </div>
          <CardTitle className="font-serif text-3xl tracking-[-0.02em] text-[#102522]">Evidence Studio</CardTitle>
          <CardDescription className="text-sm text-[#64756f]">
            Clear thinking, <em>grounded</em> research. Sign in to start a research session.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="user-name" className="text-xs font-semibold text-[#496158]">Your name</Label>
              <Input
                id="user-name"
                value={userName}
                onChange={event => setUserName(event.target.value)}
                placeholder="How should we address you?"
                className="border-[#cedad0] bg-white"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="access-code" className="text-xs font-semibold text-[#496158]">Access code <span className="font-normal text-[#8d9a94]">(optional)</span></Label>
              <Input
                id="access-code"
                type="password"
                autoComplete="off"
                value={accessCode}
                onChange={event => setAccessCode(event.target.value)}
                placeholder="Set via ADMIN_CODE if required"
                className="border-[#cedad0] bg-white"
              />
            </div>
            {error && <p className="rounded-lg bg-[#fff0ef] px-3 py-2 text-xs font-medium text-[#a24138]">{error.message}</p>}
            <Button type="submit" disabled={loading || !userName.trim()} className="h-10 w-full rounded-xl bg-[#0a2825] text-sm font-semibold text-white hover:bg-[#123c37]">
              {loading ? null : <Sparkles className="mr-2 h-4 w-4" />}
              {loading ? "Signing in..." : "Enter workspace"}
            </Button>
            <p className="px-1 text-center text-[11px] leading-4 text-[#8d9a94]">
              Your session is kept locally in a signed cookie. No account or personal data is required.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
