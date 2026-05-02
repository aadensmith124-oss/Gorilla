import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Mail, Zap, AlertTriangle, CheckCircle2 } from "lucide-react";

export default function EmailBomberPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [targetEmail, setTargetEmail] = useState("");
  const [jobId, setJobId] = useState<string | null>(null);
  const [sent, setSent] = useState(0);
  const [total, setTotal] = useState(200);
  const [status, setStatus] = useState<"idle" | "running" | "done" | "failed">("idle");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const BOMB_COST = 50;
  const canAfford = user && user.balance >= BOMB_COST;
  const progress = total > 0 ? Math.round((sent / total) * 100) : 0;

  const startBomb = async () => {
    if (!targetEmail || !canAfford || status === "running") return;
    try {
      const res = await apiRequest("POST", "/api/tools/email-bomb", { email: targetEmail });
      if (!res.ok) {
        const err = await res.json();
        toast({ title: "Failed", description: err.message, variant: "destructive" });
        return;
      }
      const data = await res.json();
      setJobId(data.jobId);
      setTotal(data.total || 200);
      setSent(0);
      setStatus("running");
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  useEffect(() => {
    if (!jobId || status !== "running") return;
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/tools/email-bomb/${jobId}`);
        if (!res.ok) return;
        const data = await res.json();
        setSent(data.sent);
        if (data.status === "done") {
          setStatus("done");
          clearInterval(pollRef.current!);
          toast({ title: "Bomb complete!", description: `Sent ${data.sent} emails to ${targetEmail}` });
        } else if (data.status === "failed") {
          setStatus("failed");
          clearInterval(pollRef.current!);
          toast({ title: "Bomb failed", variant: "destructive" });
        }
      } catch {}
    }, 800);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [jobId, status]);

  const reset = () => {
    setStatus("idle");
    setJobId(null);
    setSent(0);
    setTargetEmail("");
  };

  return (
    <div className="min-h-screen bg-[#0c0c0c] p-4">
      <div className="max-w-md mx-auto space-y-6 py-6">

        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Zap className="h-4.5 w-4.5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Email Bomber</h1>
            <p className="text-xs text-white/30">Flood any inbox with 200 emails</p>
          </div>
        </div>

        <div className="bg-[#111] border border-white/5 rounded-xl p-5 space-y-4">

          {status === "done" ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <CheckCircle2 className="h-10 w-10 text-green-400" />
              <div>
                <p className="font-bold text-white">Bomb Complete!</p>
                <p className="text-xs text-white/40 mt-0.5">Successfully sent {total} emails to<br /><span className="font-mono text-white/70">{targetEmail}</span></p>
              </div>
              <Button size="sm" variant="outline" className="mt-2 h-8 text-xs" onClick={reset}>
                Bomb Another
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-widest text-white/40">Target Email</label>
                <Input
                  value={targetEmail}
                  onChange={e => setTargetEmail(e.target.value)}
                  placeholder="target@example.com"
                  type="email"
                  disabled={status === "running"}
                  className="h-10 bg-black/50 border-white/10 focus:border-primary/50"
                  data-testid="input-target-email"
                />
              </div>

              <div className="flex items-center justify-between border border-white/5 rounded-lg px-3 py-2">
                <div className="flex items-center gap-1.5 text-xs text-white/50">
                  <Mail className="h-3.5 w-3.5" />
                  <span>200 emails · $0.50 per bomb</span>
                </div>
                <span className="text-xs font-mono text-white/50">Balance: ${((user?.balance ?? 0) / 100).toFixed(2)}</span>
              </div>

              {!canAfford && (
                <div className="flex items-center gap-2 bg-red-950/30 border border-red-500/20 rounded-lg p-2.5 text-xs text-red-400">
                  <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                  Insufficient balance — need $0.50 to bomb
                </div>
              )}

              {status === "running" && (
                <div className="space-y-2 pt-1">
                  <div className="flex justify-between text-xs text-white/40">
                    <span>Sending...</span>
                    <span className="font-mono">{sent} / {total}</span>
                  </div>
                  <Progress value={progress} className="h-2.5" />
                  <p className="text-xs text-center text-primary font-mono">{progress}%</p>
                </div>
              )}

              <Button
                onClick={startBomb}
                disabled={!targetEmail || !canAfford || status === "running"}
                className="w-full h-10 text-sm font-bold"
                data-testid="btn-bomb"
              >
                {status === "running" ? (
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
                    Bombing... ({progress}%)
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Bomb ($0.50)
                  </span>
                )}
              </Button>
            </>
          )}
        </div>

        <p className="text-[10px] text-white/15 text-center leading-relaxed">
          Each bomb sends 200 emails one every 0.5 seconds.<br />
          Use responsibly. Balance deducted immediately.
        </p>
      </div>
    </div>
  );
}
