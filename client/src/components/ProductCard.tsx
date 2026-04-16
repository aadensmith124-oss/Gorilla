import { Link } from "wouter";
import { useState } from "react";
import type { Product, Variant } from "@shared/schema";

interface ProductWithVariants extends Product {
  variants: (Variant & { stockCount: number })[];
}

const TOPO_BG = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 300' preserveAspectRatio='none'%3E%3Cpath d='M0,150 C130,60 250,240 400,150 C550,60 680,220 800,150' fill='none' stroke='rgba(255,255,255,0.07)' stroke-width='1.5'/%3E%3Cpath d='M0,110 C130,20 250,200 400,110 C550,20 680,180 800,110' fill='none' stroke='rgba(255,255,255,0.05)' stroke-width='1.5'/%3E%3Cpath d='M0,190 C130,100 250,280 400,190 C550,100 680,260 800,190' fill='none' stroke='rgba(255,255,255,0.05)' stroke-width='1.5'/%3E%3Cpath d='M0,70 C130,-20 250,160 400,70 C550,-20 680,140 800,70' fill='none' stroke='rgba(255,255,255,0.04)' stroke-width='1'/%3E%3Cpath d='M0,230 C130,140 250,320 400,230 C550,140 680,300 800,230' fill='none' stroke='rgba(255,255,255,0.04)' stroke-width='1'/%3E%3C/svg%3E")`;

export function ProductCard({ product }: { product: ProductWithVariants }) {
  const lowestPrice = product.variants.length > 0 ? Math.min(...product.variants.map(v => v.price)) : 0;
  const [imgError, setImgError] = useState(false);

  return (
    <Link href={`/product/${encodeURIComponent(product.name)}`}>
      <div
        className="group cursor-pointer overflow-hidden rounded-xl border border-white/8 transition-all hover:border-white/15 hover:shadow-xl"
        data-testid={`card-product-${product.id}`}
      >
        <div
          className="relative flex flex-col items-center justify-center py-6 px-4"
          style={{
            background: `${TOPO_BG}, #070d18`,
            backgroundSize: "cover",
            minHeight: "180px",
          }}
        >
          {product.image && !imgError ? (
            <img
              src={product.image}
              alt={product.name}
              className="h-24 w-auto object-contain transform group-hover:scale-105 transition-transform duration-500 drop-shadow-xl"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="h-24 flex items-center justify-center">
              <span className="text-5xl font-black text-white/20 italic tracking-tighter">
                {product.name?.charAt(0)?.toUpperCase()}
              </span>
            </div>
          )}

          <p className="mt-4 text-xs font-bold text-white/35 tracking-widest">
            rulf<span className="text-primary/70">.cc</span>
          </p>
        </div>

        <div className="h-px bg-primary/50" />

        <div className="bg-[#0a0e16] px-4 py-3 space-y-2.5">
          <h3 className="text-sm font-bold text-white uppercase tracking-tight leading-tight line-clamp-2">
            {product.name}
          </h3>
          <button className="w-full py-2.5 bg-[#1a3ecf] hover:bg-[#1e4aed] text-white text-xs font-bold rounded transition-colors tracking-wide">
            Purchase | ${(lowestPrice / 100).toFixed(2)}
          </button>
        </div>
      </div>
    </Link>
  );
}
