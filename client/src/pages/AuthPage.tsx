import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { Copy, Check, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const P    = "hsl(186 100% 50%)";
const PBG  = "hsl(186 100% 50% / 0.1)";
const BG   = "hsl(214 50% 4%)";
const CARD = "hsl(214 45% 7%)";
const BDR  = "hsl(210 40% 16%)";
const TEXT = "hsl(195 60% 88%)";
const MUT  = "hsl(205 30% 45%)";

export default function AuthPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"login" | "register">("login");

  if (user) return <Redirect to="/" />;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ background: BG }}>
      <div className="w-full max-w-sm space-y-6">
        {/* Pixel logo */}
        <div className="text-center space-y-2">
          <h1 style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: "18px",
            color: P,
            textShadow: `0 0 12px ${P}, 0 0 30px hsl(186 100% 50% / 0.5)`,
            letterSpacing: "0.05em",
          }}>
            NYC<span style={{ color: TEXT, textShadow: "none" }}>HQ</span>
          </h1>
          <p className="text-[10px] tracking-widest" style={{ color: MUT }}>PREMIUM DIGITAL MARKETPLACE</p>
        </div>

        {/* Tabs */}
        <div className="flex" style={{ border: `1px solid ${BDR}` }}>
          {(["login", "register"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className="flex-1 text-[10px] py-2.5 transition-all tracking-widest"
              style={tab === t
                ? { background: PBG, color: P, borderBottom: `2px solid ${P}` }
                : { color: MUT, borderRight: t === "login" ? `1px solid ${BDR}` : undefined }
              }
              data-testid={`tab-${t}`}>
              {t === "login" ? "[ SIGN IN ]" : "[ REGISTER ]"}
            </button>
          ))}
        </div>

        {/* Card */}
        <div style={{ background: CARD, border: `1px solid ${BDR}`, padding: "20px" }}>
          {tab === "login" ? <LoginForm /> : <RegisterForm />}
        </div>

        <p className="text-center text-[9px]" style={{ color: "hsl(210 40% 20%)" }}>
          ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
        </p>
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
    try { await login({ loginCode: loginCode.trim().toUpperCase() }); } catch {}
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-[9px] tracking-widest" style={{ color: MUT }}>LOGIN CODE</label>
        <input
          value={loginCode}
          onChange={e => setLoginCode(e.target.value.toUpperCase())}
          placeholder="XXXXXXXXXXXX"
          disabled={isLoggingIn}
          autoComplete="off"
          className="w-full h-10 text-base font-mono tracking-[0.25em] text-center outline-none transition-all"
          style={{
            background: BG,
            border: `1px solid ${loginCode.length === 12 ? P : BDR}`,
            color: TEXT,
            boxShadow: loginCode.length === 12 ? `0 0 6px ${P}` : "none",
          }}
          maxLength={12}
          data-testid="input-login-code"
        />
        <p className="text-[9px] text-center" style={{ color: "hsl(195 60% 88% / 0.25)" }}>
          enter your 12-character code
        </p>
      </div>
      <button type="submit" disabled={isLoggingIn || loginCode.length < 12}
        className="w-full h-9 text-[10px] tracking-widest transition-all disabled:opacity-40 pixel-btn"
        style={{ background: P, color: BG, fontFamily: "'Share Tech Mono', monospace" }}
        data-testid="btn-login">
        {isLoggingIn ? "..." : "▶ SIGN IN"}
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
          <p className="text-[10px] tracking-widest" style={{ color: P, textShadow: `0 0 6px ${P}` }}>✓ ACCOUNT CREATED</p>
          {username && <p className="text-[10px] font-mono" style={{ color: MUT }}>{username}</p>}
        </div>

        <div className="p-4 text-center space-y-2" style={{ background: BG, border: `2px solid ${P}`, boxShadow: `0 0 12px ${P}` }}>
          <p className="text-[9px] tracking-widest" style={{ color: MUT }}>YOUR LOGIN CODE</p>
          <p className="font-mono text-2xl font-black tracking-[0.2em] select-all" style={{ color: P, textShadow: `0 0 8px ${P}` }}>{generatedCode}</p>
          <button onClick={copyCode} className="flex items-center gap-1.5 mx-auto text-[10px] transition-colors mt-1"
            style={{ color: copied ? P : MUT }} data-testid="btn-copy-code">
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "COPIED!" : "COPY CODE"}
          </button>
        </div>

        <div className="flex items-start gap-2.5 p-3" style={{ background: "hsl(186 100% 50% / 0.06)", border: `1px solid ${P}` }}>
          <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: P }} />
          <div>
            <p className="text-[9px] tracking-widest mb-1" style={{ color: P }}>SAVE THIS — DON'T LOSE IT</p>
            <p className="text-[10px] leading-relaxed" style={{ color: MUT }}>
              This is your only way to sign in. No reset exists.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleCreate} className="space-y-4">
      <div className="text-center py-3">
        <p className="text-[10px] leading-relaxed" style={{ color: MUT }}>
          No email needed.<br />We generate a unique code for you.
        </p>
      </div>
      <button type="submit" disabled={isRegistering}
        className="w-full h-9 text-[10px] tracking-widest transition-all disabled:opacity-40 pixel-btn"
        style={{ background: P, color: BG }}
        data-testid="btn-register">
        {isRegistering ? "..." : "▶ GENERATE CODE"}
      </button>
    </form>
  );
}
