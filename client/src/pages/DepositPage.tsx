import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { ChevronRight, Loader2, Copy, Check, Clock, CheckCircle2, XCircle, AlertTriangle, RefreshCw, ExternalLink, Zap } from "lucide-react";
import { SiBitcoin, SiEthereum, SiLitecoin, SiSolana, SiTether, SiCashapp } from "react-icons/si";

type Method = "crypto" | "cashapp" | "chime" | "zelle";

type ManualResult = { note: string; handle: string; amount: number; method: Method };

type Deposit = {
  id: string;
  type: "crypto" | "cashapp" | "chime" | "zelle";
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

const QUICK_AMOUNTS = [10, 25, 50, 100, 250];

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
      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/8 hover:bg-white/12 border border-white/10 text-[10px] text-white/50 hover:text-white transition-colors"
      data-testid="btn-copy"
    >
      {copied ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
      {copied ? "Copied" : (label || "Copy")}
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "completed" || status === "delivering" || status === "fulfilled")
    return <span className="flex items-center gap-1 text-[10px] font-mono text-green-400"><CheckCircle2 className="h-3 w-3" />credited</span>;
  if (status === "failed" || status === "expired")
    return <span className="flex items-center gap-1 text-[10px] font-mono text-red-400/70"><XCircle className="h-3 w-3" />{status}</span>;
  if (status === "underpaid")
    return <span className="flex items-center gap-1 text-[10px] font-mono text-yellow-400/70"><AlertTriangle className="h-3 w-3" />underpaid</span>;
  return <span className="flex items-center gap-1 text-[10px] font-mono text-white/30 animate-pulse"><Clock className="h-3 w-3" />pending</span>;
}

function methodColor(type: string) {
  if (type === "cashapp") return "#00D632";
  if (type === "chime") return "#7BC67E";
  if (type === "zelle") return "#6D1ED4";
  return "#F7931A";
}

function methodLabel(type: string) {
  if (type === "cashapp") return "CashApp";
  if (type === "chime") return "Chime";
  if (type === "zelle") return "Zelle";
  return "Crypto";
}

function DepositRow({ deposit }: { deposit: Deposit }) {
  const isCredited = ["completed", "delivering", "fulfilled"].includes(deposit.status);
  const amountLabel = deposit.amount > 0 ? `$${(deposit.amount / 100).toFixed(2)}` : "pending";
  const color = methodColor(deposit.type);
  return (
    <div className={`flex items-center justify-between px-3 py-2.5 rounded-xl border ${
      isCredited ? "bg-green-950/10 border-green-900/20" :
      deposit.status === "failed" || deposit.status === "expired" ? "bg-red-950/10 border-red-900/20" :
      "bg-white/[0.03] border-white/[0.06]"
    }`}>
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{ background: `${color}18`, color }}>
          {deposit.type === "crypto" ? "₿" : deposit.type.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-white">{amountLabel}</span>
            <StatusBadge status={deposit.status} />
          </div>
          <p className="text-[10px] text-white/25 font-mono mt-0.5">
            {methodLabel(deposit.type)} · {new Date(deposit.createdAt).toLocaleDateString()}
            {deposit.paymentNote && <span style={{ color: `${color}70` }}> · {deposit.paymentNote}</span>}
          </p>
        </div>
      </div>
      {deposit.checkoutUrl && !isCredited && (
        <a href={deposit.checkoutUrl} target="_blank" rel="noopener noreferrer">
          <button className="ml-2 flex-shrink-0 text-white/20 hover:text-white/60 transition-colors"><ExternalLink className="h-3.5 w-3.5" /></button>
        </a>
      )}
    </div>
  );
}

function ManualDepositPanel({ result, onReset }: { result: ManualResult; onReset: () => void }) {
  const color = methodColor(result.method);
  const name = methodLabel(result.method);
  const sendLabel = result.method === "cashapp" ? "Send to $Cashtag" : result.method === "chime" ? "Send to Chime" : "Send to Zelle";

  return (
    <div className="rounded-2xl border overflow-hidden" style={{ borderColor: `${color}30`, background: `${color}06` }}>
      <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: `${color}20` }}>
        <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black text-white" style={{ background: color }}>{name.charAt(0)}</div>
        <p className="text-sm font-bold" style={{ color }}>Send via {name}</p>
      </div>
      <div className="p-4 space-y-3">
        <div className="rounded-xl bg-black/30 border border-white/5 px-4 py-3">
          <p className="text-[9px] text-white/30 uppercase tracking-widest mb-1.5 font-mono">{sendLabel}</p>
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-bold text-white font-mono truncate">{result.handle || `(no ${name} handle set)`}</p>
            {result.handle && <CopyButton value={result.handle} />}
          </div>
        </div>
        <div className="rounded-xl bg-black/30 border border-white/5 px-4 py-3">
          <p className="text-[9px] text-white/30 uppercase tracking-widest mb-1.5 font-mono">Amount — send EXACTLY</p>
          <div className="flex items-center justify-between gap-2">
            <p className="text-2xl font-black text-white font-mono">${(result.amount / 100).toFixed(2)}</p>
            <CopyButton value={(result.amount / 100).toFixed(2)} label="Copy" />
          </div>
          <p className="text-[10px] text-yellow-400/60 font-mono mt-1.5">⚠ Wrong amount = not credited</p>
        </div>
        <div className="rounded-xl bg-black/30 border border-white/5 px-4 py-3">
          <p className="text-[9px] text-white/30 uppercase tracking-widest mb-1.5 font-mono">Payment Note (required)</p>
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-bold font-mono" style={{ color }}>{result.note}</p>
            <CopyButton value={result.note} />
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

export default function DepositPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [method, setMethod] = useState<Method>("crypto");
  const [selectedCoin, setSelectedCoin] = useState("BTC");
  const [amountInput, setAmountInput] = useState("");
  const [manualResult, setManualResult] = useState<ManualResult | null>(null);

  const { data: manualMethods } = useQuery<{
    cashapp: { enabled: boolean; tag: string };
    chime: { enabled: boolean; handle: string };
    zelle: { enabled: boolean; handle: string };
    venmo: { enabled: boolean; handle: string };
  }>({ queryKey: ["/api/site-settings/manual-payments"] });

  const { data: minDeposits } = useQuery<Record<string, number>>({
    queryKey: ["/api/site-settings/min-deposits"],
  });

  const { data: deposits, refetch: refetchDeposits } = useQuery<Deposit[]>({
    queryKey: ["/api/deposits"],
    enabled: !!user,
    refetchInterval: 15000,
  });

  const cryptoMutation = useMutation({
    mutationFn: async () => {
      const amount = parseFloat(amountInput);
      const cryptoMin = Math.max(1, minDeposits?.crypto ?? 0);
      if (!amount || amount < cryptoMin) throw new Error(`Minimum deposit for Crypto is $${cryptoMin.toFixed(2)}`);
      if (amount > 1000000000) throw new Error("Maximum deposit is $1,000,000,000");
      const res = await apiRequest("POST", "/api/payments/forebit/create", { amount: String(Math.round(amount * 100)), purpose: "deposit" });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.message || "Failed to create payment"); }
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

  const cashappMutation = useMutation({
    mutationFn: async () => {
      const amount = parseFloat(amountInput);
      if (!amount || amount < 0.01) throw new Error("Enter the amount you want to deposit");
      const min = minDeposits?.cashapp ?? 0;
      if (min > 0 && amount < min) throw new Error(`Minimum deposit for CashApp is $${min.toFixed(2)}`);
      const res = await apiRequest("POST", "/api/orders/cashapp", { amount });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.message || "Failed"); }
      return res.json();
    },
    onSuccess: (data) => {
      setManualResult({ note: data.paymentNote, handle: data.cashappTag || manualMethods?.cashapp.tag || "", amount: Math.round(parseFloat(amountInput) * 100), method: "cashapp" });
      qc.invalidateQueries({ queryKey: ["/api/deposits"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const chimeMutation = useMutation({
    mutationFn: async () => {
      const amount = parseFloat(amountInput);
      if (!amount || amount < 0.01) throw new Error("Enter the amount you want to deposit");
      const min = minDeposits?.chime ?? 0;
      if (min > 0 && amount < min) throw new Error(`Minimum deposit for Chime is $${min.toFixed(2)}`);
      const res = await apiRequest("POST", "/api/deposits/chime", { amount });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.message || "Failed"); }
      return res.json();
    },
    onSuccess: (data) => {
      setManualResult({ note: data.paymentNote, handle: data.handle || manualMethods?.chime.handle || "", amount: Math.round(parseFloat(amountInput) * 100), method: "chime" });
      qc.invalidateQueries({ queryKey: ["/api/deposits"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const zelleMutation = useMutation({
    mutationFn: async () => {
      const amount = parseFloat(amountInput);
      if (!amount || amount < 0.01) throw new Error("Enter the amount you want to deposit");
      const min = minDeposits?.zelle ?? 0;
      if (min > 0 && amount < min) throw new Error(`Minimum deposit for Zelle is $${min.toFixed(2)}`);
      const res = await apiRequest("POST", "/api/deposits/zelle", { amount });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.message || "Failed"); }
      return res.json();
    },
    onSuccess: (data) => {
      setManualResult({ note: data.paymentNote, handle: data.handle || manualMethods?.zelle.handle || "", amount: Math.round(parseFloat(amountInput) * 100), method: "zelle" });
      qc.invalidateQueries({ queryKey: ["/api/deposits"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const recentDeposits = deposits?.slice(0, 20) ?? [];
  const pendingDeposits = deposits?.filter(d => !["completed", "delivering", "fulfilled", "failed", "expired"].includes(d.status)) ?? [];
  const pendingManualDeposits = pendingDeposits.filter(d => d.type !== "crypto");
  const pendingCryptoDeposits = pendingDeposits.filter(d => d.type === "crypto");
  const parsedAmount = parseFloat(amountInput) || 0;
  const activeTier = BONUS_TIERS.find(t => parsedAmount >= t.min && (t.max === null || parsedAmount <= t.max));

  const cashappEnabled = manualMethods?.cashapp.enabled !== false;
  const chimeEnabled = manualMethods?.chime.enabled === true;
  const zelleEnabled = manualMethods?.zelle.enabled === true;

  const handleGenerate = () => {
    if (method === "cashapp") cashappMutation.mutate();
    else if (method === "chime") chimeMutation.mutate();
    else if (method === "zelle") zelleMutation.mutate();
  };

  const isManualPending = cashappMutation.isPending || chimeMutation.isPending || zelleMutation.isPending;
  const isManual = method !== "crypto";

  const methodBgColor = method === "cashapp" ? "#00D632" : method === "chime" ? "#7BC67E" : method === "zelle" ? "#6D1ED4" : "";

  const availableMethods = [
    { id: "crypto" as Method, label: "Crypto", sub: "+bonus", show: true, color: "hsl(var(--primary))", icon: <SiBitcoin className="h-5 w-5" /> },
    { id: "cashapp" as Method, label: "CashApp", sub: "instant", show: cashappEnabled, color: "#00D632", icon: <SiCashapp className="h-5 w-5" /> },
    { id: "chime" as Method, label: "Chime", sub: "instant", show: chimeEnabled, color: "#7BC67E", icon: <span className="text-base font-black leading-none">C</span> },
    { id: "zelle" as Method, label: "Zelle", sub: "instant", show: zelleEnabled, color: "#6D1ED4", icon: <span className="text-base font-black leading-none">Z</span> },
  ].filter(m => m.show);

  return (
    <div className="max-w-sm mx-auto px-4 py-5 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-black text-white">Add Balance</h1>
          <p className="text-[10px] text-white/35 font-mono mt-0.5">
            Current: <span className="text-primary font-bold">${user ? (user.balance / 100).toFixed(2) : "0.00"}</span>
          </p>
        </div>
        <a href="https://t.me/omzri" target="_blank" rel="noopener noreferrer">
          <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/8 text-[10px] text-white/35 hover:text-white/60 transition-colors font-mono" data-testid="btn-payment-issues">
            <span className="w-1.5 h-1.5 rounded-full bg-white/30 animate-pulse flex-shrink-0" />
            Need help?
          </button>
        </a>
      </div>

      {/* Pending alerts */}
      {pendingCryptoDeposits.length > 0 && (
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-yellow-500/15 bg-yellow-500/5">
          <Clock className="h-3.5 w-3.5 text-yellow-400/60 flex-shrink-0" />
          <p className="text-[11px] text-yellow-400/70 font-mono">
            {pendingCryptoDeposits.length} crypto deposit{pendingCryptoDeposits.length > 1 ? "s" : ""} awaiting network confirmation
          </p>
        </div>
      )}

      {pendingManualDeposits.length > 0 && (
        <div className="rounded-2xl border border-white/8 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-white/5 flex items-center gap-2">
            <Clock className="h-3 w-3 text-yellow-400/60 flex-shrink-0" />
            <p className="text-[10px] font-bold text-yellow-400/70 uppercase tracking-widest font-mono">Awaiting Confirmation</p>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {pendingManualDeposits.map(dep => (
              <div key={dep.id} className="px-4 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0"
                    style={{ background: methodColor(dep.type) + "25", color: methodColor(dep.type) }}>
                    {dep.type.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xs font-mono text-white font-bold">{dep.amount > 0 ? `$${(dep.amount / 100).toFixed(2)}` : "pending"}</p>
                    <p className="text-[10px] text-white/25 font-mono">{methodLabel(dep.type)} · {dep.paymentNote || "—"}</p>
                  </div>
                </div>
                <span className="text-[9px] px-2 py-0.5 rounded-md font-mono animate-pulse bg-yellow-500/10 text-yellow-400/50">pending</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Method selector */}
      <div className={`grid gap-2`} style={{ gridTemplateColumns: `repeat(${availableMethods.length}, 1fr)` }}>
        {availableMethods.map(m => {
          const isActive = method === m.id;
          return (
            <button
              key={m.id}
              onClick={() => { setMethod(m.id); setManualResult(null); setAmountInput(""); }}
              className="flex flex-col items-center gap-2 py-4 rounded-2xl border transition-all"
              style={{
                borderColor: isActive ? `${m.color}50` : "rgba(255,255,255,0.07)",
                background: isActive ? `${m.color}10` : "rgba(255,255,255,0.02)",
              }}
              data-testid={`btn-method-${m.id}`}
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: isActive ? m.color : "rgba(255,255,255,0.08)", color: isActive ? "#fff" : "rgba(255,255,255,0.45)" }}>
                {m.icon}
              </div>
              <div className="text-center">
                <p className="text-xs font-bold" style={{ color: isActive ? m.color : "rgba(255,255,255,0.45)" }}>{m.label}</p>
                <p className="text-[10px] text-white/20 font-mono">{m.sub}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* CRYPTO */}
      {method === "crypto" && (
        <div className="space-y-4">
          {/* Bonus tiers */}
          <div className="rounded-2xl border border-primary/15 bg-primary/[0.04] overflow-hidden">
            <div className="px-4 py-2.5 border-b border-primary/10 flex items-center gap-2">
              <Zap className="h-3.5 w-3.5 text-primary" />
              <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Deposit Bonus · Crypto Only</p>
            </div>
            <div className="divide-y divide-white/[0.04]">
              {BONUS_TIERS.map((tier, i) => {
                const isActive = activeTier === tier;
                return (
                  <div key={i} className={`flex items-center justify-between px-4 py-2 transition-colors ${isActive ? "bg-primary/10" : ""}`}>
                    <span className={`text-xs font-mono ${isActive ? "text-white" : "text-white/35"}`}>
                      ${tier.min.toLocaleString()}{tier.max ? ` – $${tier.max.toLocaleString()}` : "+"}
                    </span>
                    <span className={`text-xs font-mono font-bold ${isActive ? "text-primary" : "text-white/25"}`}>{tier.bonus}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Coin selection */}
          <div>
            <p className="text-[9px] text-white/25 uppercase tracking-widest font-mono mb-2">Select coin</p>
            <div className="grid grid-cols-3 gap-2">
              {COINS.map(coin => {
                const isSelected = selectedCoin === coin.id;
                return (
                  <button
                    key={coin.id}
                    onClick={() => setSelectedCoin(coin.id)}
                    className="flex flex-col items-center gap-1.5 py-3 rounded-xl border transition-all"
                    style={{
                      borderColor: isSelected ? `${coin.color}50` : "rgba(255,255,255,0.07)",
                      background: isSelected ? `${coin.color}12` : "rgba(255,255,255,0.02)",
                    }}
                    data-testid={`btn-coin-${coin.id}`}
                  >
                    <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: `${coin.color}20` }}>
                      <coin.Icon className="h-4 w-4" style={{ color: coin.color }} />
                    </div>
                    <span className="text-[10px] font-bold text-white/70">{coin.sub}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Amount input */}
          <div className="space-y-2">
            <p className="text-[9px] text-white/25 uppercase tracking-widest font-mono">Amount (USD)</p>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base text-white/35 font-mono">$</span>
              <input
                type="number" step="0.01" min="1" placeholder="0.00"
                value={amountInput}
                onChange={e => setAmountInput(e.target.value)}
                className="w-full h-14 bg-[#0d0d0d] border border-white/10 rounded-xl pl-8 pr-4 text-xl text-white font-mono font-bold outline-none focus:border-primary/30 transition-colors"
                data-testid="input-amount"
              />
            </div>
            <div className="flex gap-1.5">
              {QUICK_AMOUNTS.map(a => (
                <button
                  key={a}
                  onClick={() => setAmountInput(String(a))}
                  className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold border transition-colors ${
                    parsedAmount === a ? "bg-primary/15 border-primary/30 text-primary" : "bg-white/[0.03] border-white/8 text-white/35 hover:text-white/60 hover:border-white/15"
                  }`}
                >
                  ${a}
                </button>
              ))}
            </div>
            {activeTier && parsedAmount > 0 && (
              <p className="text-[11px] text-primary font-mono font-bold flex items-center gap-1">
                <Zap className="h-3 w-3" /> {activeTier.bonus} bonus on this deposit!
              </p>
            )}
          </div>

          <button
            onClick={() => cryptoMutation.mutate()}
            disabled={cryptoMutation.isPending || !amountInput || parsedAmount <= 0}
            className="w-full h-12 rounded-xl bg-primary text-white font-black text-sm hover:bg-primary/90 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
            data-testid="btn-deposit-crypto"
          >
            {cryptoMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : (
              <><ExternalLink className="h-4 w-4" />Deposit {parsedAmount > 0 ? `$${parsedAmount.toFixed(2)}` : ""} with {selectedCoin}</>
            )}
          </button>
        </div>
      )}

      {/* MANUAL (CashApp / Chime / Zelle) */}
      {isManual && (
        <div className="space-y-4">
          {manualResult ? (
            <ManualDepositPanel result={manualResult} onReset={() => { setManualResult(null); setAmountInput(""); }} />
          ) : (
            <>
              <div className="rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 text-[11px] text-white/30 font-mono leading-relaxed">
                Enter how much you want to deposit · You'll get a unique note · Send EXACTLY that amount with the note · Admin will credit your balance
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[9px] text-white/25 uppercase tracking-widest font-mono">Deposit Amount (USD)</p>
                  {(() => {
                    const min = minDeposits?.[method as string] ?? 0;
                    return min > 0 ? <span className="text-[9px] font-mono text-yellow-400/60">Min: ${min.toFixed(2)}</span> : null;
                  })()}
                </div>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base text-white/35 font-mono">$</span>
                  <input
                    type="number" step="0.01" min="0.01" placeholder="0.00"
                    value={amountInput}
                    onChange={e => setAmountInput(e.target.value)}
                    className="w-full h-14 bg-[#0d0d0d] border border-white/10 rounded-xl pl-8 pr-4 text-xl text-white font-mono font-bold outline-none focus:border-white/20 transition-colors"
                    data-testid="input-manual-amount"
                  />
                </div>
                <div className="flex gap-1.5">
                  {QUICK_AMOUNTS.map(a => (
                    <button
                      key={a}
                      onClick={() => setAmountInput(String(a))}
                      className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold border transition-colors ${
                        parsedAmount === a
                          ? "border-white/20 text-white"
                          : "bg-white/[0.03] border-white/8 text-white/35 hover:text-white/60 hover:border-white/15"
                      }`}
                      style={parsedAmount === a ? { background: `${methodBgColor}15`, borderColor: `${methodBgColor}40`, color: methodBgColor } : {}}
                    >
                      ${a}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleGenerate}
                disabled={isManualPending || !amountInput || parsedAmount <= 0}
                className="w-full h-12 rounded-xl font-black text-sm transition-all disabled:opacity-40 flex items-center justify-center gap-2 border"
                style={{
                  background: `${methodBgColor}15`,
                  borderColor: `${methodBgColor}40`,
                  color: methodBgColor,
                }}
                data-testid="btn-generate-note"
              >
                {isManualPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Generate Payment Note →"}
              </button>
            </>
          )}
        </div>
      )}

      {/* History */}
      {recentDeposits.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[9px] text-white/20 uppercase tracking-widest font-mono">Topup History</p>
            <button onClick={() => refetchDeposits()} className="text-white/20 hover:text-white/50 transition-colors" title="Refresh" data-testid="btn-refresh-deposits">
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
