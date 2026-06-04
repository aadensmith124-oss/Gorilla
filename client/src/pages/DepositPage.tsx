import { useState } from "react";
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

const CRYPTO_COINS = [
  { value: "BTC", label: "Bitcoin (BTC)" },
  { value: "ETH", label: "Ethereum (ETH)" },
  { value: "USDT_TRC20", label: "USDT (TRC-20)" },
  { value: "USDT_ERC20", label: "USDT (ERC-20)" },
  { value: "LTC", label: "Litecoin (LTC)" },
  { value: "XRP", label: "XRP" },
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
  return (
    <span className="flex items-center gap-1 text-[10px] font-mono text-white/40 animate-pulse">
      <Clock className="h-3 w-3" /> {type === "cashapp" ? "awaiting admin" : "pending"}
    </span>
  );
}

function DepositRow({ deposit, onStatusRefresh }: { deposit: Deposit; onStatusRefresh: () => void }) {
  const isCredited = ["completed", "delivering", "fulfilled"].includes(deposit.status);
  const amountLabel = deposit.amount > 0 ? `$${(deposit.amount / 100).toFixed(2)}` : "any amount";

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
            <span className="text-xs font-mono font-bold text-white">{amountLabel}</span>
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
    </div>
  );
}

export default function DepositPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [method, setMethod] = useState<Method>("cashapp");
  const [selectedCoin, setSelectedCoin] = useState("BTC");
  const [cashappResult, setCashappResult] = useState<{ note: string; tag: string } | null>(null);

  const { data: cashappTagData } = useQuery<{ tag: string }>({
    queryKey: ["/api/site-settings/cashapp-tag"],
  });

  const { data: cryptoAddresses = [] } = useQuery<{ currency: string; address: string }[]>({
    queryKey: ["/api/user/crypto-addresses"],
    enabled: !!user && method === "crypto",
  });

  const { data: deposits, refetch: refetchDeposits } = useQuery<Deposit[]>({
    queryKey: ["/api/deposits"],
    enabled: !!user,
    refetchInterval: 15000,
  });

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
      setCashappResult({
        note: data.paymentNote,
        tag: data.cashappTag || cashappTagData?.tag || "",
      });
      qc.invalidateQueries({ queryKey: ["/api/deposits"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const currentCryptoAddress = cryptoAddresses.find(a => a.currency === selectedCoin)?.address;

  const recentDeposits = deposits?.slice(0, 20) ?? [];
  const pendingDeposits = deposits?.filter(d =>
    !["completed", "delivering", "fulfilled", "failed", "expired"].includes(d.status)
  ) ?? [];

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

      {/* Method selector */}
      <div className="grid grid-cols-2 gap-2">
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
            <p className="text-[10px] text-white/25 font-mono">any amount</p>
          </div>
        </button>

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
            <p className="text-[10px] text-white/25 font-mono">permanent address</p>
          </div>
        </button>
      </div>

      {/* CashApp section */}
      {method === "cashapp" && (
        <div className="space-y-2">
          {!cashappResult ? (
            <>
              <div className="px-3 py-2.5 bg-[#0e0e0e] border border-white/8 rounded text-xs text-white/40 font-mono leading-relaxed">
                click below to generate a unique payment note · send any amount via cashapp · admin will credit your balance after confirming
              </div>
              <button
                onClick={() => { setCashappResult(null); cashappMutation.mutate(); }}
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

      {/* Crypto section */}
      {method === "crypto" && (
        <div className="space-y-2">
          <div className="space-y-1">
            <label className="text-[9px] text-white/30 uppercase tracking-widest font-mono">Select Coin</label>
            <select
              value={selectedCoin}
              onChange={e => setSelectedCoin(e.target.value)}
              className="w-full h-9 rounded-md bg-[#0e0e0e] border border-white/10 text-sm text-white px-3 focus:outline-none focus:border-white/20"
              data-testid="select-coin"
            >
              {CRYPTO_COINS.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          {currentCryptoAddress ? (
            <div className="border border-white/10 bg-[#0e0e0e] rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <SiBitcoin className="h-4 w-4 text-white/50" />
                <p className="text-xs font-bold text-white">Your {selectedCoin} Address</p>
              </div>
              <div className="bg-black/40 rounded px-3 py-2.5 space-y-2">
                <p className="text-[9px] text-white/30 uppercase tracking-widest font-mono">Deposit Address</p>
                <p className="text-xs font-mono text-white break-all leading-relaxed">{currentCryptoAddress}</p>
                <CopyButton value={currentCryptoAddress} label="Copy Address" />
              </div>
              <p className="text-[10px] text-white/25 font-mono leading-relaxed">
                send any amount to this address · contact support after sending so admin can credit your balance
              </p>
            </div>
          ) : (
            <div className="border border-white/8 bg-[#0e0e0e] rounded-xl p-4 text-center space-y-2">
              <p className="text-xs text-white/40 font-mono">No {selectedCoin} address assigned yet</p>
              <p className="text-[10px] text-white/25 font-mono">contact support to get your personal deposit address set up</p>
              <a href="https://t.me/nychqsupport" target="_blank" rel="noopener noreferrer">
                <button className="mt-1 px-3 py-1.5 border border-white/10 rounded text-xs text-white/50 hover:text-white hover:border-white/20 transition-colors font-mono" data-testid="btn-contact-support">
                  contact support →
                </button>
              </a>
            </div>
          )}
        </div>
      )}

      {/* Topup History */}
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
