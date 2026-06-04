import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { Loader2, Copy, Check, ShieldCheck, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AuthPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"login" | "register">("login");

  if (user) return <Redirect to="/" />;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#0c0c0c]">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-15%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-15%] right-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
      </div>

      <div className="z-10 w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-extrabold text-white tracking-tight">ACCT<span className="text-white/40">PLUG</span></h1>
          <p className="text-white/30 text-xs mt-1">Premium digital marketplace</p>
        </div>

        {/* Tabs */}
        <div className="flex bg-white/5 rounded-lg p-0.5">
          <button
            onClick={() => setTab("login")}
            className={`flex-1 text-xs font-medium py-2 rounded-md transition-colors ${tab === "login" ? "bg-white/10 text-white" : "text-white/40 hover:text-white/60"}`}
            data-testid="tab-login"
          >
            Sign In
          </button>
          <button
            onClick={() => setTab("register")}
            className={`flex-1 text-xs font-medium py-2 rounded-md transition-colors ${tab === "register" ? "bg-white/10 text-white" : "text-white/40 hover:text-white/60"}`}
            data-testid="tab-register"
          >
            Create Account
          </button>
        </div>

        <div className="bg-[#111] border border-white/5 rounded-xl p-5">
          {tab === "login" ? <LoginForm /> : <RegisterForm />}
        </div>
      </div>
    </div>
  );
}

function LoginForm() {
  const { login, isLoggingIn } = useAuth();
  const [loginCode, setLoginCode] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginCode.trim()) return;
    try {
      await login({ loginCode: loginCode.trim().toUpperCase() });
    } catch {}
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-[10px] uppercase tracking-widest text-white/40">Login Code</Label>
        <Input
          value={loginCode}
          onChange={e => setLoginCode(e.target.value.toUpperCase())}
          placeholder="XXXXXXXXXXXX"
          disabled={isLoggingIn}
          autoComplete="off"
          className="h-10 text-base bg-black/50 border-white/10 focus:border-primary/50 font-mono tracking-[0.25em] text-center"
          maxLength={12}
          data-testid="input-login-code"
        />
        <p className="text-[10px] text-white/25 text-center">Enter the 12-character code from when you registered</p>
      </div>
      <Button
        type="submit"
        disabled={isLoggingIn || loginCode.length < 12}
        className="w-full h-9 text-xs"
        data-testid="btn-login"
      >
        {isLoggingIn ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Sign In"}
      </Button>
    </form>
  );
}

function RegisterForm() {
  const { register, isRegistering } = useAuth();
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await register({});
      if (result?.loginCode) {
        setGeneratedCode(result.loginCode);
        setUsername(result.username ?? null);
      }
    } catch {}
  };

  const copyCode = () => {
    if (!generatedCode) return;
    navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Code copied to clipboard!" });
  };

  if (generatedCode) {
    return (
      <div className="space-y-4">
        <div className="text-center space-y-1">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 border border-primary/20 mx-auto">
            <ShieldCheck className="h-5 w-5 text-primary" />
          </div>
          <p className="text-sm font-bold text-white mt-2">Account Created!</p>
          {username && (
            <p className="text-[10px] text-white/30 font-mono">{username}</p>
          )}
        </div>

        {/* Code display */}
        <div className="bg-black/70 border-2 border-primary/30 rounded-xl p-4 space-y-2 text-center">
          <p className="text-[9px] uppercase tracking-widest text-white/30">Your Login Code</p>
          <p className="font-mono text-2xl font-black text-white tracking-[0.25em] select-all">{generatedCode}</p>
          <button
            onClick={copyCode}
            className="flex items-center gap-1.5 mx-auto text-xs text-primary hover:text-primary/80 transition-colors mt-1"
            data-testid="btn-copy-code"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied!" : "Copy code"}
          </button>
        </div>

        {/* Warning */}
        <div className="flex items-start gap-2.5 bg-yellow-950/40 border border-yellow-600/30 rounded-lg p-3">
          <AlertTriangle className="h-4 w-4 text-yellow-500 flex-shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="text-xs font-bold text-yellow-400">Save this code — don't lose it!</p>
            <p className="text-[11px] text-yellow-400/70 leading-relaxed">
              This is the <span className="font-bold">only way</span> to sign in. There is no password reset. If you lose it, your account is gone.
            </p>
          </div>
        </div>

        <p className="text-[10px] text-white/20 text-center leading-relaxed">
          Write it down, screenshot it, or save it in a password manager.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleCreate} className="space-y-4">
      <div className="text-center space-y-2 py-2">
        <p className="text-xs text-white/60 leading-relaxed">
          No email or password needed.<br />We'll generate a unique login code for you.
        </p>
      </div>
      <Button
        type="submit"
        disabled={isRegistering}
        className="w-full h-9 text-xs"
        data-testid="btn-register"
      >
        {isRegistering ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Generate My Login Code"}
      </Button>
    </form>
  );
}
