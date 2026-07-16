import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Loader2, Copy, Check, Clock, CheckCircle2, XCircle, AlertTriangle,
  RefreshCw, ExternalLink, Zap, Send, Link as LinkIcon
} from "lucide-react";
import { SiBitcoin, SiCashapp } from "react-icons/si";

type Method = "crypto" | "cashapp" | "chime" | "zelle";

type Deposit = {
  id: string;
  type: string;
  amount: number;
  status: string;
  paymentId?: string;
  checkoutUrl?: string;
  paymentNote?: string;
  createdAt: string;
};

type ManualResult = { note: string; handle: string; amount: number; method: Method };

const BONUS_TIERS = [
  { min: 100,  max: 249,  bonus: "+10%", example: "$100 → $110"     },
  { min: 250,  max: 499,  bonus: "+13%", example: "$250 → $282.50"  },
  { min: 500,  max: 999,  bonus: "+16%", example: "$500 → $580"     },
  { min: 1000, max: 2499, bonus: "+20%", example: "$1,000 → $1,200" },
  { min: 2500, max: 4999, bonus: "+25%", example: "$2,500 → $3,125" },
  { min: 5000, max: null, bonus: "+30%", example: "$5,000 → $6,500" },
];

function methodColor(type: string) {
  if (type === "cashapp") return "#00D632";
  if (type === "chime")   return "#7BC67E";
  if (type === "zelle")   return "#6D1ED4";
  return "#F7931A";
}
function methodLabel(type: string) {
  if (type === "cashapp") return "CashApp";
  if (type === "chime")   return "Chime";
  if (type === "zelle")   return "Zelle";
  return "Crypto";
}

function CopyBtn({ value, className = "" }: { value: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className={`flex items-center justify-center w-9 h-9 rounded-lg bg-white/8 hover:bg-white/12 border border-white/10 text-white/50 hover:text-white transition-colors flex-shrink-0 ${className}`}
      data-testid="btn-copy"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (["completed","delivering","fulfilled"].includes(status))
    return <span className="flex items-center gap-1 text-[10px] font-mono text-green-400"><CheckCircle2 className="h-3 w-3" />credited</span>;
  if (["failed","expired"].includes(status))
    return <span className="flex items-center gap-1 text-[10px] font-mono text-red-400/70"><XCircle className="h-3 w-3" />{status}</span>;
  if (status === "underpaid")
    return <span className="flex items-center gap-1 text-[10px] font-mono text-yellow-400/70"><AlertTriangle className="h-3 w-3" />underpaid</span>;
  return <span className="flex items-center gap-1 text-[10px] font-mono text-white/30 animate-pulse"><Clock className="h-3 w-3" />pending</span>;
}

function DepositRow({ deposit }: { deposit: Deposit }) {
  const isCredited = ["completed","delivering","fulfilled"].includes(deposit.status);
  const color = methodColor(deposit.type);
  return (
    <div className={`flex items-center justify-between px-3 py-2 rounded-xl border ${
      isCredited ? "bg-green-950/10 border-green-900/15" :
      ["failed","expired"].includes(deposit.status) ? "bg-red-950/10 border-red-900/15" :
      "bg-white/[0.02] border-white/[0.05]"
    }`}>
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0" style={{ background: `${color}18`, color }}>
          {deposit.type === "crypto" ? "₿" : deposit.type.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-mono font-bold text-white">
              {deposit.amount > 0 ? `$${(deposit.amount / 100).toFixed(2)}` : "pending"}
            </span>
            <StatusBadge status={deposit.status} />
          </div>
          <p className="text-[9px] text-white/20 font-mono">{methodLabel(deposit.type)} · {new Date(deposit.createdAt).toLocaleDateString()}</p>
        </div>
      </div>
      {deposit.checkoutUrl && !isCredited && (
        <a href={deposit.checkoutUrl} target="_blank" rel="noopener noreferrer" className="ml-2 flex-shrink-0 text-white/20 hover:text-white/60 transition-colors">
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )}
    </div>
  );
}


/* ── MANUAL DEPOSIT PANEL ── */
function ManualDepositPanel({ result, onReset }: { result: ManualResult; onReset: () => void }) {
  const color = methodColor(result.method);
  const name = methodLabel(result.method);

  return (
    <div className="rounded-2xl border overflow-hidden" style={{ borderColor: `${color}30`, background: `${color}06` }}>
      <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: `${color}20` }}>
        <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black text-white" style={{ background: color }}>
          {name.charAt(0)}
        </div>
        <p className="text-sm font-bold" style={{ color }}>Send via {name}</p>
      </div>
      <div className="p-4 space-y-3">
        <div className="rounded-xl bg-black/30 border border-white/5 px-4 py-3">
          <p className="text-[9px] text-white/30 uppercase tracking-widest mb-1.5 font-mono">Send to</p>
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-bold text-white font-mono truncate">{result.handle || `(no handle set)`}</p>
            {result.handle && <CopyBtn value={result.handle} />}
          </div>
        </div>
        <div className="rounded-xl bg-black/30 border border-white/5 px-4 py-3">
          <p className="text-[9px] text-white/30 uppercase tracking-widest mb-1.5 font-mono">Amount — send EXACTLY</p>
          <div className="flex items-center justify-between gap-2">
            <p className="text-2xl font-black text-white font-mono">${(result.amount / 100).toFixed(2)}</p>
            <CopyBtn value={(result.amount / 100).toFixed(2)} />
          </div>
          <p className="text-[10px] text-yellow-400/60 font-mono mt-1.5">⚠ Wrong amount = not credited</p>
        </div>
        <div className="rounded-xl bg-black/30 border border-white/5 px-4 py-3">
          <p className="text-[9px] text-white/30 uppercase tracking-widest mb-1.5 font-mono">Payment Note (required)</p>
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-bold font-mono" style={{ color }}>{result.note}</p>
            <CopyBtn value={result.note} />
          </div>
        </div>
        <p className="text-[10px] text-white/20 font-mono text-center">include the exact note · admin will confirm and credit balance</p>
        <button onClick={onReset} className="w-full text-[11px] text-white/25 hover:text-white/50 transition-colors font-mono pt-1" data-testid="btn-new-deposit">
          ← create new deposit
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   TELEGRAM NAME REWARD CARD
══════════════════════════════════════════════ */
function TelegramNameRewardCard() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [copied, setCopied] = useState(false);

  const { data: status, refetch } = useQuery<{
    linked: boolean;
    lastReward: string | null;
    referralLink: string | null;
    referralCount: number;
  }>({
    queryKey: ["/api/telegram/link/status"],
    staleTime: 30_000,
  });

  const linkMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/telegram/link", {});
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.message || "Failed"); }
      return res.json() as Promise<{ botUrl: string }>;
    },
    onSuccess: (data) => {
      window.open(data.botUrl, "_blank");
      // Poll for link completion
      const interval = setInterval(async () => {
        const r = await refetch();
        if (r.data?.linked) { clearInterval(interval); qc.invalidateQueries({ queryKey: ["/api/telegram/link/status"] }); }
      }, 3000);
      setTimeout(() => clearInterval(interval), 120_000);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const linked = status?.linked ?? false;
  const lastReward = status?.lastReward ? new Date(status.lastReward) : null;
  const nextRewardMs = lastReward ? lastReward.getTime() + 24 * 3600 * 1000 - Date.now() : 0;
  const nextRewardHrs = nextRewardMs > 0 ? Math.ceil(nextRewardMs / 3_600_000) : 0;
  const referralLink = status?.referralLink ?? null;
  const referralCount = status?.referralCount ?? 0;

  function copyReferral() {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="rounded-2xl border border-[#229ED9]/20 bg-[#229ED9]/5 px-4 py-3 space-y-2.5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Send className="h-3.5 w-3.5 text-[#229ED9]" />
          <p className="text-[10px] font-black uppercase tracking-widest text-[#229ED9]">Telegram Name Reward</p>
        </div>
        {linked && (
          <span className="flex items-center gap-1 text-[9px] font-mono text-green-400">
            <CheckCircle2 className="h-2.5 w-2.5" /> linked
          </span>
        )}
      </div>

      {/* Description */}
      <p className="text-[11px] text-white/50 leading-relaxed">
        Join our group, add <span className="font-mono text-white font-bold">beastcc.xyz $1 ccs</span> to your Telegram name, and earn <span className="text-[#229ED9] font-bold">$1.00/day</span> automatically. Refer a friend and you both earn <span className="text-green-400 font-bold">+$0.50</span> when they qualify.
      </p>

      {!linked ? (
        <>
          {/* Must join group first */}
          <a
            href="https://t.me/+oxGX1KUYsadmNGUx"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 h-8 rounded-xl bg-white/5 border border-white/10 text-white/50 text-[11px] font-bold hover:bg-white/8 hover:text-white/70 transition-colors"
          >
            <Send className="h-3.5 w-3.5" />
            Step 1 — Join our Telegram Group
          </a>
          <button
            onClick={() => linkMutation.mutate()}
            disabled={linkMutation.isPending}
            className="w-full flex items-center justify-center gap-2 h-8 rounded-xl bg-[#229ED9]/15 border border-[#229ED9]/25 text-[#229ED9] text-[11px] font-bold hover:bg-[#229ED9]/22 transition-colors disabled:opacity-50"
          >
            {linkMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LinkIcon className="h-3.5 w-3.5" />}
            Step 2 — Link Telegram Account
          </button>
        </>
      ) : (
        <>
          {/* Reward status */}
          <p className="text-[10px] font-mono text-white/35">
            {lastReward
              ? nextRewardHrs > 0
                ? `⏳ Next reward in ~${nextRewardHrs}h`
                : "✅ Reward available — name check runs hourly"
              : "⏳ No reward yet — add the phrase and wait up to 1 hour"}
          </p>

          {/* Referral link */}
          {referralLink && (
            <div className="space-y-1">
              <p className="text-[9px] text-white/30 uppercase tracking-widest font-mono">
                Your referral link{referralCount > 0 ? ` · ${referralCount} referral${referralCount !== 1 ? "s" : ""}` : ""}
              </p>
              <div className="flex items-center gap-2 bg-black/30 border border-white/8 rounded-xl px-3 py-2">
                <span className="text-[10px] font-mono text-white/50 truncate flex-1">{referralLink}</span>
                <button
                  onClick={copyReferral}
                  className="flex-shrink-0 text-white/30 hover:text-white/70 transition-colors"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
              <p className="text-[9px] text-white/25 font-mono">Share this link — both earn $0.50 when they first qualify</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════
   MAIN DEPOSIT PAGE
══════════════════════════════════════════════ */
export default function DepositPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [amountInput, setAmountInput] = useState("");
  const [manualResult, setManualResult] = useState<ManualResult | null>(null);

  const { data: manualMethods } = useQuery<{
    cashapp: { enabled: boolean; tag: string; fee: number };
    chime: { enabled: boolean; handle: string; fee: number };
    zelle: { enabled: boolean; handle: string; fee: number };
    venmo: { enabled: boolean; handle: string; fee: number };
  }>({ queryKey: ["/api/site-settings/manual-payments"] });

  const { data: minDeposits } = useQuery<Record<string, number>>({
    queryKey: ["/api/site-settings/min-deposits"],
  });

  const { data: deposits, refetch: refetchDeposits } = useQuery<Deposit[]>({
    queryKey: ["/api/deposits"],
    enabled: !!user,
    refetchInterval: 20000,
  });

  const cashappEnabled = manualMethods?.cashapp.enabled !== false;
  const chimeEnabled   = manualMethods?.chime.enabled === true;
  const zelleEnabled   = manualMethods?.zelle.enabled === true;

  const parsedAmount = parseFloat(amountInput) || 0;
  const activeTier = BONUS_TIERS.find(t => parsedAmount >= t.min && (t.max === null || parsedAmount <= t.max));

  const recentDeposits = deposits?.slice(0, 15) ?? [];

  /* ── Crypto mutation ── */
  const cryptoMutation = useMutation({
    mutationFn: async () => {
      const amount = parsedAmount;
      const cryptoMin = Math.max(1, minDeposits?.crypto ?? 0);
      if (!amount || amount < cryptoMin) throw new Error(`Minimum deposit is $${cryptoMin.toFixed(2)}`);
      const res = await apiRequest("POST", "/api/payments/forebit/create", {
        amount: String(Math.round(amount * 100)),
        purpose: "deposit",
      });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.message || "Failed to create payment"); }
      return res.json();
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["/api/deposits"] });
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        toast({ title: "Error", description: "Payment provider did not return a checkout link.", variant: "destructive" });
      }
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  /* ── Manual mutations ── */
  async function createManual(endpoint: string, method: Method) {
    const amount = parsedAmount;
    if (!amount || amount < 0.01) throw new Error("Enter the amount you want to deposit");
    const min = minDeposits?.[method] ?? 0;
    if (min > 0 && amount < min) throw new Error(`Minimum deposit for ${methodLabel(method)} is $${min.toFixed(2)}`);
    const res = await apiRequest("POST", endpoint, { amount });
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.message || "Failed"); }
    return res.json();
  }

  const cashappMutation = useMutation({
    mutationFn: () => createManual("/api/orders/cashapp", "cashapp"),
    onSuccess: (data) => {
      setManualResult({ note: data.paymentNote, handle: data.cashappTag || manualMethods?.cashapp.tag || "", amount: Math.round(parsedAmount * 100), method: "cashapp" });
      qc.invalidateQueries({ queryKey: ["/api/deposits"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const chimeMutation = useMutation({
    mutationFn: () => createManual("/api/deposits/chime", "chime"),
    onSuccess: (data) => {
      setManualResult({ note: data.paymentNote, handle: data.handle || manualMethods?.chime.handle || "", amount: Math.round(parsedAmount * 100), method: "chime" });
      qc.invalidateQueries({ queryKey: ["/api/deposits"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const zelleMutation = useMutation({
    mutationFn: () => createManual("/api/deposits/zelle", "zelle"),
    onSuccess: (data) => {
      setManualResult({ note: data.paymentNote, handle: data.handle || manualMethods?.zelle.handle || "", amount: Math.round(parsedAmount * 100), method: "zelle" });
      qc.invalidateQueries({ queryKey: ["/api/deposits"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const isManualPending = cashappMutation.isPending || chimeMutation.isPending || zelleMutation.isPending;
  const isPending = cryptoMutation.isPending || isManualPending;

  function feeLabel(fee: number | undefined) {
    if (!fee || fee === 0) return "0% fee";
    return `${fee}% fee`;
  }

  const paymentOptions = [
    { id: "crypto", label: "Crypto", sub: "BTC · ETH · LTC · SOL · USDT", Icon: SiBitcoin, color: "#F7931A", fee: "0% fee" },
    ...(cashappEnabled ? [{ id: "cashapp", label: "CashApp", sub: "instant", Icon: SiCashapp, color: "#00D632", fee: feeLabel(manualMethods?.cashapp?.fee) }] : []),
    ...(chimeEnabled ? [{ id: "chime", label: "Chime", sub: "instant", Icon: null, color: "#7BC67E", fee: feeLabel(manualMethods?.chime?.fee) }] : []),
    ...(zelleEnabled ? [{ id: "zelle", label: "Zelle", sub: "instant", Icon: null, color: "#6D1ED4", fee: feeLabel(manualMethods?.zelle?.fee) }] : []),
  ];

  const selected = paymentOptions.find(o => o.id === selectedOption) || null;
  const isSelectedCrypto = selectedOption === "crypto";

  function handleContinue() {
    if (!selectedOption) return;
    if (isSelectedCrypto) cryptoMutation.mutate();
    else if (selectedOption === "cashapp") cashappMutation.mutate();
    else if (selectedOption === "chime") chimeMutation.mutate();
    else if (selectedOption === "zelle") zelleMutation.mutate();
  }

  return (
    <div className="max-w-sm mx-auto px-4 py-4 space-y-4">

      {manualResult ? (
        <ManualDepositPanel result={manualResult} onReset={() => { setManualResult(null); setSelectedOption(null); setAmountInput(""); }} />
      ) : (
        <>
          {/* ── Hero card: balance + amount ── */}
          <div className="relative rounded-2xl border border-primary/25 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent pointer-events-none" />
            <div className="relative px-4 pt-3 pb-4 space-y-3" style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.02), transparent)" }}>
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Current Balance</p>
                <p className="text-sm font-bold text-white font-mono tabular-nums">${((user?.balance ?? 0) / 100).toFixed(2)}</p>
              </div>

              <div className="h-px bg-white/[0.06]" />

              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Amount to add</p>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-primary font-mono font-bold">$</span>
                  <input
                    type="number" step="0.01" min="0.01" placeholder="0.00"
                    value={amountInput}
                    onChange={e => setAmountInput(e.target.value)}
                    className="w-full h-10 bg-black/30 border border-white/10 rounded-xl pl-7 pr-4 text-sm text-white font-mono font-bold outline-none focus:border-primary/50 transition-colors placeholder:text-white/20"
                    data-testid="input-amount"
                  />
                </div>
                <div className="grid grid-cols-5 gap-1.5">
                  {[10,25,50,100,250].map(a => (
                    <button key={a} onClick={() => setAmountInput(String(a))}
                      className={`py-1 rounded-lg text-[10px] font-bold border transition-all ${
                        parsedAmount === a ? "bg-primary text-primary-foreground border-primary" : "bg-white/[0.03] border-white/10 text-white/40 hover:text-white/70 hover:border-white/20"
                      }`}
                      data-testid={`btn-quick-amount-${a}`}>
                      ${a}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── Telegram name reward card ── */}
          <TelegramNameRewardCard />

          {/* ── Bonus milestones strip ── */}
          <div className="pro-card p-3.5 space-y-2.5">
            <div className="flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-primary" />
              <p className="text-[10px] font-black uppercase tracking-widest text-white/70">Topup bonus tiers</p>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {BONUS_TIERS.map((tier, i) => {
                const isActiveTier = activeTier === tier;
                return (
                  <div key={i} className={`rounded-xl border px-1.5 py-2 text-center transition-all ${
                    isActiveTier ? "border-primary bg-primary/15" : "border-white/8 bg-black/20"
                  }`}>
                    <p className={`text-[9px] font-mono leading-tight ${isActiveTier ? "text-white/70" : "text-white/35"}`}>${tier.min.toLocaleString()}+</p>
                    <p className={`text-[11px] font-black font-mono leading-tight mt-0.5 ${isActiveTier ? "text-primary" : "text-white/50"}`}>{tier.bonus}</p>
                  </div>
                );
              })}
            </div>
            {activeTier && parsedAmount > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/10 border border-primary/25">
                <Zap className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                <p className="text-[11px] text-primary font-mono font-bold">{activeTier.bonus} bonus applied on this deposit</p>
              </div>
            )}
          </div>

          {/* ── Choose a payment method ── */}
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Choose a payment method</p>
            <div className="grid grid-cols-2 gap-2">
              {paymentOptions.map(opt => {
                const isActive = selectedOption === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setSelectedOption(opt.id)}
                    className="relative flex flex-col items-center gap-1.5 py-3 rounded-xl border transition-all"
                    style={{
                      borderColor: isActive ? opt.color : "rgba(255,255,255,0.08)",
                      background: isActive ? `${opt.color}14` : "#111",
                      boxShadow: isActive ? `0 0 0 1px ${opt.color}30, 0 6px 16px -6px ${opt.color}40` : undefined,
                    }}
                    data-testid={`btn-payment-${opt.id}`}
                  >
                    {isActive && (
                      <div className="absolute top-1.5 right-1.5 w-3.5 h-3.5 rounded-full flex items-center justify-center" style={{ background: opt.color }}>
                        <Check className="h-2 w-2 text-black" />
                      </div>
                    )}
                    <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: `${opt.color}20` }}>
                      {opt.Icon
                        ? <opt.Icon className="h-4 w-4" style={{ color: opt.color }} />
                        : <span className="text-xs font-black" style={{ color: opt.color }}>{opt.label.charAt(0)}</span>
                      }
                    </div>
                    <div className="text-center px-1">
                      <p className="text-xs font-bold text-white">{opt.label}</p>
                      <p className="text-[9px] text-white/35 font-mono leading-tight">{opt.sub}</p>
                      <p className="text-[9px] text-white/25 font-mono">{opt.fee}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── CTA ── */}
          <button
            onClick={handleContinue}
            disabled={!selectedOption || isPending || !amountInput || parsedAmount <= 0}
            className="w-full h-10 rounded-xl font-bold text-xs transition-all disabled:opacity-40 flex items-center justify-center gap-2"
            style={selected
              ? { background: `linear-gradient(135deg, ${selected.color}, ${selected.color}cc)`, color: "#000", boxShadow: `0 8px 24px -8px ${selected.color}80` }
              : { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.35)" }}
            data-testid="btn-continue-deposit"
          >
            {isPending
              ? <><Loader2 className="h-4 w-4 animate-spin" />Processing...</>
              : selected ? <>Continue with {selected.label} <span aria-hidden>→</span></> : "Select a method"
            }
          </button>

          <div className="space-y-2 pt-1">
            <p className="text-[11px] text-white/25 font-mono text-center">
              Payment issues?{" "}
              <a href="https://t.me/+oxGX1KUYsadmNGUx" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Contact support</a>
            </p>
            <a href="https://t.me/+oxGX1KUYsadmNGUx" target="_blank" rel="noopener noreferrer">
              <button className="w-full flex items-center justify-center gap-2 h-9 rounded-xl border border-blue-500/25 bg-blue-500/8 text-blue-400 text-xs font-bold hover:bg-blue-500/12 transition-colors">
                <Send className="h-3.5 w-3.5" /> Join our Telegram
              </button>
            </a>
          </div>
        </>
      )}

      {/* ── History ── */}
      {recentDeposits.length > 0 && (
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between">
            <p className="text-[9px] text-white/20 uppercase tracking-widest font-mono">Topup History</p>
            <button onClick={() => refetchDeposits()} className="text-white/20 hover:text-white/50 transition-colors" data-testid="btn-refresh-deposits">
              <RefreshCw className="h-3 w-3" />
            </button>
          </div>
          <div className="space-y-1.5">
            {recentDeposits.map(dep => <DepositRow key={dep.id} deposit={dep} />)}
          </div>
        </div>
      )}
    </div>
  );
}
