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
        className="group cursor-pointer overflow-hidden transition-all flex flex-col"
        style={{
          background: "hsl(35 12% 7%)",
          border: "1px solid hsl(36 18% 18%)",
        }}
        data-testid={`card-product-${product.id}`}
      >
        {/* Square image */}
        <div className="w-full relative" style={{ aspectRatio: '1 / 1', background: "hsl(35 13% 5%)" }}>
          {product.image && !imgError ? (
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-full object-contain p-3 transform group-hover:scale-105 transition-transform duration-500"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center" style={{ background: "hsl(35 13% 5%)" }}>
              <span className="text-2xl font-bold" style={{ color: "hsl(40 55% 82% / 0.2)", fontFamily: "'VT323', monospace" }}>
                {product.name?.charAt(0)?.toUpperCase()}
              </span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="px-2 py-1.5 flex flex-col gap-1.5">
          <p className="text-[10px] font-bold leading-tight text-center line-clamp-2 min-h-[28px] flex items-center justify-center" style={{ color: "hsl(40 55% 82%)" }}>
            {product.name}
          </p>

          <button
            className="w-full h-7 text-[10px] font-bold flex items-center justify-between px-2.5 transition-all hover:opacity-90 active:scale-[0.98]"
            style={{ background: "hsl(42 72% 55%)", color: "hsl(35 15% 4%)" }}
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
