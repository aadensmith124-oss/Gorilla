import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { ChevronRight, Loader2, Copy, Check, Clock, CheckCircle2, XCircle, AlertTriangle, RefreshCw, ExternalLink } from "lucide-react";
import { SiBitcoin, SiEthereum, SiLitecoin, SiSolana, SiTether, SiCashapp } from "react-icons/si";

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

const COINS = [
  { id: "BTC", label: "Bitcoin", sub: "BTC", Icon: SiBitcoin, color: "#F7931A" },
  { id: "ETH", label: "Ethereum", sub: "ETH", Icon: SiEthereum, color: "#627EEA" },
  { id: "LTC", label: "Litecoin", sub: "LTC", Icon: SiLitecoin, color: "#A6A9AA" },
  { id: "SOL", label: "Solana", sub: "SOL", Icon: SiSolana, color: "#9945FF" },
  { id: "USDT", label: "Tether", sub: "USDT", Icon: SiTether, color: "#26A17B" },
  { id: "USDC", label: "USD Coin", sub: "USDC", Icon: SiBitcoin, color: "#2775CA" },
];

const BONUS_TIERS = [
  { min: 100, max: 249, bonus: "+10%" },
  { min: 250, max: 499, bonus: "+13%" },
  { min: 500, max: 999, bonus: "+16%" },
  { min: 1000, max: 2499, bonus: "+20%" },
  { min: 2500, max: 4999, bonus: "+25%" },
  { min: 5000, max: null, bonus: "+30%" },
];

function CopyButton({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const handle = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handle}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-white/60 hover:text-white transition-colors"
      data-testid="btn-copy"
    >
      {copied ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
      {copied ? "Copied!" : (label || "Copy")}
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "completed" || status === "delivering" || status === "fulfilled") {
    return <span className="flex items-center gap-1 text-[10px] font-mono text-green-400"><CheckCircle2 className="h-3 w-3" /> credited</span>;
  }
  if (status === "failed" || status === "expired") {
    return <span className="flex items-center gap-1 text-[10px] font-mono text-red-400/70"><XCircle className="h-3 w-3" /> {status}</span>;
  }
  if (status === "underpaid") {
    return <span className="flex items-center gap-1 text-[10px] font-mono text-yellow-400/70"><AlertTriangle className="h-3 w-3" /> underpaid</span>;
  }
  return <span className="flex items-center gap-1 text-[10px] font-mono text-white/40 animate-pulse"><Clock className="h-3 w-3" /> pending</span>;
}

function DepositRow({ deposit }: { deposit: Deposit }) {
  const isCredited = ["completed", "delivering", "fulfilled"].includes(deposit.status);
  const amountLabel = deposit.amount > 0 ? `$${(deposit.amount / 100).toFixed(2)}` : "pending";

  return (
    <div className={`flex items-center justify-between px-3 py-2.5 rounded border ${
      isCredited ? "bg-green-950/10 border-green-900/30" :
      deposit.status === "failed" || deposit.status === "expired" ? "bg-red-950/10 border-red-900/20" :
      "bg-[#0c0d1a] border-white/5"
    }`}>
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="flex-shrink-0">
          {deposit.type === "crypto" ? <SiBitcoin className="h-3.5 w-3.5 text-white/30" /> : <SiCashapp className="h-3.5 w-3.5 text-[#00D632]/40" />}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-white">{amountLabel}</span>
            <StatusBadge status={deposit.status} />
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-white/25 font-mono">
              {deposit.type === "cashapp" ? "cashapp" : "crypto"} · {new Date(deposit.createdAt).toLocaleDateString()}
            </span>
            {deposit.paymentNote && <span className="text-[10px] font-mono text-[#00D632]/50">{deposit.paymentNote}</span>}
          </div>
        </div>
      </div>
      {deposit.checkoutUrl && !isCredited && (
        <a href={deposit.checkoutUrl} target="_blank" rel="noopener noreferrer">
          <button className="ml-2 flex-shrink-0 text-white/20 hover:text-white/60 transition-colors" title="Reopen checkout">
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
        </a>
      )}
    </div>
  );
}

export default function DepositPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [method, setMethod] = useState<Method>("crypto");
  const [selectedCoin, setSelectedCoin] = useState("BTC");
  const [amountInput, setAmountInput] = useState("");
  const [showMoreCoins, setShowMoreCoins] = useState(false);
  const [cashappResult, setCashappResult] = useState<{ note: string; tag: string } | null>(null);

  const { data: cashappTagData } = useQuery<{ tag: string }>({
    queryKey: ["/api/site-settings/cashapp-tag"],
  });

  const { data: deposits, refetch: refetchDeposits } = useQuery<Deposit[]>({
    queryKey: ["/api/deposits"],
    enabled: !!user,
    refetchInterval: 15000,
  });

  // Crypto deposit → Forebit checkout
  const cryptoMutation = useMutation({
    mutationFn: async () => {
      const amount = parseFloat(amountInput);
      if (!amount || amount < 1) throw new Error("Minimum deposit is $1");
      if (amount > 1000000000) throw new Error("Maximum deposit is $1,000,000,000");
      const res = await apiRequest("POST", "/api/payments/forebit/create", {
        amount: String(Math.round(amount * 100)),
        purpose: "deposit",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to create payment");
      }
      return res.json();
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["/api/deposits"] });
      if (data.checkoutUrl || data.url) {
        const url = data.checkoutUrl || data.url;
        if (data.paymentId) {
          sessionStorage.setItem("lastForebitPaymentId", data.paymentId);
          sessionStorage.setItem("lastForebitPurpose", "deposit");
          sessionStorage.removeItem("lastForebitOrderId");
        }
        window.location.href = url;
      } else {
        toast({ title: "Payment created", description: "Check your email for the payment link" });
      }
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // CashApp deposit → generate note
  const cashappMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/orders/cashapp", {});
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to create deposit");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setCashappResult({ note: data.paymentNote, tag: data.cashappTag || cashappTagData?.tag || "" });
      qc.invalidateQueries({ queryKey: ["/api/deposits"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const recentDeposits = deposits?.slice(0, 20) ?? [];
  const pendingDeposits = deposits?.filter(d => !["completed", "delivering", "fulfilled", "failed", "expired"].includes(d.status)) ?? [];
  const parsedAmount = parseFloat(amountInput) || 0;
  const activeTier = BONUS_TIERS.find(t => parsedAmount >= t.min && (t.max === null || parsedAmount <= t.max));
  const visibleCoins = showMoreCoins ? COINS : COINS.slice(0, 6);

  return (
    <div className="max-w-sm mx-auto px-3 py-3 space-y-3">
      {/* Payment issues banner */}
      <a href="https://t.me/Xurkie" target="_blank" rel="noopener noreferrer">
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
            {pendingDeposits.length} pending deposit{pendingDeposits.length > 1 ? "s" : ""} — awaiting confirmation
          </p>
        </div>
      )}

      {/* Method selector */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => { setMethod("crypto"); setCashappResult(null); }}
          className={`flex flex-col items-center gap-2 py-4 rounded-xl border transition-all ${method === "crypto" ? "border-primary/50 bg-primary/10" : "border-white/8 bg-[#0c0d1a] hover:border-white/15"}`}
          data-testid="btn-method-crypto"
        >
          <div className={`w-9 h-9 rounded-full flex items-center justify-center ${method === "crypto" ? "bg-primary" : "bg-white/10"}`}>
            <SiBitcoin className={`h-5 w-5 ${method === "crypto" ? "text-black" : "text-white/60"}`} />
          </div>
          <div className="text-center">
            <p className={`text-xs font-bold ${method === "crypto" ? "text-primary" : "text-white/50"}`}>Crypto</p>
            <p className="text-[10px] text-white/25 font-mono">0% fee · bonus up to +30%</p>
          </div>
        </button>

        <button
          onClick={() => { setMethod("cashapp"); setCashappResult(null); }}
          className={`flex flex-col items-center gap-2 py-4 rounded-xl border transition-all ${method === "cashapp" ? "border-[#00D632]/50 bg-[#00D632]/10" : "border-white/8 bg-[#0c0d1a] hover:border-white/15"}`}
          data-testid="btn-method-cashapp"
        >
          <div className={`w-9 h-9 rounded-full flex items-center justify-center ${method === "cashapp" ? "bg-[#00D632]" : "bg-white/10"}`}>
            <SiCashapp className={`h-5 w-5 ${method === "cashapp" ? "text-white" : "text-white/60"}`} />
          </div>
          <div className="text-center">
            <p className={`text-xs font-bold ${method === "cashapp" ? "text-[#00D632]" : "text-white/50"}`}>CashApp</p>
            <p className="text-[10px] text-white/25 font-mono">any amount</p>
          </div>
        </button>
      </div>

      {/* === CRYPTO SECTION === */}
      {method === "crypto" && (
        <div className="space-y-3">
          {/* Bonus Milestones */}
          <div className="border border-primary/20 bg-primary/5 rounded-xl overflow-hidden">
            <div className="px-3 py-2 border-b border-primary/10">
              <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Deposit Bonus Milestones · Crypto Only</p>
              <p className="text-[10px] text-white/30 mt-0.5">More you deposit, more you get back</p>
            </div>
            <div className="divide-y divide-white/5">
              <div className="grid grid-cols-2 px-3 py-1.5">
                <span className="text-[9px] text-white/30 uppercase tracking-widest font-mono">Range</span>
                <span className="text-[9px] text-white/30 uppercase tracking-widest font-mono text-right">Bonus</span>
              </div>
              {BONUS_TIERS.map((tier, i) => {
                const isActive = activeTier === tier;
                return (
                  <div key={i} className={`grid grid-cols-2 px-3 py-1.5 transition-colors ${isActive ? "bg-primary/10" : ""}`}>
                    <span className={`text-xs font-mono ${isActive ? "text-white" : "text-white/40"}`}>
                      ${tier.min.toLocaleString()}{tier.max ? ` — $${tier.max.toLocaleString()}` : "+"}
                    </span>
                    <span className={`text-xs font-mono text-right font-bold ${isActive ? "text-primary" : "text-primary/60"}`}>{tier.bonus}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Coin Grid */}
          <div className="space-y-1.5">
            <p className="text-[9px] text-white/30 uppercase tracking-widest font-mono">Tap a coin to deposit</p>
            <div className="grid grid-cols-3 gap-2">
              {visibleCoins.map(coin => {
                const isSelected = selectedCoin === coin.id;
                const { Icon } = coin;
                return (
                  <button
                    key={coin.id}
                    onClick={() => setSelectedCoin(coin.id)}
                    className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border transition-all ${
                      isSelected ? "border-white/30 bg-white/8" : "border-white/8 bg-[#0c0d1a] hover:border-white/15"
                    }`}
                    data-testid={`btn-coin-${coin.id}`}
                  >
                    <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: `${coin.color}22` }}>
                      <Icon className="h-4 w-4" style={{ color: coin.color }} />
                    </div>
                    <span className="text-[10px] font-bold text-white font-mono">{coin.sub}</span>
                    <span className="text-[9px] text-white/30">{coin.label}</span>
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setShowMoreCoins(v => !v)}
              className="w-full py-1.5 border border-white/8 rounded text-[10px] text-white/30 hover:text-white hover:border-white/15 transition-colors font-mono"
              data-testid="btn-more-coins"
            >
              {showMoreCoins ? "▲ FEWER COINS ▲" : "▶ MORE COINS ▼"}
            </button>
          </div>

          {/* Amount Input */}
          <div className="space-y-1.5">
            <label className="text-[9px] text-white/30 uppercase tracking-widest font-mono">Amount (USD)</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-white/40 font-mono">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  placeholder="0.00"
                  value={amountInput}
                  onChange={e => setAmountInput(e.target.value)}
                  className="w-full h-10 bg-[#0c0d1a] border border-white/10 rounded-lg pl-7 pr-3 text-sm text-white font-mono outline-none focus:border-primary/40 transition-colors"
                  data-testid="input-amount"
                />
              </div>
            </div>
            {activeTier && parsedAmount > 0 && (
              <p className="text-[10px] text-primary font-mono font-bold">
                🎉 You qualify for a {activeTier.bonus} bonus on this deposit!
              </p>
            )}
          </div>

          <button
            onClick={() => cryptoMutation.mutate()}
            disabled={cryptoMutation.isPending || !amountInput || parsedAmount <= 0}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-black font-bold text-sm hover:bg-primary/90 transition-all disabled:opacity-40"
            data-testid="btn-deposit-crypto"
          >
            {cryptoMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : (
              <>
                <ExternalLink className="h-4 w-4" />
                Deposit {parsedAmount > 0 ? `$${parsedAmount.toFixed(2)}` : ""} with {selectedCoin}
              </>
            )}
          </button>
        </div>
      )}

      {/* === CASHAPP SECTION === */}
      {method === "cashapp" && (
        <div className="space-y-2">
          {!cashappResult ? (
            <>
              <div className="px-3 py-2.5 bg-[#0c0d1a] border border-white/8 rounded text-xs text-white/40 font-mono leading-relaxed">
                click below to generate a unique payment note · send any amount via cashapp · admin will credit your balance after confirming
              </div>
              <button
                onClick={() => cashappMutation.mutate()}
                disabled={cashappMutation.isPending}
                className="w-full flex items-center justify-center gap-2 py-2.5 border border-[#00D632]/30 rounded text-xs font-mono text-[#00D632]/70 hover:text-[#00D632] hover:border-[#00D632]/50 transition-all disabled:opacity-40"
                data-testid="btn-generate-note"
              >
                {cashappMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "generate payment note →"}
              </button>
            </>
          ) : (
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
                  <p className="text-xs text-white/60 font-mono">any amount you want to deposit</p>
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
        </div>
      )}

      {/* Topup History */}
      {recentDeposits.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between">
            <p className="text-[9px] text-white/20 uppercase tracking-widest font-mono">Topup History</p>
            <button onClick={() => refetchDeposits()} className="text-white/20 hover:text-white/50 transition-colors" title="Refresh" data-testid="btn-refresh-deposits">
              <RefreshCw className="h-3 w-3" />
            </button>
          </div>
          <div className="space-y-1">
            {recentDeposits.map(dep => <DepositRow key={dep.id} deposit={dep} />)}
          </div>
        </div>
      )}
    </div>
  );
}
