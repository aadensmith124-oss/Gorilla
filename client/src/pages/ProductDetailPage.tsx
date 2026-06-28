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

export default function ProductDetailPage() {
  const [, params] = useRoute("/product/:name");
  const [, setLocation] = useLocation();
  const name = decodeURIComponent(params?.name || "");
  const { data: products } = useProducts();
  const product = products?.find((p: any) => p.name === name);
  const isLoading = !products;
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const { toast } = useToast();

  const selectedVariant = product?.variants.find((v: any) => v.id.toString() === selectedVariantId);
  const minQty = selectedVariant?.minQuantity || 1;
  const maxQty = selectedVariant?.stockCount ?? 999;
  const totalAmount = selectedVariant ? selectedVariant.price * quantity : 0;

  const { data: rankData } = useQuery<any>({ queryKey: ["/api/user/rank"] });
  const rankDiscountPct = rankData?.discountPct ?? 0;
  const discountedAmount = rankDiscountPct > 0 && totalAmount > 0
    ? Math.round(totalAmount * (1 - rankDiscountPct / 100))
    : totalAmount;

  useEffect(() => {
    if (selectedVariant) setQuantity(Math.min(Math.max(minQty, 1), maxQty));
  }, [selectedVariantId, minQty, maxQty]);

  if (isLoading) return <div className="flex h-screen items-center justify-center bg-gray-50"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!product) return <div className="p-8 text-center text-gray-500 text-sm">Product not found</div>;

  const purchaseMutation = useMutation({
    mutationFn: async () => {
      if (!selectedVariant) throw new Error("Select an option first");
      if (quantity < minQty) throw new Error(`Minimum order is ${minQty}`);
      const body: any = {
        items: [{ variantId: selectedVariant.id, quantity }],
        cardIds: [],
      };
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
    <div className="min-h-screen bg-gray-50 flex items-start justify-center p-4 pt-8">
      <div className="w-full max-w-sm bg-gray-50 rounded-2xl border border-gray-200 overflow-hidden shadow-2xl">

        {/* Header */}
        <div className="flex items-start justify-between px-4 py-4 gap-3">
          <span className="text-sm font-bold text-white leading-snug">{product.name}</span>
          <button
            onClick={() => setLocation("/")}
            className="flex-shrink-0 mt-0.5 text-gray-500 hover:text-white transition-colors"
            data-testid="button-close-product"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-4 pb-4 space-y-4">
          {/* Description */}
          {product.description ? (
            <div className="space-y-1.5">
              <p className="text-xs text-gray-500">Description</p>
              <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">{product.description}</p>
            </div>
          ) : null}

          {/* Variant select */}
          <div className="space-y-1.5">
            <p className="text-xs text-gray-500">Available options</p>
            <Select onValueChange={setSelectedVariantId} value={selectedVariantId || undefined}>
              <SelectTrigger className="w-full h-10 bg-gray-50 border-gray-200 text-gray-900 text-xs rounded-lg" data-testid="select-variant">
                <SelectValue placeholder="Select an option" />
              </SelectTrigger>
              <SelectContent className="bg-gray-50 border-gray-200 text-gray-900">
                {product.variants.map((v: any) => {
                  const outOfStock = v.stockCount === 0;
                  return (
                    <SelectItem
                      key={v.id}
                      value={v.id.toString()}
                      disabled={outOfStock}
                      className="text-xs cursor-pointer hover:bg-gray-50 focus:bg-gray-50"
                    >
                      <span className={`font-bold ${outOfStock ? "text-gray-400" : "text-gray-900"}`}>
                        {v.comparePrice && v.comparePrice > v.price && (
                          <span className="line-through text-gray-500 font-normal mr-1">${(v.comparePrice / 100).toFixed(2)}</span>
                        )}
                        ${(v.price / 100).toFixed(2)} — {v.name}
                        {outOfStock && <span className="ml-2 text-red-400 font-normal">(out of stock)</span>}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Quantity */}
          <div className="space-y-1.5">
            <p className="text-xs text-gray-500">Quantity</p>
            <div className="flex items-center h-10 bg-gray-50 border border-gray-200 rounded-lg overflow-hidden w-full">
              <button
                onClick={() => setQuantity(prev => Math.max(minQty, prev - 1))}
                disabled={quantity <= minQty}
                className="h-full px-3 text-gray-500 hover:text-white hover:bg-gray-50 transition-colors border-r border-gray-200 text-base font-medium disabled:opacity-30 disabled:cursor-not-allowed"
                data-testid="button-qty-decrease"
              >
                <Minus className="h-3 w-3" />
              </button>
              <span className="flex-1 text-center text-sm text-gray-900 font-mono">{quantity}</span>
              <button
                onClick={() => setQuantity(prev => Math.min(maxQty, prev + 1))}
                disabled={quantity >= maxQty}
                className="h-full px-3 text-gray-500 hover:text-white hover:bg-gray-50 transition-colors border-l border-gray-200 text-base font-medium disabled:opacity-30 disabled:cursor-not-allowed"
                data-testid="button-qty-increase"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* Total amount */}
          <div className="space-y-1">
            <p className="text-xs text-gray-500">Total amount</p>
            <div className="flex items-baseline gap-2">
              <p className="text-lg font-bold text-primary">
                {discountedAmount > 0 ? `$${(discountedAmount / 100).toFixed(2)}` : "—"}
              </p>
              {rankDiscountPct > 0 && discountedAmount < totalAmount && (
                <span className="text-xs text-gray-400 line-through">${(totalAmount / 100).toFixed(2)}</span>
              )}
              {rankDiscountPct > 0 && discountedAmount < totalAmount && (
                <span className="text-[10px] text-amber-400 font-bold">{rankDiscountPct}% off</span>
              )}
            </div>
          </div>

          {/* Purchase button */}
          <button
            onClick={() => purchaseMutation.mutate()}
            disabled={!selectedVariantId || purchaseMutation.isPending}
            className="w-full h-9 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 active:scale-[0.98] bg-primary text-black"
            data-testid="button-purchase"
          >
            {purchaseMutation.isPending
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : `Purchase${discountedAmount > 0 ? ` $${(discountedAmount / 100).toFixed(2)}` : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}
