import { useProducts } from "@/hooks/use-products";
import { useRoute, useLocation } from "wouter";
import { Loader2, Minus, Plus, X } from "lucide-react";
import { useState, useEffect } from "react";
import { useCart } from "@/hooks/use-cart";
import { useToast } from "@/hooks/use-toast";
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
  const { addItem } = useCart();
  const { toast } = useToast();

  const selectedVariant = product?.variants.find((v: any) => v.id.toString() === selectedVariantId);
  const minQty = selectedVariant?.minQuantity || 1;

  useEffect(() => {
    if (selectedVariant) {
      setQuantity(Math.max(minQty, 1));
    }
  }, [selectedVariantId, minQty]);

  if (isLoading) return <div className="flex h-screen items-center justify-center bg-[#090a0c]"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!product) return <div className="p-8 text-center text-white/50 text-sm">Product not found</div>;

  const handleAddToCart = () => {
    if (!selectedVariant) {
      toast({ title: "Select an option first", variant: "destructive" });
      return;
    }
    if (quantity < minQty) {
      toast({ title: "Minimum quantity", description: `Minimum order is ${minQty}`, variant: "destructive" });
      return;
    }
    addItem({
      variantId: selectedVariant.id,
      productId: product.id,
      productName: product.name,
      variantName: selectedVariant.name,
      price: selectedVariant.price,
      quantity,
      image: product.image ?? "",
      minQuantity: minQty,
    });
    toast({ title: "Added to cart", description: `${quantity}x ${product.name} (${selectedVariant.name})` });
  };

  const handleBuyNow = () => {
    if (!selectedVariant) {
      toast({ title: "Select an option first", variant: "destructive" });
      return;
    }
    handleAddToCart();
    setLocation("/cart");
  };

  return (
    <div className="min-h-screen bg-[#090a0c] flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-[#0d1017] rounded-2xl border border-white/[0.06] overflow-hidden shadow-2xl">

        {/* Header — centered title */}
        <div className="relative flex items-center justify-center px-10 py-3.5 border-b border-white/[0.05]">
          <span className="text-sm font-bold text-white text-center">{product.name}</span>
          <button
            onClick={() => setLocation("/")}
            className="absolute right-3 top-1/2 -translate-y-1/2 h-6 w-6 flex items-center justify-center rounded bg-white/8 text-white/40 hover:text-white transition-colors"
            data-testid="button-close-product"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Description */}
          {product.description ? (
            <div className="bg-white/[0.03] border border-white/[0.05] px-3 py-3 rounded-xl">
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-1.5">About Product</p>
              <p className="text-[11px] text-white/60 leading-relaxed whitespace-pre-wrap">{product.description}</p>
            </div>
          ) : null}

          {/* Options */}
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Available Options</p>
            <Select onValueChange={setSelectedVariantId} value={selectedVariantId || undefined}>
              <SelectTrigger className="w-full h-10 bg-[#151b26] border-white/[0.06] text-white text-xs" data-testid="select-variant">
                <SelectValue placeholder="Select an option" />
              </SelectTrigger>
              <SelectContent className="bg-[#151b26] border-white/[0.08] text-white">
                {product.variants.map((v: any) => (
                  <SelectItem
                    key={v.id}
                    value={v.id.toString()}
                    className="text-xs hover:bg-white/5 focus:bg-white/5 cursor-pointer"
                  >
                    ${(v.price / 100).toFixed(2)} - {v.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quantity */}
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Quantity</p>
            <div className="inline-flex items-center gap-0 rounded-lg border border-white/[0.08] overflow-hidden">
              <button
                onClick={() => setQuantity(prev => Math.max(minQty, prev - 1))}
                className="h-8 w-9 flex items-center justify-center bg-white/5 hover:bg-white/10 text-white/70 transition-colors border-r border-white/[0.08] text-sm font-bold"
                data-testid="button-qty-decrease"
              >
                -
              </button>
              <span className="w-10 text-center text-sm font-bold text-white font-mono">{quantity}</span>
              <button
                onClick={() => setQuantity(prev => prev + 1)}
                className="h-8 w-9 flex items-center justify-center bg-white/5 hover:bg-white/10 text-white/70 transition-colors border-l border-white/[0.08] text-sm font-bold"
                data-testid="button-qty-increase"
              >
                +
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-1">
            <button
              onClick={handleAddToCart}
              disabled={!selectedVariantId}
              className="w-full h-11 rounded-xl text-sm font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 active:scale-[0.98]"
              style={{
                background: "linear-gradient(135deg, #e53935, #c0392b)",
                color: "#fff",
                boxShadow: "0 6px 24px rgba(229,57,53,0.35)",
              }}
              data-testid="button-add-to-cart"
            >
              ADD TO CART
            </button>

            <button
              onClick={handleBuyNow}
              disabled={!selectedVariantId}
              className="w-full h-11 rounded-xl bg-[#1a1d24] border border-white/[0.10] text-white text-sm font-black uppercase tracking-widest hover:bg-white/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              data-testid="button-buy-now"
            >
              BUY NOW
            </button>

            <button
              onClick={() => setLocation("/cart")}
              className="w-full h-11 rounded-xl bg-[#1a1d24] border border-white/[0.10] text-white text-sm font-black uppercase tracking-widest hover:bg-white/5 transition-colors"
              data-testid="button-view-cart"
            >
              VIEW CART
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
