import { useProduct } from "@/hooks/use-products";
import { useRoute, useLocation } from "wouter";
import { Loader2, ShoppingCart, Minus, Plus, X, ChevronDown } from "lucide-react";
import { useState } from "react";
import { useCart } from "@/hooks/use-cart";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function ProductDetailPage() {
  const [, params] = useRoute("/product/:id");
  const [, setLocation] = useLocation();
  const id = parseInt(params?.id || "0");
  const { data: product, isLoading } = useProduct(id);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const { addItem } = useCart();
  const { toast } = useToast();

  if (isLoading) return <div className="flex h-screen items-center justify-center bg-[#090a0c]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!product) return <div className="p-8 text-center text-white">Product not found</div>;

  const selectedVariant = product.variants.find(v => v.id.toString() === selectedVariantId);

  const handleAddToCart = () => {
    if (!selectedVariant) {
      toast({ title: "Error", description: "Please select an option", variant: "destructive" });
      return;
    }
    addItem({
      variantId: selectedVariant.id,
      productId: product.id,
      productName: product.name,
      variantName: selectedVariant.name,
      price: selectedVariant.price,
      quantity: quantity,
      image: product.image
    });
    toast({ title: "Added to cart", description: `${quantity}x ${product.name} (${selectedVariant.name})` });
  };

  const handleBuyNow = () => {
    handleAddToCart();
    setLocation("/cart");
  };

  return (
    <div className="min-h-screen bg-[#090a0c] flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-[#16181d] rounded-2xl border border-white/5 overflow-hidden relative shadow-2xl">
        <div className="p-6 border-b border-white/5 flex justify-between items-start">
          <h1 className="text-xl font-display font-black tracking-tight text-white uppercase pr-8 leading-tight">
            {product.name}
          </h1>
          <button 
            onClick={() => setLocation("/")}
            className="p-1 rounded bg-white/5 text-muted-foreground hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-destructive/10 border border-destructive/30 p-4 rounded-xl space-y-2">
            <p className="text-xs font-bold text-destructive uppercase tracking-widest">PURCHASE {product.name.toUpperCase()} BULK FOR THE CHEAPEST</p>
            <p className="text-xs text-destructive/80 leading-relaxed">AFTER PURCHASE YOU WILL WAIT UP TO 4 HOURS FOR AN ADMIN TO PUSH YOUR ORDER</p>
            <p className="text-xs text-destructive/80">ANY SUPPORT PLEASE CONTACT @OMZRII ON TELEGRAM</p>
          </div>
          <div className="space-y-3">
            <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">About Product</h3>
            <div className="text-sm text-[#9ca3af] leading-relaxed whitespace-pre-wrap">
              {product.description || "No description available."}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Available Options</h3>
            <Select onValueChange={setSelectedVariantId} value={selectedVariantId || undefined}>
              <SelectTrigger className="w-full h-12 bg-[#1c1f26] border-white/5 text-white font-bold uppercase tracking-wide">
                <SelectValue placeholder="SELECT AN OPTION" />
              </SelectTrigger>
              <SelectContent className="bg-[#1c1f26] border-white/5 text-white">
                {product.variants.map((v) => (
                  <SelectItem 
                    key={v.id} 
                    value={v.id.toString()}
                    disabled={v.stockCount === 0}
                    className="font-bold uppercase tracking-wide hover:bg-white/5 focus:bg-white/5 cursor-pointer"
                  >
                    ${(v.price / 100).toFixed(2)} - {v.name} {v.stockCount === 0 ? "(OUT OF STOCK)" : `(${v.stockCount} IN STOCK)`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Quantity</h3>
            <div className="inline-flex items-center gap-3 p-1.5 bg-[#1c1f26] rounded-xl border border-white/5">
              <button 
                onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
                className="h-8 w-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-white transition-colors"
              >
                <Minus className="h-3 w-3" />
              </button>
              <span className="w-10 text-center text-sm font-bold text-white font-mono">{quantity}</span>
              <button 
                onClick={() => setQuantity(prev => Math.min(selectedVariant?.stockCount || 99, prev + 1))}
                className="h-8 w-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-white transition-colors"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
          </div>

          <div className="space-y-3 pt-4">
            <button 
              onClick={handleAddToCart}
              disabled={!selectedVariantId}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-[#ff5f6d] to-[#ffc371] text-white font-black uppercase italic tracking-tighter text-sm shadow-lg shadow-orange-500/20 hover:scale-[0.98] transition-transform disabled:opacity-50 disabled:hover:scale-100"
            >
              Add to Cart
            </button>
            
            <button 
              onClick={handleBuyNow}
              disabled={!selectedVariantId}
              className="w-full h-12 rounded-xl bg-transparent border border-white/10 text-white font-black uppercase italic tracking-tighter text-sm hover:bg-white/5 transition-colors disabled:opacity-50"
            >
              Buy Now
            </button>

            <button 
              onClick={() => setLocation("/cart")}
              className="w-full h-12 rounded-xl bg-transparent border border-white/10 text-white font-black uppercase italic tracking-tighter text-sm hover:bg-white/5 transition-colors"
            >
              View Cart
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
