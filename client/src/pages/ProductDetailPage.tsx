import { useProducts } from "@/hooks/use-products";
import { useRoute, useLocation } from "wouter";
import { Loader2, Minus, Plus, X, ShoppingCart } from "lucide-react";
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
      <div className="w-full max-w-sm bg-[#0d1017] rounded-xl border border-white/[0.06] overflow-hidden shadow-xl">

        <div className="flex items-center justify-between px-3.5 py-3 border-b border-white/[0.05]">
          <span className="text-sm font-semibold text-white leading-tight pr-6 truncate">{product.name}</span>
          <button
            onClick={() => setLocation("/")}
            className="flex-shrink-0 text-white/30 hover:text-white transition-colors"
            data-testid="button-close-product"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="p-3.5 space-y-3">
          {product.description ? (
            <div className="bg-white/[0.03] border border-white/[0.05] px-3 py-2.5 rounded-lg">
              <p className="text-[11px] text-white/50 leading-relaxed whitespace-pre-wrap">{product.description}</p>
            </div>
          ) : null}

          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold text-white/40 uppercase tracking-widest">Option</p>
            <Select onValueChange={setSelectedVariantId} value={selectedVariantId || undefined}>
              <SelectTrigger className="w-full h-9 bg-[#151b26] border-white/[0.06] text-white text-xs" data-testid="select-variant">
                <SelectValue placeholder="Select an option" />
              </SelectTrigger>
              <SelectContent className="bg-[#151b26] border-white/[0.08] text-white">
                {product.variants.map((v: any) => (
                  <SelectItem
                    key={v.id}
                    value={v.id.toString()}
                    className="text-xs hover:bg-white/5 focus:bg-white/5 cursor-pointer"
                  >
                    ${(v.price / 100).toFixed(2)} — {v.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold text-white/40 uppercase tracking-widest">Quantity</p>
            <div className="inline-flex items-center gap-2.5 p-1 bg-[#151b26] rounded-lg border border-white/[0.06]">
              <button
                onClick={() => setQuantity(prev => Math.max(minQty, prev - 1))}
                className="h-6 w-6 flex items-center justify-center rounded bg-white/5 hover:bg-primary/20 hover:text-primary text-white/60 transition-colors"
                data-testid="button-qty-decrease"
              >
                <Minus className="h-2.5 w-2.5" />
              </button>
              <span className="w-6 text-center text-xs font-bold text-white font-mono">{quantity}</span>
              <button
                onClick={() => setQuantity(prev => prev + 1)}
                className="h-6 w-6 flex items-center justify-center rounded bg-white/5 hover:bg-primary/20 hover:text-primary text-white/60 transition-colors"
                data-testid="button-qty-increase"
              >
                <Plus className="h-2.5 w-2.5" />
              </button>
            </div>
          </div>

          <div className="space-y-1.5 pt-1">
            <button
              onClick={handleAddToCart}
              disabled={!selectedVariantId}
              className="w-full h-9 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
              style={{
                background: "linear-gradient(135deg, hsl(38,82%,52%), hsl(30,90%,40%))",
                color: "#0a0a0a",
              }}
              data-testid="button-add-to-cart"
            >
              <ShoppingCart className="h-3.5 w-3.5" />
              Add to Cart
            </button>

            <button
              onClick={handleBuyNow}
              disabled={!selectedVariantId}
              className="w-full h-9 rounded-lg bg-transparent border border-white/[0.08] text-white/70 text-xs hover:bg-white/5 hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              data-testid="button-buy-now"
            >
              Buy Now
            </button>

            <button
              onClick={() => setLocation("/cart")}
              className="w-full h-9 rounded-lg bg-transparent text-white/30 text-xs hover:text-white/60 transition-colors"
              data-testid="button-view-cart"
            >
              View Cart
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
