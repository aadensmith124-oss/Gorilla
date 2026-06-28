import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { ChevronRight, Loader2, Copy, Check, Clock, CheckCircle2, XCircle, AlertTriangle, RefreshCw, ExternalLink } from "lucide-react";
import { SiBitcoin, SiEthereum, SiLitecoin, SiSolana, SiTether, SiCashapp } from "react-icons/si";

type Method = "crypto" | "cashapp" | "chime" | "zelle";
type ManualResult = { note: string; handle: string; amount: number; method: Method };
type Deposit = {
  id: string; type: "crypto" | "cashapp" | "chime" | "zelle";
  amount: number; status: string; paymentId?: string;
  checkoutUrl?: string; paymentNote?: string; createdAt: string;
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
  const handle = () => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <button onClick={handle} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 border border-gray-200 text-xs text-gray-600 hover:text-gray-900 transition-colors" data-testid="btn-copy">
      {copied ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
      {copied ? "Copied!" : (label || "Copy")}
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "completed" || status === "delivering" || status === "fulfilled")
    return <span className="flex items-center gap-1 text-[10px] font-mono text-green-600"><CheckCircle2 className="h-3 w-3" /> credited</span>;
  if (status === "failed" || status === "expired")
    return <span className="flex items-center gap-1 text-[10px] font-mono text-red-500"><XCircle className="h-3 w-3" /> {status}</span>;
  if (status === "underpaid")
    return <span className="flex items-center gap-1 text-[10px] font-mono text-amber-500"><AlertTriangle className="h-3 w-3" /> underpaid</span>;
  return <span className="flex items-center gap-1 text-[10px] font-mono text-gray-400 animate-pulse"><Clock className="h-3 w-3" /> pending</span>;
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
    <div className={`flex items-center justify-between px-3 py-2.5 rounded-xl border transition-colors ${
      isCredited ? "bg-green-50 border-green-200" :
      deposit.status === "failed" || deposit.status === "expired" ? "bg-red-50 border-red-200" :
      "bg-white border-gray-200"
    }`}>
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold" style={{ background: `${color}22`, color }}>
          {deposit.type === "crypto" ? "₿" : deposit.type.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-gray-900">{amountLabel}</span>
            <StatusBadge status={deposit.status} />
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-gray-400 font-mono">
              {methodLabel(deposit.type)} · {new Date(deposit.createdAt).toLocaleDateString()}
            </span>
            {deposit.paymentNote && <span className="text-[10px] font-mono" style={{ color: `${color}99` }}>{deposit.paymentNote}</span>}
          </div>
        </div>
      </div>
      {deposit.checkoutUrl && !isCredited && (
        <a href={deposit.checkoutUrl} target="_blank" rel="noopener noreferrer">
          <button className="ml-2 flex-shrink-0 text-gray-300 hover:text-gray-600 transition-colors" title="Reopen checkout">
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
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
    <div className="border rounded-2xl p-4 space-y-3" style={{ borderColor: `${color}40`, background: `${color}08` }}>
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: color, color: "#fff" }}>
          {name.charAt(0)}
        </div>
        <p className="text-xs font-bold" style={{ color }}>Send via {name}</p>
      </div>
      <div className="space-y-2">
        <div className="bg-white border border-gray-200 rounded-xl px-3 py-2.5">
          <p className="text-[9px] text-gray-400 uppercase tracking-widest mb-1 font-mono">{sendLabel}</p>
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-gray-900 font-mono">{result.handle || `(no ${name} handle set)`}</p>
            {result.handle && <CopyButton value={result.handle} />}
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl px-3 py-2.5">
          <p className="text-[9px] text-gray-400 uppercase tracking-widest mb-1 font-mono">Amount (send EXACTLY this)</p>
          <div className="flex items-center justify-between">
            <p className="text-xl font-black text-gray-900 font-mono">${(result.amount / 100).toFixed(2)}</p>
            <CopyButton value={(result.amount / 100).toFixed(2)} label="Copy" />
          </div>
          <p className="text-[10px] text-amber-600 font-mono mt-1">⚠ Send exactly this amount</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl px-3 py-2.5">
          <p className="text-[9px] text-gray-400 uppercase tracking-widest mb-1 font-mono">Payment Note (required)</p>
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold font-mono" style={{ color }}>{result.note}</p>
            <CopyButton value={result.note} />
          </div>
        </div>
      </div>
      <p className="text-[10px] text-gray-400 font-mono leading-relaxed">
        include the exact note when sending · admin will confirm and credit your balance
      </p>
      <button onClick={onReset} className="w-full text-[11px] text-gray-400 hover:text-gray-700 transition-colors font-mono" data-testid="btn-new-deposit">
        ← create new deposit
      </button>
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
        if (data.paymentId) { sessionStorage.setItem("lastForebitPaymentId", data.paymentId); sessionStorage.setItem("lastForebitPurpose", "deposit"); sessionStorage.removeItem("lastForebitOrderId"); }
        window.location.href = url;
      } else { toast({ title: "Payment created", description: "Check your email for the payment link" }); }
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
  const parsedAmount = parseFloat(amountInput) || 0;
  const activeTier = BONUS_TIERS.find(t => parsedAmount >= t.min && (t.max === null || parsedAmount <= t.max));
  const visibleCoins = showMoreCoins ? COINS : COINS.slice(0, 6);

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

  return (
    <div className="max-w-sm mx-auto px-3 py-4 space-y-3">

      {/* Payment issues banner */}
      <a href="https://t.me/omzri" target="_blank" rel="noopener noreferrer">
        <button className="w-full flex items-center justify-between px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-xs text-gray-500 hover:bg-gray-50 transition-colors shadow-sm" data-testid="btn-payment-issues">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
            <span className="font-mono">payment issues? click here</span>
          </div>
          <ChevronRight className="h-3 w-3 flex-shrink-0" />
        </button>
      </a>

      {pendingDeposits.length > 0 && (
        <div className="border border-amber-200 bg-amber-50 rounded-xl px-3 py-2.5 flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
          <p className="text-[11px] text-amber-700 font-mono">
            {pendingDeposits.length} pending deposit{pendingDeposits.length > 1 ? "s" : ""} — awaiting confirmation
          </p>
        </div>
      )}

      {/* Method selector */}
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${1 + (cashappEnabled ? 1 : 0) + (chimeEnabled ? 1 : 0) + (zelleEnabled ? 1 : 0)}, 1fr)` }}>
        <button
          onClick={() => { setMethod("crypto"); setManualResult(null); setAmountInput(""); }}
          className={`flex flex-col items-center gap-2 py-4 rounded-2xl border transition-all shadow-sm ${method === "crypto" ? "border-green-300 bg-green-50 shadow-green-100" : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"}`}
          data-testid="btn-method-crypto"
        >
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${method === "crypto" ? "bg-green-700" : "bg-gray-100"}`}>
            <SiBitcoin className={`h-5 w-5 ${method === "crypto" ? "text-white" : "text-gray-500"}`} />
          </div>
          <div className="text-center">
            <p className={`text-xs font-bold ${method === "crypto" ? "text-green-800" : "text-gray-600"}`}>Crypto</p>
            <p className="text-[10px] text-gray-400 font-mono">+bonus</p>
          </div>
        </button>

        {cashappEnabled && (
          <button
            onClick={() => { setMethod("cashapp"); setManualResult(null); setAmountInput(""); }}
            className={`flex flex-col items-center gap-2 py-4 rounded-2xl border transition-all shadow-sm ${method === "cashapp" ? "border-green-400 bg-green-50" : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"}`}
            data-testid="btn-method-cashapp"
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${method === "cashapp" ? "bg-[#00D632]" : "bg-gray-100"}`}>
              <SiCashapp className={`h-5 w-5 ${method === "cashapp" ? "text-white" : "text-gray-500"}`} />
            </div>
            <div className="text-center">
              <p className={`text-xs font-bold ${method === "cashapp" ? "text-[#00b82b]" : "text-gray-600"}`}>CashApp</p>
              <p className="text-[10px] text-gray-400 font-mono">instant</p>
            </div>
          </button>
        )}

        {chimeEnabled && (
          <button
            onClick={() => { setMethod("chime"); setManualResult(null); setAmountInput(""); }}
            className={`flex flex-col items-center gap-2 py-4 rounded-2xl border transition-all shadow-sm ${method === "chime" ? "border-green-400 bg-green-50" : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"}`}
            data-testid="btn-method-chime"
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-black ${method === "chime" ? "bg-[#7BC67E] text-white" : "bg-gray-100 text-gray-500"}`}>C</div>
            <div className="text-center">
              <p className={`text-xs font-bold ${method === "chime" ? "text-[#3d8f40]" : "text-gray-600"}`}>Chime</p>
              <p className="text-[10px] text-gray-400 font-mono">instant</p>
            </div>
          </button>
        )}

        {zelleEnabled && (
          <button
            onClick={() => { setMethod("zelle"); setManualResult(null); setAmountInput(""); }}
            className={`flex flex-col items-center gap-2 py-4 rounded-2xl border transition-all shadow-sm ${method === "zelle" ? "border-purple-300 bg-purple-50" : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"}`}
            data-testid="btn-method-zelle"
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-black ${method === "zelle" ? "bg-[#6D1ED4] text-white" : "bg-gray-100 text-gray-500"}`}>Z</div>
            <div className="text-center">
              <p className={`text-xs font-bold ${method === "zelle" ? "text-[#6D1ED4]" : "text-gray-600"}`}>Zelle</p>
              <p className="text-[10px] text-gray-400 font-mono">instant</p>
            </div>
          </button>
        )}
      </div>

      {/* CRYPTO SECTION */}
      {method === "crypto" && (
        <div className="space-y-3">
          {/* Bonus milestones */}
          <div className="border border-green-200 bg-green-50 rounded-2xl overflow-hidden">
            <div className="px-3 py-2.5 border-b border-green-200">
              <p className="text-[10px] font-bold text-green-800 uppercase tracking-widest">Deposit Bonus Milestones · Crypto Only</p>
              <p className="text-[10px] text-green-600 mt-0.5">More you deposit, more you get back</p>
            </div>
            <div className="divide-y divide-green-100">
              <div className="grid grid-cols-2 px-3 py-1.5">
                <span className="text-[9px] text-green-600 uppercase tracking-widest font-mono font-bold">Range</span>
                <span className="text-[9px] text-green-600 uppercase tracking-widest font-mono font-bold text-right">Bonus</span>
              </div>
              {BONUS_TIERS.map((tier, i) => {
                const isActive = activeTier === tier;
                return (
                  <div key={i} className={`grid grid-cols-2 px-3 py-1.5 transition-colors ${isActive ? "bg-green-200/50" : ""}`}>
                    <span className={`text-xs font-mono font-semibold ${isActive ? "text-green-900" : "text-gray-700"}`}>
                      ${tier.min.toLocaleString()}{tier.max ? ` — $${tier.max.toLocaleString()}` : "+"}
                    </span>
                    <span className={`text-xs font-mono text-right font-bold ${isActive ? "text-green-800" : "text-green-600"}`}>{tier.bonus}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Coin selector */}
          <div className="space-y-1.5">
            <p className="text-[9px] text-gray-500 uppercase tracking-widest font-mono font-bold">Tap a coin to deposit</p>
            <div className="grid grid-cols-3 gap-2">
              {visibleCoins.map(coin => {
                const isSelected = selectedCoin === coin.id;
                const { Icon } = coin;
                return (
                  <button
                    key={coin.id}
                    onClick={() => setSelectedCoin(coin.id)}
                    className={`flex flex-col items-center gap-1.5 py-3 rounded-2xl border transition-all shadow-sm ${isSelected ? "border-gray-300 bg-gray-100" : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"}`}
                    data-testid={`btn-coin-${coin.id}`}
                  >
                    <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: `${coin.color}22` }}>
                      <Icon className="h-4 w-4" style={{ color: coin.color }} />
                    </div>
                    <span className="text-[10px] font-bold text-gray-800 font-mono">{coin.sub}</span>
                    <span className="text-[9px] text-gray-400">{coin.label}</span>
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setShowMoreCoins(v => !v)}
              className="w-full py-2 border border-gray-200 bg-white rounded-xl text-[10px] text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-colors font-mono shadow-sm"
              data-testid="btn-more-coins"
            >
              {showMoreCoins ? "▲ FEWER COINS" : "▶ MORE COINS"}
            </button>
          </div>

          {/* Amount input */}
          <div className="space-y-1.5">
            <label className="text-[9px] text-gray-500 uppercase tracking-widest font-mono font-bold">Amount (USD)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-mono">$</span>
              <input
                type="number" step="0.01" min="1" placeholder="0.00" value={amountInput}
                onChange={e => setAmountInput(e.target.value)}
                className="w-full h-11 bg-white border border-gray-200 rounded-xl pl-7 pr-3 text-sm text-gray-900 font-mono outline-none focus:border-green-300 transition-colors shadow-sm"
                data-testid="input-amount"
              />
            </div>
            {activeTier && parsedAmount > 0 && (
              <p className="text-[10px] text-green-700 font-mono font-bold">🎉 You qualify for a {activeTier.bonus} bonus!</p>
            )}
          </div>

          <button
            onClick={() => cryptoMutation.mutate()}
            disabled={cryptoMutation.isPending || !amountInput || parsedAmount <= 0}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm transition-all disabled:opacity-40 shadow-sm text-white"
            style={{ background: "#2d6a2d" }}
            data-testid="btn-deposit-crypto"
          >
            {cryptoMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : (
              <><ExternalLink className="h-4 w-4" /> Deposit {parsedAmount > 0 ? `$${parsedAmount.toFixed(2)}` : ""} with {selectedCoin}</>
            )}
          </button>
        </div>
      )}

      {/* MANUAL PAYMENT SECTION */}
      {isManual && (
        <div className="space-y-2">
          {manualResult ? (
            <ManualDepositPanel result={manualResult} onReset={() => { setManualResult(null); setAmountInput(""); }} />
          ) : (
            <>
              <div className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-500 font-mono leading-relaxed">
                enter how much you want to deposit · you will get a unique note · send EXACTLY that amount with the note · admin will credit your balance
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[9px] text-gray-500 uppercase tracking-widest font-mono font-bold">Deposit Amount (USD)</label>
                  {(() => { const min = minDeposits?.[method as string] ?? 0; return min > 0 ? <span className="text-[9px] font-mono text-amber-600 font-bold">Min: ${min.toFixed(2)}</span> : null; })()}
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-mono">$</span>
                  <input
                    type="number" step="0.01" min="0.01" placeholder="0.00" value={amountInput}
                    onChange={e => setAmountInput(e.target.value)}
                    className="w-full h-11 bg-white border border-gray-200 rounded-xl pl-7 pr-3 text-sm text-gray-900 font-mono outline-none focus:border-gray-300 transition-colors shadow-sm"
                    data-testid="input-manual-amount"
                  />
                </div>
              </div>
              <button
                onClick={handleGenerate}
                disabled={isManualPending || !amountInput || parsedAmount <= 0}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-mono font-bold transition-all disabled:opacity-40 border"
                style={{
                  borderColor: method === "cashapp" ? "#00D63240" : method === "chime" ? "#7BC67E40" : "#6D1ED440",
                  color: method === "cashapp" ? "#00b82b" : method === "chime" ? "#3d8f40" : "#6D1ED4",
                  background: method === "cashapp" ? "#f0fff4" : method === "chime" ? "#f0fff4" : "#faf5ff",
                }}
                data-testid="btn-generate-note"
              >
                {isManualPending ? <Loader2 className="h-3 w-3 animate-spin" /> : `generate payment note →`}
              </button>
            </>
          )}
        </div>
      )}

      {/* Topup History */}
      {recentDeposits.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between">
            <p className="text-[9px] text-gray-400 uppercase tracking-widest font-mono font-bold">Topup History</p>
            <button onClick={() => refetchDeposits()} className="text-gray-300 hover:text-gray-500 transition-colors" title="Refresh" data-testid="btn-refresh-deposits">
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
