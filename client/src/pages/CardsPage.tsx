import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Search, ShoppingCart, SlidersHorizontal, X, Loader2 } from "lucide-react";
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
    if (/^\d{5}(-\d{4})?$/.test(t)) return t;
  }
  return "";
}

function extractCity(extras: string): string {
  if (!extras) return "";
  const parts = extras.split(/[|\t]/);
  const city = parts[5]?.trim() ?? "";
  if (city && city.length > 1 && !/^\d{5}/.test(city)) return city;
  return "";
}

function extractState(extras: string): string {
  if (!extras) return "";
  const parts = extras.split(/[|\t]/);
  const state = parts[6]?.trim() ?? "";
  if (/^[A-Z]{2}$/.test(state) && !["US", "UK", "CA", "AU"].includes(state)) return state;
  return "";
}

function hasBilling(extras: string): boolean {
  return (extras ?? "").split(/[|\t]/).length >= 5;
}

function formatCardType(binData: any): string {
  if (!binData) return "";
  return [binData.type, binData.scheme, binData.brand]
    .filter(Boolean)
    .map((s: string) => s.toUpperCase())
    .join(" ");
}

function CardRow({ card, inCart, onToggleCart }: { card: any; inCart: boolean; onToggleCart: (c: any) => void }) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const bin = extractBin(card.cardNumber);
  const zip = extractZip(card.extras ?? "");
  const city = extractCity(card.extras ?? "");
  const state = extractState(card.extras ?? "");
  const billing = hasBilling(card.extras ?? "");
  const cardType = formatCardType(card.binData);
  const bank = card.binData?.bank || "Unknown";
  const countryCode = card.binData?.countryCode ?? "US";
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
    <div className={`border mb-2 overflow-hidden transition-colors ${inCart ? "border-green-600/40 bg-[#060d06]" : "border-white/8 bg-[#0a0a0a]"}`}>
      <div className="px-3 py-3 space-y-1.5">
        {/* Row 1: Base name + billing + price */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            {baseName && (
              <span className="text-xs font-bold text-primary font-mono truncate">{baseName}</span>
            )}
            {billing && (
              <span className="text-xs font-bold text-green-400 font-mono shrink-0">Y</span>
            )}
          </div>
          <span className="text-sm font-mono font-bold text-white shrink-0">${(card.price / 100).toFixed(2)}</span>
        </div>

        {/* Row 2: Card type */}
        {cardType && (
          <p className="text-[11px] text-white/40 font-mono">{cardType}</p>
        )}

        {/* Row 3: BIN + bank + city + state + ZIP + country — wraps naturally */}
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 font-mono text-[11px] text-white/40">
          {bin && (
            <span className="border border-white/20 px-1.5 py-0.5 rounded-sm text-white/60 shrink-0">{bin}</span>
          )}
          <span>{bank}</span>
          {city && <span>{city}</span>}
          {state && <span>{state}</span>}
          {zip && <span>ZIP {zip}</span>}
          {countryCode && <span>{countryCode.toUpperCase()}</span>}
        </div>

        {/* Row 4: Buttons */}
        <div className="flex gap-1.5 pt-0.5">
          <button
            onClick={() => onToggleCart(card)}
            className={`flex items-center gap-1.5 border rounded-sm text-xs font-bold py-1.5 px-3 transition-all ${
              inCart
                ? "border-green-600/60 text-green-400 bg-green-900/15"
                : "border-white/15 text-white/50 hover:border-white/25 hover:text-white"
            }`}
            data-testid={`btn-cart-card-${card.id}`}
          >
            <ShoppingCart className="h-3 w-3" />
            {inCart ? "added" : "add"}
          </button>
          <button
            onClick={() => purchaseMutation.mutate()}
            disabled={purchaseMutation.isPending}
            className="flex-1 border border-green-600/50 text-green-400 rounded-sm text-xs font-bold py-1.5 transition-all hover:bg-green-900/15 disabled:opacity-50 flex items-center justify-center gap-1.5"
            data-testid={`btn-buy-card-${card.id}`}
          >
            {purchaseMutation.isPending
              ? <Loader2 className="h-3 w-3 animate-spin" />
              : `Buy $${(card.price / 100).toFixed(2)}`
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
        || (card.binData?.brand ?? "").toLowerCase().includes(q)
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

      {/* Search + Filters on same row */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
          <input
            type="text"
            placeholder="Search cards, base name, BIN, brand..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-[#111] border border-white/8 rounded py-2.5 pl-9 pr-3 text-xs text-white placeholder:text-white/25 outline-none focus:border-white/12 transition-colors"
            data-testid="input-search"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-1.5 border rounded px-3 py-2 text-xs font-mono shrink-0 transition-all ${
            showFilters || activeFilters > 0
              ? "border-primary/50 text-primary bg-primary/5"
              : "border-white/10 text-white/40 hover:text-white hover:border-white/20 bg-[#111]"
          }`}
          data-testid="btn-filters"
        >
          <SlidersHorizontal className="h-3 w-3" />
          filters{activeFilters > 0 ? ` (${activeFilters})` : ""}
        </button>
      </div>

      {/* Filters panel */}
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

      {/* Base filter tabs — flex-wrap, default "all bases" selected */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedBase(null)}
          className={`text-xs px-3 py-1.5 border font-mono transition-all ${
            selectedBase === null
              ? "border-primary text-primary font-bold"
              : "border-white/12 text-white/40 hover:border-white/20 hover:text-white"
          }`}
          data-testid="btn-base-all"
        >
          all bases
        </button>
        {(bases ?? []).map((b: any) => (
          <button
            key={b.id}
            onClick={() => setSelectedBase(b.id)}
            className={`text-xs px-3 py-1.5 border font-mono transition-all ${
              selectedBase === b.id
                ? "border-primary text-primary font-bold"
                : "border-white/12 text-white/40 hover:border-white/20 hover:text-white"
            }`}
            data-testid={`btn-base-${b.id}`}
          >
            {b.name} ({b.count})
          </button>
        ))}
      </div>

      {/* Add selected bar — always visible */}
      <button
        onClick={purchaseCart}
        disabled={cartCardIds.size === 0 || !!cartPurchasing}
        className="w-full border border-white/10 bg-[#0d0d0d] rounded py-2 text-xs text-white/50 font-mono flex items-center justify-center gap-2 hover:border-white/20 hover:text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        data-testid="btn-add-selected"
      >
        {cartPurchasing && !cartPurchasing.done ? (
          <>
            <Loader2 className="h-3 w-3 animate-spin" />
            purchasing {cartPurchasing.current}/{cartPurchasing.total}...
          </>
        ) : (
          <>
            <ShoppingCart className="h-3 w-3" />
            add selected ({cartCardIds.size})
          </>
        )}
      </button>

      {/* Cart total bar — shows when items selected */}
      {cartCardIds.size > 0 && (
        <div className="flex items-center justify-between px-1">
          <span className="text-xs text-white/40 font-mono">{cartCardIds.size} selected · ${(cartTotal / 100).toFixed(2)}</span>
          <button onClick={() => setCartCardIds(new Set())} className="text-[10px] text-white/25 hover:text-white/50 font-mono transition-colors">clear</button>
        </div>
      )}

      {/* Cards list */}
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
