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
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#0c0c0c]">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-15%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-15%] right-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
      </div>

      <div className="z-10 w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-extrabold text-white tracking-tight">PiF<span className="text-white/40"> Market</span></h1>
          <p className="text-white/30 text-xs mt-1">Premium digital marketplace</p>
        </div>

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
        className="h-10 bg-black/50 border-white/10 focus:border-primary/50 pr-9"
        data-testid={testId}
      />
      <button
        type="button"
        onClick={() => setShow(s => !s)}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
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
        <Label className="text-[10px] uppercase tracking-widest text-white/40">Email</Label>
        <Input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="you@example.com"
          disabled={isLoggingIn}
          autoComplete="email"
          className="h-10 bg-black/50 border-white/10 focus:border-primary/50"
          data-testid="input-email"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-[10px] uppercase tracking-widest text-white/40">Password</Label>
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
      <div className="text-center space-y-3 py-2">
        <div className="text-3xl">✓</div>
        <p className="text-sm font-bold text-white">Account created!</p>
        <p className="text-xs text-white/40">Your username was auto-generated. You can see it in your profile.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleCreate} className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-[10px] uppercase tracking-widest text-white/40">Email</Label>
        <Input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="you@example.com"
          disabled={isRegistering}
          autoComplete="email"
          className="h-10 bg-black/50 border-white/10 focus:border-primary/50"
          data-testid="input-reg-email"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-[10px] uppercase tracking-widest text-white/40">Password</Label>
        <PasswordInput
          value={password}
          onChange={setPassword}
          placeholder="min. 6 characters"
          disabled={isRegistering}
          testId="input-reg-password"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-[10px] uppercase tracking-widest text-white/40">Confirm Password</Label>
        <PasswordInput
          value={confirm}
          onChange={setConfirm}
          placeholder="repeat password"
          disabled={isRegistering}
          testId="input-reg-confirm"
        />
      </div>
      <p className="text-[10px] text-white/25 leading-relaxed">
        Your username will be auto-generated as <span className="font-mono text-white/40">anon-xxxxxxxx</span>.
      </p>
      <Button
        type="submit"
        disabled={isRegistering || !email.trim() || !password || !confirm}
        className="w-full h-9 text-xs"
        data-testid="btn-register"
      >
        {isRegistering ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Create Account"}
      </Button>
    </form>
  );
}
