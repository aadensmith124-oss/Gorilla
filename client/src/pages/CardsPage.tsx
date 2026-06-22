import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Search, ShoppingCart, Filter, X, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";

function extractBin(cardNumber: string): string {
  return (cardNumber ?? "").replace(/\D/g, "").substring(0, 6);
}

function extractZip(extras: string): string {
  if (!extras) return "";
  const parts = extras.split(/[|\t]/);
  for (let i = 3; i < parts.length; i++) {
    const t = parts[i].trim();
    if (/^\d{5}(-\d{4})?$/.test(t)) return t.substring(0, 5);
  }
  return "";
}

function extractState(extras: string): string {
  if (!extras) return "";
  const parts = extras.split(/[|\t]/);
  for (let i = 3; i < parts.length; i++) {
    const t = parts[i].trim();
    if (/^[A-Z]{2}$/.test(t) && t !== "US" && t !== "UK" && t !== "CA") return t;
  }
  return "";
}

function hasBilling(extras: string): boolean {
  return (extras ?? "").split(/[|\t]/).length >= 5;
}

function formatCardType(binData: any): string {
  if (!binData) return "";
  return [binData.type?.toUpperCase(), binData.brand?.toUpperCase() || binData.scheme?.toUpperCase()]
    .filter(Boolean).join(" ");
}

function CardRow({ card, inCart, onToggleCart }: { card: any; inCart: boolean; onToggleCart: (c: any) => void }) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const bin = extractBin(card.cardNumber);
  const zip = extractZip(card.extras ?? "");
  const state = extractState(card.extras ?? "");
  const billing = hasBilling(card.extras ?? "");
  const cardType = formatCardType(card.binData);
  const countryCode = card.binData?.countryCode ?? card.country ?? "";
  const baseName = card.baseName ?? null;

  const purchaseMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/cards/${card.id}/purchase`, {});
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.message || "Purchase failed"); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cards"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({ title: "Purchase complete", description: "Card delivered to your orders" });
      setLocation("/orders");
    },
    onError: (e: Error) => toast({ title: "Purchase failed", description: e.message, variant: "destructive" }),
  });

  return (
    <div className={`border rounded-lg mb-2 overflow-hidden transition-colors ${inCart ? "border-green-600/40 bg-[#0a140a]" : "border-white/6 bg-[#0d0d0d]"}`}>
      <div className="px-4 py-3 space-y-1.5">
        {/* Row 1: Base name + billing + price */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {baseName ? (
              <span className="text-xs font-bold text-primary/90 font-mono truncate">{baseName}</span>
            ) : (
              <span className="text-xs font-bold text-white/30 font-mono">NO BASE</span>
            )}
            {billing && (
              <span className="text-[10px] font-bold text-green-400 font-mono shrink-0">Y</span>
            )}
          </div>
          <span className="text-sm font-mono font-bold text-white shrink-0">${(card.price / 100).toFixed(2)}</span>
        </div>

        {/* Row 2: Card type */}
        {cardType && (
          <p className="text-[11px] text-white/40 font-mono uppercase">{cardType}</p>
        )}

        {/* Row 3: BIN + Unknown + ZIP + country */}
        <div className="flex items-center gap-2 font-mono text-[11px] flex-wrap">
          {bin && (
            <span className="border border-white/15 px-1.5 py-0.5 rounded text-white/60 text-[11px]">{bin}</span>
          )}
          <span className="text-white/30">Unknown</span>
          {state && <span className="text-white/30">{state}</span>}
          {zip && <span className="text-white/30">ZIP {zip}</span>}
          {countryCode && <span className="text-white/30">{countryCode}</span>}
        </div>

        {/* Row 4: Buttons */}
        <div className="flex gap-1.5 pt-0.5">
          <button
            onClick={() => onToggleCart(card)}
            className={`flex items-center gap-1.5 border rounded text-xs font-bold py-2 px-3 transition-all ${
              inCart
                ? "border-green-600/60 text-green-400 bg-green-900/20"
                : "border-white/10 text-white/50 hover:border-white/20 hover:text-white"
            }`}
            data-testid={`btn-cart-card-${card.id}`}
          >
            <ShoppingCart className="h-3 w-3" />
            {inCart ? "added" : "add"}
          </button>
          <button
            onClick={() => purchaseMutation.mutate()}
            disabled={purchaseMutation.isPending}
            className="flex-1 border border-primary/50 bg-primary/8 text-primary rounded text-xs font-bold py-2 transition-all hover:bg-primary/15 disabled:opacity-50 flex items-center justify-center gap-1.5"
            data-testid={`btn-buy-card-${card.id}`}
          >
            {purchaseMutation.isPending
              ? <Loader2 className="h-3 w-3 animate-spin" />
              : `Purchase ($${(card.price / 100).toFixed(2)})`
            }
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CardsPage() {
  const [search, setSearch] = useState("");
  const [selectedBase, setSelectedBase] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [cartCardIds, setCartCardIds] = useState<Set<number>>(new Set());
  const [cartPurchasing, setCartPurchasing] = useState<{ current: number; total: number; done: boolean } | null>(null);

  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: bases } = useQuery<any[]>({
    queryKey: ["/api/card-bases"],
    refetchInterval: 30000,
  });

  const { data: cards, isLoading } = useQuery<any[]>({
    queryKey: ["/api/cards", selectedBase],
    queryFn: async () => {
      const url = selectedBase ? `/api/cards?baseId=${selectedBase}` : "/api/cards";
      const res = await fetch(url, { credentials: "include" });
      return res.json();
    },
    refetchInterval: 20000,
  });

  const filteredCards = useMemo(() => {
    if (!cards) return [];
    return cards.filter((card: any) => {
      const q = search.toLowerCase();
      const matchSearch = !search
        || extractBin(card.cardNumber).includes(q)
        || (card.baseName ?? "").toLowerCase().includes(q)
        || (card.binData?.scheme ?? "").toLowerCase().includes(q)
        || (card.binData?.type ?? "").toLowerCase().includes(q)
        || extractZip(card.extras ?? "").includes(search);
      const cardPrice = card.price / 100;
      const matchMin = !priceMin || cardPrice >= parseFloat(priceMin);
      const matchMax = !priceMax || cardPrice <= parseFloat(priceMax);
      return matchSearch && matchMin && matchMax;
    });
  }, [cards, search, priceMin, priceMax]);

  const cartCards = useMemo(() => (cards ?? []).filter((c: any) => cartCardIds.has(c.id)), [cards, cartCardIds]);
  const cartTotal = cartCards.reduce((s: number, c: any) => s + c.price, 0);

  const toggleCart = (card: any) => {
    setCartCardIds(prev => {
      const next = new Set(prev);
      if (next.has(card.id)) next.delete(card.id); else next.add(card.id);
      return next;
    });
  };

  const purchaseCart = async () => {
    if (cartCards.length === 0) return;
    setCartPurchasing({ current: 0, total: cartCards.length, done: false });
    let ok = 0;
    for (let i = 0; i < cartCards.length; i++) {
      setCartPurchasing({ current: i + 1, total: cartCards.length, done: false });
      try {
        const res = await apiRequest("POST", `/api/cards/${cartCards[i].id}/purchase`, {});
        if (!res.ok) { const err = await res.json().catch(() => ({})); toast({ title: `Card ${i + 1} failed`, description: err.message, variant: "destructive" }); }
        else ok++;
      } catch { toast({ title: `Card ${i + 1} failed`, variant: "destructive" }); }
    }
    setCartPurchasing({ current: cartCards.length, total: cartCards.length, done: true });
    queryClient.invalidateQueries({ queryKey: ["/api/cards"] });
    queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
    setCartCardIds(new Set());
    setTimeout(() => {
      setCartPurchasing(null);
      if (ok > 0) { toast({ title: `${ok} card${ok > 1 ? "s" : ""} purchased` }); setLocation("/orders"); }
    }, 800);
  };

  const activeFilters = (priceMin ? 1 : 0) + (priceMax ? 1 : 0);

  return (
    <div className="max-w-2xl mx-auto px-3 py-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white">Cards</h1>
          <p className="text-[10px] text-white/30 font-mono">{filteredCards.length} available</p>
        </div>
        <button
          onClick={purchaseCart}
          disabled={cartCardIds.size === 0 || !!cartPurchasing}
          className="flex items-center gap-1.5 border border-white/8 bg-[#111] rounded px-3 py-1.5 text-xs text-white/60 hover:text-white hover:border-white/15 transition-all disabled:opacity-50"
          data-testid="btn-cart"
        >
          {cartPurchasing && !cartPurchasing.done ? <Loader2 className="h-3 w-3 animate-spin" /> : <ShoppingCart className="h-3 w-3" />}
          cart ({cartCardIds.size})
        </button>
      </div>

      {/* Cart bar */}
      {cartCardIds.size > 0 && (
        <div className="border border-green-600/30 bg-green-950/20 rounded px-3 py-2 flex items-center justify-between">
          <span className="text-xs text-green-400">{cartCardIds.size} selected · ${(cartTotal / 100).toFixed(2)}</span>
          <button onClick={purchaseCart} disabled={!!cartPurchasing} className="text-[11px] text-green-400 font-bold hover:text-green-300 disabled:opacity-50">checkout →</button>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
        <input
          type="text"
          placeholder="Search cards, base name, BIN, brand..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-[#111] border border-white/5 rounded py-2.5 pl-9 pr-3 text-xs text-white placeholder:text-white/25 outline-none focus:border-white/10 transition-colors"
          data-testid="input-search"
        />
      </div>

      {/* Base filter tabs — horizontal scroll */}
      {bases && bases.length > 0 && (
        <div className="overflow-x-auto scrollbar-hide -mx-3 px-3">
          <div className="flex gap-2 pb-1" style={{ width: "max-content" }}>
            <button
              onClick={() => setSelectedBase(null)}
              className={`shrink-0 text-xs px-3 py-1.5 rounded-lg border font-mono transition-all ${
                selectedBase === null
                  ? "border-primary/60 bg-primary/10 text-primary font-bold"
                  : "border-white/10 text-white/45 hover:border-white/20 hover:text-white"
              }`}
              data-testid="btn-base-all"
            >
              all bases
            </button>
            {bases.map((b: any) => (
              <button
                key={b.id}
                onClick={() => setSelectedBase(b.id)}
                className={`shrink-0 text-xs px-3 py-1.5 rounded-lg border font-mono transition-all ${
                  selectedBase === b.id
                    ? "border-primary/60 bg-primary/10 text-primary font-bold"
                    : "border-white/10 text-white/45 hover:border-white/20 hover:text-white"
                }`}
                data-testid={`btn-base-${b.id}`}
              >
                {b.name} ({b.count})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filters toggle */}
      <button
        onClick={() => setShowFilters(!showFilters)}
        className={`w-full border rounded py-2 text-xs transition-all flex items-center justify-center gap-2 ${
          showFilters || activeFilters > 0 ? "border-primary/40 text-primary bg-primary/5" : "border-white/8 text-white/50 bg-[#111] hover:text-white hover:border-white/15"
        }`}
        data-testid="btn-filters"
      >
        <Filter className="h-3 w-3" />
        filters{activeFilters > 0 ? ` (${activeFilters})` : ""}
      </button>

      {showFilters && (
        <div className="border border-white/8 bg-[#111] rounded p-3 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-white/40 uppercase tracking-widest">Price Range</p>
            <button onClick={() => { setPriceMin(""); setPriceMax(""); setShowFilters(false); }} className="text-[10px] text-white/30 hover:text-white flex items-center gap-1">
              <X className="h-3 w-3" /> clear
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[9px] text-white/30 uppercase tracking-widest">Min ($)</label>
              <input type="number" step="0.01" placeholder="0.00" value={priceMin} onChange={e => setPriceMin(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded py-1.5 px-2 text-xs text-white placeholder:text-white/20 outline-none" data-testid="input-price-min" />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] text-white/30 uppercase tracking-widest">Max ($)</label>
              <input type="number" step="0.01" placeholder="100.00" value={priceMax} onChange={e => setPriceMax(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded py-1.5 px-2 text-xs text-white placeholder:text-white/20 outline-none" data-testid="input-price-max" />
            </div>
          </div>
        </div>
      )}

      {/* Cards */}
      <div>
        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : filteredCards.length === 0 ? (
          <div className="py-16 text-center text-white/25 text-xs font-mono">No cards available</div>
        ) : (
          filteredCards.map((card: any) => (
            <CardRow key={card.id} card={card} inCart={cartCardIds.has(card.id)} onToggleCart={toggleCart} />
          ))
        )}
      </div>
    </div>
  );
}
