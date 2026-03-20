import { useProducts } from "@/hooks/use-products";
import { ProductCard } from "@/components/ProductCard";
import { Input } from "@/components/ui/input";
import { Loader2, Headset, ShieldX, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

const PRODUCTS_PER_PAGE = 20;

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

function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div className="flex items-center justify-center gap-2 pt-6 pb-2" data-testid="pagination">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="h-8 w-8 flex items-center justify-center rounded-lg border border-white/10 text-white/60 hover:border-white/30 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        data-testid="button-page-prev"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {pages.map((page) => (
        <button
          key={page}
          onClick={() => onPageChange(page)}
          data-testid={`button-page-${page}`}
          className={`h-8 w-8 flex items-center justify-center rounded-lg border text-sm font-bold transition-all ${
            currentPage === page
              ? "border-primary bg-primary/20 text-primary shadow-sm shadow-primary/30"
              : "border-white/10 text-white/60 hover:border-white/30 hover:text-white"
          }`}
        >
          {page}
        </button>
      ))}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="h-8 w-8 flex items-center justify-center rounded-lg border border-white/10 text-white/60 hover:border-white/30 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        data-testid="button-page-next"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function ShopPage() {
  const { user } = useAuth();
  const { data: products, isLoading } = useProducts();
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [shuffleSeed] = useState(() => Math.random() * 233280);

  const shuffledProducts = useMemo(
    () => (products ? seededShuffle(products, shuffleSeed) : []),
    [products, shuffleSeed]
  );

  const filtered = shuffledProducts.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.description.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PRODUCTS_PER_PAGE));

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  // Clamp page if total shrinks
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

  const paginated = filtered.slice(
    (currentPage - 1) * PRODUCTS_PER_PAGE,
    currentPage * PRODUCTS_PER_PAGE
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

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
          <h2 className="text-2xl font-display font-black text-destructive uppercase tracking-tighter italic">Account Restricted</h2>
          <p className="text-muted-foreground leading-relaxed">
            Your account has been banned by an administrator. You may still browse our product catalog, but purchasing and other features are disabled.
            <br /><br />
            If you believe this is an error, please contact support.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 px-2 max-w-2xl mx-auto opacity-60 grayscale-[0.5]">
          {paginated.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
      </div>
    );
  }

  return (
    <div className="space-y-12 pb-20 pt-4">
      <div className="flex flex-col items-center gap-8">
        <h1 className="text-5xl font-display font-black tracking-tighter text-white italic text-center">
          RULF<span className="text-primary italic">.CC</span>
        </h1>

        <a
          href="https://t.me/m/iP8zL2axM2Rh"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Button variant="destructive" size="sm" className="h-10 px-6 font-bold gap-2 rounded-lg bg-[#e11d48] hover:bg-[#be123c] transition-colors uppercase tracking-tight shadow-xl shadow-red-500/20">
            <Headset className="h-4 w-4" /> Support
          </Button>
        </a>

        <div className="relative w-full max-w-lg px-4">
          <Input
            placeholder="Find products..."
            className="h-12 bg-white/5 border-white/5 text-white placeholder:text-white/20 pl-6 rounded-xl focus-visible:ring-primary/20 text-sm font-medium"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="input-search"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <p className="text-sm font-bold uppercase tracking-widest opacity-50">No products found</p>
        </div>
      ) : (
        <div className="max-w-2xl mx-auto px-2 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {paginated.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
              <span>Page {currentPage} of {totalPages}</span>
              <span>{filtered.length} products</span>
            </div>
          )}

          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
        </div>
      )}
    </div>
  );
}
