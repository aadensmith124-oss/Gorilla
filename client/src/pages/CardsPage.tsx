import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, ShoppingCart, ChevronDown, ChevronUp, Loader2, Filter, X, Headphones } from "lucide-react";
import { Link, useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";

const SELLER_DEFAULT_LABEL: Record<string, string> = {
  bronze: "🍟 BRONZE SELLER 🍟",
  fresh: "🍺 FRESH SELLER 🍺",
  top: "🔥 TOP SELLER SPECIAL 🔥",
};
const SELLER_BADGE: Record<string, string> = {
  bronze: "🍟",
  fresh: "🍺",
  top: "🔥",
};

function getSellerLabel(card: any): string | null {
  if (!card.userId) return null;
  const type = card.sellerType ?? "bronze";
  const name = card.sellerDisplayName?.trim();
  if (name) {
    const emoji = SELLER_BADGE[type] ?? "🍟";
    return `${emoji} ${name} ${emoji}`;
  }
  return SELLER_DEFAULT_LABEL[type] ?? "🍟 SELLER 🍟";
}

function extractBin(cardNumber: string): string {
  return (cardNumber ?? "").replace(/\D/g, "").substring(0, 6);
}

function useBinData(bin: string) {
  return useQuery<{ bin: string; bank?: string; scheme?: string; type?: string; brand?: string; country?: string; countryCode?: string }>({
    queryKey: [`/api/bin/${bin}`],
    enabled: !!bin && bin.length === 6,
    staleTime: 1000 * 60 * 60,
  });
}

function formatCardType(data: any): string {
  if (!data) return "";
  const parts = [
    data.type?.toUpperCase(),
    data.brand?.toUpperCase() || data.scheme?.toUpperCase(),
  ].filter(Boolean);
  return parts.join(" ");
}

function BinRow({ bin }: { bin: string }) {
  const { data } = useBinData(bin);
  return (
    <div className="flex items-center gap-2 font-mono text-[11px] text-white/40">
      <span className="border border-white/20 px-1.5 py-0.5 rounded text-white/60 text-[11px]">{bin}</span>
      {data?.bank && <span>{data.bank}</span>}
      {(data?.country || data?.countryCode) && (
        <span>{[data.country, data.countryCode].filter(Boolean).join(" ")}</span>
      )}
    </div>
  );
}

function CardRow({ card, inCart, onToggleCart }: { card: any; inCart: boolean; onToggleCart: (card: any) => void }) {
  const [expanded, setExpanded] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const bin = extractBin(card.cardNumber);
  const sellerLabel = getSellerLabel(card);
  const { data: binData } = useBinData(bin);
  const cardType = formatCardType(binData);

  const purchaseMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/cards/${card.id}/purchase`, {});
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Purchase failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cards"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({ title: "Purchase complete", description: "Card delivered to your orders" });
      setLocation("/orders");
    },
    onError: (e: Error) => {
      toast({ title: "Purchase failed", description: e.message, variant: "destructive" });
    },
  });

  return (
    <div className={`border rounded mb-2 overflow-hidden transition-colors ${inCart ? "border-green-600/40 bg-[#0f1a0f]" : "border-white/8 bg-[#0f0f0f]"}`}>
      <div className="px-4 py-3 space-y-1.5">
        {/* Row 1: Seller label + N badge + price */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <p className="text-sm font-bold text-white tracking-wide leading-tight font-mono uppercase">
              {sellerLabel ?? card.maskedCard}
            </p>
            {card.isFirstHand && (
              <span className="text-[10px] text-primary font-bold border border-primary/40 px-1 rounded flex-shrink-0">N</span>
            )}
          </div>
          <p className="text-sm font-mono font-bold text-white flex-shrink-0">${(card.price / 100).toFixed(2)}</p>
        </div>

        {/* Row 2: Bank + card type */}
        <div className="flex items-center gap-2 font-mono text-[11px] text-white/40">
          {binData?.bank && <span>{binData.bank}</span>}
          {cardType && <span className="uppercase">{cardType}</span>}
          {(binData?.country || binData?.countryCode) && (
            <span>{[binData.country, binData.countryCode].filter(Boolean).join(" ")}</span>
          )}
        </div>

        {/* Row 4: Buttons */}
        <div className="flex gap-1.5 pt-0.5">
          <button
            onClick={() => onToggleCart(card)}
            className={`flex items-center gap-1.5 border rounded text-xs font-bold py-1.5 px-3 transition-all ${
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
            className="flex-1 border border-green-600/60 text-green-400 rounded text-xs font-bold py-1.5 transition-all hover:bg-green-900/20 disabled:opacity-50 flex items-center justify-center gap-1.5"
            data-testid={`btn-buy-card-${card.id}`}
          >
            {purchaseMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : `Buy $${(card.price / 100).toFixed(2)}`}
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            className="border border-white/10 px-3 py-1.5 rounded text-xs text-white/40 hover:border-white/20 hover:text-white transition-all"
            data-testid={`btn-expand-card-${card.id}`}
          >
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        </div>

        {expanded && (
          <div className="pt-2 border-t border-white/5 space-y-1">
            <p className="text-[11px] text-white/40">Delivery: Instant after purchase</p>
            <p className="text-[11px] text-white/20">Full card content delivered to your orders.</p>
          </div>
        )}
      </div>
    </div>
  );
}

interface CartPurchaseState {
  current: number;
  total: number;
  done: boolean;
}

export default function CardsPage() {
  const [search, setSearch] = useState("");
  const [baseFilter, setBaseFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [cartCardIds, setCartCardIds] = useState<Set<number>>(new Set());
  const [cartPurchasing, setCartPurchasing] = useState<CartPurchaseState | null>(null);

  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: cards, isLoading } = useQuery<any[]>({
    queryKey: ["/api/cards"],
  });

  const bases = useMemo(() => {
    if (!cards) return [];
    const seen = new Map<string, string>();
    for (const c of cards) {
      if (c.userId && !seen.has(String(c.userId))) {
        const label = getSellerLabel(c) || c.sellerUsername || `Seller ${c.userId}`;
        seen.set(String(c.userId), label);
      }
    }
    return Array.from(seen.entries()).map(([id, label]) => ({ id, label }));
  }, [cards]);

  const filteredCards = useMemo(() => {
    if (!cards) return [];
    return cards.filter((card: any) => {
      const matchBase = baseFilter === "all" || String(card.userId) === baseFilter;
      const matchSearch = !search
        || card.country?.toLowerCase().includes(search.toLowerCase())
        || card.cardNumber?.startsWith(search)
        || (card.sellerDisplayName || "").toLowerCase().includes(search.toLowerCase())
        || (card.sellerUsername || "").toLowerCase().includes(search.toLowerCase());
      const cardPriceDollars = card.price / 100;
      const matchPriceMin = !priceMin || cardPriceDollars >= parseFloat(priceMin);
      const matchPriceMax = !priceMax || cardPriceDollars <= parseFloat(priceMax);
      return matchBase && matchSearch && matchPriceMin && matchPriceMax;
    });
  }, [cards, baseFilter, search, priceMin, priceMax, typeFilter]);

  const cartCards = useMemo(() => {
    if (!cards) return [];
    return cards.filter((c: any) => cartCardIds.has(c.id));
  }, [cards, cartCardIds]);

  const cartTotal = cartCards.reduce((sum: number, c: any) => sum + c.price, 0);

  const toggleCart = (card: any) => {
    setCartCardIds(prev => {
      const next = new Set(prev);
      if (next.has(card.id)) next.delete(card.id);
      else next.add(card.id);
      return next;
    });
  };

  const purchaseCart = async () => {
    if (cartCards.length === 0) return;
    setCartPurchasing({ current: 0, total: cartCards.length, done: false });
    let purchased = 0;
    for (let i = 0; i < cartCards.length; i++) {
      const card = cartCards[i];
      setCartPurchasing({ current: i + 1, total: cartCards.length, done: false });
      try {
        const res = await apiRequest("POST", `/api/cards/${card.id}/purchase`, {});
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          toast({ title: `Card ${i + 1} failed`, description: err.message || "Purchase failed", variant: "destructive" });
        } else {
          purchased++;
        }
      } catch {
        toast({ title: `Card ${i + 1} failed`, variant: "destructive" });
      }
    }
    setCartPurchasing({ current: cartCards.length, total: cartCards.length, done: true });
    queryClient.invalidateQueries({ queryKey: ["/api/cards"] });
    queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
    setCartCardIds(new Set());
    setTimeout(() => {
      setCartPurchasing(null);
      if (purchased > 0) {
        toast({ title: `${purchased} card${purchased > 1 ? "s" : ""} purchased`, description: "Check your orders" });
        setLocation("/orders");
      }
    }, 800);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  const activeFilters = (priceMin ? 1 : 0) + (priceMax ? 1 : 0) + (typeFilter !== "all" ? 1 : 0);

  return (
    <div className="max-w-2xl mx-auto px-3 py-4 space-y-2">
      {/* Top Action Buttons */}
      <div className="flex gap-2">
        <Link href="/support" className="flex-1">
          <button className="w-full border border-white/8 bg-[#111] rounded py-2 text-xs text-white/60 hover:text-white hover:border-white/15 transition-all" data-testid="btn-support">
            support
          </button>
        </Link>
        <button
          onClick={purchaseCart}
          disabled={cartCardIds.size === 0 || !!cartPurchasing}
          className="flex-1 border border-white/8 bg-[#111] rounded py-2 text-xs text-white/60 hover:text-white hover:border-white/15 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          data-testid="btn-cart"
        >
          {cartPurchasing && !cartPurchasing.done ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <ShoppingCart className="h-3 w-3" />
          )}
          cart ({cartCardIds.size})
        </button>
      </div>

      {/* Cart total + checkout */}
      {cartCardIds.size > 0 && (
        <div className="border border-green-600/30 bg-green-950/20 rounded px-3 py-2 flex items-center justify-between">
          <span className="text-xs text-green-400">{cartCardIds.size} card{cartCardIds.size > 1 ? "s" : ""} selected · ${(cartTotal / 100).toFixed(2)}</span>
          <button
            onClick={purchaseCart}
            disabled={!!cartPurchasing}
            className="text-[11px] text-green-400 font-bold hover:text-green-300 disabled:opacity-50"
          >
            checkout →
          </button>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
        <input
          type="text"
          placeholder="Search cards, base name, BIN, brand..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-[#111] border border-white/5 rounded py-2.5 pl-9 pr-3 text-xs text-white placeholder:text-white/25 outline-none focus:border-white/10 transition-colors"
          data-testid="input-search"
        />
      </div>

      {/* Base Filter */}
      <Select value={baseFilter} onValueChange={setBaseFilter}>
        <SelectTrigger className="w-full bg-[#111] border-white/5 text-white/60 h-9 text-xs" data-testid="select-base">
          <SelectValue placeholder="All Bases" />
        </SelectTrigger>
        <SelectContent className="bg-[#111] border-white/10 text-white text-xs">
          <SelectItem value="all">All Bases</SelectItem>
          {bases.map(b => <SelectItem key={b.id} value={b.id}>{b.label}</SelectItem>)}
        </SelectContent>
      </Select>

      {/* Filters toggle */}
      <button
        onClick={() => setShowFilters(!showFilters)}
        className={`w-full border rounded py-2 text-xs transition-all flex items-center justify-center gap-2 ${
          showFilters || activeFilters > 0
            ? "border-primary/40 text-primary bg-primary/5"
            : "border-white/8 text-white/50 bg-[#111] hover:text-white hover:border-white/15"
        }`}
        data-testid="btn-filters"
      >
        <Filter className="h-3 w-3" />
        filters{activeFilters > 0 ? ` (${activeFilters})` : ""}
      </button>

      {/* Filter Panel */}
      {showFilters && (
        <div className="border border-white/8 bg-[#111] rounded p-3 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-white/40 uppercase tracking-widest">Filters</p>
            <button
              onClick={() => { setPriceMin(""); setPriceMax(""); setTypeFilter("all"); setShowFilters(false); }}
              className="text-[10px] text-white/30 hover:text-white transition-colors flex items-center gap-1"
            >
              <X className="h-3 w-3" /> clear
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[9px] text-white/30 uppercase tracking-widest">Min Price ($)</label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={priceMin}
                onChange={e => setPriceMin(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded py-1.5 px-2 text-xs text-white placeholder:text-white/20 outline-none"
                data-testid="input-price-min"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] text-white/30 uppercase tracking-widest">Max Price ($)</label>
              <input
                type="number"
                step="0.01"
                placeholder="100.00"
                value={priceMax}
                onChange={e => setPriceMax(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded py-1.5 px-2 text-xs text-white placeholder:text-white/20 outline-none"
                data-testid="input-price-max"
              />
            </div>
          </div>
        </div>
      )}

      {/* Add Selected button */}
      <button
        onClick={purchaseCart}
        disabled={cartCardIds.size === 0 || !!cartPurchasing}
        className="w-full border border-white/8 bg-[#111] rounded py-2 text-xs text-white/40 hover:text-white hover:border-white/15 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
        data-testid="btn-add-selected"
      >
        <ShoppingCart className="h-3 w-3" />
        add selected ({cartCardIds.size})
      </button>

      {/* Card list */}
      <div>
        {filteredCards.length === 0 ? (
          <div className="py-16 text-center text-white/25 text-xs">No cards available</div>
        ) : (
          filteredCards.map((card: any) => (
            <CardRow
              key={card.id}
              card={card}
              inCart={cartCardIds.has(card.id)}
              onToggleCart={toggleCart}
            />
          ))
        )}
      </div>
    </div>
  );
}
