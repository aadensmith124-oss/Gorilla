import { Link } from "wouter";
import type { Product, Variant } from "@shared/schema";

interface ProductWithVariants extends Product {
  variants: (Variant & { stockCount: number })[];
}

export function ProductCard({ product }: { product: ProductWithVariants }) {
  const lowestPrice = product.variants.length > 0 ? Math.min(...product.variants.map(v => v.price)) : 0;

  return (
    <Link href={`/product/${encodeURIComponent(product.name)}`}>
      <div className="group relative cursor-pointer overflow-hidden rounded-xl bg-[#16181d] border border-white/5 transition-all hover:border-primary/30 hover:shadow-2xl hover:shadow-primary/5">
        <div className="w-full relative overflow-hidden bg-[#0f1115]" style={{ aspectRatio: '1280 / 853' }}>
          {product.image ? (
            <img 
              src={product.image} 
              alt={product.name}
              className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-800/30 to-amber-950/40">
              <span className="text-5xl font-black text-white/80 italic tracking-tighter">{product.name?.charAt(0)?.toUpperCase()}</span>
            </div>
          )}
          
          {lowestPrice > 0 && (
            <div className="absolute top-2 right-2 z-10">
              <div className="bg-[#e11d48] text-white text-[9px] font-black px-2 py-0.5 rounded italic shadow-lg uppercase tracking-tighter">
                From ${(lowestPrice / 100).toFixed(2)}
              </div>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
