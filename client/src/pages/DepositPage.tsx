import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { ChevronRight, Loader2, Copy, Check } from "lucide-react";
import { Link } from "wouter";
import { SiBitcoin, SiCashapp } from "react-icons/si";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const COINS = ["Bitcoin (BTC)", "Ethereum (ETH)", "Litecoin (LTC)", "USDT (TRC20)", "USDT (ERC20)", "Monero (XMR)"];
const NETWORKS_MAP: Record<string, string[]> = {
  "Bitcoin (BTC)": ["Bitcoin"],
  "Ethereum (ETH)": ["ERC20"],
  "Litecoin (LTC)": ["Litecoin"],
  "USDT (TRC20)": ["TRC20"],
  "USDT (ERC20)": ["ERC20"],
  "Monero (XMR)": ["Monero"],
};

type Method = "crypto" | "cashapp";

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

export default function DepositPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [method, setMethod] = useState<Method>("crypto");
  const [coin, setCoin] = useState("");
  const [network, setNetwork] = useState("");
  const [amount, setAmount] = useState(20);
  const [cashappResult, setCashappResult] = useState<{ note: string; tag: string } | null>(null);

  const { data: transactions } = useQuery<any[]>({
    queryKey: ["/api/wallet/transactions"],
    enabled: !!user,
  });

  const { data: cashappTagData } = useQuery<{ tag: string }>({
    queryKey: ["/api/site-settings/cashapp-tag"],
  });

  const fee = 0.05;
  const youSend = (amount * (1 + fee)).toFixed(2);
  const minAmount = 5;

  const cryptoMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/payments/forebit/create", {
        amount: Math.round(amount * 100),
        currency: coin,
        network,
        purpose: "deposit",
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.checkoutUrl) window.open(data.checkoutUrl, "_blank");
      else toast({ title: "Invoice created" });
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
      qc.invalidateQueries({ queryKey: ["/api/wallet/transactions"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const isLoading = cryptoMutation.isPending || cashappMutation.isPending;

  const handleCreate = () => {
    if (method === "crypto") {
      if (!coin || !network) return toast({ title: "Select coin and network", variant: "destructive" });
      cryptoMutation.mutate();
    } else {
      setCashappResult(null);
      cashappMutation.mutate();
    }
  };

  const depositHistory = transactions?.filter((t: any) => t.type === "deposit") ?? [];

  return (
    <div className="max-w-sm mx-auto px-3 py-3 space-y-3">
      {/* Payment issues banner */}
      <Link href="/support">
        <button className="w-full flex items-center justify-between px-3 py-2 bg-primary/10 border border-primary/20 rounded text-xs text-primary hover:bg-primary/15 transition-colors" data-testid="btn-payment-issues">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse flex-shrink-0" />
            <span className="font-mono">payment issues? click here</span>
          </div>
          <ChevronRight className="h-3 w-3 flex-shrink-0" />
        </button>
      </Link>

      {/* Method cards */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => { setMethod("crypto"); setCashappResult(null); }}
          className={`flex flex-col items-center gap-2 py-4 rounded-xl border transition-all ${method === "crypto" ? "border-primary/50 bg-primary/10" : "border-white/8 bg-[#0e0e0e] hover:border-white/15"}`}
          data-testid="btn-method-crypto"
        >
          <div className={`w-9 h-9 rounded-full flex items-center justify-center ${method === "crypto" ? "bg-primary" : "bg-white/10"}`}>
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
          <>
            <div className="space-y-1">
              <label className="text-[9px] text-white/30 uppercase tracking-widest font-mono">COIN</label>
              <Select value={coin} onValueChange={(v) => { setCoin(v); setNetwork(""); }}>
                <SelectTrigger className="bg-[#0e0e0e] border-white/8 text-white/60 h-9 text-xs font-mono" data-testid="select-coin">
                  <SelectValue placeholder="select coin..." />
                </SelectTrigger>
                <SelectContent className="bg-[#111] border-white/10 text-white text-xs">
                  {COINS.map(c => <SelectItem key={c} value={c} className="text-xs font-mono">{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[9px] text-white/30 uppercase tracking-widest font-mono">NETWORK</label>
              <Select value={network} onValueChange={setNetwork} disabled={!coin}>
                <SelectTrigger className="bg-[#0e0e0e] border-white/8 text-white/60 h-9 text-xs font-mono" data-testid="select-network">
                  <SelectValue placeholder="select network..." />
                </SelectTrigger>
                <SelectContent className="bg-[#111] border-white/10 text-white text-xs">
                  {(NETWORKS_MAP[coin] ?? []).map(n => <SelectItem key={n} value={n} className="text-xs font-mono">{n}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {method === "cashapp" && (
          <div className="px-3 py-2.5 bg-[#0e0e0e] border border-white/8 rounded text-xs text-white/40 font-mono leading-relaxed">
            send exact amount via cashapp · 15% processing fee applies
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

      {/* Deposit History */}
      {depositHistory.length > 0 && (
        <div className="space-y-1.5 pt-2">
          <p className="text-[9px] text-white/20 uppercase tracking-widest font-mono">History</p>
          <div className="space-y-1">
            {depositHistory.slice(0, 8).map((t: any) => (
              <div key={t.id} className="flex items-center justify-between px-2.5 py-1.5 bg-[#0e0e0e] border border-white/5 rounded text-xs font-mono">
                <span className="text-white/40">{new Date(t.createdAt).toLocaleDateString()}</span>
                <span className="text-green-400">+${(t.amount / 100).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
