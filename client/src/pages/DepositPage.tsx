import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { ChevronRight, Loader2, Copy, Check, Clock, CheckCircle2, XCircle, AlertTriangle, RefreshCw } from "lucide-react";
import { SiBitcoin, SiCashapp } from "react-icons/si";

type Method = "crypto" | "cashapp";

type Deposit = {
  id: string;
  type: "crypto" | "cashapp";
  amount: number;
  status: string;
  paymentId?: string;
  checkoutUrl?: string;
  paymentNote?: string;
  createdAt: string;
};

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const handle = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handle} className="ml-1 text-white/40 hover:text-white transition-colors flex-shrink-0" data-testid="btn-copy-note">
      {copied ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
    </button>
  );
}

function StatusBadge({ status, type }: { status: string; type: string }) {
  if (status === "completed" || status === "delivering" || status === "fulfilled") {
    return (
      <span className="flex items-center gap-1 text-[10px] font-mono text-green-400">
        <CheckCircle2 className="h-3 w-3" /> credited
      </span>
    );
  }
  if (status === "failed" || status === "expired") {
    return (
      <span className="flex items-center gap-1 text-[10px] font-mono text-red-400/70">
        <XCircle className="h-3 w-3" /> {status}
      </span>
    );
  }
  if (status === "underpaid") {
    return (
      <span className="flex items-center gap-1 text-[10px] font-mono text-yellow-400/70">
        <AlertTriangle className="h-3 w-3" /> underpaid
      </span>
    );
  }
  // pending / waiting_payment
  return (
    <span className="flex items-center gap-1 text-[10px] font-mono text-white/40 animate-pulse">
      <Clock className="h-3 w-3" /> {type === "cashapp" ? "awaiting admin" : "pending"}
    </span>
  );
}

function DepositRow({ deposit, onStatusRefresh }: { deposit: Deposit; onStatusRefresh: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const isPending = !["completed", "delivering", "fulfilled", "failed", "expired"].includes(deposit.status);

  const checkMutation = useMutation({
    mutationFn: async () => {
      if (!deposit.paymentId) throw new Error("No payment ID");
      const res = await apiRequest("GET", `/api/payments/forebit/${deposit.paymentId}/status`);
      return res.json();
    },
    onSuccess: (data) => {
      if (data.status === "completed" || data.status === "fulfilled") {
        toast({ title: "Deposit credited!", description: `$${(deposit.amount / 100).toFixed(2)} added to your balance` });
        qc.invalidateQueries({ queryKey: ["/api/user"] });
        qc.invalidateQueries({ queryKey: ["/api/deposits"] });
        qc.invalidateQueries({ queryKey: ["/api/wallet/transactions"] });
      } else {
        toast({ title: "Not confirmed yet", description: `Status: ${data.status}` });
        onStatusRefresh();
      }
    },
    onError: () => {
      toast({ title: "Could not check status", variant: "destructive" });
    },
  });

  const isCredited = ["completed", "delivering", "fulfilled"].includes(deposit.status);

  return (
    <div className={`flex items-center justify-between px-3 py-2.5 rounded border transition-colors ${
      isCredited
        ? "bg-green-950/10 border-green-900/30"
        : deposit.status === "failed" || deposit.status === "expired"
        ? "bg-red-950/10 border-red-900/20"
        : "bg-[#0e0e0e] border-white/5"
    }`}>
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="flex-shrink-0">
          {deposit.type === "crypto"
            ? <SiBitcoin className="h-3.5 w-3.5 text-white/30" />
            : <SiCashapp className="h-3.5 w-3.5 text-[#00D632]/40" />}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-white">${(deposit.amount / 100).toFixed(2)}</span>
            <StatusBadge status={deposit.status} type={deposit.type} />
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-white/25 font-mono">
              {deposit.type === "cashapp" ? "cashapp" : "crypto"} · {new Date(deposit.createdAt).toLocaleDateString()}
            </span>
            {deposit.paymentNote && (
              <span className="text-[10px] font-mono text-[#00D632]/50">{deposit.paymentNote}</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 flex-shrink-0">
        {deposit.type === "crypto" && isPending && deposit.checkoutUrl && (
          <a
            href={deposit.checkoutUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] font-mono text-white/30 hover:text-white transition-colors border border-white/10 px-2 py-0.5 rounded"
          >
            pay
          </a>
        )}
        {deposit.type === "crypto" && isPending && deposit.paymentId && (
          <button
            onClick={() => checkMutation.mutate()}
            disabled={checkMutation.isPending}
            className="text-white/30 hover:text-white transition-colors"
            title="Check payment status"
            data-testid={`btn-check-status-${deposit.id}`}
          >
            {checkMutation.isPending
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <RefreshCw className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>
    </div>
  );
}

export default function DepositPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [method, setMethod] = useState<Method>("crypto");
  const [amount, setAmount] = useState(5);
  const [cashappResult, setCashappResult] = useState<{ note: string; tag: string } | null>(null);

  const { data: cashappTagData } = useQuery<{ tag: string }>({
    queryKey: ["/api/site-settings/cashapp-tag"],
  });

  const { data: deposits, refetch: refetchDeposits } = useQuery<Deposit[]>({
    queryKey: ["/api/deposits"],
    enabled: !!user,
    refetchInterval: 15000, // poll every 15s
  });

  const fee = 0.05;
  const youSend = (amount * (1 + fee)).toFixed(2);
  const minAmount = 5;

  // Auto-check pending crypto payments every 20s
  const pendingCrypto = deposits?.filter(d => d.type === "crypto" && d.status === "pending" && d.paymentId) ?? [];

  useEffect(() => {
    if (pendingCrypto.length === 0) return;
    const timer = setInterval(async () => {
      for (const dep of pendingCrypto) {
        try {
          const res = await apiRequest("GET", `/api/payments/forebit/${dep.paymentId}/status`);
          const data = await res.json();
          if (data.status === "completed") {
            qc.invalidateQueries({ queryKey: ["/api/user"] });
            qc.invalidateQueries({ queryKey: ["/api/deposits"] });
            qc.invalidateQueries({ queryKey: ["/api/wallet/transactions"] });
            toast({ title: "Deposit credited!", description: `$${(dep.amount / 100).toFixed(2)} added to your balance` });
          }
        } catch {}
      }
    }, 20000);
    return () => clearInterval(timer);
  }, [pendingCrypto.length]);

  const cryptoMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/payments/forebit/create", {
        amount: Math.round(amount * 100),
        purpose: "deposit",
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        toast({ title: "Invoice created" });
      }
      qc.invalidateQueries({ queryKey: ["/api/deposits"] });
      qc.invalidateQueries({ queryKey: ["/api/wallet/transactions"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const cashappMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/orders/cashapp", {
        amount: Math.round(amount * 100),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to create deposit");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setCashappResult({
        note: data.paymentNote,
        tag: data.cashappTag || cashappTagData?.tag || "",
      });
      qc.invalidateQueries({ queryKey: ["/api/deposits"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const isLoading = cryptoMutation.isPending || cashappMutation.isPending;

  const handleCreate = () => {
    if (method === "crypto") {
      cryptoMutation.mutate();
    } else {
      setCashappResult(null);
      cashappMutation.mutate();
    }
  };

  const pendingDeposits = deposits?.filter(d =>
    !["completed", "delivering", "fulfilled", "failed", "expired"].includes(d.status)
  ) ?? [];
  const recentDeposits = deposits?.slice(0, 20) ?? [];

  return (
    <div className="max-w-sm mx-auto px-3 py-3 space-y-3">
      {/* Payment issues banner */}
      <a href="https://t.me/nychqsupport" target="_blank" rel="noopener noreferrer">
        <button className="w-full flex items-center justify-between px-3 py-2 bg-white/5 border border-white/10 rounded text-xs text-white/50 hover:bg-white/8 transition-colors" data-testid="btn-payment-issues">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-pulse flex-shrink-0" />
            <span className="font-mono">payment issues? click here</span>
          </div>
          <ChevronRight className="h-3 w-3 flex-shrink-0" />
        </button>
      </a>

      {/* Pending deposits alert */}
      {pendingDeposits.length > 0 && (
        <div className="border border-yellow-500/20 bg-yellow-950/10 rounded px-3 py-2 flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 text-yellow-400/60 flex-shrink-0" />
          <p className="text-[11px] text-yellow-400/70 font-mono">
            {pendingDeposits.length} pending deposit{pendingDeposits.length > 1 ? "s" : ""} — see below
          </p>
        </div>
      )}

      {/* Method cards */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => { setMethod("crypto"); setCashappResult(null); }}
          className={`flex flex-col items-center gap-2 py-4 rounded-xl border transition-all ${method === "crypto" ? "border-white/30 bg-white/5" : "border-white/8 bg-[#0e0e0e] hover:border-white/15"}`}
          data-testid="btn-method-crypto"
        >
          <div className={`w-9 h-9 rounded-full flex items-center justify-center ${method === "crypto" ? "bg-white" : "bg-white/10"}`}>
            <SiBitcoin className={`h-5 w-5 ${method === "crypto" ? "text-black" : "text-white/60"}`} />
          </div>
          <div className="text-center">
            <p className={`text-xs font-bold ${method === "crypto" ? "text-white" : "text-white/50"}`}>Crypto</p>
            <p className="text-[10px] text-white/25 font-mono">5% fee</p>
          </div>
        </button>

        <button
          onClick={() => { setMethod("cashapp"); setCashappResult(null); }}
          className={`flex flex-col items-center gap-2 py-4 rounded-xl border transition-all ${method === "cashapp" ? "border-[#00D632]/50 bg-[#00D632]/10" : "border-white/8 bg-[#0e0e0e] hover:border-white/15"}`}
          data-testid="btn-method-cashapp"
        >
          <div className={`w-9 h-9 rounded-full flex items-center justify-center ${method === "cashapp" ? "bg-[#00D632]" : "bg-white/10"}`}>
            <SiCashapp className={`h-5 w-5 ${method === "cashapp" ? "text-white" : "text-white/60"}`} />
          </div>
          <div className="text-center">
            <p className={`text-xs font-bold ${method === "cashapp" ? "text-[#00D632]" : "text-white/50"}`}>CashApp</p>
            <p className="text-[10px] text-white/25 font-mono">5% fee</p>
          </div>
        </button>
      </div>

      {/* Form */}
      <div className="space-y-2">
        {method === "crypto" && (
          <div className="px-3 py-2.5 bg-[#0e0e0e] border border-white/8 rounded text-xs text-white/40 font-mono leading-relaxed">
            you'll choose your coin on the checkout page · 5% fee applies
          </div>
        )}

        {method === "cashapp" && (
          <div className="px-3 py-2.5 bg-[#0e0e0e] border border-white/8 rounded text-xs text-white/40 font-mono leading-relaxed">
            send exact amount via cashapp · 5% processing fee applies
          </div>
        )}

        <div className="space-y-1">
          <label className="text-[9px] text-white/30 uppercase tracking-widest font-mono">AMOUNT TO RECEIVE (USD)</label>
          <div className="flex items-center border border-white/8 rounded bg-[#0e0e0e] overflow-hidden h-10">
            <button onClick={() => setAmount(Math.max(minAmount, amount - 5))} className="px-3 h-full text-white/40 hover:text-white hover:bg-white/5 transition-colors border-r border-white/8 text-sm" data-testid="btn-minus">−</button>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(Math.max(minAmount, Number(e.target.value)))}
              className="flex-1 bg-transparent text-center text-lg font-mono text-white outline-none"
              data-testid="input-amount"
            />
            <button onClick={() => setAmount(amount + 5)} className="px-3 h-full text-white/40 hover:text-white hover:bg-white/5 transition-colors border-l border-white/8 text-sm" data-testid="btn-plus">+</button>
          </div>
          <p className="text-[9px] text-white/20 font-mono">min ${minAmount}.00 · {Math.round(fee * 100)}% fee</p>
        </div>

        <div className="flex items-center justify-between px-3 py-2 bg-[#0e0e0e] border border-white/8 rounded text-xs font-mono">
          <span className="text-white/30">you send</span>
          <span className="text-white">${youSend}</span>
        </div>

        {!cashappResult && (
          <button
            onClick={handleCreate}
            disabled={isLoading}
            className={`w-full flex items-center justify-center gap-2 py-2 border rounded text-xs font-mono transition-all disabled:opacity-40 ${
              method === "cashapp"
                ? "border-[#00D632]/30 text-[#00D632]/70 hover:text-[#00D632] hover:border-[#00D632]/50"
                : "border-white/10 text-white/50 hover:text-white hover:border-white/20"
            }`}
            data-testid="btn-create-invoice"
          >
            {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : method === "cashapp" ? "create cashapp deposit →" : "create deposit invoice →"}
          </button>
        )}
      </div>

      {/* CashApp result — show note + cashtag */}
      {cashappResult && (
        <div className="border border-[#00D632]/30 bg-[#00D632]/5 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <SiCashapp className="h-4 w-4 text-[#00D632]" />
            <p className="text-xs font-bold text-[#00D632]">Send via CashApp</p>
          </div>

          <div className="space-y-2">
            <div className="bg-black/40 rounded px-3 py-2">
              <p className="text-[9px] text-white/30 uppercase tracking-widest mb-1 font-mono">Send to</p>
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-white font-mono">{cashappResult.tag || "(no cashtag set)"}</p>
                {cashappResult.tag && <CopyButton value={cashappResult.tag} />}
              </div>
            </div>

            <div className="bg-black/40 rounded px-3 py-2">
              <p className="text-[9px] text-white/30 uppercase tracking-widest mb-1 font-mono">Amount</p>
              <p className="text-sm font-bold text-white font-mono">${youSend}</p>
            </div>

            <div className="bg-black/40 rounded px-3 py-2">
              <p className="text-[9px] text-white/30 uppercase tracking-widest mb-1 font-mono">Payment Note (required)</p>
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-[#00D632] font-mono">{cashappResult.note}</p>
                <CopyButton value={cashappResult.note} />
              </div>
            </div>
          </div>

          <p className="text-[10px] text-white/25 font-mono leading-relaxed">
            include the exact note when sending · admin will confirm and credit your balance
          </p>

          <button
            onClick={() => { setCashappResult(null); cashappMutation.reset(); }}
            className="w-full text-[11px] text-white/30 hover:text-white/60 transition-colors font-mono"
            data-testid="btn-new-deposit"
          >
            ← create new deposit
          </button>
        </div>
      )}

      {/* Topup List */}
      {recentDeposits.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between">
            <p className="text-[9px] text-white/20 uppercase tracking-widest font-mono">Topup History</p>
            <button
              onClick={() => refetchDeposits()}
              className="text-white/20 hover:text-white/50 transition-colors"
              title="Refresh"
              data-testid="btn-refresh-deposits"
            >
              <RefreshCw className="h-3 w-3" />
            </button>
          </div>
          <div className="space-y-1">
            {recentDeposits.map(dep => (
              <DepositRow
                key={dep.id}
                deposit={dep}
                onStatusRefresh={() => refetchDeposits()}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
