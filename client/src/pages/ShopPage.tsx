import { useProducts } from "@/hooks/use-products";
import { useQuery } from "@tanstack/react-query";
import { Loader2, ShieldX, Search } from "lucide-react";
import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const result = [...arr];
  let s = seed;
  const rand = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

const CARD_GRADIENTS = [
  "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
  "linear-gradient(135deg, #0d1b2a 0%, #1b263b 100%)",
  "linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)",
  "linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)",
  "linear-gradient(135deg, #1c1c1c 0%, #3a3a3a 100%)",
  "linear-gradient(135deg, #0a0a0a 0%, #1f1f1f 100%)",
  "linear-gradient(135deg, #141414 0%, #2a2a2a 100%)",
  "linear-gradient(135deg, #12121f 0%, #1e1e35 100%)",
];

function cardGradient(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return CARD_GRADIENTS[h % CARD_GRADIENTS.length];
}

function ProductCard({ product, rank }: { product: any; rank: number }) {
  const lowestVariant = product.variants?.length > 0
    ? product.variants.reduce((a: any, b: any) => a.price < b.price ? a : b)
    : null;
  const lowestPrice = lowestVariant?.price ?? 0;
  const comparePrice = lowestVariant?.comparePrice ?? null;
  const hasImage = !!product.image;

  const isTop1 = rank === 0;
  const isTop2 = rank === 1;

  return (
    <Link href={`/product/${encodeURIComponent(product.name)}`}>
      <div
        className="rounded-2xl overflow-hidden border border-white/[0.07] cursor-pointer transition-all hover:border-white/[0.14] hover:scale-[1.02] active:scale-[0.99] bg-[#0f0f0f]"
        style={isTop1
          ? { boxShadow: "0 0 20px 2px rgba(251,191,36,0.14)" }
          : isTop2
          ? { boxShadow: "0 0 12px 1px rgba(251,191,36,0.07)" }
          : {}}
        data-testid={`card-product-${product.id}`}
      >
        {/* Image area */}
        <div
          className="relative w-full flex items-center justify-center overflow-hidden"
          style={{
            height: 108,
            background: hasImage ? "#111" : cardGradient(product.name),
          }}
        >
          {hasImage ? (
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          ) : (
            <span className="text-3xl font-black text-white/10 select-none uppercase tracking-widest">
              {product.name.slice(0, 2)}
            </span>
          )}

          {isTop1 && (
            <div className="absolute top-2 left-2 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest bg-amber-500 text-black">
              🏆 Top 1
            </div>
          )}
          {isTop2 && (
            <div className="absolute top-2 left-2 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest bg-amber-500/20 text-amber-400 border border-amber-500/40">
              🔥 Top 2
            </div>
          )}
        </div>

        {/* Info */}
        <div className="px-3 py-2.5 space-y-1">
          <p className="text-xs font-bold text-white leading-tight line-clamp-1">{product.name}</p>
          {product.description ? (
            <p className="text-[10px] text-white/25 leading-snug line-clamp-1 font-mono">{product.description}</p>
          ) : null}
          <div className="flex items-center gap-1.5 pt-0.5">
            {comparePrice && comparePrice > lowestPrice && (
              <span className="text-[10px] line-through text-white/20 font-mono">${(comparePrice / 100).toFixed(2)}</span>
            )}
            {lowestPrice > 0 ? (
              <span className={`text-sm font-black font-mono ${isTop1 ? "text-amber-300" : isTop2 ? "text-amber-400" : "text-white"}`}>
                ${(lowestPrice / 100).toFixed(2)}
              </span>
            ) : (
              <span className="text-sm font-black font-mono text-white/35">Free</span>
            )}
            <span className="text-[10px] text-white/20 font-mono">/ line</span>
          </div>
        </div>
      </div>
    </Link>
  );
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
    const q = search.trim().toLowerCase();
    if (!q) return sortedProducts;
    return sortedProducts.filter((p: any) =>
      p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q)
    );
  }, [sortedProducts, search]);

  if (isLoading) {
    return <div className="flex h-[50vh] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-white/30" /></div>;
  }

  if (user?.isBanned) {
    return (
      <div className="max-w-sm mx-auto px-4 py-10">
        <div className="bg-destructive/10 border border-destructive/20 p-6 rounded-2xl text-center space-y-3">
          <ShieldX className="h-8 w-8 text-destructive mx-auto" />
          <p className="text-sm text-destructive font-bold">Account Restricted</p>
          <p className="text-xs text-white/40 leading-relaxed">Your account has been restricted. Contact support if you believe this is an error.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto px-4 py-5 space-y-4">
      {/* Header */}
      <div className="space-y-0.5">
        <h1 className="text-lg font-bold text-white">NYC<span className="text-white/30">HQ</span></h1>
        <p className="text-[11px] text-white/25">BEST HIGH QUALITY CARDS</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/25" />
        <input
          type="text"
          placeholder="Search logs..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full h-10 bg-[#0f0f0f] border border-white/[0.07] rounded-2xl pl-9 pr-4 text-xs text-white placeholder:text-white/20 outline-none focus:border-white/[0.12] transition-colors"
          data-testid="input-search"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-white/20 text-sm">No products found</div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filtered.map((product: any) => {
            const rank = !search.trim() ? topIds.indexOf(product.id) : -1;
            return <ProductCard key={product.id} product={product} rank={rank} />;
          })}
        </div>
      )}
    </div>
  );
}
