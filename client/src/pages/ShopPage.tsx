import { useProducts } from "@/hooks/use-products";
import { useQuery } from "@tanstack/react-query";
import { Loader2, ShieldX, Trophy, Flame, ShoppingCart, CreditCard } from "lucide-react";
import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";

const P    = "hsl(186 100% 50%)";
const PBG  = "hsl(186 100% 50% / 0.08)";
const BG   = "hsl(214 50% 4%)";
const CARD = "hsl(214 45% 7%)";
const BDR  = "hsl(210 40% 16%)";
const TEXT = "hsl(195 60% 88%)";
const MUT  = "hsl(205 30% 45%)";

const TILE_COLORS = [
  "#C0392B", "#E67E22", "#27AE60", "#2980B9",
  "#8E44AD", "#16A085", "#D35400", "#1ABC9C",
  "#2C3E50", "#E74C3C", "#F39C12", "#2ECC71",
];

function getTileColor(name: string, idx: number): string {
  return TILE_COLORS[idx % TILE_COLORS.length];
}

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

  const filtered = useMemo(() =>
    sortedProducts.filter((p: any) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description?.toLowerCase().includes(search.toLowerCase())
    ), [sortedProducts, search]);

  if (isLoading) return <div className="flex h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" style={{ color: P }} /></div>;

  if (user?.isBanned) {
    return (
      <div className="max-w-sm mx-auto px-3 py-8">
        <div className="p-6 text-center" style={{ background: "hsl(0 80% 58% / 0.1)", border: "1px solid hsl(0 80% 58% / 0.3)" }}>
          <ShieldX className="h-8 w-8 mx-auto mb-2" style={{ color: "hsl(0 80% 58%)" }} />
          <p className="text-sm font-bold" style={{ color: "hsl(0 80% 58%)" }}>Account Restricted</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-3 py-3 space-y-3">
      {/* DEPOSIT banner */}
      <Link href="/">
        <div className="w-full flex items-center justify-between px-4 py-3 font-bold tracking-widest cursor-pointer hover:opacity-90 transition-opacity pixel-btn"
          style={{ background: P, color: BG, fontSize: "13px" }}
          data-testid="btn-deposit-banner">
          <div className="flex items-center gap-2">
            <span>■</span>
            <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "9px" }}>DEPOSIT</span>
          </div>
          <span>→</span>
        </div>
      </Link>

      {/* Quick action buttons */}
      <div className="flex items-center gap-2">
        <a href="https://t.me/+K3ou01RaW6oyMjJh" target="_blank" rel="noopener noreferrer">
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs transition-all"
            style={{ border: `1px solid ${BDR}`, color: MUT, background: CARD }}
            data-testid="btn-support">
            ⚙ support
          </button>
        </a>
        <Link href="/acctplug">
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs transition-all"
            style={{ border: `1px solid ${BDR}`, color: MUT, background: CARD }}
            data-testid="btn-cards-link">
            <CreditCard className="h-3 w-3" /> cards
          </button>
        </Link>
        <Link href="/cart">
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs transition-all"
            style={{ border: `1px solid ${BDR}`, color: MUT, background: CARD }}
            data-testid="btn-cart-link">
            <ShoppingCart className="h-3 w-3" /> cart (0)
          </button>
        </Link>
      </div>

      {/* Heading */}
      <h1 style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "14px", color: TEXT, letterSpacing: "0.05em" }}>
        LOGS
      </h1>

      {/* Search */}
      <input
        placeholder="Search logs..."
        className="w-full outline-none transition-colors"
        style={{
          background: "hsl(214 45% 10%)",
          border: `1px solid ${BDR}`,
          color: TEXT,
          padding: "10px 14px",
          fontSize: "13px",
        }}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        data-testid="input-search"
      />

      {/* Product grid — 2 columns, no images, colored tiles */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 text-xs" style={{ color: MUT }}>No products found</div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filtered.map((product: any, idx: number) => {
            const rank = !search ? topIds.indexOf(product.id) : -1;
            const isTop = rank === 0;
            const isSecond = rank === 1;
            const lowestVariant = product.variants?.length > 0
              ? product.variants.reduce((a: any, b: any) => a.price < b.price ? a : b)
              : null;
            const lowestPrice = lowestVariant?.price ?? 0;
            const comparePrice = lowestVariant?.comparePrice ?? null;
            const inStock = product.variants?.some((v: any) => v.stockCount > 0);
            const tileColor = getTileColor(product.name, idx);

            return (
              <Link key={product.id} href={`/product/${encodeURIComponent(product.name)}`}>
                <div className="cursor-pointer overflow-hidden transition-all hover:brightness-110"
                  style={{ border: `1px solid ${isTop ? P : isSecond ? "#F59E0B" : BDR}`, boxShadow: isTop ? `0 0 10px ${P}44` : undefined }}
                  data-testid={`card-product-${product.id}`}>

                  {/* Colored tile (no image) */}
                  <div className="relative flex items-center justify-center"
                    style={{ background: tileColor, aspectRatio: "1.2 / 1" }}>
                    <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "22px", color: "rgba(255,255,255,0.25)" }}>
                      {product.name?.charAt(0)?.toUpperCase()}
                    </span>
                    {/* Price badge top-right */}
                    {lowestPrice > 0 && (
                      <span className="absolute top-2 right-2 px-1.5 py-0.5 text-[9px] font-bold"
                        style={{ background: "#22C55E", color: "#fff" }}>
                        From ${(lowestPrice / 100).toFixed(2)}
                      </span>
                    )}
                    {/* Top badges */}
                    {isTop && (
                      <span className="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 text-[8px] font-bold"
                        style={{ background: P, color: BG }}>
                        <Trophy className="h-2.5 w-2.5" /> #1
                      </span>
                    )}
                    {isSecond && (
                      <span className="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 text-[8px] font-bold"
                        style={{ background: "#F59E0B", color: BG }}>
                        <Flame className="h-2.5 w-2.5" /> #2
                      </span>
                    )}
                    {!inStock && (
                      <div className="absolute inset-0 flex items-center justify-center"
                        style={{ background: "rgba(0,0,0,0.6)" }}>
                        <span className="text-[9px] font-bold" style={{ color: "hsl(0 80% 65%)" }}>OUT OF STOCK</span>
                      </div>
                    )}
                  </div>

                  {/* Name row */}
                  <div className="px-2 py-2" style={{ background: CARD }}>
                    <p className="text-[11px] font-bold leading-tight truncate" style={{ color: isTop ? P : isSecond ? "#F59E0B" : TEXT }}>
                      {product.name}
                    </p>
                    {comparePrice && comparePrice > lowestPrice && (
                      <p className="text-[9px] line-through mt-0.5" style={{ color: MUT }}>
                        ${(comparePrice / 100).toFixed(2)}
                      </p>
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
