import { Link } from "wouter";
import type { Product, Variant } from "@shared/schema";

interface ProductWithVariants extends Product {
  variants: (Variant & { stockCount: number })[];
}

export function ProductCard({ product }: { product: ProductWithVariants }) {
  const lowestPrice = Math.min(...product.variants.map(v => v.price));
  const hasStock = product.variants.some(v => v.stockCount > 0);

  return (
    <Link href={`/product/${product.id}`}>
      <div className="group relative cursor-pointer overflow-hidden rounded-xl bg-[#16181d] border border-white/5 transition-all hover:border-primary/30 hover:shadow-2xl hover:shadow-primary/5">
        <div className="aspect-square w-full relative overflow-hidden bg-[#0f1115]">
          {product.image ? (
            <img 
              src={product.image} 
              alt={product.name}
              className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-600/30 to-purple-900/30">
              <span className="text-5xl font-black text-white/80 italic tracking-tighter">{product.name?.charAt(0)?.toUpperCase()}</span>
            </div>
          )}
          
          <div className="absolute top-2 right-2 z-10">
            <div className="bg-[#e11d48] text-white text-[9px] font-black px-2 py-0.5 rounded italic shadow-lg uppercase tracking-tighter">
              From ${(lowestPrice / 100).toFixed(2)}
            </div>
          </div>

          {!hasStock && (
            <div className="absolute inset-0 bg-[#090a0c]/80 flex items-center justify-center backdrop-blur-[2px] z-20">
              <span className="font-black text-[#e11d48] rotate-[-15deg] border-2 border-[#e11d48] px-2 py-0.5 text-[10px] uppercase tracking-tighter italic">OUT OF STOCK</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
