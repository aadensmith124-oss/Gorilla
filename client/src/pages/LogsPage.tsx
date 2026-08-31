import { useProducts } from "@/hooks/use-products";
import { useQuery } from "@tanstack/react-query";
import { Loader2, ShieldX, Search, ChevronDown, FileText } from "lucide-react";
import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";

function seededShuffle<T>(items: T[], seed: number): T[] {
  const result = [...items];
  let value = seed;
  const random = () => {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };

  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

const PLACEHOLDER_GRADIENTS = [
  "linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)",
  "linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)",
  "linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%)",
  "linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)",
  "linear-gradient(135deg, #e8eaf6 0%, #c5cae9 100%)",
  "linear-gradient(135deg, #fce4ec 0%, #f8bbd0 100%)",
  "linear-gradient(135deg, #e0f7fa 0%, #b2ebf2 100%)",
  "linear-gradient(135deg, #f1f8e9 0%, #dcedc8 100%)",
];

function placeholderGradient(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return PLACEHOLDER_GRADIENTS[hash % PLACEHOLDER_GRADIENTS.length];
}

function LogProductCard({ product, rank }: { product: any; rank: number }) {
  const lowestVariant = product.variants?.length
    ? product.variants.reduce((lowest: any, variant: any) => lowest.price < variant.price ? lowest : variant)
    : null;
  const lowestPrice = lowestVariant?.price ?? 0;
  const isTopProduct = rank === 0 || rank === 1;

  return (
    <Link href={`/product/${encodeURIComponent(product.name)}`}>
      <div
        className="h-full cursor-pointer overflow-hidden rounded-2xl border bg-[#111] transition-all hover:scale-[1.02] hover:shadow-lg active:scale-[0.99]"
        style={{
          borderColor: isTopProduct ? "hsl(38 95% 55% / 0.3)" : "rgba(255,255,255,0.1)",
          boxShadow: rank === 0 ? "0 4px 16px hsl(38 95% 55% / 0.15)" : "none",
        }}
        data-testid={`card-log-product-${product.id}`}
      >
        <div
          className="relative flex h-[110px] w-full items-center justify-center overflow-hidden"
          style={{ background: product.image ? "#f9fafb" : placeholderGradient(product.name) }}
        >
          {product.image ? (
            <img
              src={product.image}
              alt={product.name}
              className="h-full w-full object-cover"
              onError={(event) => { (event.currentTarget as HTMLImageElement).style.display = "none"; }}
            />
          ) : (
            <span className="select-none text-3xl font-black uppercase tracking-widest text-black/10">
              {product.name.slice(0, 2)}
            </span>
          )}
          {rank === 0 && (
            <span className="absolute left-2 top-2 rounded-lg bg-primary px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-primary-foreground shadow-sm">
              Top 1
            </span>
          )}
          {rank === 1 && (
            <span className="absolute left-2 top-2 rounded-lg border border-primary/30 bg-primary/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-primary">
              Top 2
            </span>
          )}
        </div>
        <div className="space-y-2.5 px-3 pb-3 pt-2.5">
          <p className="line-clamp-2 text-sm font-semibold leading-tight text-white">{product.name}</p>
          <div className="w-full rounded bg-primary py-2 text-center text-xs font-semibold text-primary-foreground transition-colors hover:opacity-90">
            Purchase · {lowestPrice > 0 ? `$${(lowestPrice / 100).toFixed(2)}` : "Free"}
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function LogsPage() {
  const { user } = useAuth();
  const { data: products, isLoading, isError } = useProducts();
  const { data: topProducts } = useQuery<any[]>({
    queryKey: ["/api/products/top-selling"],
    refetchInterval: 60 * 60 * 1000,
  });
  const { data: features } = useQuery<{ logs: boolean }>({
    queryKey: ["/api/settings/features"],
  });
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [shuffleSeed] = useState(() => Math.random() * 233280);

  const topIds = useMemo(() => (topProducts ?? []).map((product: any) => product.id), [topProducts]);
  const sortedProducts = useMemo(() => {
    if (!products) return [];
    const shuffled = seededShuffle([...products], shuffleSeed);
    const top = topIds
      .map((id) => shuffled.find((product: any) => product.id === id))
      .filter(Boolean);
    const rest = shuffled.filter((product: any) => !topIds.includes(product.id));
    return [...top, ...rest];
  }, [products, shuffleSeed, topIds]);

  const filteredProducts = useMemo(() => {
    let result = sortedProducts;
    if (activeFilter !== "all") result = result.filter((product: any) => product.name === activeFilter);
    const query = search.trim().toLowerCase();
    if (!query) return result;
    return result.filter((product: any) =>
      product.name.toLowerCase().includes(query) ||
      product.description?.toLowerCase().includes(query),
    );
  }, [sortedProducts, activeFilter, search]);

  if (isLoading) {
    return <div className="flex h-[50vh] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-white/30" /></div>;
  }

  if (isError) {
    return <div className="flex h-[50vh] items-center justify-center text-sm text-red-400">Failed to load logs. Please refresh.</div>;
  }

  if (features?.logs === false) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center">
        <FileText className="mx-auto h-9 w-9 text-white/25" />
        <p className="mt-3 text-sm font-bold text-white/70">Logs are currently unavailable</p>
        <p className="mt-1 text-xs text-white/40">Please check back later.</p>
      </div>
    );
  }

  if (user?.isBanned) {
    return (
      <div className="mx-auto max-w-lg px-4 py-10">
        <div className="space-y-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-center">
          <ShieldX className="mx-auto h-8 w-8 text-red-400" />
          <p className="text-sm font-bold text-red-400">Account Restricted</p>
          <p className="text-xs leading-relaxed text-white/40">Your account has been restricted. Contact support if you believe this is an error.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 pb-8 lg:max-w-5xl xl:max-w-6xl">
      <div className="space-y-1 pb-6 pt-8 text-center">
        <h1 className="text-3xl font-black uppercase tracking-wide text-primary sm:text-4xl">Logs shop</h1>
        <p className="text-sm text-white/50">Browse available products and choose a log package.</p>
      </div>

      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
        <input
          type="text"
          placeholder="Search for a product"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="h-11 w-full rounded border border-white/12 bg-[#111] pl-10 pr-4 text-sm text-white/90 outline-none transition-colors placeholder:text-white/35 focus:border-primary/40"
          data-testid="input-search-logs"
        />
      </div>

      <div className="relative mb-6 flex h-11 items-center gap-2 rounded border border-white/12 bg-[#111] px-3">
        <div className="grid flex-shrink-0 grid-cols-2 gap-0.5">
          {[0, 1, 2, 3].map((item) => <span key={item} className="block h-1.5 w-1.5 rounded-sm bg-primary" />)}
        </div>
        <select
          value={activeFilter}
          onChange={(event) => setActiveFilter(event.target.value)}
          className="flex-1 cursor-pointer appearance-none bg-transparent text-sm text-white/80 outline-none"
          data-testid="filter-select-logs"
        >
          <option value="all">All</option>
          {sortedProducts.map((product: any) => <option key={product.id} value={product.name}>{product.name}</option>)}
        </select>
        <ChevronDown className="h-4 w-4 flex-shrink-0 text-white/40" />
      </div>

      <h2 className="mb-4 text-center text-base font-bold text-white">Available logs</h2>
      {filteredProducts.length === 0 ? (
        <div className="py-20 text-center text-sm text-white/40">No products found</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredProducts.map((product: any) => (
            <LogProductCard key={product.id} product={product} rank={!search.trim() ? topIds.indexOf(product.id) : -1} />
          ))}
        </div>
      )}
    </div>
  );
}