import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, ChevronDown, ChevronUp, Loader2, Store } from "lucide-react";
import { Link, useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";

const SELLER_BADGE: Record<string, string> = {
  bronze: "🍟",
  fresh: "🍺",
  top: "🔥",
};

function extractBin(cardNumber: string): string {
  return (cardNumber ?? "").replace(/\D/g, "").substring(0, 6);
}

function BinInfo({ bin }: { bin: string }) {
  const { data } = useQuery<{ bin: string; bank?: string; scheme?: string; type?: string; country?: string; countryCode?: string }>({
    queryKey: [`/api/bin/${bin}`],
    enabled: !!bin && bin.length === 6,
    staleTime: 1000 * 60 * 60,
  });

  return (
    <div className="flex items-center gap-2 font-mono text-[11px] text-white/40">
      <span className="border border-white/20 px-1.5 py-0.5 rounded text-white/60 text-[11px]">{bin}</span>
      {data?.bank && <span>{data.bank}</span>}
      {data?.country && <span>{data.country}</span>}
      {data?.countryCode && <span>{data.countryCode}</span>}
    </div>
  );
}

function CardRow({ card }: { card: any }) {
  const [expanded, setExpanded] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const bin = extractBin(card.cardNumber);

  const emoji = SELLER_BADGE[card.sellerType] ?? null;
  const displayName = card.sellerDisplayName?.trim() || null;
  const sellerLabel = card.userId && emoji && displayName
    ? `${emoji} ${displayName} ${emoji}`
    : null;

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
      toast({ title: "Purchase complete", description: "Card delivered to your orders" });
      setLocation("/orders");
    },
    onError: (e: Error) => {
      toast({ title: "Purchase failed", description: e.message, variant: "destructive" });
    },
  });

  return (
    <div className="border border-white/8 bg-[#0f0f0f] rounded mb-2 overflow-hidden">
      <div className="px-4 py-3 space-y-1.5">
        {/* Row 1: Title + price */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            {sellerLabel ? (
              <p className="text-sm font-bold text-white tracking-wide leading-tight font-mono uppercase">{sellerLabel}</p>
            ) : (
              <p className="text-sm font-bold text-white font-mono uppercase truncate">{card.maskedCard}</p>
            )}
            {card.isFirstHand && (
              <span className="text-[10px] text-primary font-bold border border-primary/40 px-1 rounded flex-shrink-0">N</span>
            )}
          </div>
          <p className="text-sm font-mono font-bold text-white flex-shrink-0">${(card.price / 100).toFixed(2)}</p>
        </div>

        {/* Row 2: Card type / extras */}
        {card.extras && (
          <p className="text-[11px] text-white/35 uppercase tracking-wide">{card.extras}</p>
        )}

        {/* Row 3: BIN info */}
        {bin && <BinInfo bin={bin} />}

        {/* Row 4: Buttons */}
        <div className="flex gap-1.5 pt-0.5">
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
            <p className="text-[11px] text-white/40">Format: Digital</p>
            <p className="text-[11px] text-white/40">Delivery: Instant after purchase</p>
            <p className="text-[11px] text-white/20 mt-1">Full card content delivered to your orders instantly.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CardsPage() {
  const [search, setSearch] = useState("");
  const [countryFilter, setCountryFilter] = useState("all");

  const { data: cards, isLoading } = useQuery<any[]>({
    queryKey: ["/api/cards"],
  });

  const countries = useMemo(() => {
    if (!cards) return [];
    return Array.from(new Set(cards.map((c: any) => c.country).filter(Boolean))).sort() as string[];
  }, [cards]);

  const filteredCards = useMemo(() => {
    if (!cards) return [];
    return cards.filter((card: any) => {
      const matchCountry = countryFilter === "all" || card.country === countryFilter;
      const matchSearch = !search
        || card.maskedCard?.toLowerCase().includes(search.toLowerCase())
        || card.country?.toLowerCase().includes(search.toLowerCase())
        || card.cardNumber?.startsWith(search)
        || (card.sellerDisplayName || "").toLowerCase().includes(search.toLowerCase());
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

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
          <input
            type="text"
            placeholder="Search by BIN, country..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#111] border border-white/5 rounded py-2 pl-9 pr-3 text-xs text-white placeholder:text-white/25 outline-none focus:border-white/10 transition-colors"
            data-testid="input-search"
          />
        </div>
        <Select value={countryFilter} onValueChange={setCountryFilter}>
          <SelectTrigger className="w-36 bg-[#111] border-white/5 text-white/60 h-9 text-xs" data-testid="select-country">
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent className="bg-[#111] border-white/10 text-white text-xs">
            <SelectItem value="all">All Countries</SelectItem>
            {countries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div>
        {filteredCards.length === 0 ? (
          <div className="py-16 text-center text-white/25 text-xs">No cards available</div>
        ) : (
          filteredCards.map((card: any) => (
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
