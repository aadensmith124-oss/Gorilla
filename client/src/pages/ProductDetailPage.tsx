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

  if (isLoading) return (
    <div className="flex h-screen items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
  if (!product) return <div className="p-8 text-center text-white">Product not found</div>;

  const handleAddToCart = () => {
    if (!selectedVariant) {
      toast({ title: "Select an option", description: "Please choose a variant first", variant: "destructive" });
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

  const handleViewCart = () => {
    setLocation("/cart");
  };

  const priceDisplay = selectedVariant
    ? `$${(selectedVariant.price / 100).toFixed(2)}`
    : product.variants.length > 0
    ? `$${(Math.min(...product.variants.map((v: any) => v.price)) / 100).toFixed(2)}`
    : "$0.00";

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-[#0d1017] rounded-xl border border-white/8 overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
          <button onClick={() => setLocation("/")} className="text-xs text-muted-foreground hover:text-white transition-colors">
            Add to cart
          </button>
          <button
            onClick={() => setLocation("/")}
            className="h-7 w-7 flex items-center justify-center rounded text-muted-foreground hover:text-white transition-colors"
            data-testid="button-close-product"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 pt-5 pb-1">
          <h1 className="text-xl font-bold text-white tracking-tight">{product.name}</h1>
        </div>

        <div className="px-5 py-4 space-y-5">
          {product.description && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium">About product</p>
              <div className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap font-medium">
                {product.description}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium">Available options</p>
            <Select onValueChange={setSelectedVariantId} value={selectedVariantId || undefined}>
              <SelectTrigger className="w-full h-11 bg-[#151b26] border-white/8 text-white text-sm" data-testid="select-variant">
                <SelectValue placeholder="Select an option..." />
              </SelectTrigger>
              <SelectContent className="bg-[#151b26] border-white/10 text-white">
                {product.variants.map((v: any) => (
                  <SelectItem
                    key={v.id}
                    value={v.id.toString()}
                    className="hover:bg-white/5 focus:bg-white/5 cursor-pointer text-sm"
                  >
                    {v.name} - Price: ${(v.price / 100).toFixed(2)}
                    {v.minQuantity > 1 ? ` (min ${v.minQuantity})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium">
              Amount to add {minQty > 1 && <span className="text-primary normal-case">(min {minQty})</span>}
            </p>
            <div className="flex items-center gap-3 bg-[#151b26] border border-white/8 rounded-lg px-4 py-2">
              <button
                onClick={() => setQuantity(prev => Math.max(minQty, prev - 1))}
                className="h-7 w-7 flex items-center justify-center rounded bg-white/5 hover:bg-white/10 text-white transition-colors"
                data-testid="button-qty-decrease"
              >
                <Minus className="h-3 w-3" />
              </button>
              <span className="flex-1 text-center text-sm font-bold text-white font-mono">{quantity}</span>
              <div className="text-xs text-muted-foreground font-mono ml-auto pr-2">$</div>
              <span className="text-sm font-bold text-white font-mono">{(((selectedVariant?.price || 0) * quantity) / 100).toFixed(2)}</span>
              <button
                onClick={() => setQuantity(prev => prev + 1)}
                className="h-7 w-7 flex items-center justify-center rounded bg-white/5 hover:bg-white/10 text-white transition-colors"
                data-testid="button-qty-increase"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
          </div>

          <div className="space-y-2.5 pt-1">
            <button
              onClick={handleAddToCart}
              disabled={!selectedVariantId}
              className="w-full h-11 rounded-lg bg-[#1a3ecf] hover:bg-[#1e4aed] text-white font-bold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              data-testid="button-add-to-cart"
            >
              <ShoppingCart className="h-4 w-4" />
              Add to cart
            </button>

            <button
              onClick={handleViewCart}
              className="w-full h-11 rounded-lg bg-[#1a3ecf]/20 border border-[#1a3ecf]/40 text-[#5b82f5] hover:bg-[#1a3ecf]/30 font-bold text-sm transition-colors"
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
