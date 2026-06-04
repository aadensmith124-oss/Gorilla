import { useProducts } from "@/hooks/use-products";
import { Input } from "@/components/ui/input";
import { Loader2, ShieldX } from "lucide-react";
import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

const SELLER_TYPES = [
  { value: "all", label: "All Sellers" },
  { value: "top", label: "🔥 Top Seller" },
  { value: "fresh", label: "🍺 Fresh Seller" },
  { value: "bronze", label: "🍟 Bronze Seller" },
];

export default function ShopPage() {
  const { user } = useAuth();
  const { data: products, isLoading } = useProducts();
  const [search, setSearch] = useState("");
  const [sellerType, setSellerType] = useState("all");
  const [shuffleSeed] = useState(() => Math.random() * 233280);

  const shuffledProducts = useMemo(() => {
    if (!products) return [];
    const pinned = products.filter((p: any) => p.pinned).slice(0, 4);
    const rest = seededShuffle(products.filter((p: any) => !p.pinned), shuffleSeed);
    return [...pinned, ...rest];
  }, [products, shuffleSeed]);

  const filtered = useMemo(() => {
    return shuffledProducts.filter((p: any) => {
      const matchSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.description?.toLowerCase().includes(search.toLowerCase());
      const matchSeller =
        sellerType === "all" ||
        (p.sellerTypes && p.sellerTypes.includes(sellerType));
      return matchSearch && matchSeller;
    });
  }, [shuffledProducts, search, sellerType]);

  if (isLoading) {
    return <div className="flex h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-white/40" /></div>;
  }

  if (user?.isBanned) {
    return (
      <div className="max-w-sm mx-auto px-3 py-8 space-y-4">
        <div className="bg-destructive/10 border border-destructive/20 p-6 rounded-xl text-center space-y-3">
          <ShieldX className="h-8 w-8 text-destructive mx-auto" />
          <p className="text-sm text-destructive font-bold">Account Restricted</p>
          <p className="text-xs text-white/40 leading-relaxed">Your account has been restricted. Contact support if you believe this is an error.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto px-3 py-4 space-y-3">
      <div className="space-y-1 mb-4">
        <h1 className="text-xl font-bold text-white">ACCT<span className="text-white/40">PLUG</span></h1>
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

      <Select value={sellerType} onValueChange={setSellerType}>
        <SelectTrigger className="w-full bg-[#111] border-white/5 text-white/60 h-9 text-xs" data-testid="select-seller-type">
          <SelectValue placeholder="All Sellers" />
        </SelectTrigger>
        <SelectContent className="bg-[#111] border-white/10 text-white text-xs">
          {SELLER_TYPES.map(t => (
            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-white/20 text-sm">No products found</div>
      ) : (
        <div className="divide-y divide-white/[0.05]">
          {filtered.map((product: any) => {
            const lowestVariant = product.variants?.length > 0
              ? product.variants.reduce((a: any, b: any) => a.price < b.price ? a : b)
              : null;
            const lowestPrice = lowestVariant?.price ?? 0;
            const comparePrice = lowestVariant?.comparePrice ?? null;
            const variantCount = product.variants?.length ?? 0;
            const inStock = product.variants?.some((v: any) => v.stockCount > 0);

            return (
              <Link key={product.id} href={`/product/${encodeURIComponent(product.name)}`}>
                <div
                  className="flex items-center justify-between py-3 cursor-pointer hover:bg-white/[0.02] transition-colors rounded px-1"
                  data-testid={`card-product-${product.id}`}
                >
                  <div className="space-y-0.5 min-w-0">
                    <p className="text-sm font-bold text-white leading-tight">{product.name}</p>
                    <p className="text-[10px] text-white/30 font-mono">
                      {variantCount} variant{variantCount !== 1 ? "s" : ""}
                      {!inStock && <span className="ml-2 text-red-400/60">· out of stock</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                    {comparePrice && comparePrice > lowestPrice && (
                      <span className="text-[10px] line-through text-white/25 font-mono">${(comparePrice / 100).toFixed(2)}</span>
                    )}
                    {lowestPrice > 0 && (
                      <span className="text-xs font-bold text-white font-mono">${(lowestPrice / 100).toFixed(2)}</span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
