import { useProducts } from "@/hooks/use-products";
import { ProductCard } from "@/components/ProductCard";
import { Input } from "@/components/ui/input";
import { Loader2, ShieldX } from "lucide-react";
import { useState, useMemo } from "react";
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

  const shuffledProducts = useMemo(() => {
    if (!products) return [];
    const pinned = products.filter((p: any) => p.pinned).slice(0, 4);
    const rest = seededShuffle(products.filter((p: any) => !p.pinned), shuffleSeed);
    return [...pinned, ...rest];
  }, [products, shuffleSeed]);

  const filtered = shuffledProducts.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.description.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) {
    return <div className="flex h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (user?.isBanned) {
    return (
      <div className="space-y-8 py-12">
        <div className="bg-destructive/10 border border-destructive/20 p-8 rounded-2xl text-center space-y-4 max-w-2xl mx-auto shadow-2xl shadow-destructive/5">
          <div className="bg-destructive/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-2">
            <ShieldX className="h-8 w-8 text-destructive" />
          </div>
          <h2 className="text-2xl text-destructive">Account Restricted</h2>
          <p className="text-muted-foreground leading-relaxed">
            Your account has been banned by an administrator. You may still browse our product catalog, but purchasing and other features are disabled.
            <br /><br />
            If you believe this is an error, please contact support.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto w-full opacity-60 grayscale-[0.5]">
          {filtered.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-3 py-4 space-y-3">
      <div className="space-y-1 mb-4">
        <h1 className="text-xl font-bold text-white">TRENT <span className="text-primary">HQ</span></h1>
        <p className="text-xs text-white/30">Premium marketplace</p>
      </div>

      <div className="relative">
        <Input
          placeholder="Search logs..."
          className="bg-[#111] border-white/5 text-white placeholder:text-white/25 focus-visible:ring-0 focus-visible:border-white/10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          data-testid="input-search"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-white/20 text-sm">
          No products found
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {filtered.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
