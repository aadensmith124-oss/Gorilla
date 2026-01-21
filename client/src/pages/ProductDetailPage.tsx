import { useProduct } from "@/hooks/use-products";
import { useRoute, useLocation } from "wouter";
import { Loader2, ArrowLeft, ShoppingCart, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/hooks/use-cart";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";

export default function ProductDetailPage() {
  const [, params] = useRoute("/product/:id");
  const [, setLocation] = useLocation();
  const id = parseInt(params?.id || "0");
  const { data: product, isLoading } = useProduct(id);
  const [selectedVariantId, setSelectedVariantId] = useState<string>("");
  const [quantity, setQuantity] = useState(1);
  const { addItem } = useCart();
  const { toast } = useToast();

  if (isLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  if (!product) return <div>Product not found</div>;

  const selectedVariant = product.variants.find(v => v.id.toString() === selectedVariantId);
  const hasStock = product.variants.some(v => v.stockCount > 0);

  const handleAddToCart = () => {
    if (!selectedVariant) return;
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

  return (
    <div className="max-w-6xl mx-auto">
      <Button variant="ghost" onClick={() => setLocation("/")} className="mb-6 gap-2">
        <ArrowLeft className="h-4 w-4" /> Back to Shop
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        {/* Image Side */}
        <div className="space-y-4">
          <div className="aspect-video w-full rounded-2xl overflow-hidden border border-border bg-card/50 relative shadow-2xl">
            <img 
              src={product.image} 
              alt={product.name} 
              className="w-full h-full object-cover"
            />
            {!hasStock && (
              <div className="absolute inset-0 bg-background/80 flex items-center justify-center backdrop-blur-sm">
                <span className="text-3xl font-display font-bold text-destructive rotate-[-12deg] border-4 border-destructive px-6 py-2 rounded-xl">
                  SOLD OUT
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Info Side */}
        <div className="space-y-8">
          <div>
            <div className="flex items-center justify-between mb-2">
              <Badge variant="outline" className="text-primary border-primary">Digital Item</Badge>
              {hasStock ? 
                <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Instant Delivery</Badge> : 
                <Badge variant="destructive">Out of Stock</Badge>
              }
            </div>
            <h1 className="text-4xl font-display font-bold mb-4">{product.name}</h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              {product.description}
            </p>
          </div>

          <div className="p-6 rounded-xl bg-card border border-border space-y-6 shadow-lg">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Option</label>
              <Select onValueChange={setSelectedVariantId} value={selectedVariantId}>
                <SelectTrigger className="h-12 text-lg">
                  <SelectValue placeholder="Choose a package" />
                </SelectTrigger>
                <SelectContent>
                  {product.variants.map(variant => (
                    <SelectItem 
                      key={variant.id} 
                      value={variant.id.toString()}
                      disabled={variant.stockCount === 0}
                      className="py-3"
                    >
                      <div className="flex items-center justify-between w-full min-w-[200px] gap-4">
                        <span>{variant.name}</span>
                        <div className="flex items-center gap-2">
                          {variant.stockCount < 5 && variant.stockCount > 0 && (
                            <span className="text-xs text-orange-400 font-bold">Only {variant.stockCount} left!</span>
                          )}
                          <span className="font-mono font-bold">${(variant.price / 100).toFixed(2)}</span>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedVariant && (
              <div className="flex items-end justify-between border-t border-border pt-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Quantity</label>
                  <Input 
                    type="number" 
                    min={1} 
                    max={selectedVariant.stockCount}
                    value={quantity}
                    onChange={(e) => setQuantity(Math.min(parseInt(e.target.value) || 1, selectedVariant.stockCount))}
                    className="w-24 h-12 text-lg text-center font-mono"
                  />
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground mb-1">Total Price</div>
                  <div className="text-3xl font-mono font-bold text-primary">
                    ${((selectedVariant.price * quantity) / 100).toFixed(2)}
                  </div>
                </div>
              </div>
            )}

            <Button 
              size="lg" 
              className="w-full h-14 text-lg font-bold gap-2 shadow-lg shadow-primary/20" 
              disabled={!selectedVariant}
              onClick={handleAddToCart}
            >
              <ShoppingCart className="h-5 w-5" />
              Add to Cart
            </Button>
          </div>

          <div className="flex gap-6 text-sm text-muted-foreground border-t border-border pt-6">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-primary/10 text-primary">
                <Check className="h-4 w-4" />
              </div>
              Verified Seller
            </div>
            <div className="flex items-center gap-2">
               <div className="p-2 rounded-full bg-primary/10 text-primary">
                <Check className="h-4 w-4" />
              </div>
              24/7 Support
            </div>
            <div className="flex items-center gap-2">
               <div className="p-2 rounded-full bg-primary/10 text-primary">
                <Check className="h-4 w-4" />
              </div>
              Secure Payment
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
