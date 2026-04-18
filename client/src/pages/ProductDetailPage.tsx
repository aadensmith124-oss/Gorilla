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
  const totalAmount = selectedVariant ? selectedVariant.price * quantity : 0;

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
                        ${(v.price / 100).toFixed(2)} — {v.name}
                        {outOfStock && <span className="ml-2 text-red-400 font-normal">(not in stock)</span>}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
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

          {/* Bottom actions */}
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={handleAddToCart}
              disabled={!selectedVariantId}
              className="flex-1 h-10 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 active:scale-[0.98] bg-primary text-black"
              data-testid="button-add-to-cart"
            >
              <ShoppingCart className="h-3.5 w-3.5" />
              Add To Cart
            </button>

            <button
              onClick={() => setLocation("/cart")}
              className="text-xs text-white/50 hover:text-white transition-colors whitespace-nowrap"
              data-testid="button-view-cart"
            >
              View cart
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
