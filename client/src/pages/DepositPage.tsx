import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { ChevronDown, Loader2, Copy, Check, Clock, CheckCircle2, XCircle, AlertTriangle, RefreshCw, ExternalLink, ChevronRight } from "lucide-react";
import { SiBitcoin, SiEthereum, SiLitecoin, SiSolana, SiTether, SiCashapp } from "react-icons/si";

type ManualResult = { note: string; handle: string; amount: number; method: string };
type Deposit = {
  id: string; type: string; amount: number; status: string;
  paymentId?: string; checkoutUrl?: string; paymentNote?: string; createdAt: string;
};

const COINS = [
  { id: "BTC", label: "Bitcoin",  sub: "BTC",  Icon: SiBitcoin,   color: "#F7931A" },
  { id: "ETH", label: "Ethereum", sub: "ETH",  Icon: SiEthereum,  color: "#627EEA" },
  { id: "LTC", label: "Litecoin", sub: "LTC",  Icon: SiLitecoin,  color: "#A6A9AA" },
  { id: "SOL", label: "Solana",   sub: "SOL",  Icon: SiSolana,    color: "#9945FF" },
  { id: "USDT",label: "Tether",   sub: "USDT", Icon: SiTether,    color: "#26A17B" },
  { id: "USDC",label: "USD Coin", sub: "USDC", Icon: SiBitcoin,   color: "#2775CA" },
];

const BONUS_TIERS = [
  { min: 100,  max: 249,  bonus: "+10%" },
  { min: 250,  max: 499,  bonus: "+13%" },
  { min: 500,  max: 999,  bonus: "+16%" },
  { min: 1000, max: 2499, bonus: "+20%" },
  { min: 2500, max: 4999, bonus: "+25%" },
  { min: 5000, max: null, bonus: "+30%" },
];

function CopyBtn({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 border border-gray-200 text-[11px] text-gray-600 transition-colors"
    >
      {copied ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
      {copied ? "Copied" : (label ?? "Copy")}
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (["completed","delivering","fulfilled"].includes(status))
    return <span className="flex items-center gap-1 text-[10px] font-mono text-green-600"><CheckCircle2 className="h-3 w-3" />credited</span>;
  if (["failed","expired"].includes(status))
    return <span className="flex items-center gap-1 text-[10px] font-mono text-red-500"><XCircle className="h-3 w-3" />{status}</span>;
  if (status === "underpaid")
    return <span className="flex items-center gap-1 text-[10px] font-mono text-amber-500"><AlertTriangle className="h-3 w-3" />underpaid</span>;
  return <span className="flex items-center gap-1 text-[10px] font-mono text-gray-400 animate-pulse"><Clock className="h-3 w-3" />pending</span>;
}

function methodColor(type: string) {
  if (type === "cashapp") return "#00D632";
  if (type === "chime")   return "#7BC67E";
  if (type === "zelle")   return "#6D1ED4";
  return "#F7931A";
}

function DepositRow({ deposit }: { deposit: Deposit }) {
  const isCredited = ["completed","delivering","fulfilled"].includes(deposit.status);
  const color = methodColor(deposit.type);
  return (
    <div className={`flex items-center justify-between px-3 py-2.5 rounded-xl border ${
      isCredited ? "bg-green-50 border-green-200" :
      ["failed","expired"].includes(deposit.status) ? "bg-red-50 border-red-200" :
      "bg-white border-gray-200"
    }`}>
      <div className="flex items-center gap-2.5">
        <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0"
          style={{ background: `${color}22`, color }}>
          {deposit.type === "crypto" ? "₿" : deposit.type.charAt(0).toUpperCase()}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-gray-900">
              {deposit.amount > 0 ? `$${(deposit.amount / 100).toFixed(2)}` : "pending"}
            </span>
            <StatusBadge status={deposit.status} />
          </div>
          <p className="text-[10px] text-gray-400 font-mono mt-0.5">
            {deposit.type} · {new Date(deposit.createdAt).toLocaleDateString()}
            {deposit.paymentNote ? ` · ${deposit.paymentNote}` : ""}
          </p>
        </div>
      </div>
      {deposit.checkoutUrl && !isCredited && (
        <a href={deposit.checkoutUrl} target="_blank" rel="noopener noreferrer">
          <ExternalLink className="h-3.5 w-3.5 text-gray-300 hover:text-gray-600 transition-colors" />
        </a>
      )}
    </div>
  );
}

function ManualResult({ result, onReset }: { result: ManualResult; onReset: () => void }) {
  const color = methodColor(result.method);
  const name = result.method === "cashapp" ? "CashApp" : result.method === "chime" ? "Chime" : "Zelle";
  return (
    <div className="space-y-2 mt-3">
      <div className="bg-white border border-gray-200 rounded-xl px-3 py-2.5">
        <p className="text-[9px] text-gray-400 uppercase tracking-widest font-mono mb-1">Send to</p>
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-gray-900">{result.handle || `(no ${name} handle set)`}</p>
          {result.handle && <CopyBtn value={result.handle} />}
        </div>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl px-3 py-2.5">
        <p className="text-[9px] text-gray-400 uppercase tracking-widest font-mono mb-1">Amount (EXACT)</p>
        <div className="flex items-center justify-between">
          <p className="text-xl font-black text-gray-900 font-mono">${(result.amount / 100).toFixed(2)}</p>
          <CopyBtn value={(result.amount / 100).toFixed(2)} />
        </div>
        <p className="text-[10px] text-amber-600 font-mono mt-1">⚠ Send exactly this amount</p>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl px-3 py-2.5">
        <p className="text-[9px] text-gray-400 uppercase tracking-widest font-mono mb-1">Note (required)</p>
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold font-mono" style={{ color }}>{result.note}</p>
          <CopyBtn value={result.note} />
        </div>
      </div>
      <p className="text-[10px] text-gray-400 font-mono text-center">include the note when sending · admin will confirm and credit your balance</p>
      <button onClick={onReset} className="w-full text-[11px] text-gray-400 hover:text-gray-700 font-mono transition-colors" data-testid="btn-new-deposit">
        ← create new deposit
      </button>
    </div>
  );
}

/* ─── Individual method sections ─── */

function CryptoSection({ minDeposits }: { minDeposits?: Record<string, number> }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [selectedCoin, setSelectedCoin] = useState("BTC");
  const [amount, setAmount] = useState("");
  const [showMore, setShowMore] = useState(false);
  const qc = useQueryClient();

  const parsed = parseFloat(amount) || 0;
  const activeTier = BONUS_TIERS.find(t => parsed >= t.min && (t.max === null || parsed <= t.max));

  const mutation = useMutation({
    mutationFn: async () => {
      const cryptoMin = Math.max(1, minDeposits?.crypto ?? 0);
      if (!parsed || parsed < cryptoMin) throw new Error(`Minimum crypto deposit is $${cryptoMin.toFixed(2)}`);
      const res = await apiRequest("POST", "/api/payments/forebit/create", { amount: String(Math.round(parsed * 100)), purpose: "deposit" });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.message || "Failed"); }
      return res.json();
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["/api/deposits"] });
      const url = data.checkoutUrl || data.url;
      if (url) {
        if (data.paymentId) { sessionStorage.setItem("lastForebitPaymentId", data.paymentId); sessionStorage.setItem("lastForebitPurpose", "deposit"); }
        window.location.href = url;
      }
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const coins = showMore ? COINS : COINS.slice(0, 6);

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-4"
        data-testid="btn-section-crypto"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center">
            <SiBitcoin className="h-5 w-5 text-amber-500" />
          </div>
          <div className="text-left">
            <p className="text-sm font-bold text-gray-900">Crypto</p>
            <p className="text-[11px] text-green-700 font-mono font-bold">+bonus up to 30%</p>
          </div>
        </div>
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="border-t border-gray-100 px-4 pb-4 space-y-3 pt-3">
          {/* Bonus tiers */}
          <div className="bg-green-50 border border-green-200 rounded-xl overflow-hidden">
            <div className="px-3 py-2 border-b border-green-100">
              <p className="text-[10px] font-bold text-green-800 uppercase tracking-widest">Deposit Bonus Milestones</p>
            </div>
            <div className="divide-y divide-green-100">
              <div className="grid grid-cols-2 px-3 py-1">
                <span className="text-[9px] text-green-600 font-mono font-bold uppercase">Range</span>
                <span className="text-[9px] text-green-600 font-mono font-bold uppercase text-right">Bonus</span>
              </div>
              {BONUS_TIERS.map((tier, i) => {
                const isActive = activeTier === tier;
                return (
                  <div key={i} className={`grid grid-cols-2 px-3 py-1 ${isActive ? "bg-green-200/50" : ""}`}>
                    <span className={`text-xs font-mono font-semibold ${isActive ? "text-green-900" : "text-gray-700"}`}>
                      ${tier.min.toLocaleString()}{tier.max ? ` – $${tier.max.toLocaleString()}` : "+"}
                    </span>
                    <span className={`text-xs font-mono font-bold text-right ${isActive ? "text-green-800" : "text-green-600"}`}>{tier.bonus}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Coin selector */}
          <div>
            <p className="text-[9px] text-gray-400 font-mono uppercase font-bold mb-1.5">Choose coin</p>
            <div className="grid grid-cols-3 gap-2">
              {coins.map(coin => {
                const isSelected = selectedCoin === coin.id;
                const { Icon } = coin;
                return (
                  <button key={coin.id} onClick={() => setSelectedCoin(coin.id)}
                    className={`flex flex-col items-center gap-1.5 py-2.5 rounded-xl border transition-all ${isSelected ? "border-gray-300 bg-gray-100" : "border-gray-200 bg-gray-50 hover:bg-gray-100"}`}
                    data-testid={`btn-coin-${coin.id}`}
                  >
                    <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: `${coin.color}22` }}>
                      <Icon className="h-4 w-4" style={{ color: coin.color }} />
                    </div>
                    <span className="text-[10px] font-bold text-gray-800 font-mono">{coin.sub}</span>
                  </button>
                );
              })}
            </div>
            <button onClick={() => setShowMore(v => !v)} className="w-full mt-2 py-1.5 text-[10px] text-gray-400 hover:text-gray-600 font-mono transition-colors border border-gray-200 rounded-lg">
              {showMore ? "▲ fewer" : "▼ more coins"}
            </button>
          </div>

          {/* Amount */}
          <div>
            <label className="text-[9px] text-gray-400 uppercase tracking-widest font-mono font-bold">Amount (USD)</label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-mono text-sm">$</span>
              <input type="number" step="0.01" min="1" placeholder="0.00" value={amount}
                onChange={e => setAmount(e.target.value)}
                className="w-full h-11 bg-gray-50 border border-gray-200 rounded-xl pl-7 pr-3 text-sm text-gray-900 font-mono outline-none focus:border-green-300 focus:bg-white transition-colors"
                data-testid="input-amount-crypto"
              />
            </div>
            {activeTier && parsed > 0 && (
              <p className="text-[10px] text-green-700 font-mono font-bold mt-1">🎉 {activeTier.bonus} bonus on this deposit!</p>
            )}
          </div>

          <button onClick={() => mutation.mutate()} disabled={mutation.isPending || !amount || parsed <= 0}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-40"
            style={{ background: "#2d6a2d" }} data-testid="btn-deposit-crypto"
          >
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><ExternalLink className="h-4 w-4" />Deposit {parsed > 0 ? `$${parsed.toFixed(2)}` : ""} with {selectedCoin}</>}
          </button>
        </div>
      )}
    </div>
  );
}

function ManualSection({ id, label, color, icon, tag, tagLabel, enabled, minDeposits }: {
  id: string; label: string; color: string; icon: React.ReactNode; tag: string; tagLabel: string; enabled: boolean; minDeposits?: Record<string, number>;
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [result, setResult] = useState<ManualResult | null>(null);
  const qc = useQueryClient();

  const parsed = parseFloat(amount) || 0;

  const mutation = useMutation({
    mutationFn: async () => {
      if (!parsed || parsed < 0.01) throw new Error("Enter the amount you want to deposit");
      const min = minDeposits?.[id] ?? 0;
      if (min > 0 && parsed < min) throw new Error(`Minimum deposit is $${min.toFixed(2)}`);
      let endpoint = "";
      if (id === "cashapp") endpoint = "/api/orders/cashapp";
      else if (id === "chime") endpoint = "/api/deposits/chime";
      else if (id === "zelle") endpoint = "/api/deposits/zelle";
      const res = await apiRequest("POST", endpoint, { amount: parsed });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.message || "Failed"); }
      return res.json();
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["/api/deposits"] });
      const handle = id === "cashapp" ? (data.cashappTag || tag) : (data.handle || tag);
      setResult({ note: data.paymentNote, handle, amount: Math.round(parsed * 100), method: id });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (!enabled) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-4"
        data-testid={`btn-section-${id}`}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: `${color}18` }}>
            <div style={{ color }}>{icon}</div>
          </div>
          <div className="text-left">
            <p className="text-sm font-bold text-gray-900">{label}</p>
            <p className="text-[11px] text-gray-400 font-mono">{tagLabel || "instant"}</p>
          </div>
        </div>
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="border-t border-gray-100 px-4 pb-4 pt-3">
          {result ? (
            <ManualResult result={result} onReset={() => { setResult(null); setAmount(""); }} />
          ) : (
            <div className="space-y-3">
              <p className="text-[11px] text-gray-500 font-mono leading-relaxed bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5">
                enter how much you want to deposit · you'll get a unique note · send exactly that amount with the note · admin will credit your balance
              </p>
              <div>
                {(() => { const min = minDeposits?.[id] ?? 0; return min > 0 ? <p className="text-[9px] text-amber-600 font-mono font-bold mb-1">Min: ${min.toFixed(2)}</p> : null; })()}
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-mono text-sm">$</span>
                  <input type="number" step="0.01" min="0.01" placeholder="0.00" value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className="w-full h-11 bg-gray-50 border border-gray-200 rounded-xl pl-7 pr-3 text-sm text-gray-900 font-mono outline-none focus:border-gray-300 focus:bg-white transition-colors"
                    data-testid={`input-amount-${id}`}
                  />
                </div>
              </div>
              <button onClick={() => mutation.mutate()} disabled={mutation.isPending || !amount || parsed <= 0}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold border transition-all disabled:opacity-40"
                style={{ borderColor: `${color}40`, color, background: `${color}0c` }}
                data-testid={`btn-generate-${id}`}
              >
                {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : `Generate payment note →`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Main page ─── */

export default function DepositPage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: manualMethods } = useQuery<{
    cashapp: { enabled: boolean; tag: string };
    chime:   { enabled: boolean; handle: string };
    zelle:   { enabled: boolean; handle: string };
    venmo:   { enabled: boolean; handle: string };
  }>({ queryKey: ["/api/site-settings/manual-payments"] });

  const { data: minDeposits } = useQuery<Record<string, number>>({
    queryKey: ["/api/site-settings/min-deposits"],
  });

  const { data: deposits, refetch: refetchDeposits } = useQuery<Deposit[]>({
    queryKey: ["/api/deposits"],
    enabled: !!user,
    refetchInterval: 15000,
  });

  const recentDeposits = deposits?.slice(0, 20) ?? [];
  const pendingDeposits = deposits?.filter(d => !["completed","delivering","fulfilled","failed","expired"].includes(d.status)) ?? [];

  const cashappEnabled = manualMethods?.cashapp.enabled !== false;
  const chimeEnabled   = manualMethods?.chime.enabled === true;
  const zelleEnabled   = manualMethods?.zelle.enabled === true;

  return (
    <div className="max-w-sm mx-auto px-3 py-4 space-y-3">

      {/* Payment issues banner */}
      <a href="https://t.me/omzri" target="_blank" rel="noopener noreferrer">
        <div className="w-full flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-2xl text-xs text-gray-500 hover:bg-gray-50 transition-colors shadow-sm cursor-pointer" data-testid="btn-payment-issues">
          <div className="flex items-center gap-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
            <span className="font-mono">payment issues? click here</span>
          </div>
          <ChevronRight className="h-3 w-3 text-gray-300" />
        </div>
      </a>

      {pendingDeposits.length > 0 && (
        <div className="border border-amber-200 bg-amber-50 rounded-xl px-3 py-2.5 flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
          <p className="text-[11px] text-amber-700 font-mono">
            {pendingDeposits.length} pending deposit{pendingDeposits.length > 1 ? "s" : ""} — awaiting confirmation
          </p>
        </div>
      )}

      {/* Section label */}
      <div className="pt-1">
        <p className="text-[9px] text-gray-400 uppercase tracking-widest font-mono font-bold px-1">Choose payment method</p>
      </div>

      {/* Crypto */}
      <CryptoSection minDeposits={minDeposits} />

      {/* CashApp */}
      <ManualSection
        id="cashapp" label="CashApp" color="#00D632"
        icon={<SiCashapp className="h-5 w-5" />}
        tag={manualMethods?.cashapp.tag ?? ""}
        tagLabel={manualMethods?.cashapp.tag ? `$${manualMethods.cashapp.tag}` : "instant"}
        enabled={cashappEnabled}
        minDeposits={minDeposits}
      />

      {/* Chime */}
      <ManualSection
        id="chime" label="Chime" color="#7BC67E"
        icon={<span className="text-lg font-black">C</span>}
        tag={manualMethods?.chime.handle ?? ""}
        tagLabel={manualMethods?.chime.handle || "instant"}
        enabled={chimeEnabled}
        minDeposits={minDeposits}
      />

      {/* Zelle */}
      <ManualSection
        id="zelle" label="Zelle" color="#6D1ED4"
        icon={<span className="text-lg font-black">Z</span>}
        tag={manualMethods?.zelle.handle ?? ""}
        tagLabel={manualMethods?.zelle.handle || "instant"}
        enabled={zelleEnabled}
        minDeposits={minDeposits}
      />

      {/* Topup History */}
      {recentDeposits.length > 0 && (
        <div className="space-y-1.5 pt-2">
          <div className="flex items-center justify-between px-1">
            <p className="text-[9px] text-gray-400 uppercase tracking-widest font-mono font-bold">Topup History</p>
            <button onClick={() => refetchDeposits()} className="text-gray-300 hover:text-gray-500 transition-colors" data-testid="btn-refresh-deposits">
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
