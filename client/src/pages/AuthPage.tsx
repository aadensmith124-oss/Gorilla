import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import beastBoyImg from "@assets/IMG_8176_1782687294972.jpeg";

export default function AuthPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"login" | "register">("login");
  const [faceLoaded, setFaceLoaded] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setFaceLoaded(true), 80);
    return () => clearTimeout(t);
  }, []);

  if (user) return <Redirect to="/" />;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-5" style={{ background: "linear-gradient(160deg, #0b1a0e 0%, #091208 100%)" }}>
      {/* Green ambient glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-15%] left-1/2 -translate-x-1/2 w-[70%] h-[50%] rounded-full blur-[140px]" style={{ background: "rgba(45,106,45,0.18)" }} />
        <div className="absolute bottom-[-20%] right-[-15%] w-[40%] h-[40%] rounded-full blur-[120px]" style={{ background: "rgba(20,60,20,0.12)" }} />
      </div>

      <div className="relative z-10 w-full max-w-[340px] space-y-4">
        {/* Beast Boy face fades in */}
        <div
          className="flex justify-center mb-1"
          style={{
            opacity: faceLoaded ? 1 : 0,
            transform: faceLoaded ? "translateY(0) scale(1)" : "translateY(-16px) scale(0.92)",
            transition: "opacity 1s ease, transform 1s ease",
          }}
        >
          <div
            className="w-20 h-20 rounded-full overflow-hidden"
            style={{
              boxShadow: "0 4px 32px 6px rgba(74,154,58,0.3), 0 0 0 2px rgba(74,154,58,0.2)",
              maskImage: "linear-gradient(to bottom, black 60%, transparent 100%)",
              WebkitMaskImage: "linear-gradient(to bottom, black 60%, transparent 100%)",
            }}
          >
            <img
              src={beastBoyImg}
              alt="NYCHQ"
              className="w-full h-full object-cover scale-125"
              style={{ objectPosition: "50% 15%" }}
            />
          </div>
        </div>

        {/* Brand */}
        <div className="text-center space-y-0.5">
          <h1 className="text-xl font-black tracking-tight text-white">
            NYC<span style={{ color: "#4a9a3a" }}>HQ</span>
          </h1>
          <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: "rgba(74,154,58,0.5)" }}>BEST HIGH QUALITY CARDS</p>
        </div>

        {/* Tab switcher */}
        <div className="flex rounded-2xl p-1 gap-1" style={{ background: "rgba(255,255,255,0.06)" }}>
          <button
            onClick={() => setTab("login")}
            className={`flex-1 text-[11px] font-bold py-2 rounded-xl transition-all ${
              tab === "login"
                ? "text-white shadow-sm"
                : "hover:text-white/60"
            }`}
            style={tab === "login" ? { background: "rgba(45,106,45,0.5)", color: "#fff" } : { color: "rgba(255,255,255,0.35)" }}
            data-testid="tab-login"
          >
            Sign In
          </button>
          <button
            onClick={() => setTab("register")}
            className={`flex-1 text-[11px] font-bold py-2 rounded-xl transition-all`}
            style={tab === "register" ? { background: "rgba(45,106,45,0.5)", color: "#fff" } : { color: "rgba(255,255,255,0.35)" }}
            data-testid="tab-register"
          >
            Create Account
          </button>
        </div>

        {/* Form card */}
        <div className="rounded-2xl p-5 shadow-2xl" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(74,154,58,0.15)", backdropFilter: "blur(12px)" }}>
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
        className="h-10 pr-9 rounded-xl text-sm"
        style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(74,154,58,0.2)", color: "#fff" }}
        data-testid={testId}
      />
      <button
        type="button"
        onClick={() => setShow(s => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
        style={{ color: "rgba(255,255,255,0.25)" }}
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
        <Label className="text-[10px] uppercase tracking-widest font-bold" style={{ color: "rgba(74,154,58,0.6)" }}>Email</Label>
        <Input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="you@example.com"
          disabled={isLoggingIn}
          autoComplete="email"
          className="h-10 rounded-xl text-sm"
          style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(74,154,58,0.2)", color: "#fff" }}
          data-testid="input-email"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-[10px] uppercase tracking-widest font-bold" style={{ color: "rgba(74,154,58,0.6)" }}>Password</Label>
        <PasswordInput value={password} onChange={setPassword} disabled={isLoggingIn} testId="input-password" />
      </div>
      <Button
        type="submit"
        disabled={isLoggingIn || !email.trim() || !password}
        className="w-full h-10 text-xs font-bold rounded-xl mt-1 border-0"
        style={{ background: "#2d6a2d", color: "#fff" }}
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
        <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.35)" }}>Your username was auto-generated. You can see it in your profile.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleCreate} className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-[10px] uppercase tracking-widest font-bold" style={{ color: "rgba(74,154,58,0.6)" }}>Email</Label>
        <Input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="you@example.com"
          disabled={isRegistering}
          autoComplete="email"
          className="h-10 rounded-xl text-sm"
          style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(74,154,58,0.2)", color: "#fff" }}
          data-testid="input-reg-email"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-[10px] uppercase tracking-widest font-bold" style={{ color: "rgba(74,154,58,0.6)" }}>Password</Label>
        <PasswordInput value={password} onChange={setPassword} placeholder="min. 6 characters" disabled={isRegistering} testId="input-reg-password" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-[10px] uppercase tracking-widest font-bold" style={{ color: "rgba(74,154,58,0.6)" }}>Confirm Password</Label>
        <PasswordInput value={confirm} onChange={setConfirm} placeholder="repeat password" disabled={isRegistering} testId="input-reg-confirm" />
      </div>
      <p className="text-[10px] leading-relaxed" style={{ color: "rgba(255,255,255,0.2)" }}>
        Username auto-generated as <span className="font-mono" style={{ color: "rgba(255,255,255,0.35)" }}>anon-xxxxxxxx</span>.
      </p>
      <Button
        type="submit"
        disabled={isRegistering || !email.trim() || !password || !confirm}
        className="w-full h-10 text-xs font-bold rounded-xl border-0"
        style={{ background: "#2d6a2d", color: "#fff" }}
        data-testid="btn-register"
      >
        {isRegistering ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Create Account"}
      </Button>
    </form>
  );
}
