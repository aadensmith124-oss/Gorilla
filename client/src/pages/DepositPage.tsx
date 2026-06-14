import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Copy, Check, Clock, CheckCircle2, XCircle, AlertTriangle, RefreshCw, ExternalLink } from "lucide-react";
import { SiBitcoin, SiEthereum, SiLitecoin, SiSolana, SiTether, SiCashapp } from "react-icons/si";

const P    = "hsl(186 100% 50%)";
const PBG  = "hsl(186 100% 50% / 0.1)";
const BG   = "hsl(214 50% 4%)";
const CARD = "hsl(214 45% 7%)";
const NAVY = "hsl(220 50% 12%)";
const BDR  = "hsl(210 40% 16%)";
const TEXT = "hsl(195 60% 88%)";
const MUT  = "hsl(205 30% 45%)";
const GREEN = "#22C55E";

type Method = "BTC" | "ETH" | "LTC" | "SOL" | "USDT" | "USDC" | "CASHAPP";

const ALL_METHODS: { id: Method; label: string; sub: string; Icon: any; color: string }[] = [
  { id: "BTC",     label: "Bitcoin",    sub: "BTC",    Icon: SiBitcoin,  color: "#F7931A" },
  { id: "ETH",     label: "Ethereum",   sub: "ETH",    Icon: SiEthereum, color: "#627EEA" },
  { id: "USDT",    label: "Tether",     sub: "USDT",   Icon: SiTether,   color: "#26A17B" },
  { id: "SOL",     label: "Solana",     sub: "SOL",    Icon: SiSolana,   color: "#9945FF" },
  { id: "LTC",     label: "Litecoin",   sub: "LTC",    Icon: SiLitecoin, color: "#A6A9AA" },
  { id: "CASHAPP", label: "CashApp",    sub: "instant",Icon: SiCashapp,  color: "#00D632" },
];

const BONUS_TIERS = [
  { min: 100, max: 249, bonus: "+10%" },
  { min: 250, max: 499, bonus: "+13%" },
  { min: 500, max: 999, bonus: "+16%" },
  { min: 1000, max: 2499, bonus: "+20%" },
  { min: 2500, max: 4999, bonus: "+25%" },
  { min: 5000, max: null, bonus: "+30%" },
];

type Deposit = { id: string; type: string; amount: number; status: string; paymentId?: string; checkoutUrl?: string; paymentNote?: string; createdAt: string };

function CopyBtn({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="flex items-center gap-1 px-2 py-1 text-[10px] transition-all"
      style={{ border: `1px solid ${BDR}`, color: copied ? GREEN : MUT, background: CARD }}>
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (["completed", "delivering", "fulfilled"].includes(status))
    return <span className="flex items-center gap-1 text-[10px]" style={{ color: GREEN }}><CheckCircle2 className="h-3 w-3" /> credited</span>;
  if (["failed", "expired"].includes(status))
    return <span className="flex items-center gap-1 text-[10px]" style={{ color: "hsl(0 80% 58%)" }}><XCircle className="h-3 w-3" /> {status}</span>;
  if (status === "underpaid")
    return <span className="flex items-center gap-1 text-[10px]" style={{ color: "#F59E0B" }}><AlertTriangle className="h-3 w-3" /> underpaid</span>;
  return <span className="flex items-center gap-1 text-[10px] animate-pulse" style={{ color: MUT }}><Clock className="h-3 w-3" /> pending</span>;
}

function DepositRow({ deposit }: { deposit: Deposit }) {
  const isCredited = ["completed", "delivering", "fulfilled"].includes(deposit.status);
  const amountLabel = deposit.amount > 0 ? `$${(deposit.amount / 100).toFixed(2)}` : "pending";
  return (
    <div className="flex items-center justify-between px-3 py-2.5"
      style={{
        background: isCredited ? "hsl(142 50% 10% / 0.4)" : deposit.status === "failed" ? "hsl(0 50% 10% / 0.4)" : CARD,
        border: `1px solid ${isCredited ? "#22C55E33" : deposit.status === "failed" ? "hsl(0 80% 58% / 0.2)" : BDR}`,
        marginBottom: "4px",
      }}>
      <div className="flex items-center gap-2.5 min-w-0">
        <div style={{ color: deposit.type === "cashapp" ? "#00D632" : MUT }}>
          {deposit.type === "cashapp" ? <SiCashapp className="h-3.5 w-3.5" /> : <SiBitcoin className="h-3.5 w-3.5" />}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold" style={{ color: TEXT }}>{amountLabel}</span>
            <StatusBadge status={deposit.status} />
          </div>
          <span className="text-[10px] font-mono" style={{ color: MUT }}>
            {deposit.type} · {new Date(deposit.createdAt).toLocaleDateString()}
            {deposit.paymentNote && <span style={{ color: "#00D632" }}> · {deposit.paymentNote}</span>}
          </span>
        </div>
      </div>
      {deposit.checkoutUrl && !isCredited && (
        <a href={deposit.checkoutUrl} target="_blank" rel="noopener noreferrer">
          <ExternalLink className="h-3.5 w-3.5" style={{ color: MUT }} />
        </a>
      )}
    </div>
  );
}

export default function DepositPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [selectedMethod, setSelectedMethod] = useState<Method>("BTC");
  const [amountInput, setAmountInput] = useState("");
  const [cashappResult, setCashappResult] = useState<{ note: string; tag: string } | null>(null);

  const { data: cashappTagData } = useQuery<{ tag: string }>({ queryKey: ["/api/site-settings/cashapp-tag"] });
  const { data: deposits, refetch: refetchDeposits } = useQuery<Deposit[]>({
    queryKey: ["/api/deposits"],
    enabled: !!user,
    refetchInterval: 15000,
  });

  const cryptoMutation = useMutation({
    mutationFn: async () => {
      const amount = parseFloat(amountInput);
      if (!amount || amount < 1) throw new Error("Minimum deposit is $1");
      const res = await apiRequest("POST", "/api/payments/forebit/create", {
        amount: String(Math.round(amount * 100)),
        purpose: "deposit",
        coin: selectedMethod !== "CASHAPP" ? selectedMethod : undefined,
      });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.message || "Failed"); }
      return res.json();
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["/api/deposits"] });
      if (data.checkoutUrl || data.url) {
        if (data.paymentId) { sessionStorage.setItem("lastForebitPaymentId", data.paymentId); sessionStorage.setItem("lastForebitPurpose", "deposit"); }
        window.location.href = data.checkoutUrl || data.url;
      }
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const cashappMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/orders/cashapp", {});
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.message || "Failed"); }
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
  const isCashApp = selectedMethod === "CASHAPP";

  const handleProceed = () => {
    if (isCashApp) {
      cashappMutation.mutate();
    } else {
      cryptoMutation.mutate();
    }
  };

  const isPending = cryptoMutation.isPending || cashappMutation.isPending;

  return (
    <div className="max-w-sm mx-auto px-3 py-3 space-y-3">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <h1 style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "13px", color: TEXT, letterSpacing: "0.03em" }}>
          TOPUP
        </h1>
        <a href="https://t.me/+K3ou01RaW6oyMjJh" target="_blank" rel="noopener noreferrer">
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs"
            style={{ border: `1px solid ${BDR}`, color: MUT, background: CARD }}>
            ⚙ support
          </button>
        </a>
      </div>

      {/* Current Balance panel */}
      <div className="flex items-center justify-between px-4 py-3"
        style={{ background: NAVY, border: `1px solid ${BDR}` }}>
        <span className="text-xs font-bold tracking-widest" style={{ color: TEXT }}>Current Balance</span>
        <span className="text-lg font-mono font-bold" style={{ color: P, textShadow: `0 0 10px ${P}` }}>
          ${((user?.balance ?? 0) / 100).toFixed(2)}
        </span>
      </div>

      {/* Pending alert */}
      {pendingDeposits.length > 0 && (
        <div className="flex items-center gap-2 px-3 py-2"
          style={{ border: `1px solid #F59E0B44`, background: "#F59E0B0A" }}>
          <Clock className="h-3.5 w-3.5" style={{ color: "#F59E0B" }} />
          <p className="text-[11px] font-mono" style={{ color: "#F59E0B" }}>
            {pendingDeposits.length} pending · awaiting confirmation
          </p>
        </div>
      )}

      {/* Amount input */}
      <div className="space-y-1">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-mono" style={{ color: MUT }}>$</span>
          <input
            type="number" step="0.01" min="1"
            placeholder="Enter amount in USD"
            value={amountInput}
            onChange={e => setAmountInput(e.target.value)}
            className="w-full h-11 outline-none font-mono text-sm pl-7 pr-3 transition-all"
            style={{
              background: "hsl(214 45% 10%)",
              border: `1px solid ${parsedAmount > 0 ? P : BDR}`,
              color: TEXT,
              boxShadow: parsedAmount > 0 ? `0 0 6px ${P}44` : "none",
            }}
            data-testid="input-amount"
          />
        </div>
        {activeTier && parsedAmount > 0 && (
          <p className="text-[10px] font-mono font-bold" style={{ color: GREEN }}>
            🎉 Bonus: {activeTier.bonus} on this deposit!
          </p>
        )}
      </div>

      {/* Bonus table — collapsed hint */}
      {parsedAmount === 0 && (
        <div className="px-3 py-2 text-[10px] font-mono" style={{ background: PBG, border: `1px solid ${P}33`, color: MUT }}>
          ⚡ Deposit $100+ to unlock crypto bonuses up to +30%
        </div>
      )}

      {/* Choose method section */}
      <div className="space-y-2">
        <p className="text-[9px] tracking-widest font-bold" style={{ color: MUT }}>CHOOSE A PAYMENT METHOD</p>

        {/* Method grid — 3x2 */}
        <div className="p-3 space-y-2" style={{ background: NAVY, border: `1px solid ${BDR}` }}>
          <div className="grid grid-cols-3 gap-2">
            {ALL_METHODS.map(m => {
              const isSelected = selectedMethod === m.id;
              return (
                <button key={m.id} onClick={() => { setSelectedMethod(m.id); setCashappResult(null); }}
                  className="flex flex-col items-center gap-1.5 py-3 transition-all"
                  style={{
                    background: isSelected ? `${m.color}22` : CARD,
                    border: `1px solid ${isSelected ? m.color : BDR}`,
                    boxShadow: isSelected ? `0 0 8px ${m.color}55` : "none",
                  }}
                  data-testid={`btn-method-${m.id}`}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: m.color }}>
                    <m.Icon className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-[10px] font-bold" style={{ color: isSelected ? m.color : TEXT }}>{m.label}</span>
                  <span className="text-[9px]" style={{ color: MUT }}>{m.sub}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* CashApp result panel */}
      {isCashApp && cashappResult && (
        <div className="p-4 space-y-3" style={{ background: "#00D63208", border: "1px solid #00D63240" }}>
          <div className="flex items-center gap-2">
            <SiCashapp className="h-4 w-4" style={{ color: "#00D632" }} />
            <p className="text-xs font-bold" style={{ color: "#00D632" }}>Send via CashApp</p>
          </div>
          {[
            { label: "Send to", value: cashappResult.tag || "(no cashtag set)" },
            { label: "Note (required)", value: cashappResult.note, highlight: true },
          ].map(row => (
            <div key={row.label} className="px-3 py-2" style={{ background: BG, border: `1px solid ${BDR}` }}>
              <p className="text-[9px] tracking-widest mb-1" style={{ color: MUT }}>{row.label}</p>
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold font-mono" style={{ color: row.highlight ? "#00D632" : TEXT }}>{row.value}</p>
                {row.value && <CopyBtn value={row.value} />}
              </div>
            </div>
          ))}
          <p className="text-[10px] font-mono" style={{ color: MUT }}>
            Include the exact note · admin confirms and credits your balance
          </p>
          <button onClick={() => { setCashappResult(null); cashappMutation.reset(); }}
            className="text-[11px] w-full text-center" style={{ color: MUT }}>
            ← new deposit
          </button>
        </div>
      )}

      {/* Proceed button */}
      {!(isCashApp && cashappResult) && (
        <button
          onClick={handleProceed}
          disabled={isPending || (!isCashApp && (!amountInput || parsedAmount <= 0))}
          className="w-full flex items-center justify-center gap-2 py-3 font-bold text-sm transition-all disabled:opacity-40 pixel-btn"
          style={{ background: isCashApp ? "#00D632" : GREEN, color: "#fff" }}
          data-testid="btn-proceed">
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : (
            <span>
              {isCashApp
                ? "▶ Generate CashApp Note"
                : `▶ Deposit${parsedAmount > 0 ? ` $${parsedAmount.toFixed(2)}` : ""} with ${selectedMethod}`}
            </span>
          )}
        </button>
      )}

      {/* Topup history */}
      {recentDeposits.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between">
            <p className="text-[9px] tracking-widest" style={{ color: MUT }}>TOPUP HISTORY</p>
            <button onClick={() => refetchDeposits()} style={{ color: MUT }} data-testid="btn-refresh-deposits">
              <RefreshCw className="h-3 w-3" />
            </button>
          </div>
          {recentDeposits.map(dep => <DepositRow key={dep.id} deposit={dep} />)}
        </div>
      )}
    </div>
  );
}
