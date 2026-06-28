import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Search, ShoppingCart, ChevronDown, X, Loader2, SlidersHorizontal, Zap } from "lucide-react";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";

function countryFlag(code: string): string {
  if (!code || code.length !== 2) return "";
  const upper = code.toUpperCase();
  return String.fromCodePoint(...upper.split("").map(c => 0x1F1E6 - 65 + c.charCodeAt(0)));
}

function extractBin(cardNumber: string): string {
  return (cardNumber ?? "").replace(/\D/g, "").substring(0, 6);
}

function extractZip(extras: string): string {
  if (!extras) return "";
  const tokens = extras.split(/[|\t:;,\s]+/).map(t => t.trim()).filter(Boolean);
  for (const token of tokens) {
    const zipMatch = token.match(/^(\d{5})(?:-\d{4})?$/);
    if (zipMatch) {
      const num = parseInt(zipMatch[1], 10);
      if (num >= 501 && num <= 99950 && !(num >= 1900 && num <= 2100)) return zipMatch[1];
    }
  }
  for (const token of tokens) {
    const digits = token.replace(/\D/g, "");
    if (digits.length >= 13) continue;
    const m = token.match(/\b(\d{5})(?:-\d{4})?\b/);
    if (m) {
      const num = parseInt(m[1], 10);
      if (num >= 501 && num <= 99950 && !(num >= 1900 && num <= 2100)) return m[1];
    }
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
    .join(" · ");
}

function FilterDropdown({
  label, value, onChange, options, placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void; options: string[]; placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const active = !!value;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-mono shrink-0 transition-all w-full justify-between"
        style={{
          background: active ? "rgba(45,106,45,0.2)" : "#0c140d",
          border: active ? "1px solid rgba(74,154,58,0.4)" : "1px solid rgba(45,106,45,0.2)",
          color: active ? "#6abf5a" : "rgba(255,255,255,0.35)",
        }}
      >
        <span className="truncate max-w-[120px]">{value || placeholder}</span>
        <div className="flex items-center gap-1 shrink-0">
          {value && (
            <span
              onClick={e => { e.stopPropagation(); onChange(""); setOpen(false); }}
              className="hover:text-white transition-colors"
            >
              <X className="h-3 w-3" />
            </span>
          )}
          <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
        </div>
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 w-full min-w-[160px] border rounded-xl shadow-xl z-50 max-h-52 overflow-y-auto" style={{ background: "#0c140d", borderColor: "rgba(45,106,45,0.25)" }}>
          <button
            onClick={() => { onChange(""); setOpen(false); }}
            className="w-full text-left px-3 py-2 text-xs font-mono transition-colors hover:bg-white/5"
            style={{ color: "rgba(255,255,255,0.25)" }}
          >
            All {label}s
          </button>
          {options.map(opt => (
            <button
              key={opt}
              onClick={() => { onChange(opt); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-xs font-mono transition-colors hover:bg-white/5"
              style={{ color: value === opt ? "#6abf5a" : "rgba(255,255,255,0.55)", background: value === opt ? "rgba(45,106,45,0.15)" : "transparent" }}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
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
  const bank = card.binData?.bank && card.binData.bank !== "Unknown" ? card.binData.bank : "";
  const countryCode = card.binData?.countryCode ?? "";
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
    <div
      className="rounded-xl overflow-hidden mb-2 transition-all"
      style={{
        background: inCart ? "rgba(20,50,20,0.6)" : "#0c140d",
        border: inCart ? "1px solid rgba(74,154,58,0.35)" : "1px solid rgba(45,106,45,0.15)",
      }}
      data-testid={`card-row-${card.id}`}
    >
      <div className="px-3.5 py-3 space-y-2">
        {/* Top: base name + billing badge + price */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {baseName && (
              <span className="text-xs font-black font-mono truncate" style={{ color: "#6abf5a" }}>{baseName}</span>
            )}
            {billing && (
              <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider shrink-0" style={{ background: "rgba(45,106,45,0.3)", color: "#6abf5a" }}>BILL</span>
            )}
          </div>
          <span className="text-sm font-black font-mono text-white shrink-0">${(card.price / 100).toFixed(2)}</span>
        </div>

        {/* Card type */}
        {cardType && (
          <p className="text-[10px] font-mono" style={{ color: "rgba(106,191,90,0.45)" }}>{cardType}</p>
        )}

        {/* BIN + bank + location */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-[11px]" style={{ color: "rgba(255,255,255,0.35)" }}>
          {bin && (
            <span className="px-1.5 py-0.5 rounded-md font-bold text-white/60" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>{bin}</span>
          )}
          {bank && <span className="truncate max-w-[120px]">{bank}</span>}
          {city && <span>{city}</span>}
          {state && <span className="font-bold" style={{ color: "rgba(255,255,255,0.5)" }}>{state}</span>}
          {zip && <span>· {zip}</span>}
          {countryCode && <span>{countryFlag(countryCode)}</span>}
        </div>

        {/* Action buttons */}
        <div className="flex gap-1.5 pt-0.5">
          <button
            onClick={() => onToggleCart(card)}
            className="flex items-center gap-1.5 rounded-xl text-xs font-bold py-1.5 px-3 transition-all"
            style={{
              border: inCart ? "1px solid rgba(74,154,58,0.5)" : "1px solid rgba(255,255,255,0.12)",
              color: inCart ? "#6abf5a" : "rgba(255,255,255,0.45)",
              background: inCart ? "rgba(45,106,45,0.15)" : "transparent",
            }}
            data-testid={`btn-cart-card-${card.id}`}
          >
            <ShoppingCart className="h-3 w-3" />
            {inCart ? "added" : "add"}
          </button>
          <button
            onClick={() => purchaseMutation.mutate()}
            disabled={purchaseMutation.isPending}
            className="flex-1 rounded-xl text-xs font-bold py-1.5 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
            style={{
              background: "rgba(45,106,45,0.25)",
              border: "1px solid rgba(74,154,58,0.4)",
              color: "#6abf5a",
            }}
            data-testid={`btn-buy-card-${card.id}`}
          >
            {purchaseMutation.isPending
              ? <Loader2 className="h-3 w-3 animate-spin" />
              : <><Zap className="h-3 w-3" /> Buy ${(card.price / 100).toFixed(2)}</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CardsPage() {
  const [search, setSearch] = useState("");
  const [zipSearch, setZipSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedBase, setSelectedBase] = useState<number | null>(null);
  const [selectedBank, setSelectedBank] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("");
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

  const availableBanks = useMemo(() => {
    if (!cards) return [];
    const set = new Set<string>();
    cards.forEach((c: any) => {
      const b = c.binData?.bank;
      if (b && b !== "Unknown") set.add(b);
    });
    return Array.from(set).sort();
  }, [cards]);

  const availableCountries = useMemo(() => {
    if (!cards) return [];
    const set = new Set<string>();
    cards.forEach((c: any) => {
      const code = c.binData?.countryCode;
      if (code) set.add(code.toUpperCase());
    });
    return Array.from(set).sort();
  }, [cards]);

  const filteredCards = useMemo(() => {
    if (!cards) return [];
    return cards.filter((card: any) => {
      const q = search.toLowerCase();
      const matchSearch = !search
        || extractBin(card.cardNumber).includes(q)
        || (card.baseName ?? "").toLowerCase().includes(q)
        || (card.binData?.scheme ?? "").toLowerCase().includes(q)
        || (card.binData?.type ?? "").toLowerCase().includes(q)
        || (card.binData?.brand ?? "").toLowerCase().includes(q);
      const matchZip = !zipSearch || extractZip(card.extras ?? "").startsWith(zipSearch.trim());
      const cardPrice = card.price / 100;
      const matchMin = !priceMin || cardPrice >= parseFloat(priceMin);
      const matchMax = !priceMax || cardPrice <= parseFloat(priceMax);
      const matchBank = !selectedBank || (card.binData?.bank === selectedBank);
      const matchCountry = !selectedCountry || ((card.binData?.countryCode ?? "").toUpperCase() === selectedCountry);
      return matchSearch && matchZip && matchMin && matchMax && matchBank && matchCountry;
    });
  }, [cards, search, zipSearch, priceMin, priceMax, selectedBank, selectedCountry]);

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

  const activeFilters = (zipSearch ? 1 : 0) + (priceMin ? 1 : 0) + (priceMax ? 1 : 0) + (selectedBank ? 1 : 0) + (selectedCountry ? 1 : 0);
  const clearFilters = () => { setZipSearch(""); setPriceMin(""); setPriceMax(""); setSelectedBank(""); setSelectedCountry(""); };

  return (
    <div className="max-w-2xl mx-auto px-3 py-4 space-y-3">

      {/* Header */}
      <div className="space-y-0.5 pb-1">
        <h1 className="text-lg font-black text-white">
          NYC<span style={{ color: "#4a9a3a" }}>HQ</span>
          <span className="ml-2 text-xs font-mono font-normal" style={{ color: "rgba(106,191,90,0.4)" }}>Cards</span>
        </h1>
        <p className="text-[10px] uppercase tracking-widest font-bold" style={{ color: "rgba(74,154,58,0.35)" }}>FRESH BINS · INSTANT DELIVERY</p>
      </div>

      {/* Search + Filter row */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: "rgba(74,154,58,0.4)" }} />
          <input
            type="text"
            placeholder="Search BIN, base, brand, type..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-xl py-2.5 pl-9 pr-3 text-xs text-white placeholder:text-white/20 outline-none transition-colors"
            style={{
              background: "#0c140d",
              border: "1px solid rgba(45,106,45,0.2)",
            }}
            onFocus={e => (e.target.style.borderColor = "rgba(74,154,58,0.4)")}
            onBlur={e => (e.target.style.borderColor = "rgba(45,106,45,0.2)")}
            data-testid="input-search"
          />
        </div>
        <button
          onClick={() => setShowFilters(f => !f)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono shrink-0 transition-all"
          style={{
            background: showFilters || activeFilters > 0 ? "rgba(45,106,45,0.2)" : "#0c140d",
            border: showFilters || activeFilters > 0 ? "1px solid rgba(74,154,58,0.4)" : "1px solid rgba(45,106,45,0.2)",
            color: showFilters || activeFilters > 0 ? "#6abf5a" : "rgba(255,255,255,0.35)",
          }}
          data-testid="btn-toggle-filters"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          {activeFilters > 0 ? `(${activeFilters})` : "Filter"}
        </button>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="space-y-2.5 rounded-xl p-3.5" style={{ background: "#0c140d", border: "1px solid rgba(45,106,45,0.2)" }}>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: "rgba(74,154,58,0.45)" }}>ZIP Code</p>
            <input
              type="text"
              placeholder="Enter ZIP..."
              value={zipSearch}
              onChange={e => setZipSearch(e.target.value)}
              className="w-full rounded-xl py-2 px-3 text-xs text-white placeholder:text-white/20 outline-none"
              style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(45,106,45,0.2)" }}
              data-testid="input-zip"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <FilterDropdown label="Bank" value={selectedBank} onChange={setSelectedBank} options={availableBanks} placeholder="Issuer / Bank" />
            <FilterDropdown label="Country" value={selectedCountry} onChange={setSelectedCountry} options={availableCountries} placeholder="Country" />
          </div>

          <div className="flex gap-2 items-center">
            <input
              type="number" step="0.01" placeholder="Min $" value={priceMin} onChange={e => setPriceMin(e.target.value)}
              className="flex-1 rounded-xl py-2 px-3 text-xs text-white placeholder:text-white/20 outline-none"
              style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(45,106,45,0.2)" }}
              data-testid="input-price-min"
            />
            <span className="text-xs font-mono shrink-0" style={{ color: "rgba(74,154,58,0.3)" }}>—</span>
            <input
              type="number" step="0.01" placeholder="Max $" value={priceMax} onChange={e => setPriceMax(e.target.value)}
              className="flex-1 rounded-xl py-2 px-3 text-xs text-white placeholder:text-white/20 outline-none"
              style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(45,106,45,0.2)" }}
              data-testid="input-price-max"
            />
          </div>

          {activeFilters > 0 && (
            <button
              onClick={clearFilters}
              className="text-[10px] font-mono flex items-center gap-1 px-2 py-1.5 rounded-lg transition-colors"
              style={{ color: "rgba(255,100,100,0.6)", border: "1px solid rgba(180,0,0,0.2)", background: "rgba(180,0,0,0.08)" }}
            >
              <X className="h-3 w-3" /> clear filters
            </button>
          )}
        </div>
      )}

      {/* Base filter pills */}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setSelectedBase(null)}
          className="text-xs px-3 py-1.5 rounded-xl font-mono font-bold transition-all"
          style={{
            background: selectedBase === null ? "rgba(45,106,45,0.25)" : "transparent",
            border: selectedBase === null ? "1px solid rgba(74,154,58,0.4)" : "1px solid rgba(45,106,45,0.2)",
            color: selectedBase === null ? "#6abf5a" : "rgba(255,255,255,0.35)",
          }}
          data-testid="btn-base-all"
        >
          all bases
        </button>
        {(bases ?? []).map((b: any) => (
          <button
            key={b.id}
            onClick={() => setSelectedBase(b.id)}
            className="text-xs px-3 py-1.5 rounded-xl font-mono font-bold transition-all"
            style={{
              background: selectedBase === b.id ? "rgba(45,106,45,0.25)" : "transparent",
              border: selectedBase === b.id ? "1px solid rgba(74,154,58,0.4)" : "1px solid rgba(45,106,45,0.15)",
              color: selectedBase === b.id ? "#6abf5a" : "rgba(255,255,255,0.3)",
            }}
            data-testid={`btn-base-${b.id}`}
          >
            {b.name} <span style={{ color: "rgba(74,154,58,0.5)" }}>({b.count})</span>
          </button>
        ))}
      </div>

      {/* Buy selected bar */}
      <button
        onClick={purchaseCart}
        disabled={cartCardIds.size === 0 || !!cartPurchasing}
        className="w-full rounded-xl py-2.5 text-xs font-bold font-mono flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        style={{
          background: cartCardIds.size > 0 ? "rgba(45,106,45,0.2)" : "rgba(255,255,255,0.03)",
          border: cartCardIds.size > 0 ? "1px solid rgba(74,154,58,0.35)" : "1px solid rgba(255,255,255,0.07)",
          color: cartCardIds.size > 0 ? "#6abf5a" : "rgba(255,255,255,0.3)",
        }}
        data-testid="btn-add-selected"
      >
        {cartPurchasing && !cartPurchasing.done ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            purchasing {cartPurchasing.current}/{cartPurchasing.total}...
          </>
        ) : (
          <>
            <ShoppingCart className="h-3.5 w-3.5" />
            {cartCardIds.size > 0 ? `Buy ${cartCardIds.size} selected · $${(cartTotal / 100).toFixed(2)}` : `select cards to buy`}
          </>
        )}
      </button>

      {/* Count info */}
      {!isLoading && (cards ?? []).length > 0 && (
        <p className="text-[10px] font-mono" style={{ color: "rgba(74,154,58,0.35)" }}>
          {filteredCards.length} card{filteredCards.length !== 1 ? "s" : ""} available
          {activeFilters > 0 ? ` · ${activeFilters} filter${activeFilters > 1 ? "s" : ""} active` : ""}
        </p>
      )}

      {/* Cards list */}
      <div>
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin" style={{ color: "rgba(74,154,58,0.5)" }} />
          </div>
        ) : filteredCards.length === 0 ? (
          <div className="py-16 text-center text-xs font-mono" style={{ color: "rgba(74,154,58,0.3)" }}>No cards available</div>
        ) : (
          filteredCards.map((card: any) => (
            <CardRow key={card.id} card={card} inCart={cartCardIds.has(card.id)} onToggleCart={toggleCart} />
          ))
        )}
      </div>
    </div>
  );
}
