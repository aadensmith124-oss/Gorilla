import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { ChevronRight, Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "wouter";

const COINS = ["Bitcoin (BTC)", "Ethereum (ETH)", "Litecoin (LTC)", "USDT (TRC20)", "USDT (ERC20)", "Monero (XMR)"];
const NETWORKS_MAP: Record<string, string[]> = {
  "Bitcoin (BTC)": ["Bitcoin"],
  "Ethereum (ETH)": ["ERC20"],
  "Litecoin (LTC)": ["Litecoin"],
  "USDT (TRC20)": ["TRC20"],
  "USDT (ERC20)": ["ERC20"],
  "Monero (XMR)": ["Monero"],
};

type Method = "crypto" | "chime";

export default function DepositPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [method, setMethod] = useState<Method>("crypto");
  const [coin, setCoin] = useState("");
  const [network, setNetwork] = useState("");
  const [amount, setAmount] = useState(20);

  const { data: transactions } = useQuery<any[]>({
    queryKey: ["/api/wallet/transactions"],
    enabled: !!user,
  });

  const fee = method === "crypto" ? 0.05 : 0.15;
  const youSend = (amount * (1 + fee)).toFixed(2);
  const minAmount = 20;
  const isPending = false;

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

  const chimeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/orders/cashapp", {
        amount: Math.round(amount * 100),
        note: `CHIME DEPOSIT - ${user?.username}`,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Chime request submitted" });
      qc.invalidateQueries({ queryKey: ["/api/wallet/transactions"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const isLoading = cryptoMutation.isPending || chimeMutation.isPending;

  const handleCreate = () => {
    if (method === "crypto") {
      if (!coin || !network) return toast({ title: "Select coin and network", variant: "destructive" });
      cryptoMutation.mutate();
    } else {
      chimeMutation.mutate();
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

      {/* Method tabs */}
      <div className="flex gap-1.5">
        {(["crypto", "chime"] as Method[]).map(m => (
          <button
            key={m}
            onClick={() => setMethod(m)}
            className={`px-3 py-1 rounded text-xs font-mono border transition-all ${method === m ? "bg-white/10 text-white border-white/20" : "bg-transparent text-white/30 border-white/10 hover:text-white/50"}`}
            data-testid={`btn-method-${m}`}
          >
            {m === "crypto" ? "Crypto" : "Chime"}
          </button>
        ))}
        <span className="ml-auto text-[10px] text-white/20 self-center font-mono">buy crypto →</span>
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

        {method === "chime" && (
          <div className="px-3 py-2.5 bg-[#0e0e0e] border border-white/8 rounded text-xs text-white/40 font-mono leading-relaxed">
            send any amount — you'll be credited the full usd value received, no fee
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

        <button
          onClick={handleCreate}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 py-2 border border-white/10 rounded text-xs text-white/50 font-mono hover:text-white hover:border-white/20 transition-all disabled:opacity-40"
          data-testid="btn-create-invoice"
        >
          {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : "create deposit invoice →"}
        </button>
      </div>

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
