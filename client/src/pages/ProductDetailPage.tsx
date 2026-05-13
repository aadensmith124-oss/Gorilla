import { useProducts } from "@/hooks/use-products";
import { useRoute, useLocation } from "wouter";
import { Loader2, Minus, Plus, X } from "lucide-react";
import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TIER_ORDER = ["top", "fresh", "bronze"];
const TIER_LABEL: Record<string, string> = {
  top: "🔥 Top Seller 🔥",
  fresh: "🍺 Fresh Seller 🍺",
  bronze: "🍟 Bronze Seller 🍟",
};

function groupByTier(sellers: any[]): { type: string; label: string; stock: number; ids: number[] }[] {
  const map: Record<string, { stock: number; ids: number[] }> = {};
  for (const s of sellers) {
    const type = s.sellerType ?? "bronze";
    if (!map[type]) map[type] = { stock: 0, ids: [] };
    map[type].stock += s.stockCount ?? 0;
    map[type].ids.push(s.id);
  }
  return TIER_ORDER
    .filter((t) => map[t])
    .map((t) => ({ type: t, label: TIER_LABEL[t] ?? t, stock: map[t].stock, ids: map[t].ids }));
}

export default function ProductDetailPage() {
  const [, params] = useRoute("/product/:name");
  const [, setLocation] = useLocation();
  const name = decodeURIComponent(params?.name || "");
  const { data: products } = useProducts();
  const product = products?.find((p: any) => p.name === name);
  const isLoading = !products;
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const { toast } = useToast();

  const selectedVariant = product?.variants.find((v: any) => v.id.toString() === selectedVariantId);
  const minQty = selectedVariant?.minQuantity || 1;
  const totalAmount = selectedVariant ? selectedVariant.price * quantity : 0;

  const { data: sellers } = useQuery<any[]>({
    queryKey: ["/api/variants", selectedVariantId, "sellers"],
    queryFn: async () => {
      const res = await fetch(`/api/variants/${selectedVariantId}/sellers`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!selectedVariantId,
  });

  const tiers = sellers && sellers.length > 0 ? groupByTier(sellers) : [];

  useEffect(() => {
    if (selectedVariant) setQuantity(Math.max(minQty, 1));
    setSelectedTier(null);
  }, [selectedVariantId, minQty]);

  if (isLoading) return <div className="flex h-screen items-center justify-center bg-[#090a0c]"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!product) return <div className="p-8 text-center text-white/50 text-sm">Product not found</div>;

  const purchaseMutation = useMutation({
    mutationFn: async () => {
      if (!selectedVariant) throw new Error("Select an option first");
      if (quantity < minQty) throw new Error(`Minimum order is ${minQty}`);
      const body: any = {
        items: [{ variantId: selectedVariant.id, quantity }],
        cardIds: [],
      };
      // Pick a random seller from the selected tier
      if (selectedTier && sellers) {
        const tierSellers = sellers.filter((s: any) => (s.sellerType ?? "bronze") === selectedTier);
        if (tierSellers.length > 0) {
          body.sellerId = tierSellers[Math.floor(Math.random() * tierSellers.length)].id;
        }
      }
      const res = await apiRequest("POST", "/api/orders", body);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Purchase failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({ title: "Purchase complete", description: "Delivered to your orders" });
      setLocation("/orders");
    },
    onError: (e: Error) => {
      toast({ title: "Purchase failed", description: e.message, variant: "destructive" });
    },
  });

  return (
    <div className="min-h-screen bg-[#090a0c] flex items-start justify-center p-4 pt-8">
      <div className="w-full max-w-sm bg-[#111318] rounded-2xl border border-white/[0.07] overflow-hidden shadow-2xl">

        {/* Header */}
        <div className="flex items-start justify-between px-4 py-4 gap-3">
          <span className="text-sm font-bold text-white leading-snug">{product.name}</span>
          <button
            onClick={() => setLocation("/")}
            className="flex-shrink-0 mt-0.5 text-white/40 hover:text-white transition-colors"
            data-testid="button-close-product"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-4 pb-4 space-y-4">
          {/* Description */}
          {product.description ? (
            <div className="space-y-1.5">
              <p className="text-xs text-white/40">Description</p>
              <p className="text-xs text-white/80 leading-relaxed whitespace-pre-wrap">{product.description}</p>
            </div>
          ) : null}

          {/* Available options */}
          <div className="space-y-1.5">
            <p className="text-xs text-white/40">Available options</p>
            <Select onValueChange={setSelectedVariantId} value={selectedVariantId || undefined}>
              <SelectTrigger className="w-full h-10 bg-[#1a1d24] border-white/[0.07] text-white text-xs rounded-lg" data-testid="select-variant">
                <SelectValue placeholder="Select an option" />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1d24] border-white/[0.08] text-white">
                {product.variants.map((v: any) => {
                  const outOfStock = v.stockCount === 0;
                  return (
                    <SelectItem
                      key={v.id}
                      value={v.id.toString()}
                      disabled={outOfStock}
                      className="text-xs cursor-pointer hover:bg-white/5 focus:bg-white/5"
                    >
                      <span className={`font-bold ${outOfStock ? "text-white/30" : "text-white"}`}>
                        {v.comparePrice && v.comparePrice > v.price && (
                          <span className="line-through text-white/40 font-normal mr-1">${(v.comparePrice / 100).toFixed(2)}</span>
                        )}
                        ${(v.price / 100).toFixed(2)} — {v.name}
                        {outOfStock && <span className="ml-2 text-red-400 font-normal">(not in stock)</span>}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            {/* Tier chips — one per seller tier with combined stock */}
            {selectedVariantId && tiers.length > 0 && (
              <div className="flex flex-col gap-1.5 pt-1">
                {tiers.map((tier) => {
                  const isSelected = selectedTier === tier.type;
                  return (
                    <button
                      key={tier.type}
                      onClick={() => setSelectedTier(isSelected ? null : tier.type)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-xs transition-all ${
                        isSelected
                          ? "border-primary/50 bg-primary/10 text-white"
                          : "border-white/[0.07] bg-[#1a1d24] text-white/70 hover:border-white/20 hover:text-white"
                      }`}
                      data-testid={`btn-tier-${tier.type}`}
                    >
                      <span className="font-bold">{tier.label}</span>
                      <span className={`text-[10px] font-mono ${isSelected ? "text-primary" : "text-white/30"}`}>
                        {tier.stock} in stock
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quantity */}
          <div className="space-y-1.5">
            <p className="text-xs text-white/40">Quantity</p>
            <div className="flex items-center h-10 bg-[#1a1d24] border border-white/[0.07] rounded-lg overflow-hidden w-full">
              <button
                onClick={() => setQuantity(prev => Math.max(minQty, prev - 1))}
                className="h-full px-3 text-white/50 hover:text-white hover:bg-white/5 transition-colors border-r border-white/[0.07] text-base font-medium"
                data-testid="button-qty-decrease"
              >
                <Minus className="h-3 w-3" />
              </button>
              <span className="flex-1 text-center text-sm text-white font-mono">{quantity}</span>
              <button
                onClick={() => setQuantity(prev => prev + 1)}
                className="h-full px-3 text-white/50 hover:text-white hover:bg-white/5 transition-colors border-l border-white/[0.07] text-base font-medium"
                data-testid="button-qty-increase"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* Total amount */}
          <div className="space-y-1">
            <p className="text-xs text-white/40">Total amount</p>
            <p className="text-lg font-bold text-primary">
              {totalAmount > 0 ? `$${(totalAmount / 100).toFixed(2)}` : "—"}
            </p>
          </div>

          {/* Purchase button */}
          <button
            onClick={() => purchaseMutation.mutate()}
            disabled={!selectedVariantId || purchaseMutation.isPending}
            className="w-full h-9 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 active:scale-[0.98] bg-primary text-black"
            data-testid="button-purchase"
          >
            {purchaseMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : `Purchase ${totalAmount > 0 ? `$${(totalAmount / 100).toFixed(2)}` : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}
