import { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { Loader2, Eye, EyeOff, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import beastBoyImg from "@assets/IMG_8176_1782687294972.jpeg";

/* ── SVG Captcha ──────────────────────────────────────────── */
const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

function randomChar() { return CHARS[Math.floor(Math.random() * CHARS.length)]; }
function randomInt(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function generateCaptchaCode(len = 5) {
  return Array.from({ length: len }, randomChar).join("");
}

function CaptchaImage({ code, width = 200, height = 52 }: { code: string; width?: number; height?: number }) {
  const chars = code.split("");
  const cellW = width / chars.length;

  const noises = Array.from({ length: 6 }, (_, i) => ({
    x1: randomInt(0, width), y1: randomInt(0, height),
    x2: randomInt(0, width), y2: randomInt(0, height),
    key: i,
  }));

  return (
    <svg
      width={width} height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ userSelect: "none", display: "block" }}
    >
      {/* Background */}
      <rect width={width} height={height} fill="#f8f8f6" rx="6" />
      {/* Noise lines */}
      {noises.map(n => (
        <line key={n.key} x1={n.x1} y1={n.y1} x2={n.x2} y2={n.y2}
          stroke={`hsl(${randomInt(100,200)},30%,60%)`} strokeWidth="1.2" opacity="0.5" />
      ))}
      {/* Characters */}
      {chars.map((ch, i) => {
        const x = cellW * i + cellW / 2 + randomInt(-3, 3);
        const y = height / 2 + randomInt(-4, 4);
        const rotate = randomInt(-22, 22);
        const size = randomInt(20, 28);
        const color = `hsl(${randomInt(180, 260)},50%,${randomInt(20, 45)}%)`;
        return (
          <text key={i} x={x} y={y}
            dominantBaseline="middle" textAnchor="middle"
            fontSize={size} fill={color} fontWeight="bold"
            fontFamily="Georgia, serif"
            transform={`rotate(${rotate},${x},${y})`}
            style={{ letterSpacing: 2 }}
          >{ch}</text>
        );
      })}
      {/* Dot noise */}
      {Array.from({ length: 40 }, (_, i) => (
        <circle key={i} cx={randomInt(0, width)} cy={randomInt(0, height)}
          r={randomInt(1, 2)} fill={`hsl(${randomInt(0, 360)},40%,50%)`} opacity="0.35" />
      ))}
    </svg>
  );
}

function useCaptcha() {
  const [code, setCode] = useState(() => generateCaptchaCode());
  const refresh = useCallback(() => setCode(generateCaptchaCode()), []);
  return { code, refresh };
}

/* ── Shared password input ──────────────────────────────────── */
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

/* ── Login form ─────────────────────────────────────────────── */
function LoginForm() {
  const { login, isLoggingIn } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [captchaInput, setCaptchaInput] = useState("");
  const { code: captchaCode, refresh: refreshCaptcha } = useCaptcha();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    if (captchaInput.trim().toLowerCase() !== captchaCode.toLowerCase()) {
      toast({ title: "Verification failed", description: "Code doesn't match — try again", variant: "destructive" });
      refreshCaptcha();
      setCaptchaInput("");
      return;
    }
    try {
      await login({ email: email.trim().toLowerCase(), password });
    } catch {}
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3.5">
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

      {/* CAPTCHA */}
      <div className="space-y-1.5">
        <Label className="text-[10px] uppercase tracking-widest font-bold" style={{ color: "rgba(74,154,58,0.6)" }}>Verification</Label>
        <div className="flex items-center gap-2">
          <div className="flex-1 rounded-xl overflow-hidden border" style={{ borderColor: "rgba(74,154,58,0.15)" }}>
            <CaptchaImage code={captchaCode} width={180} height={50} />
          </div>
          <button
            type="button"
            onClick={() => { refreshCaptcha(); setCaptchaInput(""); }}
            className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors"
            style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(74,154,58,0.2)", color: "rgba(74,154,58,0.5)" }}
            title="New code"
            data-testid="btn-refresh-captcha"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
        <Input
          type="text"
          value={captchaInput}
          onChange={e => setCaptchaInput(e.target.value)}
          placeholder="Enter the code above"
          disabled={isLoggingIn}
          autoComplete="off"
          className="h-10 rounded-xl text-sm tracking-widest"
          style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(74,154,58,0.2)", color: "#fff" }}
          data-testid="input-captcha"
        />
      </div>

      <Button
        type="submit"
        disabled={isLoggingIn || !email.trim() || !password || !captchaInput.trim()}
        className="w-full h-10 text-xs font-bold rounded-xl mt-1 border-0"
        style={{ background: "#2d6a2d", color: "#fff" }}
        data-testid="btn-login"
      >
        {isLoggingIn ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Sign In"}
      </Button>
    </form>
  );
}

/* ── Register form ──────────────────────────────────────────── */
function RegisterForm({ onSwitchToLogin }: { onSwitchToLogin: () => void }) {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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
    setSubmitting(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast({ title: "Registration failed", description: err.message || "Try again", variant: "destructive" });
        return;
      }
      setDone(true);
    } catch {
      toast({ title: "Registration failed", description: "Try again", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="text-center space-y-4 py-4">
        <div className="text-4xl">✓</div>
        <p className="text-sm font-bold text-white">Account created!</p>
        <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.35)" }}>
          Your username was auto-generated. Sign in with your email and password.
        </p>
        <button
          onClick={onSwitchToLogin}
          className="w-full h-10 text-xs font-bold rounded-xl border-0 mt-2"
          style={{ background: "#2d6a2d", color: "#fff" }}
          data-testid="btn-go-login"
        >
          Sign In
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleCreate} className="space-y-3.5">
      <div className="space-y-1.5">
        <Label className="text-[10px] uppercase tracking-widest font-bold" style={{ color: "rgba(74,154,58,0.6)" }}>Email</Label>
        <Input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="you@example.com"
          disabled={submitting}
          autoComplete="email"
          className="h-10 rounded-xl text-sm"
          style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(74,154,58,0.2)", color: "#fff" }}
          data-testid="input-reg-email"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-[10px] uppercase tracking-widest font-bold" style={{ color: "rgba(74,154,58,0.6)" }}>Password</Label>
        <PasswordInput value={password} onChange={setPassword} placeholder="min. 6 characters" disabled={submitting} testId="input-reg-password" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-[10px] uppercase tracking-widest font-bold" style={{ color: "rgba(74,154,58,0.6)" }}>Confirm Password</Label>
        <PasswordInput value={confirm} onChange={setConfirm} placeholder="repeat password" disabled={submitting} testId="input-reg-confirm" />
      </div>
      <p className="text-[10px] leading-relaxed" style={{ color: "rgba(255,255,255,0.2)" }}>
        Username auto-generated as <span className="font-mono" style={{ color: "rgba(255,255,255,0.35)" }}>anon-xxxxxxxx</span>.
      </p>
      <Button
        type="submit"
        disabled={submitting || !email.trim() || !password || !confirm}
        className="w-full h-10 text-xs font-bold rounded-xl border-0"
        style={{ background: "#2d6a2d", color: "#fff" }}
        data-testid="btn-register"
      >
        {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Create Account"}
      </Button>
    </form>
  );
}

/* ── Main page ──────────────────────────────────────────────── */
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
      {/* Ambient glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-15%] left-1/2 -translate-x-1/2 w-[70%] h-[50%] rounded-full blur-[140px]" style={{ background: "rgba(45,106,45,0.18)" }} />
        <div className="absolute bottom-[-20%] right-[-15%] w-[40%] h-[40%] rounded-full blur-[120px]" style={{ background: "rgba(20,60,20,0.12)" }} />
      </div>

      <div className="relative z-10 w-full max-w-[340px] space-y-4">
        {/* Beast Boy face */}
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
              alt="BEASTCC"
              className="w-full h-full object-cover scale-125"
              style={{ objectPosition: "50% 15%" }}
            />
          </div>
        </div>

        {/* Brand */}
        <div className="text-center space-y-0.5">
          <h1 className="text-xl font-black tracking-tight text-white">
            BEAST<span style={{ color: "#4a9a3a" }}>CC</span>
          </h1>
          <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: "rgba(74,154,58,0.5)" }}>BEST HIGH QUALITY CARDS</p>
        </div>

        {/* Tab switcher */}
        <div className="flex rounded-2xl p-1 gap-1" style={{ background: "rgba(255,255,255,0.06)" }}>
          <button
            onClick={() => setTab("login")}
            className="flex-1 text-[11px] font-bold py-2 rounded-xl transition-all"
            style={tab === "login" ? { background: "rgba(45,106,45,0.5)", color: "#fff" } : { color: "rgba(255,255,255,0.35)" }}
            data-testid="tab-login"
          >
            Sign In
          </button>
          <button
            onClick={() => setTab("register")}
            className="flex-1 text-[11px] font-bold py-2 rounded-xl transition-all"
            style={tab === "register" ? { background: "rgba(45,106,45,0.5)", color: "#fff" } : { color: "rgba(255,255,255,0.35)" }}
            data-testid="tab-register"
          >
            Create Account
          </button>
        </div>

        {/* Form card */}
        <div className="rounded-2xl p-5 shadow-2xl" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(74,154,58,0.15)", backdropFilter: "blur(12px)" }}>
          {tab === "login"
            ? <LoginForm />
            : <RegisterForm onSwitchToLogin={() => setTab("login")} />
          }
        </div>
      </div>
    </div>
  );
}
