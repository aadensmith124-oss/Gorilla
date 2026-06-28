import { useProducts } from "@/hooks/use-products";
import { useQuery } from "@tanstack/react-query";
import { Loader2, ShieldX, Search, Zap } from "lucide-react";
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
  "linear-gradient(135deg, #0d1f0e 0%, #142a15 100%)",
  "linear-gradient(135deg, #0e1a1f 0%, #132535 100%)",
  "linear-gradient(135deg, #12100d 0%, #22200a 100%)",
  "linear-gradient(135deg, #0f1520 0%, #1a2540 100%)",
  "linear-gradient(135deg, #1a0d0d 0%, #2a1515 100%)",
  "linear-gradient(135deg, #0a1010 0%, #1a2020 100%)",
  "linear-gradient(135deg, #10100a 0%, #20201a 100%)",
  "linear-gradient(135deg, #0d0d1f 0%, #16163a 100%)",
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
        className="rounded-2xl overflow-hidden cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.99]"
        style={{
          background: "#0c140d",
          border: isTop1
            ? "1px solid rgba(74,154,58,0.45)"
            : isTop2
            ? "1px solid rgba(74,154,58,0.25)"
            : "1px solid rgba(45,106,45,0.15)",
          boxShadow: isTop1
            ? "0 0 24px 2px rgba(74,154,58,0.12), inset 0 1px 0 rgba(74,154,58,0.1)"
            : isTop2
            ? "0 0 14px 1px rgba(74,154,58,0.07)"
            : "none",
        }}
        data-testid={`card-product-${product.id}`}
      >
        {/* Image / gradient area */}
        <div
          className="relative w-full flex items-center justify-center overflow-hidden"
          style={{
            height: 100,
            background: hasImage ? "#0c140d" : cardGradient(product.name),
          }}
        >
          {hasImage ? (
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-full object-cover opacity-80"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          ) : (
            <span className="text-3xl font-black select-none uppercase tracking-widest" style={{ color: "rgba(74,154,58,0.12)" }}>
              {product.name.slice(0, 2)}
            </span>
          )}

          {isTop1 && (
            <div className="absolute top-2 left-2 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest" style={{ background: "#2d6a2d", color: "#a8e89a" }}>
              ⚡ #1
            </div>
          )}
          {isTop2 && (
            <div className="absolute top-2 left-2 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border" style={{ borderColor: "rgba(74,154,58,0.35)", color: "#6abf5a", background: "rgba(45,106,45,0.15)" }}>
              🔥 #2
            </div>
          )}

          {/* Subtle bottom fade */}
          <div className="absolute inset-x-0 bottom-0 h-8" style={{ background: "linear-gradient(to top, #0c140d, transparent)" }} />
        </div>

        {/* Info */}
        <div className="px-3 py-2.5 space-y-1.5">
          <p className="text-xs font-bold text-white leading-tight line-clamp-1">{product.name}</p>
          {product.description ? (
            <p className="text-[10px] leading-snug line-clamp-1 font-mono" style={{ color: "rgba(106,191,90,0.4)" }}>{product.description}</p>
          ) : null}
          <div className="flex items-center justify-between pt-0.5">
            <div className="flex items-center gap-1.5">
              {comparePrice && comparePrice > lowestPrice && (
                <span className="text-[10px] line-through font-mono" style={{ color: "rgba(255,255,255,0.2)" }}>${(comparePrice / 100).toFixed(2)}</span>
              )}
              {lowestPrice > 0 ? (
                <span className="text-sm font-black font-mono" style={{ color: isTop1 ? "#6abf5a" : isTop2 ? "#5aad4a" : "#fff" }}>
                  ${(lowestPrice / 100).toFixed(2)}
                </span>
              ) : (
                <span className="text-sm font-black font-mono" style={{ color: "rgba(106,191,90,0.5)" }}>Free</span>
              )}
            </div>
            <div className="flex items-center gap-0.5" style={{ color: "rgba(74,154,58,0.4)" }}>
              <Zap className="h-2.5 w-2.5" />
              <span className="text-[9px] font-mono">instant</span>
            </div>
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
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin" style={{ color: "rgba(74,154,58,0.5)" }} />
      </div>
    );
  }

  if (user?.isBanned) {
    return (
      <div className="max-w-sm mx-auto px-4 py-10">
        <div className="border p-6 rounded-2xl text-center space-y-3" style={{ background: "rgba(180,0,0,0.08)", borderColor: "rgba(180,0,0,0.2)" }}>
          <ShieldX className="h-8 w-8 text-red-400 mx-auto" />
          <p className="text-sm text-red-400 font-bold">Account Restricted</p>
          <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.35)" }}>Your account has been restricted. Contact support if you believe this is an error.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto px-4 py-5 space-y-4">
      {/* Header */}
      <div className="space-y-0.5">
        <h1 className="text-lg font-black text-white">
          NYC<span style={{ color: "#4a9a3a" }}>HQ</span>
          <span className="ml-2 text-xs font-mono font-normal" style={{ color: "rgba(106,191,90,0.4)" }}>Logs</span>
        </h1>
        <p className="text-[10px] uppercase tracking-widest font-bold" style={{ color: "rgba(74,154,58,0.4)" }}>BEST HIGH QUALITY CARDS</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: "rgba(74,154,58,0.4)" }} />
        <input
          type="text"
          placeholder="Search logs..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full h-10 rounded-2xl pl-9 pr-4 text-xs text-white placeholder:text-white/20 outline-none transition-colors"
          style={{
            background: "#0c140d",
            border: "1px solid rgba(45,106,45,0.25)",
          }}
          onFocus={e => (e.target.style.borderColor = "rgba(74,154,58,0.45)")}
          onBlur={e => (e.target.style.borderColor = "rgba(45,106,45,0.25)")}
          data-testid="input-search"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-xs font-mono" style={{ color: "rgba(74,154,58,0.3)" }}>No products found</div>
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
