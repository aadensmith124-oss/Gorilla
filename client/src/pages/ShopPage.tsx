import { useProducts } from "@/hooks/use-products";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Loader2, ShieldX, Trophy, Flame } from "lucide-react";
import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";

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
  const { data: topProducts } = useQuery<any[]>({
    queryKey: ["/api/products/top-selling"],
    refetchInterval: 60 * 60 * 1000,
  });
  const [search, setSearch] = useState("");
  const [shuffleSeed] = useState(() => Math.random() * 233280);

  const topIds: number[] = useMemo(() => (topProducts ?? []).map((p: any) => p.id), [topProducts]);

  const sortedProducts = useMemo(() => {
    if (!products) return [];
    const shuffled = seededShuffle([...products], shuffleSeed);
    if (topIds.length === 0) return shuffled;
    const top = topIds.map((id) => shuffled.find((p: any) => p.id === id)).filter(Boolean);
    const rest = shuffled.filter((p: any) => !topIds.includes(p.id));
    return [...top, ...rest];
  }, [products, shuffleSeed, topIds]);

  const filtered = useMemo(() => {
    return sortedProducts.filter((p: any) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description?.toLowerCase().includes(search.toLowerCase())
    );
  }, [sortedProducts, search]);

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
        <h1 className="text-xl font-bold text-white">NYC<span className="text-white/40">HQ</span></h1>
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
        <div className="text-center py-20 text-white/20 text-sm">No products found</div>
      ) : (
        <div className="divide-y divide-white/[0.05]">
          {filtered.map((product: any) => {
            const rank = !search ? topIds.indexOf(product.id) : -1;
            const isTop = rank === 0;
            const isSecond = rank === 1;
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
                  className={`flex items-center justify-between py-3 cursor-pointer transition-all rounded px-1
                    ${isTop
                      ? "hover:bg-amber-500/5"
                      : isSecond
                      ? "hover:bg-amber-500/[0.03]"
                      : "hover:bg-white/[0.02]"
                    }`}
                  style={
                    isTop
                      ? { boxShadow: "0 0 14px 1px rgba(251,191,36,0.18), 0 0 4px 0 rgba(251,191,36,0.10)" }
                      : isSecond
                      ? { boxShadow: "0 0 8px 0px rgba(251,191,36,0.09), 0 0 2px 0 rgba(251,191,36,0.06)" }
                      : {}
                  }
                  data-testid={`card-product-${product.id}`}
                >
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-bold leading-tight ${isTop || isSecond ? "text-amber-100" : "text-white"}`}>
                        {product.name}
                      </p>
                      {isTop && (
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full px-1.5 py-0.5 flex-shrink-0">
                          <Trophy className="h-2.5 w-2.5" />
                          #1 Last 1H
                        </span>
                      )}
                      {isSecond && (
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-500/70 border border-amber-500/20 rounded-full px-1.5 py-0.5 flex-shrink-0">
                          <Flame className="h-2.5 w-2.5" />
                          #2 Last 1H
                        </span>
                      )}
                    </div>
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
                      <span className={`text-xs font-bold font-mono ${isTop ? "text-amber-300" : isSecond ? "text-amber-400/80" : "text-white"}`}>
                        ${(lowestPrice / 100).toFixed(2)}
                      </span>
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
