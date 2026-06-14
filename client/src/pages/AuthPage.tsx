import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { Loader2, Copy, Check, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const C = {
  bg: "hsl(35 15% 4%)",
  card: "hsl(35 12% 7%)",
  border: "hsl(36 18% 20%)",
  text: "hsl(40 55% 82%)",
  muted: "hsl(38 20% 48%)",
  primary: "hsl(42 72% 55%)",
  primaryBg: "hsl(42 72% 55% / 0.12)",
};

export default function AuthPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"login" | "register">("login");

  if (user) return <Redirect to="/" />;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ background: C.bg }}>
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="text-center">
          <h1
            className="text-4xl tracking-widest"
            style={{ fontFamily: "'VT323', monospace", color: C.text }}
          >
            NYC<span style={{ color: C.primary }}>HQ</span>
          </h1>
          <p className="text-xs mt-1" style={{ color: C.muted }}>premium digital marketplace</p>
        </div>

        {/* Tab buttons */}
        <div className="flex" style={{ border: `1px solid ${C.border}` }}>
          <button
            onClick={() => setTab("login")}
            className="flex-1 text-xs py-2 transition-colors"
            style={tab === "login"
              ? { background: C.primaryBg, color: C.primary, borderRight: `1px solid ${C.border}` }
              : { color: C.muted, borderRight: `1px solid ${C.border}` }
            }
            data-testid="tab-login"
          >
            [ SIGN IN ]
          </button>
          <button
            onClick={() => setTab("register")}
            className="flex-1 text-xs py-2 transition-colors"
            style={tab === "register"
              ? { background: C.primaryBg, color: C.primary }
              : { color: C.muted }
            }
            data-testid="tab-register"
          >
            [ CREATE ACCOUNT ]
          </button>
        </div>

        {/* Form card */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, padding: "20px" }}>
          {tab === "login" ? <LoginForm /> : <RegisterForm />}
        </div>
      </div>
    </div>
  );
}

function LoginForm() {
  const { login, isLoggingIn } = useAuth();
  const [loginCode, setLoginCode] = useState("");

  const C = {
    border: "hsl(36 18% 20%)",
    text: "hsl(40 55% 82%)",
    muted: "hsl(38 20% 48%)",
    primary: "hsl(42 72% 55%)",
    input: "hsl(35 12% 9%)",
    primaryFg: "hsl(35 15% 4%)",
  };

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
        <label className="text-[10px] tracking-widest" style={{ color: C.muted }}>LOGIN CODE</label>
        <input
          value={loginCode}
          onChange={e => setLoginCode(e.target.value.toUpperCase())}
          placeholder="XXXXXXXXXXXX"
          disabled={isLoggingIn}
          autoComplete="off"
          className="w-full h-10 text-base font-mono tracking-[0.25em] text-center outline-none transition-colors"
          style={{
            background: C.input,
            border: `1px solid ${C.border}`,
            color: C.text,
          }}
          maxLength={12}
          data-testid="input-login-code"
        />
        <p className="text-[10px] text-center" style={{ color: "hsl(40 55% 82% / 0.28)" }}>
          Enter your 12-character login code
        </p>
      </div>
      <button
        type="submit"
        disabled={isLoggingIn || loginCode.length < 12}
        className="w-full h-9 text-xs font-bold tracking-widest transition-all disabled:opacity-40"
        style={{ background: C.primary, color: C.primaryFg }}
        data-testid="btn-login"
      >
        {isLoggingIn ? "..." : "SIGN IN"}
      </button>
    </form>
  );
}

function RegisterForm() {
  const { register, isRegistering } = useAuth();
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const C = {
    border: "hsl(36 18% 20%)",
    text: "hsl(40 55% 82%)",
    muted: "hsl(38 20% 48%)",
    primary: "hsl(42 72% 55%)",
    primaryFg: "hsl(35 15% 4%)",
    card2: "hsl(35 15% 4%)",
    warn: "hsl(42 90% 60%)",
    warnBg: "hsl(42 72% 55% / 0.10)",
  };

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
    toast({ title: "Code copied!" });
  };

  if (generatedCode) {
    return (
      <div className="space-y-4">
        <div className="text-center space-y-1">
          <p className="text-sm font-bold" style={{ color: C.primary }}>ACCOUNT CREATED</p>
          {username && (
            <p className="text-[10px] font-mono" style={{ color: C.muted }}>{username}</p>
          )}
        </div>

        {/* Code display */}
        <div className="p-4 text-center space-y-2" style={{ background: C.card2, border: `2px solid ${C.primary}` }}>
          <p className="text-[9px] tracking-widest" style={{ color: C.muted }}>YOUR LOGIN CODE</p>
          <p className="font-mono text-2xl font-black tracking-[0.25em] select-all" style={{ color: C.text }}>{generatedCode}</p>
          <button
            onClick={copyCode}
            className="flex items-center gap-1.5 mx-auto text-xs transition-colors mt-1"
            style={{ color: copied ? C.primary : C.muted }}
            data-testid="btn-copy-code"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "COPIED" : "COPY CODE"}
          </button>
        </div>

        {/* Warning */}
        <div className="flex items-start gap-2.5 p-3" style={{ background: C.warnBg, border: `1px solid ${C.primary}` }}>
          <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: C.warn }} />
          <div className="space-y-0.5">
            <p className="text-xs font-bold" style={{ color: C.warn }}>SAVE THIS CODE — DO NOT LOSE IT</p>
            <p className="text-[11px] leading-relaxed" style={{ color: "hsl(42 72% 55% / 0.75)" }}>
              This is the only way to sign in. No password reset exists.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleCreate} className="space-y-4">
      <div className="text-center space-y-2 py-2">
        <p className="text-xs leading-relaxed" style={{ color: C.muted }}>
          No email or password needed.<br />We generate a unique login code for you.
        </p>
      </div>
      <button
        type="submit"
        disabled={isRegistering}
        className="w-full h-9 text-xs font-bold tracking-widest transition-all disabled:opacity-40"
        style={{ background: C.primary, color: C.primaryFg }}
        data-testid="btn-register"
      >
        {isRegistering ? "..." : "GENERATE LOGIN CODE"}
      </button>
    </form>
  );
}
