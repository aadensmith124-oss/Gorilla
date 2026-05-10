import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Loader2, Copy, Check, CreditCard, Package, ReceiptText, Building2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

type Tab = "overview" | "cards" | "ach" | "logs" | "transactions";

const SELLER_BADGES: Record<string, string> = {
  bronze: "🍟",
  fresh: "🍺",
  top: "🔥",
};

export default function SellerDashboardPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [tab, setTab] = useState<Tab>("overview");

  const { data: sellerStatus, isLoading } = useQuery<{
    isSeller: boolean;
    sellerBalance: number;
    totalEarned: number;
    application?: any;
  }>({ queryKey: ["/api/seller/status"], enabled: !!user });

  const { data: permissions } = useQuery<{ cards: boolean; ach: boolean; logs: boolean }>({
    queryKey: ["/api/seller/permissions"],
    enabled: !!user,
  });

  if (isLoading) return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;
  if (!sellerStatus?.isSeller) { setLocation("/become-seller"); return null; }

  const sellerCode = sellerStatus.application?.sellerCode ?? "—";
  const sellerType = (sellerStatus as any).sellerType ?? "bronze";
  const sellerDisplayName = (sellerStatus as any).sellerDisplayName?.trim() || user?.username?.toUpperCase() || "SELLER";
  const badge = SELLER_BADGES[sellerType] ?? "🍟";
  const label = `${badge} ${sellerDisplayName} ${badge}`;

  const allowedTabs: Tab[] = ["overview", "transactions"];
  if (permissions?.cards !== false) allowedTabs.push("cards");
  if (permissions?.ach !== false) allowedTabs.push("ach");
  if (permissions?.logs !== false) allowedTabs.push("logs");
  const tabOrder: Tab[] = ["overview", "cards", "ach", "logs", "transactions"];
  const visibleTabs = tabOrder.filter(t => allowedTabs.includes(t));

  return (
    <div className="max-w-xl mx-auto px-3 py-4 space-y-3">
      {/* Header */}
      <div className="bg-[#111] border border-white/5 rounded-xl p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-white">{label}</p>
            <p className="text-[10px] text-white/30 font-mono mt-0.5">Seller Dashboard</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-mono text-white">${(sellerStatus.sellerBalance / 100).toFixed(2)}</p>
            <p className="text-[10px] text-white/30">pending payout</p>
          </div>
        </div>
        <SellerCodeDisplay code={sellerCode} />
      </div>

      {/* Tabs */}
      <div className="flex bg-white/5 rounded-lg p-0.5 gap-0.5 flex-wrap">
        {visibleTabs.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 text-[10px] font-medium py-1.5 rounded transition-colors capitalize ${tab === t ? "bg-white/10 text-white" : "text-white/30 hover:text-white/60"}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "overview" && <OverviewTab sellerStatus={sellerStatus} />}
      {tab === "cards" && permissions?.cards !== false && <AddCardsTab />}
      {tab === "ach" && permissions?.ach !== false && <AddAchTab />}
      {tab === "logs" && permissions?.logs !== false && <AddLogsTab />}
      {tab === "transactions" && <TransactionsTab />}
    </div>
  );
}

function SellerCodeDisplay({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-white/30 uppercase tracking-widest">Your Code</span>
      <span className="font-mono text-xs text-white/80 bg-black/40 border border-white/10 px-2 py-0.5 rounded">{code}</span>
      <button onClick={copy} className="text-white/30 hover:text-primary transition-colors" data-testid="btn-copy-code">
        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      </button>
    </div>
  );
}

function OverviewTab({ sellerStatus }: { sellerStatus: any }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <div className="bg-[#111] border border-white/5 rounded-xl p-3">
        <p className="text-[9px] text-white/30 uppercase tracking-widest">Pending Payout</p>
        <p className="text-xl font-mono font-bold text-white mt-1">${(sellerStatus.sellerBalance / 100).toFixed(2)}</p>
        <p className="text-[10px] text-white/20 mt-0.5">Admin pays out manually</p>
      </div>
      <div className="bg-[#111] border border-white/5 rounded-xl p-3">
        <p className="text-[9px] text-white/30 uppercase tracking-widest">Total Earned</p>
        <p className="text-xl font-mono font-bold text-white mt-1">${(sellerStatus.totalEarned / 100).toFixed(2)}</p>
        <p className="text-[10px] text-white/20 mt-0.5">80% of all sales</p>
      </div>
      <div className="col-span-2 bg-[#111] border border-white/5 rounded-xl p-3">
        <p className="text-[9px] text-white/30 uppercase tracking-widest mb-1">Payout Info</p>
        <p className="text-xs text-white/50 leading-relaxed">
          You earn <span className="text-white font-bold">80%</span> of every sale. Contact <span className="text-primary">@Omzrii</span> on Telegram to request your payout.
        </p>
      </div>
    </div>
  );
}

function BinResult({ bin }: { bin: string }) {
  const { data, isLoading } = useQuery<{ bin: string; bank?: string; scheme?: string; type?: string; country?: string; countryCode?: string }>({
    queryKey: [`/api/bin/${bin}`],
    enabled: bin.length === 6,
    staleTime: 1000 * 60 * 60,
  });
  if (!bin || bin.length < 6) return null;
  if (isLoading) return <p className="text-[9px] text-white/30 font-mono">looking up BIN...</p>;
  return (
    <div className="flex items-center gap-2 font-mono text-[9px] text-white/40">
      <span className="border border-white/20 px-1.5 py-0.5 rounded text-white/60">{bin}</span>
      {data?.bank && <span>{data.bank}</span>}
      {data?.country && <span>{data.country}</span>}
    </div>
  );
}

function AddCardsTab() {
  const { toast } = useToast();
  const [cardNumber, setCardNumber] = useState("");
  const [fullItem, setFullItem] = useState("");
  const [price, setPrice] = useState("");
  const { data: myCards, isLoading } = useQuery<any[]>({ queryKey: ["/api/seller/cards"] });

  const bin = cardNumber.replace(/\D/g, "").substring(0, 6);

  const addMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/seller/cards", { cardNumber: cardNumber.trim(), extras: fullItem.trim(), price });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Failed"); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/seller/cards"] });
      setCardNumber(""); setFullItem(""); setPrice("");
      toast({ title: "Card added" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-3">
      <div className="bg-[#111] border border-white/5 rounded-xl p-3 space-y-2.5">
        <p className="text-[9px] text-white/30 uppercase tracking-widest">Add Card</p>

        <div className="space-y-1">
          <label className="text-[9px] text-white/30 uppercase tracking-widest">Card Number</label>
          <Input value={cardNumber} onChange={e => setCardNumber(e.target.value)} placeholder="4111111111111111" className="h-9 text-xs bg-black/50 border-white/10 font-mono" data-testid="input-card-number" />
          <BinResult bin={bin} />
        </div>

        <div className="space-y-1">
          <label className="text-[9px] text-white/30 uppercase tracking-widest">Full Item</label>
          <textarea
            value={fullItem}
            onChange={e => setFullItem(e.target.value)}
            placeholder={"4111111111111111|12/25|123|John Doe|123 Main St"}
            rows={3}
            className="w-full bg-black/50 border border-white/10 rounded text-xs text-white font-mono p-2 outline-none focus:border-white/20 resize-none placeholder:text-white/20"
            data-testid="input-full-item"
          />
          <p className="text-[9px] text-white/20">only shown to buyer after purchase</p>
        </div>

        <div className="space-y-1">
          <label className="text-[9px] text-white/30 uppercase tracking-widest">Price ($)</label>
          <Input value={price} onChange={e => setPrice(e.target.value)} placeholder="5.00" type="number" step="0.01" className="h-9 text-xs bg-black/50 border-white/10" data-testid="input-card-price" />
        </div>

        <button
          onClick={() => addMutation.mutate()}
          disabled={addMutation.isPending || !cardNumber || !price}
          className="w-full h-8 bg-primary/90 hover:bg-primary text-white rounded text-xs font-bold transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5"
          data-testid="btn-add-card"
        >
          {addMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <><CreditCard className="h-3 w-3" />Add Card</>}
        </button>
      </div>

      <p className="text-[9px] text-white/20 uppercase tracking-widest">{(myCards ?? []).length} cards uploaded</p>
      {isLoading ? <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-primary" /></div> : (
        <div className="space-y-1">
          {(myCards ?? []).map((c: any) => {
            const cBin = (c.card_number || c.cardNumber || "").replace(/\D/g, "").substring(0, 6);
            return (
              <div key={c.id} className="bg-[#111] border border-white/5 rounded px-3 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-mono border border-white/15 px-1.5 py-0.5 rounded text-white/50">{cBin}</span>
                  {c.country && <span className="text-[9px] text-white/25">{c.country}</span>}
                </div>
                <div className="text-right">
                  <p className="text-xs font-mono text-white">${((c.price || 0) / 100).toFixed(2)}</p>
                  <p className={`text-[9px] ${c.is_sold || c.isSold ? "text-green-400" : "text-white/20"}`}>{c.is_sold || c.isSold ? "sold" : "avail"}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AddAchTab() {
  const { toast } = useToast();
  const [bankName, setBankName] = useState("");
  const [balance, setBalance] = useState("");
  const [fullItem, setFullItem] = useState("");
  const [price, setPrice] = useState("");
  const { data: myAchs, isLoading } = useQuery<any[]>({ queryKey: ["/api/seller/ach"] });

  const addMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/seller/ach", { bankName, balance, fullItem, price });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message || "Failed"); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/seller/ach"] });
      setBankName(""); setBalance(""); setFullItem(""); setPrice("");
      toast({ title: "ACH added" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-3">
      <div className="bg-[#111] border border-white/5 rounded-xl p-3 space-y-2.5">
        <p className="text-[9px] text-white/30 uppercase tracking-widest">Add ACH</p>

        <div className="space-y-1">
          <label className="text-[9px] text-white/30 uppercase tracking-widest">Bank</label>
          <Input value={bankName} onChange={e => setBankName(e.target.value)} placeholder="Chase, Wells Fargo..." className="h-9 text-xs bg-black/50 border-white/10" data-testid="input-ach-bank" />
        </div>

        <div className="space-y-1">
          <label className="text-[9px] text-white/30 uppercase tracking-widest">Balance</label>
          <Input value={balance} onChange={e => setBalance(e.target.value)} placeholder="$5,000 - $10,000" className="h-9 text-xs bg-black/50 border-white/10 font-mono" data-testid="input-ach-balance" />
        </div>

        <div className="space-y-1">
          <label className="text-[9px] text-white/30 uppercase tracking-widest">Full Item</label>
          <textarea
            value={fullItem}
            onChange={e => setFullItem(e.target.value)}
            placeholder={"routing|account|name|address"}
            rows={3}
            className="w-full bg-black/50 border border-white/10 rounded text-xs text-white font-mono p-2 outline-none focus:border-white/20 resize-none placeholder:text-white/20"
            data-testid="input-ach-full-item"
          />
          <p className="text-[9px] text-white/20">only shown to buyer after purchase</p>
        </div>

        <div className="space-y-1">
          <label className="text-[9px] text-white/30 uppercase tracking-widest">Price ($)</label>
          <Input value={price} onChange={e => setPrice(e.target.value)} placeholder="10.00" type="number" step="0.01" className="h-9 text-xs bg-black/50 border-white/10" data-testid="input-ach-price" />
        </div>

        <button
          onClick={() => addMutation.mutate()}
          disabled={addMutation.isPending || !bankName || !balance || !fullItem || !price}
          className="w-full h-8 bg-primary/90 hover:bg-primary text-white rounded text-xs font-bold transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5"
          data-testid="btn-add-ach"
        >
          {addMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Building2 className="h-3 w-3" />Add ACH</>}
        </button>
      </div>

      <p className="text-[9px] text-white/20 uppercase tracking-widest">{(myAchs ?? []).length} ACH uploaded</p>
      {isLoading ? <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-primary" /></div> : (
        <div className="space-y-1">
          {(myAchs ?? []).map((a: any) => (
            <div key={a.id} className="bg-[#111] border border-white/5 rounded px-3 py-2 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-white">{a.bankName}</p>
                <p className="text-[9px] text-white/30 font-mono">{a.balance}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-mono text-white">${((a.price || 0) / 100).toFixed(2)}</p>
                <p className={`text-[9px] ${a.isSold ? "text-green-400" : "text-white/20"}`}>{a.isSold ? "sold" : "avail"}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AddLogsTab() {
  const { toast } = useToast();
  const [variantId, setVariantId] = useState("");
  const [content, setContent] = useState("");
  const { data: products, isLoading } = useQuery<any[]>({ queryKey: ["/api/seller/products"] });

  const allVariants = (products ?? []).flatMap((p: any) => (p.variants ?? []).map((v: any) => ({ ...v, productName: p.name })));

  const addMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/seller/stock", { variantId: Number(variantId), content });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Failed"); }
      return res.json();
    },
    onSuccess: (data) => {
      setContent("");
      toast({ title: `Added ${data.added} stock items` });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const itemCount = content.split("\n\n").filter(s => s.trim()).length;

  return (
    <div className="space-y-3">
      <div className="bg-[#111] border border-white/5 rounded-xl p-3 space-y-2">
        <p className="text-[9px] text-white/30 uppercase tracking-widest">Add Log Stock</p>
        <div className="space-y-1">
          <label className="text-[9px] text-white/30 uppercase tracking-widest">Select Product Option</label>
          {isLoading ? <div className="text-xs text-white/30">Loading...</div> : (
            <Select value={variantId} onValueChange={setVariantId}>
              <SelectTrigger className="h-8 text-xs bg-black/50 border-white/10" data-testid="select-variant">
                <SelectValue placeholder="Pick a product option..." />
              </SelectTrigger>
              <SelectContent className="bg-[#111] border-white/10 text-white text-xs">
                {allVariants.map((v: any) => (
                  <SelectItem key={v.id} value={String(v.id)} className="text-xs">{v.productName} — {v.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <div className="space-y-1">
          <label className="text-[9px] text-white/30 uppercase tracking-widest">Stock Content (blank line between items)</label>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder={"stock1\nD\n\nstock2\n\nstock3"}
            rows={8}
            className="w-full bg-black/50 border border-white/10 rounded text-xs text-white font-mono p-2 outline-none focus:border-white/20 resize-none"
            data-testid="input-stock-content"
          />
          <p className="text-[9px] text-white/20">{itemCount} item{itemCount !== 1 ? "s" : ""}</p>
        </div>
        <button
          onClick={() => addMutation.mutate()}
          disabled={addMutation.isPending || !variantId || !content.trim()}
          className="w-full h-8 bg-primary/90 hover:bg-primary text-white rounded text-xs font-bold transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5"
          data-testid="btn-add-stock"
        >
          {addMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Package className="h-3 w-3" />Add Stock</>}
        </button>
      </div>
    </div>
  );
}

function TransactionsTab() {
  const { data: txs, isLoading } = useQuery<any[]>({ queryKey: ["/api/seller/transactions"] });

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-4 w-4 animate-spin text-primary" /></div>;

  const list = txs ?? [];
  return (
    <div className="space-y-2">
      <p className="text-[9px] text-white/20 uppercase tracking-widest">{list.length} transactions</p>
      {list.length === 0 ? (
        <div className="py-12 text-center text-white/20 text-xs">No transactions yet</div>
      ) : (
        list.map((t: any) => (
          <div key={t.id} className="bg-[#111] border border-white/5 rounded px-3 py-2 flex items-center justify-between">
            <div>
              <p className="text-xs text-white capitalize">{(t.type || "").replace("_", " ")}</p>
              <p className="text-[9px] text-white/30 font-mono">{new Date(t.created_at || t.createdAt).toLocaleDateString()}</p>
            </div>
            <span className={`text-xs font-mono font-bold ${t.type === "seller_payout" ? "text-yellow-400" : "text-green-400"}`}>
              {t.type === "seller_payout" ? "−" : "+"}${((t.amount || 0) / 100).toFixed(2)}
            </span>
          </div>
        ))
      )}
    </div>
  );
}
