import { useProducts } from "@/hooks/use-products";
import { ProductCard } from "@/components/ProductCard";
import { Input } from "@/components/ui/input";
import { Loader2, Headset, ShieldX } from "lucide-react";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const result = [...arr];
  let s = seed;
  const rand = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export default function ShopPage() {
  const { user } = useAuth();
  const { data: products, isLoading } = useProducts();
  const [search, setSearch] = useState("");
  const [shuffleSeed] = useState(() => Math.random() * 233280);

  const shuffledProducts = useMemo(
    () => (products ? seededShuffle(products, shuffleSeed) : []),
    [products, shuffleSeed]
  );

  const filtered = shuffledProducts.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.description.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) {
    return <div className="flex h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (user?.isBanned) {
    return (
      <div className="space-y-8 py-12 max-w-lg mx-auto">
        <div className="bg-destructive/10 border border-destructive/20 p-8 rounded-2xl text-center space-y-4">
          <div className="bg-destructive/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-2">
            <ShieldX className="h-8 w-8 text-destructive" />
          </div>
          <h2 className="text-xl font-bold text-destructive uppercase tracking-tight">Account Restricted</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Your account has been restricted by an administrator. Please contact support if you believe this is an error.
          </p>
        </div>
        <div className="space-y-3 opacity-50 pointer-events-none">
          {filtered.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="pb-20 pt-2 max-w-lg mx-auto w-full space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-white uppercase tracking-widest">Hot Products</h1>
        <a href="https://t.me/m/iP8zL2axM2Rh" target="_blank" rel="noopener noreferrer">
          <Button variant="ghost" size="sm" className="h-8 px-3 text-xs font-bold gap-1.5 text-muted-foreground hover:text-white">
            <Headset className="h-3.5 w-3.5" /> Support
          </Button>
        </a>
      </div>

      <Input
        placeholder="Search products..."
        className="h-11 bg-white/5 border-white/5 text-white placeholder:text-white/20 rounded-lg focus-visible:ring-primary/20 text-sm"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        data-testid="input-search"
      />

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <p className="text-sm font-bold uppercase tracking-widest opacity-50">No products found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
