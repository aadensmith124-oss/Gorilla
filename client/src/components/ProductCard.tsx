import { Link } from "wouter";
import { useState } from "react";
import type { Product, Variant } from "@shared/schema";

interface ProductWithVariants extends Product {
  variants: (Variant & { stockCount: number })[];
}

export function ProductCard({ product }: { product: ProductWithVariants }) {
  const lowestPriceVariant = product.variants.length > 0
    ? product.variants.reduce((a, b) => a.price < b.price ? a : b)
    : null;
  const lowestPrice = lowestPriceVariant?.price ?? 0;
  const comparePrice = lowestPriceVariant?.comparePrice ?? null;
  const [imgError, setImgError] = useState(false);

  return (
    <Link href={`/product/${encodeURIComponent(product.name)}`}>
      <div
        className="group cursor-pointer rounded-xl overflow-hidden border border-white/[0.10] bg-[#111318] transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 flex flex-col"
        data-testid={`card-product-${product.id}`}
      >
        {/* Square image */}
        <div className="w-full bg-[#0c0e13] relative" style={{ aspectRatio: '1 / 1' }}>
          {product.image && !imgError ? (
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-full object-contain p-3 rounded-2xl transform group-hover:scale-105 transition-transform duration-500"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-[#0c0e13] rounded-2xl">
              <span className="text-2xl font-bold text-white/20">{product.name?.charAt(0)?.toUpperCase()}</span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="px-2 py-1.5 flex flex-col gap-1.5">
          <p className="text-[10px] font-bold text-white leading-tight text-center line-clamp-2 min-h-[28px] flex items-center justify-center">
            {product.name}
          </p>

          <button
            className="w-full h-7 rounded-lg text-[10px] font-bold text-black flex items-center justify-between px-2.5 transition-all hover:opacity-90 active:scale-[0.98] bg-primary"
          >
            <span>Buy Now</span>
            <span className="flex items-center gap-1">
              {comparePrice && comparePrice > lowestPrice && (
                <span className="line-through opacity-60 text-[9px]">${(comparePrice / 100).toFixed(2)}</span>
              )}
              {lowestPrice > 0 && <span>${(lowestPrice / 100).toFixed(2)}</span>}
            </span>
          </button>
        </div>
      </div>
    </Link>
  );
}
