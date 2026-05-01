import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { Loader2, Copy, Check, ShieldCheck } from "lucide-react";
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
          <h1 className="text-2xl font-extrabold text-white tracking-tight">TRENT <span className="text-primary">HQ</span></h1>
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
  const [email, setEmail] = useState("");
  const [loginCode, setLoginCode] = useState("");
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !loginCode.trim()) return;
    try {
      await login({ email: email.trim(), loginCode: loginCode.trim() });
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
          placeholder="you@email.com"
          disabled={isLoggingIn}
          className="h-9 text-sm bg-black/50 border-white/10 focus:border-primary/50"
          data-testid="input-login-email"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-[10px] uppercase tracking-widest text-white/40">Login Code</Label>
        <Input
          value={loginCode}
          onChange={e => setLoginCode(e.target.value.toUpperCase())}
          placeholder="XXXXXXXXXXXX"
          disabled={isLoggingIn}
          className="h-9 text-sm bg-black/50 border-white/10 focus:border-primary/50 font-mono tracking-widest"
          maxLength={12}
          data-testid="input-login-code"
        />
        <p className="text-[10px] text-white/20">The 12-character code you received when you registered</p>
      </div>
      <Button
        type="submit"
        disabled={isLoggingIn || !email || !loginCode}
        className="w-full h-8 text-xs"
        data-testid="btn-login"
      >
        {isLoggingIn ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Sign In"}
      </Button>
    </form>
  );
}

function RegisterForm() {
  const { register, isRegistering } = useAuth();
  const [email, setEmail] = useState("");
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    try {
      const result = await register({ email: email.trim() });
      if (result?.loginCode) {
        setGeneratedCode(result.loginCode);
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
      <div className="space-y-4 text-center">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 border border-primary/20 mx-auto">
          <ShieldCheck className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold text-white">Account Created!</p>
          <p className="text-xs text-white/40 mt-0.5">Save your login code — this is the only way to sign in</p>
        </div>

        <div className="bg-black/60 border border-primary/20 rounded-lg p-4 space-y-2">
          <p className="text-[10px] uppercase tracking-widest text-white/30">Your Login Code</p>
          <p className="font-mono text-xl font-bold text-white tracking-[0.2em]">{generatedCode}</p>
        </div>

        <button
          onClick={copyCode}
          className="flex items-center gap-1.5 mx-auto text-xs text-primary hover:text-primary/80 transition-colors"
          data-testid="btn-copy-code"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied!" : "Copy code"}
        </button>

        <p className="text-[10px] text-white/20 leading-relaxed">
          Store this code somewhere safe. You'll need it every time you log in along with your email.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-[10px] uppercase tracking-widest text-white/40">Email</Label>
        <Input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="you@email.com"
          disabled={isRegistering}
          className="h-9 text-sm bg-black/50 border-white/10 focus:border-primary/50"
          data-testid="input-register-email"
        />
        <p className="text-[10px] text-white/20">A unique 12-character login code will be generated for you</p>
      </div>
      <Button
        type="submit"
        disabled={isRegistering || !email}
        className="w-full h-8 text-xs"
        data-testid="btn-register"
      >
        {isRegistering ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Generate Login Code"}
      </Button>
    </form>
  );
}
