import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card as CardType } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, ChevronDown, ChevronUp, Loader2, Store } from "lucide-react";
import { Link, useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";

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

function CardRow({ card }: { card: CardType }) {
  const [expanded, setExpanded] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const bin = extractBin(card.cardNumber);

  const purchaseMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/cards/${card.id}/purchase`, {});
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Purchase failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/cards"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({ title: "Purchase complete", description: "Card delivered to your orders" });
      setLocation("/orders");
    },
    onError: (e: Error) => {
      toast({ title: "Purchase failed", description: e.message, variant: "destructive" });
    },
  });

  return (
    <div className="border border-white/5 bg-[#111] rounded mb-2 overflow-hidden">
      <div className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-bold text-white uppercase leading-tight truncate font-mono">{card.maskedCard}</p>
              {card.isFirstHand && (
                <span className="text-[9px] text-primary font-bold border border-primary/30 px-1 rounded">N</span>
              )}
            </div>
            {card.extras && <p className="text-[11px] text-white/40 uppercase">{card.extras}</p>}
          </div>
          <p className="text-sm font-mono font-bold text-white flex-shrink-0">${(card.price / 100).toFixed(2)}</p>
        </div>

        {bin && <BinBadge bin={bin} />}
        {card.country && <p className="text-[11px] text-white/30">{card.country}</p>}

        <div className="flex gap-1.5 mt-2">
          <button
            onClick={() => purchaseMutation.mutate()}
            disabled={purchaseMutation.isPending}
            className="flex-1 bg-primary hover:bg-primary/90 text-white rounded text-xs font-bold py-1.5 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
            data-testid={`btn-buy-card-${card.id}`}
          >
            {purchaseMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : `Purchase $${(card.price / 100).toFixed(2)}`}
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            className="border border-white/10 px-2 py-1.5 rounded text-xs text-white/40 hover:border-white/20 hover:text-white transition-all"
            data-testid={`btn-expand-card-${card.id}`}
          >
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        </div>

        {expanded && (
          <div className="mt-2 pt-2 border-t border-white/5 space-y-1">
            <p className="text-[11px] text-white/40">Format: Digital</p>
            <p className="text-[11px] text-white/40">Delivery: Instant after purchase</p>
            <p className="text-[11px] text-white/20 mt-2">Full card content delivered to your orders instantly.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CardsPage() {
  const [search, setSearch] = useState("");
  const [countryFilter, setCountryFilter] = useState("all");

  const { data: cards, isLoading } = useQuery<CardType[]>({
    queryKey: ["/api/cards"],
  });

  const countries = useMemo(() => {
    if (!cards) return [];
    return Array.from(new Set(cards.map(c => c.country).filter(Boolean))).sort();
  }, [cards]);

  const filteredCards = useMemo(() => {
    if (!cards) return [];
    return cards.filter(card => {
      const matchCountry = countryFilter === "all" || card.country === countryFilter;
      const matchSearch = !search
        || card.maskedCard.toLowerCase().includes(search.toLowerCase())
        || card.country?.toLowerCase().includes(search.toLowerCase())
        || card.cardNumber.startsWith(search);
      return matchCountry && matchSearch;
    });
  }, [cards, countryFilter, search]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-3 py-4 space-y-3">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-sm font-bold text-white">Cards</h1>
        <span className="text-xs text-white/30">{filteredCards.length} available</span>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
        <input
          type="text"
          placeholder="Search by BIN, country..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-[#111] border border-white/5 rounded py-2.5 pl-9 pr-4 text-sm text-white placeholder:text-white/25 outline-none focus:border-white/10 transition-colors"
          data-testid="input-search"
        />
      </div>

      {/* Country filter */}
      <Select value={countryFilter} onValueChange={setCountryFilter}>
        <SelectTrigger className="w-full bg-[#111] border-white/5 text-white/60 h-9 text-xs" data-testid="select-country">
          <SelectValue placeholder="All Countries" />
        </SelectTrigger>
        <SelectContent className="bg-[#111] border-white/10 text-white">
          <SelectItem value="all">All Countries</SelectItem>
          {countries.map(c => (
            <SelectItem key={c} value={c}>{c}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Cards list */}
      <div>
        {filteredCards.length === 0 ? (
          <div className="py-16 text-center text-white/25 text-sm">No cards available</div>
        ) : (
          filteredCards.map(card => (
            <CardRow key={card.id} card={card} />
          ))
        )}
      </div>

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
