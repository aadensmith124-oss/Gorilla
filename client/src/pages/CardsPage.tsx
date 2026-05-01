import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card as CardType } from "@shared/schema";
import { useCart } from "@/hooks/use-cart";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShoppingCart, Search, ChevronDown, ChevronUp, SlidersHorizontal, Loader2, Store } from "lucide-react";
import { Link } from "wouter";

function extractBin(cardNumber: string): string {
  return cardNumber.replace(/\D/g, "").substring(0, 6);
}

function BinBadge({ bin }: { bin: string }) {
  const { data: binData } = useQuery<{ bin: string; bank?: string; scheme?: string; type?: string; country?: string }>({
    queryKey: [`/api/bin/${bin}`],
    enabled: !!bin && bin.length === 6,
    staleTime: 1000 * 60 * 60,
  });

  return (
    <div className="flex items-center gap-2 text-[11px] text-white/40 font-mono">
      <span className="bg-[#1a1a1a] border border-white/10 px-1.5 py-0.5 rounded text-white/60">{bin}</span>
      {binData?.bank && <span>{binData.bank}</span>}
      {binData?.country && <span className="text-white/30">{binData.country}</span>}
    </div>
  );
}

function CardRow({ card, onAddToCart, inCart }: { card: CardType; onAddToCart: () => void; inCart: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const bin = extractBin(card.cardNumber);

  return (
    <div className="border border-white/5 bg-[#111] rounded mb-2 overflow-hidden">
      <div className="p-3 space-y-2">
        {/* Top row: title + price */}
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-bold text-white uppercase leading-tight truncate">{card.maskedCard}</p>
              {card.isFirstHand && (
                <span className="text-[9px] text-primary font-bold">N</span>
              )}
            </div>
            <p className="text-[11px] text-white/40 uppercase">{card.extras || "DIGITAL"}</p>
          </div>
          <p className="text-sm font-mono font-bold text-white flex-shrink-0">${(card.price / 100).toFixed(2)}</p>
        </div>

        {/* BIN + location */}
        {bin && <BinBadge bin={bin} />}
        {card.country && <p className="text-[11px] text-white/30">{card.country}</p>}

        {/* Actions */}
        <div className="flex gap-1.5 mt-2">
          <button
            onClick={onAddToCart}
            disabled={inCart}
            className="flex items-center gap-1.5 border border-white/10 px-3 py-1.5 rounded text-xs text-white/60 hover:border-white/20 hover:text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            data-testid={`btn-add-card-${card.id}`}
          >
            <ShoppingCart className="h-3 w-3" />
            {inCart ? "in cart" : "add"}
          </button>
          <button
            onClick={onAddToCart}
            disabled={inCart}
            className="flex-1 bg-green-700 hover:bg-green-600 text-white rounded text-xs font-bold py-1.5 transition-colors disabled:opacity-40"
            data-testid={`btn-buy-card-${card.id}`}
          >
            {inCart ? "In Cart" : `Buy $${(card.price / 100).toFixed(2)}`}
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            className="border border-white/10 px-2 py-1.5 rounded text-xs text-white/40 hover:border-white/20 hover:text-white transition-all"
            data-testid={`btn-expand-card-${card.id}`}
          >
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        </div>

        {/* Expanded details */}
        {expanded && (
          <div className="mt-2 pt-2 border-t border-white/5 space-y-1">
            <p className="text-[11px] text-white/40">Format: Digital</p>
            <p className="text-[11px] text-white/40">Delivery: Instant after purchase</p>
            {card.expiry && <p className="text-[11px] text-white/40">Expiry: {card.expiry}</p>}
            <p className="text-[11px] text-white/20 mt-2">Card content will be delivered after purchase.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CardsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { addItem, items: cartItems } = useCart();
  const [search, setSearch] = useState("");
  const [countryFilter, setCountryFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  const { data: cards, isLoading } = useQuery<CardType[]>({
    queryKey: ["/api/cards"],
  });

  const handleAddToCart = (card: CardType) => {
    const alreadyInCart = cartItems.some(i => i.cardId === card.id);
    if (alreadyInCart) {
      toast({ title: "Already in cart", variant: "destructive" });
      return;
    }
    addItem({
      variantId: -card.id,
      productId: 0,
      productName: "Card",
      variantName: card.maskedCard,
      price: card.price,
      quantity: 1,
      image: "",
      cardId: card.id,
    });
    toast({ title: "Added to cart" });
  };

  const countries = useMemo(() => {
    if (!cards) return [];
    return Array.from(new Set(cards.map(c => c.country))).sort();
  }, [cards]);

  const filteredCards = useMemo(() => {
    if (!cards) return [];
    return cards.filter(card => {
      const matchCountry = countryFilter === "all" || card.country === countryFilter;
      const matchSearch = !search || card.maskedCard.toLowerCase().includes(search.toLowerCase()) || card.country?.toLowerCase().includes(search.toLowerCase()) || card.cardNumber.startsWith(search);
      return matchCountry && matchSearch;
    });
  }, [cards, countryFilter, search]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-3 py-4 space-y-3">
      {/* Support button */}
      <Link href="/support">
        <button className="w-full border border-white/5 rounded py-2 text-xs text-white/40 hover:border-white/10 hover:text-white/60 transition-all" data-testid="btn-support-link">
          support
        </button>
      </Link>

      {/* Cart button */}
      <Link href="/cart">
        <button className="w-full border border-white/5 rounded py-2 text-xs text-white/40 hover:border-white/10 hover:text-white/60 transition-all flex items-center justify-center gap-2" data-testid="btn-cart-link">
          <ShoppingCart className="h-3.5 w-3.5" />
          cart ({cartItems.length})
        </button>
      </Link>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
        <input
          type="text"
          placeholder="Search cards, base name, BIN, brand..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-[#111] border border-white/5 rounded py-2.5 pl-9 pr-4 text-sm text-white placeholder:text-white/25 outline-none focus:border-white/10 transition-colors"
          data-testid="input-search"
        />
      </div>

      {/* Category dropdown */}
      <Select value={countryFilter} onValueChange={setCountryFilter}>
        <SelectTrigger className="w-full bg-[#111] border-white/5 text-white/60 h-10" data-testid="select-country">
          <SelectValue placeholder="All Cards" />
        </SelectTrigger>
        <SelectContent className="bg-[#111] border-white/10 text-white">
          <SelectItem value="all">All Cards</SelectItem>
          {countries.map(c => (
            <SelectItem key={c} value={c}>{c}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Filters toggle */}
      <button
        onClick={() => setShowFilters(!showFilters)}
        className="w-full border border-white/5 rounded py-2 text-xs text-white/40 hover:border-white/10 hover:text-white/60 transition-all flex items-center justify-center gap-1.5"
        data-testid="btn-filters"
      >
        <SlidersHorizontal className="h-3.5 w-3.5" />
        filters
      </button>

      {/* Count */}
      <div className="border border-white/5 rounded py-2 text-center text-xs text-white/25">
        add selected (0)
      </div>

      {/* Cards list */}
      <div className="space-y-0">
        {filteredCards.length === 0 ? (
          <div className="py-16 text-center text-white/25 text-sm">No cards available</div>
        ) : (
          filteredCards.map(card => (
            <CardRow
              key={card.id}
              card={card}
              inCart={cartItems.some(i => i.cardId === card.id)}
              onAddToCart={() => handleAddToCart(card)}
            />
          ))
        )}
      </div>

      {/* Become Seller link */}
      <div className="pt-4 border-t border-white/5 text-center">
        <Link href="/become-seller">
          <button className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors mx-auto" data-testid="btn-become-seller-link">
            <Store className="h-3.5 w-3.5" />
            Become Seller
          </button>
        </Link>
      </div>
    </div>
  );
}
