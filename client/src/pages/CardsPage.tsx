import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Search, ShoppingCart, ChevronDown, X, Loader2, SlidersHorizontal } from "lucide-react";
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

const US_STATES = new Set([
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY",
  "LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND",
  "OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC",
]);

function extractCity(extras: string): string {
  if (!extras) return "";
  const parts = extras.split(/[|\t]/);
  // Find state abbreviation index, city is typically just before it
  for (let i = 1; i < parts.length; i++) {
    const t = parts[i].trim();
    if (US_STATES.has(t)) {
      // city is the token before the state (skip blanks)
      for (let j = i - 1; j >= 0; j--) {
        const c = parts[j].trim();
        if (c && c.length > 1 && !/^\d/.test(c) && !c.includes("@") && !c.includes(".") && !/^\d{1,3}\.\d{1,3}/.test(c)) {
          return c.length > 20 ? c.substring(0, 18) + "…" : c;
        }
      }
      break;
    }
  }
  return "";
}

function extractState(extras: string): string {
  if (!extras) return "";
  const parts = extras.split(/[|\t]/);
  for (const part of parts) {
    const t = part.trim();
    if (US_STATES.has(t)) return t;
  }
  return "";
}

function hasBilling(extras: string): boolean {
  return (extras ?? "").split(/[|\t]/).length >= 5;
}

function formatType(binData: any): string {
  if (!binData) return "";
  const t = binData.type?.toUpperCase();
  return t || "";
}

function formatBank(binData: any): string {
  if (!binData) return "";
  const b = binData.bank;
  if (!b || b === "Unknown") return "";
  return b.length > 18 ? b.substring(0, 16) + "..." : b;
}

export default function CardsPage() {
  const [search, setSearch] = useState("");
  const [zipSearch, setZipSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedBase, setSelectedBase] = useState<number | null>(null);
  const [showBaseDropdown, setShowBaseDropdown] = useState(false);
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
    cards.forEach((c: any) => { const b = c.binData?.bank; if (b && b !== "Unknown") set.add(b); });
    return Array.from(set).sort();
  }, [cards]);

  const availableCountries = useMemo(() => {
    if (!cards) return [];
    const set = new Set<string>();
    cards.forEach((c: any) => { const code = c.binData?.countryCode; if (code) set.add(code.toUpperCase()); });
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

  const toggleAll = () => {
    if (cartCardIds.size === filteredCards.length) {
      setCartCardIds(new Set());
    } else {
      setCartCardIds(new Set(filteredCards.map((c: any) => c.id)));
    }
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

  const selectedBaseName = bases?.find((b: any) => b.id === selectedBase)?.name ?? "All Bases";

  return (
    <div className="max-w-2xl mx-auto px-0 py-0">

      {/* Search + controls */}
      <div className="px-3 pt-3 pb-2 space-y-2 bg-[#111] border-b border-white/10 sticky top-[52px] z-30">
        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/40" />
          <input
            type="text"
            placeholder="Search cards, base name, BIN, brand..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-10 bg-[#0d0d0d] border border-white/10 rounded-xl pl-9 pr-4 text-xs text-white/90 placeholder:text-white/40 outline-none focus:border-white/15 focus:bg-[#111] transition-colors"
            data-testid="input-search"
          />
        </div>

        {/* All Bases dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowBaseDropdown(d => !d)}
            className="w-full flex items-center justify-between bg-[#0d0d0d] border border-white/10 rounded-xl px-3.5 h-10 text-sm text-white/70 hover:bg-[#111]/5 transition-colors"
            data-testid="btn-base-dropdown"
          >
            <span>{selectedBaseName}</span>
            <ChevronDown className={`h-4 w-4 text-white/40 transition-transform ${showBaseDropdown ? "rotate-180" : ""}`} />
          </button>
          {showBaseDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-[#111] border border-white/10 rounded-xl shadow-lg z-50 overflow-hidden">
              <button
                onClick={() => { setSelectedBase(null); setShowBaseDropdown(false); }}
                className={`w-full text-left px-4 py-3 text-sm transition-colors hover:bg-[#0d0d0d] ${selectedBase === null ? "font-semibold text-white" : "text-white/60"}`}
                data-testid="btn-base-all"
              >
                All Bases
              </button>
              {(bases ?? []).map((b: any) => (
                <button
                  key={b.id}
                  onClick={() => { setSelectedBase(b.id); setShowBaseDropdown(false); }}
                  className={`w-full text-left px-4 py-3 text-sm border-t border-white/8 transition-colors hover:bg-[#0d0d0d] ${selectedBase === b.id ? "font-semibold text-white" : "text-white/60"}`}
                  data-testid={`btn-base-${b.id}`}
                >
                  {b.name} ({b.count})
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Filters button */}
        <button
          onClick={() => setShowFilters(f => !f)}
          className={`w-full flex items-center justify-center gap-2 h-10 rounded-xl border text-sm font-medium transition-colors ${
            showFilters || activeFilters > 0
              ? "bg-gray-800 border-gray-800 text-white"
              : "bg-gray-800 border-gray-800 text-white hover:bg-gray-700"
          }`}
          data-testid="btn-toggle-filters"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters{activeFilters > 0 ? ` (${activeFilters})` : ""}
        </button>

        {/* Filter panel */}
        {showFilters && (
          <div className="space-y-2 bg-[#0d0d0d] border border-white/10 rounded-xl p-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1.5">ZIP Code</p>
              <input
                type="text"
                placeholder="Enter ZIP..."
                value={zipSearch}
                onChange={e => setZipSearch(e.target.value)}
                className="w-full h-9 bg-[#111] border border-white/10 rounded-lg px-3 text-xs text-white/90 placeholder:text-white/40 outline-none focus:border-white/15"
                data-testid="input-zip"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1.5">Bank</p>
                <select
                  value={selectedBank}
                  onChange={e => setSelectedBank(e.target.value)}
                  className="w-full h-9 bg-[#111] border border-white/10 rounded-lg px-2 text-xs text-white/70 outline-none"
                >
                  <option value="">All Banks</option>
                  {availableBanks.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1.5">Country</p>
                <select
                  value={selectedCountry}
                  onChange={e => setSelectedCountry(e.target.value)}
                  className="w-full h-9 bg-[#111] border border-white/10 rounded-lg px-2 text-xs text-white/70 outline-none"
                >
                  <option value="">All</option>
                  {availableCountries.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2 items-center">
              <input type="number" step="0.01" placeholder="Min $" value={priceMin} onChange={e => setPriceMin(e.target.value)}
                className="flex-1 h-9 bg-[#111] border border-white/10 rounded-lg px-3 text-xs text-white/90 placeholder:text-white/40 outline-none"
                data-testid="input-price-min"
              />
              <span className="text-white/30 text-xs shrink-0">—</span>
              <input type="number" step="0.01" placeholder="Max $" value={priceMax} onChange={e => setPriceMax(e.target.value)}
                className="flex-1 h-9 bg-[#111] border border-white/10 rounded-lg px-3 text-xs text-white/90 placeholder:text-white/40 outline-none"
                data-testid="input-price-max"
              />
            </div>
            {activeFilters > 0 && (
              <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 transition-colors">
                <X className="h-3 w-3" /> Clear all filters
              </button>
            )}
          </div>
        )}

        {/* Buy Selected button */}
        <button
          onClick={purchaseCart}
          disabled={cartCardIds.size === 0 || !!cartPurchasing}
          className="w-full flex items-center justify-center gap-2 h-10 rounded-xl border text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: cartCardIds.size > 0 ? "rgba(45,106,45,0.08)" : "#f3f4f6",
            borderColor: cartCardIds.size > 0 ? "rgba(45,106,45,0.3)" : "#e5e7eb",
            color: cartCardIds.size > 0 ? "#2d6a2d" : "#9ca3af",
          }}
          data-testid="btn-add-selected"
        >
          {cartPurchasing && !cartPurchasing.done ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Purchasing {cartPurchasing.current}/{cartPurchasing.total}...
            </>
          ) : (
            <>
              <ShoppingCart className="h-4 w-4" />
              Buy Selected ({cartCardIds.size}){cartCardIds.size > 0 ? ` · $${(cartTotal / 100).toFixed(2)}` : ""}
            </>
          )}
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto bg-[#0a0a0a]">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-white/30" />
          </div>
        ) : filteredCards.length === 0 ? (
          <div className="py-16 text-center text-sm text-white/40">No cards available</div>
        ) : (
          <table className="w-full text-sm border-collapse" style={{ minWidth: "560px" }}>
            <thead>
              <tr className="border-b border-white/10">
                <th className="w-10 px-3 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={filteredCards.length > 0 && cartCardIds.size === filteredCards.length}
                    onChange={toggleAll}
                    className="w-4 h-4 rounded border-white/15 cursor-pointer accent-green-500"
                    data-testid="checkbox-all"
                  />
                </th>
                <th className="px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-white/40">BIN</th>
                <th className="px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-white/40">TYPE</th>
                <th className="px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-white/40">BANK</th>
                <th className="px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-white/40">ZIP</th>
                <th className="px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-white/40">COUNTRY</th>
                <th className="px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-white/40">ST</th>
                <th className="px-3 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-white/40">PRICE</th>
                <th className="px-3 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-white/40">BUY</th>
              </tr>
            </thead>
            <tbody>
              {filteredCards.map((card: any) => (
                <CardTableRow
                  key={card.id}
                  card={card}
                  inCart={cartCardIds.has(card.id)}
                  onToggleCart={toggleCart}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function CardTableRow({ card, inCart, onToggleCart }: { card: any; inCart: boolean; onToggleCart: (c: any) => void }) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const bin = extractBin(card.cardNumber);
  const zip = extractZip(card.extras ?? "");
  const flag = countryFlag(card.binData?.countryCode ?? "");
  const state = extractState(card.extras ?? "");
  const cardType = formatType(card.binData);
  const bank = formatBank(card.binData);

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
    <tr
      className={`border-b border-white/8 transition-colors ${inCart ? "bg-green-50" : "hover:bg-[#0d0d0d]"}`}
      data-testid={`card-row-${card.id}`}
    >
      <td className="px-3 py-3">
        <input
          type="checkbox"
          checked={inCart}
          onChange={() => onToggleCart(card)}
          className="w-4 h-4 rounded border-white/15 cursor-pointer accent-green-500"
          data-testid={`checkbox-card-${card.id}`}
        />
      </td>
      <td className="px-3 py-3">
        <span className="font-bold font-mono text-sm text-white">{bin || "—"}</span>
      </td>
      <td className="px-3 py-3">
        <span className="text-xs font-mono text-white/60">{cardType || "—"}</span>
      </td>
      <td className="px-3 py-3 max-w-[140px]">
        <span className="text-xs text-white/60 truncate block">{bank || "—"}</span>
      </td>
      <td className="px-3 py-3">
        <span className="text-xs font-mono text-white/60">{zip || "—"}</span>
      </td>
      <td className="px-3 py-3">
        <span className="text-lg leading-none">{flag || "—"}</span>
      </td>
      <td className="px-3 py-3">
        <span className="text-xs font-mono text-white/60">{state || "—"}</span>
      </td>
      <td className="px-3 py-3 text-right">
        <span className="font-bold text-sm text-white">${(card.price / 100).toFixed(2)}</span>
      </td>
      <td className="px-3 py-3 text-right">
        <button
          onClick={() => purchaseMutation.mutate()}
          disabled={purchaseMutation.isPending}
          className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-white/10 bg-[#111]/5 hover:bg-[#111]/8 text-white/60 transition-colors disabled:opacity-50"
          data-testid={`btn-buy-card-${card.id}`}
        >
          {purchaseMutation.isPending
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : <ShoppingCart className="h-3.5 w-3.5" />
          }
        </button>
      </td>
    </tr>
  );
}
