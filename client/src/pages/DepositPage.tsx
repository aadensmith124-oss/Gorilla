import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Loader2, Copy, Check, Clock, CheckCircle2, XCircle, AlertTriangle,
  RefreshCw, ExternalLink, Zap, ChevronRight, Send
} from "lucide-react";
import { SiBitcoin, SiEthereum, SiLitecoin, SiSolana, SiTether, SiCashapp } from "react-icons/si";

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

type CryptoInvoice = {
  paymentId: string;
  checkoutUrl: string;
  address?: string;
  coin: string;
  network?: string;
  amount: number;
};

type ManualResult = { note: string; handle: string; amount: number; method: Method };

const COINS = [
  { id: "BTC", label: "Bitcoin",   Icon: SiBitcoin,   color: "#F7931A", network: "Bitcoin Network"   },
  { id: "ETH", label: "Ethereum",  Icon: SiEthereum,  color: "#627EEA", network: "Ethereum Network"  },
  { id: "LTC", label: "Litecoin",  Icon: SiLitecoin,  color: "#A6A9AA", network: "Litecoin Network"   },
  { id: "SOL", label: "Solana",    Icon: SiSolana,    color: "#9945FF", network: "Solana Network"     },
  { id: "USDT",label: "Tether",    Icon: SiTether,    color: "#26A17B", network: "TRC-20 / ERC-20"   },
  { id: "USDC",label: "USD Coin",  Icon: SiBitcoin,   color: "#2775CA", network: "Solana / ERC-20"   },
];

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

/* ── CRYPTO INVOICE PANEL ── */
function CryptoInvoicePanel({ invoice, onNew }: { invoice: CryptoInvoice; onNew: () => void }) {
  const { toast } = useToast();
  const [status, setStatus] = useState<"pending" | "completed" | "failed">("pending");
  const [lastChecked, setLastChecked] = useState<Date>(new Date());
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const coin = COINS.find(c => c.id === invoice.coin) || COINS[0];

  const qrData = invoice.address || invoice.checkoutUrl;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&color=ffffff&bgcolor=0a0a0a&data=${encodeURIComponent(qrData)}`;

  async function checkStatus() {
    try {
      const res = await fetch(`/api/payments/forebit/${invoice.paymentId}/status`);
      if (!res.ok) return;
      const data = await res.json();
      setLastChecked(new Date());
      if (data.status === "completed") {
        setStatus("completed");
        if (pollRef.current) clearInterval(pollRef.current);
        toast({ title: "Payment received!", description: "Balance credited to your account" });
      } else if (["failed","expired"].includes(data.status)) {
        setStatus("failed");
        if (pollRef.current) clearInterval(pollRef.current);
      }
    } catch {}
  }

  useEffect(() => {
    pollRef.current = setInterval(checkStatus, 5 * 60 * 1000); // every 5 minutes
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [invoice.paymentId]);

  if (status === "completed") {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <div className="w-16 h-16 rounded-full bg-green-500/15 flex items-center justify-center">
          <CheckCircle2 className="h-8 w-8 text-green-400" />
        </div>
        <div className="text-center">
          <p className="text-base font-black text-white">Payment received!</p>
          <p className="text-xs text-white/40 font-mono mt-1">Your balance has been credited</p>
        </div>
        <button onClick={onNew} className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold">New deposit</button>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {/* Invoice status bar */}
      <div className="flex items-center justify-between px-4 py-3 rounded-t-2xl border-x border-t border-white/10" style={{ background: "#0d0d0d" }}>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: coin.color }} />
          <span className="text-[11px] font-mono text-white/60">invoice active — send {coin.id}</span>
        </div>
        <button onClick={onNew} className="text-[10px] font-bold text-white/30 hover:text-white/60 transition-colors flex items-center gap-0.5">
          new <ChevronRight className="h-3 w-3" />
        </button>
      </div>

      {/* Info rows */}
      <div className="border-x border-white/10 divide-y divide-white/[0.06]" style={{ background: "#0a0a0a" }}>
        <div className="flex items-center justify-between px-4 py-2.5">
          <span className="text-[11px] text-white/30 font-mono">currency</span>
          <span className="text-[11px] text-white font-mono font-bold">USD</span>
        </div>
        <div className="flex items-center justify-between px-4 py-2.5">
          <span className="text-[11px] text-white/30 font-mono">network</span>
          <span className="text-[11px] text-white font-mono font-bold">{invoice.network || coin.network}</span>
        </div>
        <div className="flex items-center justify-between px-4 py-2.5">
          <span className="text-[11px] text-white/30 font-mono">fee</span>
          <span className="text-[11px] font-mono font-bold" style={{ color: coin.color }}>0% — full value credited</span>
        </div>
      </div>

      {/* QR code */}
      <div className="border-x border-white/10 flex items-center justify-center py-6" style={{ background: "#0a0a0a" }}>
        <div className="p-3 rounded-2xl bg-white">
          <img
            src={qrUrl}
            alt="Deposit QR"
            className="w-44 h-44 block"
            style={{ imageRendering: "pixelated" }}
          />
        </div>
      </div>

      {/* Address */}
      <div className="border-x border-white/10 px-4 py-3 space-y-2" style={{ background: "#0a0a0a" }}>
        <p className="text-[9px] font-bold uppercase tracking-widest text-white/30 font-mono">DEPOSIT ADDRESS</p>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-9 bg-[#111] border border-white/10 rounded-lg flex items-center px-3 overflow-hidden">
            <span className="text-[11px] font-mono text-white/70 truncate">{qrData}</span>
          </div>
          <CopyBtn value={qrData} />
        </div>
        <p className="text-[10px] text-white/25 font-mono leading-relaxed">
          only send <strong className="text-white/50">{coin.id}</strong> on <strong className="text-white/50">{invoice.network || coin.network}</strong> — wrong coin or network = permanent loss
        </p>
      </div>

      {/* Amount note */}
      {invoice.amount > 0 && (
        <div className="border-x border-white/10 px-4 py-2.5" style={{ background: "#0a0a0a" }}>
          <p className="text-[10px] text-white/25 font-mono">
            Invoice amount: <span className="text-white/50 font-bold">${(invoice.amount / 100).toFixed(2)}</span> · send any amount, it will be credited
          </p>
        </div>
      )}

      {/* Poll status */}
      <div className="border border-white/10 rounded-b-2xl px-4 py-3 flex items-center justify-between" style={{ background: "#0d0d0d" }}>
        <div className="flex items-center gap-2">
          <Clock className="h-3 w-3 text-white/20 animate-pulse" />
          <span className="text-[10px] text-white/25 font-mono">checking every 5 min</span>
        </div>
        <button
          onClick={checkStatus}
          className="text-[10px] text-white/30 hover:text-white/60 transition-colors flex items-center gap-1 font-mono"
        >
          <RefreshCw className="h-3 w-3" /> check now
        </button>
      </div>

      {/* Links */}
      <div className="pt-3 space-y-2">
        <p className="text-[11px] text-white/25 font-mono text-center">
          Payment issues?{" "}
          <a href="https://t.me/+FJLl-nL1mxAwNmZh" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Contact support</a>
        </p>
        <a href="https://t.me/+FJLl-nL1mxAwNmZh" target="_blank" rel="noopener noreferrer">
          <button className="w-full flex items-center justify-center gap-2 h-9 rounded-xl border border-blue-500/30 bg-blue-500/10 text-blue-400 text-xs font-bold hover:bg-blue-500/15 transition-colors">
            <Send className="h-3.5 w-3.5" /> Join our Telegram
          </button>
        </a>
      </div>
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
   MAIN DEPOSIT PAGE
══════════════════════════════════════════════ */
export default function DepositPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [amountInput, setAmountInput] = useState("");
  const [manualResult, setManualResult] = useState<ManualResult | null>(null);
  const [cryptoInvoice, setCryptoInvoice] = useState<CryptoInvoice | null>(null);

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
    mutationFn: async (coinId: string) => {
      const amount = parsedAmount;
      const cryptoMin = Math.max(1, minDeposits?.crypto ?? 0);
      if (!amount || amount < cryptoMin) throw new Error(`Minimum deposit is $${cryptoMin.toFixed(2)}`);
      const res = await apiRequest("POST", "/api/payments/forebit/create", {
        amount: String(Math.round(amount * 100)),
        purpose: "deposit",
        coin: coinId,
      });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.message || "Failed to create payment"); }
      return res.json();
    },
    onSuccess: (data, coinId) => {
      qc.invalidateQueries({ queryKey: ["/api/deposits"] });
      setCryptoInvoice({
        paymentId: data.paymentId,
        checkoutUrl: data.checkoutUrl,
        address: data.address,
        coin: coinId || "BTC",
        network: data.network,
        amount: Math.round(parsedAmount * 100),
      });
      setAmountInput("");
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

  const CRYPTO_IDS = COINS.map(c => c.id);

  const paymentOptions = [
    ...COINS.map(c => ({ id: c.id, label: c.label, sub: c.id, Icon: c.Icon, color: c.color, fee: "0% fee" })),
    ...(cashappEnabled ? [{ id: "cashapp", label: "CashApp", sub: "instant", Icon: SiCashapp, color: "#00D632", fee: feeLabel(manualMethods?.cashapp?.fee) }] : []),
    ...(chimeEnabled ? [{ id: "chime", label: "Chime", sub: "instant", Icon: null, color: "#7BC67E", fee: feeLabel(manualMethods?.chime?.fee) }] : []),
    ...(zelleEnabled ? [{ id: "zelle", label: "Zelle", sub: "instant", Icon: null, color: "#6D1ED4", fee: feeLabel(manualMethods?.zelle?.fee) }] : []),
  ];

  const selected = paymentOptions.find(o => o.id === selectedOption) || null;
  const isSelectedCrypto = selectedOption ? CRYPTO_IDS.includes(selectedOption) : false;

  function handleContinue() {
    if (!selectedOption) return;
    if (isSelectedCrypto) cryptoMutation.mutate(selectedOption);
    else if (selectedOption === "cashapp") cashappMutation.mutate();
    else if (selectedOption === "chime") chimeMutation.mutate();
    else if (selectedOption === "zelle") zelleMutation.mutate();
  }

  return (
    <div className="max-w-sm mx-auto px-4 py-4 space-y-4">

      {cryptoInvoice ? (
        <CryptoInvoicePanel invoice={cryptoInvoice} onNew={() => { setCryptoInvoice(null); setSelectedOption(null); }} />
      ) : manualResult ? (
        <ManualDepositPanel result={manualResult} onReset={() => { setManualResult(null); setSelectedOption(null); setAmountInput(""); }} />
      ) : (
        <>
          {/* ── Hero card: balance + amount ── */}
          <div className="relative rounded-3xl border border-primary/25 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-transparent to-transparent pointer-events-none" />
            <div className="relative px-5 pt-4 pb-5 space-y-4" style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.03), transparent)" }}>
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Current Balance</p>
                <p className="text-xl font-black text-white font-mono tabular-nums">${((user?.balance ?? 0) / 100).toFixed(2)}</p>
              </div>

              <div className="h-px bg-white/[0.06]" />

              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Amount to add</p>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl text-primary font-mono font-black">$</span>
                  <input
                    type="number" step="0.01" min="0.01" placeholder="0.00"
                    value={amountInput}
                    onChange={e => setAmountInput(e.target.value)}
                    className="w-full h-14 bg-black/30 border-2 border-white/10 rounded-2xl pl-10 pr-4 text-2xl text-white font-mono font-black outline-none focus:border-primary/50 transition-colors placeholder:text-white/15"
                    data-testid="input-amount"
                  />
                </div>
                <div className="grid grid-cols-5 gap-1.5">
                  {[10,25,50,100,250].map(a => (
                    <button key={a} onClick={() => setAmountInput(String(a))}
                      className={`py-1.5 rounded-lg text-[11px] font-bold border transition-all ${
                        parsedAmount === a ? "bg-primary text-primary-foreground border-primary shadow-[0_0_12px_-2px_hsl(var(--primary)/0.6)]" : "bg-white/[0.03] border-white/10 text-white/40 hover:text-white/70 hover:border-white/20"
                      }`}
                      data-testid={`btn-quick-amount-${a}`}>
                      ${a}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

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
            <div className="grid grid-cols-2 gap-2.5">
              {paymentOptions.map(opt => {
                const isActive = selectedOption === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setSelectedOption(opt.id)}
                    className="relative flex flex-col items-center gap-2 py-4 rounded-2xl border transition-all"
                    style={{
                      borderColor: isActive ? opt.color : "rgba(255,255,255,0.08)",
                      background: isActive ? `${opt.color}14` : "#111",
                      boxShadow: isActive ? `0 0 0 1px ${opt.color}30, 0 8px 20px -8px ${opt.color}50` : undefined,
                    }}
                    data-testid={`btn-payment-${opt.id}`}
                  >
                    {isActive && (
                      <div className="absolute top-2 right-2 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: opt.color }}>
                        <Check className="h-2.5 w-2.5 text-black" />
                      </div>
                    )}
                    <div className="w-11 h-11 rounded-full flex items-center justify-center transition-transform" style={{ background: `${opt.color}20`, transform: isActive ? "scale(1.05)" : "scale(1)" }}>
                      {opt.Icon
                        ? <opt.Icon className="h-5 w-5" style={{ color: opt.color }} />
                        : <span className="text-sm font-black" style={{ color: opt.color }}>{opt.label.charAt(0)}</span>
                      }
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-bold text-white">{opt.label}</p>
                      <p className="text-[10px] text-white/35 font-mono">{opt.sub} · {opt.fee}</p>
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
            className="w-full h-12 rounded-2xl font-bold text-sm transition-all disabled:opacity-40 flex items-center justify-center gap-2"
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
              <a href="https://t.me/+FJLl-nL1mxAwNmZh" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Contact support</a>
            </p>
            <a href="https://t.me/+FJLl-nL1mxAwNmZh" target="_blank" rel="noopener noreferrer">
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
