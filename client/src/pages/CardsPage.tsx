import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Search, ShoppingCart, ChevronDown, ChevronUp, Loader2, X, Zap } from "lucide-react";
import { useLocation, Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";

const P    = "hsl(186 100% 50%)";
const PBG  = "hsl(186 100% 50% / 0.1)";
const BG   = "hsl(214 50% 4%)";
const CARD = "hsl(214 45% 7%)";
const NAVY = "hsl(220 50% 12%)";
const BDR  = "hsl(210 40% 16%)";
const TEXT = "hsl(195 60% 88%)";
const MUT  = "hsl(205 30% 45%)";
const GREEN = "#22C55E";

const BRAND_FILTERS = [
  { id: "all",     label: "all",       color: "#E5E7EB", bg: "#1F2937" },
  { id: "VISA",    label: "VISA",      color: "#fff",    bg: "#1A47B8" },
  { id: "MC",      label: "MC",        color: "#fff",    bg: "#EB001B" },
  { id: "AMEX",    label: "AMEX",      color: "#fff",    bg: "#007BC1" },
  { id: "DISC",    label: "DISC",      color: "#fff",    bg: "#F76F20" },
  { id: "DEBIT",   label: "Debit",     color: "#fff",    bg: "#374151" },
  { id: "CREDIT",  label: "Credit",    color: "#fff",    bg: "#4B5563" },
  { id: "PREMIUM", label: "★ Premium", color: "#FDE68A", bg: "#92400E" },
  { id: "FRESH",   label: "🔥 Fresh",  color: "#fff",    bg: "#DC2626" },
];

function getCardLabel(card: any): string {
  const hr = card.hrPercent ?? 80;
  return `🔥 NYCHQ | ${hr}% HR 🔥`;
}

function extractBin(cardNumber: string): string {
  return (cardNumber ?? "").replace(/\D/g, "").substring(0, 6);
}

function matchesBrandFilter(card: any, filter: string): boolean {
  if (filter === "all") return true;
  const brand = (card.binData?.brand || card.binData?.scheme || "").toUpperCase();
  const type = (card.binData?.type || "").toUpperCase();
  if (filter === "VISA") return brand.includes("VISA");
  if (filter === "MC") return brand.includes("MASTER") || brand.includes("MC");
  if (filter === "AMEX") return brand.includes("AMEX") || brand.includes("AMERICAN");
  if (filter === "DISC") return brand.includes("DISC");
  if (filter === "DEBIT") return type === "DEBIT";
  if (filter === "CREDIT") return type === "CREDIT";
  if (filter === "PREMIUM") return (card.hrPercent ?? 80) >= 90;
  if (filter === "FRESH") return card.isFresh === true;
  return true;
}

function CardRow({ card, inCart, onToggleCart }: { card: any; inCart: boolean; onToggleCart: (card: any) => void }) {
  const [expanded, setExpanded] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const bin = extractBin(card.cardNumber);
  const label = getCardLabel(card);
  const binData = card.binData ?? null;
  const brand = (binData?.brand || binData?.scheme || "").toUpperCase();
  const type = (binData?.type || "").toUpperCase();

  const purchaseMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/cards/${card.id}/purchase`, {});
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.message || "Failed"); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cards"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({ title: "Card purchased", description: "Delivered to your orders" });
      setLocation("/orders");
    },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="mb-2 overflow-hidden"
      style={{ border: `1px solid ${inCart ? "#22C55E66" : BDR}`, background: inCart ? "hsl(142 50% 6%)" : NAVY }}>
      <div className="px-4 py-3 space-y-1.5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-bold tracking-wide leading-tight font-mono" style={{ color: P }}>{label}</p>
          <p className="text-sm font-mono font-bold flex-shrink-0" style={{ color: TEXT }}>${(card.price / 100).toFixed(2)}</p>
        </div>

        <div className="flex items-center gap-2 font-mono text-[11px] flex-wrap">
          {bin && (
            <span className="px-1.5 py-0.5 text-[11px] font-bold" style={{ background: PBG, border: `1px solid ${P}`, color: P }}>
              {bin}
            </span>
          )}
          {brand && (
            <span className="px-1.5 py-0.5 text-[10px] font-bold" style={{ background: "#1A47B855", border: "1px solid #1A47B8", color: "#93C5FD" }}>
              {brand}
            </span>
          )}
          {type && (
            <span className="px-1.5 py-0.5 text-[10px]" style={{ background: CARD, border: `1px solid ${BDR}`, color: MUT }}>
              {type}
            </span>
          )}
          {binData?.bank && <span style={{ color: MUT }}>{binData.bank}</span>}
          {(binData?.country || binData?.countryCode) && (
            <span style={{ color: MUT }}>{[binData.country, binData.countryCode].filter(Boolean).join(" ")}</span>
          )}
        </div>

        <div className="flex gap-1.5 pt-0.5">
          <button onClick={() => onToggleCart(card)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold transition-all"
            style={inCart
              ? { border: `1px solid ${GREEN}66`, color: GREEN, background: "#22C55E18" }
              : { border: `1px solid ${BDR}`, color: MUT, background: CARD }}
            data-testid={`btn-cart-card-${card.id}`}>
            <ShoppingCart className="h-3 w-3" />
            {inCart ? "added" : "add"}
          </button>
          <button onClick={() => purchaseMutation.mutate()} disabled={purchaseMutation.isPending}
            className="flex-1 text-xs font-bold py-1.5 transition-all flex items-center justify-center gap-1.5"
            style={{ border: `1px solid ${P}66`, color: P, background: PBG }}
            data-testid={`btn-buy-card-${card.id}`}>
            {purchaseMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : `▶ Buy $${(card.price / 100).toFixed(2)}`}
          </button>
          <button onClick={() => setExpanded(!expanded)}
            className="px-3 py-1.5 text-xs transition-all"
            style={{ border: `1px solid ${BDR}`, color: MUT, background: CARD }}
            data-testid={`btn-expand-card-${card.id}`}>
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        </div>

        {expanded && (
          <div className="pt-2 space-y-1" style={{ borderTop: `1px solid ${BDR}` }}>
            <p className="text-[11px]" style={{ color: MUT }}>⚡ Instant delivery after purchase</p>
            <p className="text-[11px]" style={{ color: "hsl(205 30% 30%)" }}>Full card content delivered to your orders.</p>
          </div>
        )}
      </div>
    </div>
  );
}

interface CartPurchaseState { current: number; total: number; done: boolean; }

export default function CardsPage() {
  const [search, setSearch] = useState("");
  const [brandFilter, setBrandFilter] = useState("all");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [showPriceFilter, setShowPriceFilter] = useState(false);
  const [cartCardIds, setCartCardIds] = useState<Set<number>>(new Set());
  const [cartPurchasing, setCartPurchasing] = useState<CartPurchaseState | null>(null);

  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: cards, isLoading } = useQuery<any[]>({
    queryKey: ["/api/cards"],
    refetchInterval: 20000,
  });

  const filteredCards = useMemo(() => {
    if (!cards) return [];
    return cards.filter((card: any) => {
      const matchSearch = !search
        || card.cardNumber?.startsWith(search)
        || (card.binData?.bank || "").toLowerCase().includes(search.toLowerCase())
        || (card.binData?.country || "").toLowerCase().includes(search.toLowerCase())
        || (card.binData?.brand || card.binData?.scheme || "").toLowerCase().includes(search.toLowerCase());
      const matchBrand = matchesBrandFilter(card, brandFilter);
      const priceDollars = card.price / 100;
      const matchMin = !priceMin || priceDollars >= parseFloat(priceMin);
      const matchMax = !priceMax || priceDollars <= parseFloat(priceMax);
      return matchSearch && matchBrand && matchMin && matchMax;
    });
  }, [cards, search, brandFilter, priceMin, priceMax]);

  const totalCards = cards?.length ?? 0;
  const freshCards = cards?.filter((c: any) => c.isFresh).length ?? 0;
  const cartCards = useMemo(() => cards?.filter((c: any) => cartCardIds.has(c.id)) ?? [], [cards, cartCardIds]);
  const cartTotal = cartCards.reduce((sum: number, c: any) => sum + c.price, 0);
  const toggleCart = (card: any) => setCartCardIds(prev => { const n = new Set(prev); n.has(card.id) ? n.delete(card.id) : n.add(card.id); return n; });

  const purchaseCart = async () => {
    if (cartCards.length === 0) return;
    setCartPurchasing({ current: 0, total: cartCards.length, done: false });
    let purchased = 0;
    for (let i = 0; i < cartCards.length; i++) {
      setCartPurchasing({ current: i + 1, total: cartCards.length, done: false });
      try {
        const res = await apiRequest("POST", `/api/cards/${cartCards[i].id}/purchase`, {});
        if (!res.ok) { const err = await res.json().catch(() => ({})); toast({ title: `Card ${i + 1} failed`, description: err.message, variant: "destructive" }); }
        else purchased++;
      } catch { toast({ title: `Card ${i + 1} failed`, variant: "destructive" }); }
    }
    setCartPurchasing({ current: cartCards.length, total: cartCards.length, done: true });
    queryClient.invalidateQueries({ queryKey: ["/api/cards"] });
    queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
    setCartCardIds(new Set());
    setTimeout(() => { setCartPurchasing(null); if (purchased > 0) { toast({ title: `${purchased} card(s) purchased` }); setLocation("/orders"); } }, 800);
  };

  if (isLoading) return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="h-5 w-5 animate-spin" style={{ color: P }} /></div>;

  return (
    <div className="max-w-2xl mx-auto px-3 py-3 space-y-3">
      {/* DEPOSIT banner */}
      <Link href="/">
        <div className="w-full flex items-center justify-between px-4 py-3 font-bold tracking-widest cursor-pointer hover:opacity-90 transition-opacity pixel-btn"
          style={{ background: P, color: BG, fontSize: "13px" }}
          data-testid="btn-deposit-banner">
          <div className="flex items-center gap-2">
            <span>■</span>
            <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "9px" }}>DEPOSIT</span>
          </div>
          <span>→</span>
        </div>
      </Link>

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        <a href="https://t.me/+K3ou01RaW6oyMjJh" target="_blank" rel="noopener noreferrer">
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs"
            style={{ border: `1px solid ${BDR}`, color: MUT, background: CARD }}>
            ⚙ support
          </button>
        </a>
        <button onClick={purchaseCart} disabled={cartCardIds.size === 0 || !!cartPurchasing}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold transition-all disabled:opacity-40"
          style={{ border: `1px solid ${cartCardIds.size > 0 ? GREEN : BDR}`, color: cartCardIds.size > 0 ? GREEN : MUT, background: CARD }}
          data-testid="btn-cart">
          {cartPurchasing && !cartPurchasing.done ? <Loader2 className="h-3 w-3 animate-spin" /> : <ShoppingCart className="h-3 w-3" />}
          🛒 add selected ({cartCardIds.size})
        </button>
      </div>

      {/* Live count */}
      <div className="flex items-center gap-4 text-xs font-mono">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: GREEN }} />
          <span style={{ color: TEXT }}>{totalCards} live cards</span>
        </span>
        {freshCards > 0 && (
          <span style={{ color: "#F87171" }}>🔥 {freshCards} fresh today</span>
        )}
      </div>
      <div className="flex items-center gap-1.5 text-xs font-mono" style={{ color: P }}>
        <Zap className="h-3 w-3" />
        instant delivery
      </div>

      {/* Cart total */}
      {cartCardIds.size > 0 && (
        <div className="flex items-center justify-between px-3 py-2"
          style={{ border: `1px solid ${GREEN}44`, background: "#22C55E0A" }}>
          <span className="text-xs" style={{ color: GREEN }}>{cartCardIds.size} selected · ${(cartTotal / 100).toFixed(2)}</span>
          <button onClick={purchaseCart} disabled={!!cartPurchasing}
            className="text-[11px] font-bold disabled:opacity-50" style={{ color: GREEN }}>
            checkout →
          </button>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: MUT }} />
        <input type="text" placeholder="Search cards, base name, BIN, brand..."
          value={search} onChange={e => setSearch(e.target.value)}
          className="w-full outline-none transition-colors pl-9 pr-3 py-2.5 text-xs"
          style={{ background: "hsl(214 45% 10%)", border: `1px solid ${BDR}`, color: TEXT }}
          data-testid="input-search" />
      </div>

      {/* Brand filter pills */}
      <div className="flex flex-wrap gap-1.5">
        {BRAND_FILTERS.map(f => (
          <button key={f.id} onClick={() => setBrandFilter(f.id)}
            className="px-2.5 py-1 text-[10px] font-bold transition-all"
            style={brandFilter === f.id
              ? { background: f.bg, color: f.color, border: `1px solid ${f.color}`, boxShadow: `0 0 6px ${f.bg}88` }
              : { background: CARD, color: MUT, border: `1px solid ${BDR}` }}
            data-testid={`btn-filter-${f.id}`}>
            {f.label}
          </button>
        ))}
        <button onClick={() => setShowPriceFilter(v => !v)}
          className="px-2.5 py-1 text-[10px] transition-all"
          style={{ background: showPriceFilter ? PBG : CARD, border: `1px solid ${showPriceFilter ? P : BDR}`, color: showPriceFilter ? P : MUT }}>
          $ price
        </button>
      </div>

      {/* Price filter */}
      {showPriceFilter && (
        <div className="p-3 space-y-2" style={{ border: `1px solid ${BDR}`, background: CARD }}>
          <div className="flex items-center justify-between">
            <p className="text-[9px] tracking-widest" style={{ color: MUT }}>PRICE RANGE</p>
            <button onClick={() => { setPriceMin(""); setPriceMax(""); setShowPriceFilter(false); }}
              className="flex items-center gap-1 text-[10px]" style={{ color: MUT }}>
              <X className="h-3 w-3" /> clear
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Min ($)", value: priceMin, setter: setPriceMin, placeholder: "0.00", id: "input-price-min" },
              { label: "Max ($)", value: priceMax, setter: setPriceMax, placeholder: "100.00", id: "input-price-max" },
            ].map(f => (
              <div key={f.id}>
                <p className="text-[9px] tracking-widest mb-1" style={{ color: MUT }}>{f.label}</p>
                <input type="number" step="0.01" placeholder={f.placeholder} value={f.value}
                  onChange={e => f.setter(e.target.value)}
                  className="w-full outline-none py-1.5 px-2 text-xs"
                  style={{ background: BG, border: `1px solid ${BDR}`, color: TEXT }}
                  data-testid={f.id} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Card list */}
      <div>
        {filteredCards.length === 0 ? (
          <div className="py-16 text-center text-xs font-mono" style={{ color: MUT }}>No cards available</div>
        ) : (
          filteredCards.map((card: any) => (
            <CardRow key={card.id} card={card} inCart={cartCardIds.has(card.id)} onToggleCart={toggleCart} />
          ))
        )}
      </div>
    </div>
  );
}
