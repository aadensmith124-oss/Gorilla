import { useProducts } from "@/hooks/use-products";
import { useQuery } from "@tanstack/react-query";
import { Loader2, ShieldX, Search, ChevronDown } from "lucide-react";
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
  "linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)",
  "linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)",
  "linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%)",
  "linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)",
  "linear-gradient(135deg, #e8eaf6 0%, #c5cae9 100%)",
  "linear-gradient(135deg, #fce4ec 0%, #f8bbd0 100%)",
  "linear-gradient(135deg, #e0f7fa 0%, #b2ebf2 100%)",
  "linear-gradient(135deg, #f1f8e9 0%, #dcedc8 100%)",
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
        className="rounded-2xl overflow-hidden border cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] active:scale-[0.99] bg-[#111] h-full flex flex-col"
        style={{
          borderColor: isTop1 ? "hsl(38 95% 55% / 0.4)" : isTop2 ? "hsl(38 95% 55% / 0.2)" : "rgba(255,255,255,0.1)",
          boxShadow: isTop1
            ? "0 4px 16px hsl(38 95% 55% / 0.15)"
            : isTop2
            ? "0 2px 8px hsl(38 95% 55% / 0.08)"
            : "none",
        }}
        data-testid={`card-product-${product.id}`}
      >
        {/* Image / gradient area */}
        <div
          className="relative w-full flex items-center justify-center overflow-hidden"
          style={{
            height: 110,
            background: hasImage ? "#f9fafb" : cardGradient(product.name),
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
            <span className="text-3xl font-black select-none uppercase tracking-widest text-black/10">
              {product.name.slice(0, 2)}
            </span>
          )}

          {isTop1 && (
            <div className="absolute top-2 left-2 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest bg-primary text-primary-foreground shadow-sm">
              ⚡ Top 1
            </div>
          )}
          {isTop2 && (
            <div className="absolute top-2 left-2 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border border-primary/30 text-primary bg-primary/10">
              🔥 Top 2
            </div>
          )}
        </div>

        {/* Info */}
        <div className="px-3 pt-2.5 pb-3 space-y-2.5">
          <p className="text-sm font-semibold text-white leading-tight line-clamp-2">{product.name}</p>
          <div className="w-full bg-[#ec4899] hover:bg-[#db2777] rounded text-white text-xs font-semibold py-2 text-center transition-colors">
            Purchase | {lowestPrice > 0 ? `$${(lowestPrice / 100).toFixed(2)}` : "Free"}
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
  const [activeFilter, setActiveFilter] = useState<string>("all");
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
    let base = sortedProducts;
    if (activeFilter !== "all") {
      base = base.filter((p: any) => p.name === activeFilter);
    }
    const q = search.trim().toLowerCase();
    if (!q) return base;
    return base.filter((p: any) =>
      p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q)
    );
  }, [sortedProducts, search, activeFilter]);

  if (isLoading) {
    return <div className="flex h-[50vh] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-white/30" /></div>;
  }

  if (user?.isBanned) {
    return (
      <div className="max-w-lg mx-auto px-4 py-10">
        <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-2xl text-center space-y-3">
          <ShieldX className="h-8 w-8 text-red-400 mx-auto" />
          <p className="text-sm text-red-400 font-bold">Account Restricted</p>
          <p className="text-xs text-white/40 leading-relaxed">Your account has been restricted. Contact support if you believe this is an error.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl lg:max-w-5xl xl:max-w-6xl mx-auto px-4 pb-8">
      {/* ── Hero ── */}
      <div className="text-center pt-8 pb-6 space-y-1">
        <h1 className="text-3xl sm:text-4xl font-black text-primary tracking-wide uppercase">
          foodplug
        </h1>
        <p className="text-sm text-white/50">Providing high quality logs since 2026.</p>
      </div>

      {/* ── Search bar ── */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/35" />
        <input
          type="text"
          placeholder="Search for a Product"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full h-11 bg-[#111] border border-white/12 rounded pl-10 pr-4 text-sm text-white/90 placeholder:text-white/35 outline-none focus:border-primary/40 transition-colors"
          data-testid="input-search"
        />
      </div>

      {/* ── Category dropdown ── */}
      <div className="relative mb-6">
        <div className="flex items-center gap-2 w-full h-11 bg-[#111] border border-white/12 rounded px-3 cursor-pointer"
          onClick={() => setActiveFilter("all")}>
          <div className="grid grid-cols-2 gap-0.5 flex-shrink-0">
            {[...Array(4)].map((_, i) => (
              <span key={i} className="w-1.5 h-1.5 rounded-sm bg-primary block" />
            ))}
          </div>
          <select
            value={activeFilter}
            onChange={e => setActiveFilter(e.target.value)}
            className="flex-1 bg-transparent text-sm text-white/80 outline-none cursor-pointer appearance-none"
            data-testid="filter-select"
          >
            <option value="all">All</option>
            {sortedProducts.map((p: any) => (
              <option key={p.id} value={p.name}>{p.name}</option>
            ))}
          </select>
          <ChevronDown className="h-4 w-4 text-white/40 flex-shrink-0" />
        </div>
      </div>

      {/* ── Hot Products heading ── */}
      <h2 className="text-base font-bold text-white text-center mb-4">Hot Products</h2>

      {/* ── Grid ── */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 text-white/40 text-sm">No products found</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((product: any) => {
            const rank = !search.trim() ? topIds.indexOf(product.id) : -1;
            return <ProductCard key={product.id} product={product} rank={rank} />;
          })}
        </div>
      )}
    </div>
  );
}
