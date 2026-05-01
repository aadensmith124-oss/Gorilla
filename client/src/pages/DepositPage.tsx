import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Minus, Plus, ChevronRight, AlertCircle } from "lucide-react";
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
      if (data.checkoutUrl) {
        window.open(data.checkoutUrl, "_blank");
      } else {
        toast({ title: "Invoice created", description: "Complete your payment in the opened window." });
      }
      qc.invalidateQueries({ queryKey: ["/api/wallet/transactions"] });
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const chimeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/orders/cashapp", {
        amount: Math.round(amount * 100),
        note: `CHIME DEPOSIT - ${user?.username}`,
      });
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Chime request submitted", description: "Admin will verify and credit your balance." });
      qc.invalidateQueries({ queryKey: ["/api/wallet/transactions"] });
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const handleCreateInvoice = () => {
    if (method === "crypto") {
      if (!coin || !network) return toast({ title: "Select coin and network", variant: "destructive" });
      cryptoMutation.mutate();
    } else {
      chimeMutation.mutate();
    }
  };

  const depositHistory = transactions?.filter((t: any) => t.type === "deposit") ?? [];

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      {/* Payment issues banner */}
      <button className="w-full flex items-center justify-between px-4 py-3 bg-red-950/60 border border-red-800/50 rounded text-sm text-red-400 hover:bg-red-950/80 transition-colors">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          <span>payment issues? click here</span>
        </div>
        <ChevronRight className="h-4 w-4" />
      </button>

      {/* Method tabs */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setMethod("crypto")}
            className={`px-4 py-1.5 rounded text-sm font-medium border transition-all ${method === "crypto" ? "bg-white text-black border-white" : "bg-transparent text-white/50 border-white/10 hover:border-white/20"}`}
            data-testid="btn-method-crypto"
          >
            Crypto 5%
          </button>
          <button
            onClick={() => setMethod("chime")}
            className={`px-4 py-1.5 rounded text-sm font-medium border transition-all ${method === "chime" ? "bg-white text-black border-white" : "bg-transparent text-white/50 border-white/10 hover:border-white/20"}`}
            data-testid="btn-method-chime"
          >
            Chime 15%
          </button>
        </div>
        <span className="text-xs text-white/30 hover:text-white/50 cursor-pointer transition-colors">buy crypto →</span>
      </div>

      {/* Form */}
      <div className="space-y-3">
        {method === "crypto" && (
          <>
            <div className="space-y-1">
              <label className="text-[10px] text-white/40 uppercase tracking-widest font-medium">COIN</label>
              <Select value={coin} onValueChange={(v) => { setCoin(v); setNetwork(""); }}>
                <SelectTrigger className="bg-[#111] border-white/10 text-white/70 h-11" data-testid="select-coin">
                  <SelectValue placeholder="select coin..." />
                </SelectTrigger>
                <SelectContent className="bg-[#111] border-white/10 text-white">
                  {COINS.map(c => (
                    <SelectItem key={c} value={c} className="hover:bg-white/5">{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-white/40 uppercase tracking-widest font-medium">NETWORK</label>
              <Select value={network} onValueChange={setNetwork} disabled={!coin}>
                <SelectTrigger className="bg-[#111] border-white/10 text-white/70 h-11" data-testid="select-network">
                  <SelectValue placeholder="select network..." />
                </SelectTrigger>
                <SelectContent className="bg-[#111] border-white/10 text-white">
                  {(NETWORKS_MAP[coin] ?? []).map(n => (
                    <SelectItem key={n} value={n} className="hover:bg-white/5">{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        <div className="space-y-1">
          <label className="text-[10px] text-white/40 uppercase tracking-widest font-medium">AMOUNT TO RECEIVE (USD)</label>
          <div className="flex items-center border border-white/10 rounded bg-[#111] overflow-hidden">
            <button
              onClick={() => setAmount(Math.max(minAmount, amount - 5))}
              className="px-4 py-3 text-white/50 hover:text-white hover:bg-white/5 transition-colors border-r border-white/10"
              data-testid="btn-amount-minus"
            >
              <Minus className="h-4 w-4" />
            </button>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Math.max(minAmount, Number(e.target.value)))}
              className="flex-1 bg-transparent text-center text-2xl font-mono text-white outline-none py-3"
              data-testid="input-amount"
            />
            <button
              onClick={() => setAmount(amount + 5)}
              className="px-4 py-3 text-white/50 hover:text-white hover:bg-white/5 transition-colors border-l border-white/10"
              data-testid="btn-amount-plus"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <p className="text-[10px] text-white/30">min ${minAmount}.00</p>
        </div>

        <div className="flex items-center justify-between px-4 py-3 bg-[#111] border border-white/10 rounded text-sm">
          <span className="text-white/50">you send ({Math.round(fee * 100)}% fee)</span>
          <span className="font-mono text-white">${youSend}</span>
        </div>

        <button
          onClick={handleCreateInvoice}
          disabled={cryptoMutation.isPending || chimeMutation.isPending}
          className="w-full flex items-center justify-center gap-2 py-3 border border-white/10 rounded text-sm text-white/60 hover:text-white hover:border-white/20 transition-all"
          data-testid="btn-create-invoice"
        >
          create deposit invoice →
        </button>
      </div>

      {/* Deposit History */}
      {depositHistory.length > 0 && (
        <div className="space-y-2 pt-2">
          <p className="text-[10px] text-white/30 uppercase tracking-widest font-medium">Deposit History</p>
          <div className="space-y-1">
            {depositHistory.slice(0, 10).map((t: any) => (
              <div key={t.id} className="flex items-center justify-between px-3 py-2 bg-[#111] border border-white/5 rounded text-sm">
                <div className="flex flex-col">
                  <span className="text-white/70 capitalize">{t.paymentMethod ?? t.type}</span>
                  <span className="text-[10px] text-white/30">{new Date(t.createdAt).toLocaleDateString()}</span>
                </div>
                <span className="font-mono text-green-400">+${(t.amount / 100).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
