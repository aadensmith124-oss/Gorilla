import { useState, useEffect, useRef } from "react";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";

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
    <div className="max-w-sm mx-auto px-3 py-4">
      <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
        <p className="text-[9px] text-white/30 uppercase tracking-widest font-mono">Email Bomber</p>

        <input
          value={targetEmail}
          onChange={e => setTargetEmail(e.target.value)}
          placeholder="target email address"
          type="email"
          disabled={status === "running"}
          className="w-full h-8 bg-black/40 border border-gray-200 rounded px-3 text-xs text-white placeholder:text-white/20 outline-none font-mono"
          data-testid="input-target-email"
          onKeyDown={e => { if (e.key === "Enter") handleBomb(); }}
        />

        {status === "running" && (
          <div className="space-y-1">
            <Progress value={progress} className="h-1" />
            <p className="text-[9px] text-white/25 text-right font-mono">{progress}% · {sent}/{total}</p>
          </div>
        )}

        {status === "done" && (
          <p className="text-[10px] text-green-400 font-mono">done — {total} emails sent</p>
        )}

        <button
          onClick={status === "done" ? () => { setStatus("idle"); setTargetEmail(""); setJobId(null); } : handleBomb}
          disabled={status === "running" || (status === "idle" && (!targetEmail || !canAfford))}
          className="w-full h-8 flex items-center justify-center gap-2 rounded border border-gray-200 text-xs font-mono text-white/60 hover:text-white hover:border-gray-300 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          data-testid="btn-bomb"
        >
          {status === "running"
            ? <><Loader2 className="h-3 w-3 animate-spin" /> {progress}%</>
            : status === "done"
            ? "bomb again"
            : "bomb ($0.50)"}
        </button>

        {!canAfford && status === "idle" && (
          <p className="text-[9px] text-white/20 font-mono">insufficient balance</p>
        )}
      </div>
    </div>
  );
}
