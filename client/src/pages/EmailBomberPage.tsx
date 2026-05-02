import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function EmailBomberPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [targetEmail, setTargetEmail] = useState("");
  const [jobId, setJobId] = useState<string | null>(null);
  const [sent, setSent] = useState(0);
  const [total, setTotal] = useState(200);
  const [status, setStatus] = useState<"idle" | "running" | "done">("idle");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const progress = total > 0 ? Math.round((sent / total) * 100) : 0;
  const canAfford = user && user.balance >= 50;

  const handleBomb = async () => {
    if (!targetEmail || !canAfford || status === "running") return;
    try {
      const res = await apiRequest("POST", "/api/tools/email-bomb", { email: targetEmail });
      if (!res.ok) {
        const err = await res.json();
        toast({ title: err.message || "Failed", variant: "destructive" });
        return;
      }
      const data = await res.json();
      setJobId(data.jobId);
      setTotal(data.total || 200);
      setSent(0);
      setStatus("running");
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    } catch (e: any) {
      toast({ title: e.message, variant: "destructive" });
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
        } else if (data.status === "failed") {
          setStatus("idle");
          clearInterval(pollRef.current!);
          toast({ title: "Failed", variant: "destructive" });
        }
      } catch {}
    }, 800);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [jobId, status]);

  return (
    <div className="min-h-screen bg-[#0c0c0c] flex items-start justify-center p-6 pt-16">
      <div className="w-full max-w-sm space-y-8">
        <h1 className="text-2xl font-bold text-white">Bomb Emails</h1>

        <div className="space-y-3">
          <Input
            value={targetEmail}
            onChange={e => setTargetEmail(e.target.value)}
            placeholder="Enter email"
            type="email"
            disabled={status === "running"}
            className="h-11 bg-[#111] border-white/10 focus:border-primary/50 text-white placeholder:text-white/20"
            data-testid="input-target-email"
            onKeyDown={e => { if (e.key === "Enter") handleBomb(); }}
          />

          {status === "running" && (
            <div className="space-y-1.5">
              <Progress value={progress} className="h-1.5" />
              <p className="text-xs text-white/30 text-right font-mono">{progress}%</p>
            </div>
          )}

          {status === "done" && (
            <p className="text-xs text-green-400">Done.</p>
          )}

          <Button
            onClick={status === "done" ? () => { setStatus("idle"); setTargetEmail(""); setJobId(null); } : handleBomb}
            disabled={status === "running" || (status === "idle" && (!targetEmail || !canAfford))}
            className="w-full h-11 text-sm font-semibold"
            data-testid="btn-bomb"
          >
            {status === "running" ? `${progress}%` : status === "done" ? "Bomb Again" : "Bomb ($0.50)"}
          </Button>

          {!canAfford && status === "idle" && (
            <p className="text-xs text-white/30 text-center">Insufficient balance</p>
          )}
        </div>
      </div>
    </div>
  );
}
