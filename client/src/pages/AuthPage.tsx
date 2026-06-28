import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
    const t = setTimeout(() => setFaceLoaded(true), 100);
    return () => clearTimeout(t);
  }, []);

  if (user) return <Redirect to="/" />;

  return (
    <div className="min-h-screen flex flex-col items-center bg-[#0b1a0e] relative overflow-hidden">
      {/* Green ambient glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-[50%] bg-[#2d6a2d]/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#1a4a1a]/15 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#1a4a1a]/15 rounded-full blur-[100px]" />
      </div>

      {/* Beast Boy Face — fades in from top */}
      <div
        className="relative z-10 w-full flex justify-center pt-8"
        style={{
          opacity: faceLoaded ? 1 : 0,
          transform: faceLoaded ? "translateY(0)" : "translateY(-24px)",
          transition: "opacity 1.1s ease, transform 1.1s ease",
        }}
      >
        <div
          className="relative w-36 h-36 rounded-full overflow-hidden"
          style={{
            boxShadow: "0 8px 40px 8px rgba(74,138,58,0.35), 0 0 0 3px rgba(74,138,58,0.18)",
            maskImage: "linear-gradient(to bottom, black 55%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(to bottom, black 55%, transparent 100%)",
          }}
        >
          <img
            src={beastBoyImg}
            alt="NYCHQ"
            className="w-full h-full object-cover object-top scale-125"
            style={{ objectPosition: "50% 15%" }}
          />
        </div>
      </div>

      {/* White card panel */}
      <div
        className="relative z-10 w-full max-w-[360px] mx-auto mt-5 mx-4 rounded-t-3xl rounded-b-none flex-1"
        style={{
          background: "linear-gradient(160deg, #f5f5f0 0%, #ffffff 40%)",
          minHeight: "calc(100vh - 200px)",
          opacity: faceLoaded ? 1 : 0,
          transform: faceLoaded ? "translateY(0)" : "translateY(30px)",
          transition: "opacity 0.9s ease 0.3s, transform 0.9s ease 0.3s",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.4)",
        }}
      >
        <div className="px-7 pt-8 pb-6">
          {/* Brand */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-black text-[#1a1a1a] tracking-tight">
              NYC<span className="text-[#4a7c3a]">HQ</span>
            </h1>
            <p className="text-[10px] text-[#888] uppercase tracking-[0.2em] mt-0.5">
              {tab === "login" ? "Welcome Back" : "Create Account"}
            </p>
          </div>

          {/* Tab switcher */}
          <div className="flex bg-[#f0f0ee] rounded-2xl p-1 gap-1 mb-6">
            <button
              onClick={() => setTab("login")}
              className={`flex-1 text-[11px] font-bold py-2.5 rounded-xl transition-all ${
                tab === "login"
                  ? "bg-[#2d6a2d] text-white shadow-sm"
                  : "text-[#666] hover:text-[#333]"
              }`}
              data-testid="tab-login"
            >
              Sign In
            </button>
            <button
              onClick={() => setTab("register")}
              className={`flex-1 text-[11px] font-bold py-2.5 rounded-xl transition-all ${
                tab === "register"
                  ? "bg-[#2d6a2d] text-white shadow-sm"
                  : "text-[#666] hover:text-[#333]"
              }`}
              data-testid="tab-register"
            >
              Register
            </button>
          </div>

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
        className="h-12 bg-[#f7f7f5] border-[#e0e0dc] focus:border-[#4a7c3a] focus:ring-[#4a7c3a]/20 pr-10 rounded-xl text-sm text-[#1a1a1a] placeholder:text-[#aaa]"
        data-testid={testId}
      />
      <button
        type="button"
        onClick={() => setShow(s => !s)}
        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#aaa] hover:text-[#555] transition-colors"
        tabIndex={-1}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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
        <label className="text-[10px] uppercase tracking-widest text-[#888] font-bold">Email</label>
        <Input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="you@example.com"
          disabled={isLoggingIn}
          autoComplete="email"
          className="h-12 bg-[#f7f7f5] border-[#e0e0dc] focus:border-[#4a7c3a] rounded-xl text-sm text-[#1a1a1a] placeholder:text-[#aaa]"
          data-testid="input-email"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-[10px] uppercase tracking-widest text-[#888] font-bold">Password</label>
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
        className="w-full h-12 text-sm font-bold rounded-xl mt-2 bg-[#2d6a2d] hover:bg-[#3a7a3a] text-white border-0 shadow-lg"
        data-testid="btn-login"
      >
        {isLoggingIn ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign In"}
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
      <div className="text-center space-y-3 py-6">
        <div className="text-5xl">✓</div>
        <p className="text-base font-black text-[#1a1a1a]">Account created!</p>
        <p className="text-xs text-[#888] leading-relaxed">Your username was auto-generated. You can see it in your profile.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleCreate} className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-[10px] uppercase tracking-widest text-[#888] font-bold">Email</label>
        <Input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="you@example.com"
          disabled={isRegistering}
          autoComplete="email"
          className="h-12 bg-[#f7f7f5] border-[#e0e0dc] focus:border-[#4a7c3a] rounded-xl text-sm text-[#1a1a1a] placeholder:text-[#aaa]"
          data-testid="input-reg-email"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-[10px] uppercase tracking-widest text-[#888] font-bold">Password</label>
        <PasswordInput
          value={password}
          onChange={setPassword}
          placeholder="min. 6 characters"
          disabled={isRegistering}
          testId="input-reg-password"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-[10px] uppercase tracking-widest text-[#888] font-bold">Confirm Password</label>
        <PasswordInput
          value={confirm}
          onChange={setConfirm}
          placeholder="repeat password"
          disabled={isRegistering}
          testId="input-reg-confirm"
        />
      </div>
      <p className="text-[10px] text-[#aaa] leading-relaxed">
        Your username will be auto-generated as <span className="font-mono text-[#777]">anon-xxxxxxxx</span>.
      </p>
      <Button
        type="submit"
        disabled={isRegistering || !email.trim() || !password || !confirm}
        className="w-full h-12 text-sm font-bold rounded-xl bg-[#2d6a2d] hover:bg-[#3a7a3a] text-white border-0 shadow-lg"
        data-testid="btn-register"
      >
        {isRegistering ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Account"}
      </Button>
    </form>
  );
}
