import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AuthPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"login" | "register">("login");

  if (user) return <Redirect to="/" />;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-5 bg-[#0a0a0a]">
      {/* Subtle ambient glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-15%] w-[50%] h-[50%] bg-white/[0.025] rounded-full blur-[140px]" />
        <div className="absolute bottom-[-20%] right-[-15%] w-[45%] h-[45%] bg-white/[0.015] rounded-full blur-[140px]" />
      </div>

      <div className="relative z-10 w-full max-w-[340px] space-y-5">
        {/* Brand */}
        <div className="text-center space-y-1 mb-2">
          <h1 className="text-xl font-bold text-white tracking-tight">NYC<span className="text-white/35">HQ</span></h1>
          <p className="text-white/30 text-[11px]">BEST HIGH QUALITY CARDS</p>
        </div>

        {/* Tab switcher */}
        <div className="flex bg-white/[0.05] rounded-2xl p-1 gap-1">
          <button
            onClick={() => setTab("login")}
            className={`flex-1 text-[11px] font-semibold py-2 rounded-xl transition-all ${tab === "login" ? "bg-white/[0.1] text-white shadow-sm" : "text-white/40 hover:text-white/60"}`}
            data-testid="tab-login"
          >
            Sign In
          </button>
          <button
            onClick={() => setTab("register")}
            className={`flex-1 text-[11px] font-semibold py-2 rounded-xl transition-all ${tab === "register" ? "bg-white/[0.1] text-white shadow-sm" : "text-white/40 hover:text-white/60"}`}
            data-testid="tab-register"
          >
            Create Account
          </button>
        </div>

        {/* Form card */}
        <div className="bg-[#0f0f0f] border border-white/[0.07] rounded-2xl p-5 shadow-2xl">
          {tab === "login" ? <LoginForm /> : <RegisterForm />}
        </div>
      </div>
    </div>
  );
}

function PasswordInput({ value, onChange, placeholder, disabled, testId }: {
  value: string; onChange: (v: string) => void; placeholder?: string; disabled?: boolean; testId?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        type={show ? "text" : "password"}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder || "••••••••"}
        disabled={disabled}
        autoComplete="current-password"
        className="h-10 bg-black/40 border-white/[0.08] focus:border-white/20 pr-9 rounded-xl text-sm"
        data-testid={testId}
      />
      <button
        type="button"
        onClick={() => setShow(s => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/50 transition-colors"
        tabIndex={-1}
      >
        {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}

function LoginForm() {
  const { login, isLoggingIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    try {
      await login({ email: email.trim().toLowerCase(), password });
    } catch {}
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-[10px] uppercase tracking-widest text-white/35 font-semibold">Email</Label>
        <Input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="you@example.com"
          disabled={isLoggingIn}
          autoComplete="email"
          className="h-10 bg-black/40 border-white/[0.08] focus:border-white/20 rounded-xl text-sm"
          data-testid="input-email"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-[10px] uppercase tracking-widest text-white/35 font-semibold">Password</Label>
        <PasswordInput
          value={password}
          onChange={setPassword}
          disabled={isLoggingIn}
          testId="input-password"
        />
      </div>
      <Button
        type="submit"
        disabled={isLoggingIn || !email.trim() || !password}
        className="w-full h-10 text-xs font-semibold rounded-xl mt-1"
        data-testid="btn-login"
      >
        {isLoggingIn ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Sign In"}
      </Button>
    </form>
  );
}

function RegisterForm() {
  const { register, isRegistering } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [done, setDone] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "Password too short", description: "At least 6 characters required", variant: "destructive" });
      return;
    }
    try {
      await register({ email: email.trim().toLowerCase(), password });
      setDone(true);
    } catch {}
  };

  if (done) {
    return (
      <div className="text-center space-y-3 py-4">
        <div className="text-4xl">✓</div>
        <p className="text-sm font-bold text-white">Account created!</p>
        <p className="text-xs text-white/35">Your username was auto-generated. You can see it in your profile.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleCreate} className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-[10px] uppercase tracking-widest text-white/35 font-semibold">Email</Label>
        <Input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="you@example.com"
          disabled={isRegistering}
          autoComplete="email"
          className="h-10 bg-black/40 border-white/[0.08] focus:border-white/20 rounded-xl text-sm"
          data-testid="input-reg-email"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-[10px] uppercase tracking-widest text-white/35 font-semibold">Password</Label>
        <PasswordInput
          value={password}
          onChange={setPassword}
          placeholder="min. 6 characters"
          disabled={isRegistering}
          testId="input-reg-password"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-[10px] uppercase tracking-widest text-white/35 font-semibold">Confirm Password</Label>
        <PasswordInput
          value={confirm}
          onChange={setConfirm}
          placeholder="repeat password"
          disabled={isRegistering}
          testId="input-reg-confirm"
        />
      </div>
      <p className="text-[10px] text-white/20 leading-relaxed">
        Your username will be auto-generated as <span className="font-mono text-white/35">anon-xxxxxxxx</span>.
      </p>
      <Button
        type="submit"
        disabled={isRegistering || !email.trim() || !password || !confirm}
        className="w-full h-10 text-xs font-semibold rounded-xl"
        data-testid="btn-register"
      >
        {isRegistering ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Create Account"}
      </Button>
    </form>
  );
}
