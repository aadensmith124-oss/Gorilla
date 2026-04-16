import { Link } from "wouter";
import { useState } from "react";
import type { Product, Variant } from "@shared/schema";

interface ProductWithVariants extends Product {
  variants: (Variant & { stockCount: number })[];
}

export function ProductCard({ product }: { product: ProductWithVariants }) {
  const lowestPrice = product.variants.length > 0 ? Math.min(...product.variants.map(v => v.price)) : 0;
  const [imgError, setImgError] = useState(false);

  return (
    <Link href={`/product/${encodeURIComponent(product.name)}`}>
      <div
        className="group cursor-pointer rounded-xl overflow-hidden border border-white/[0.08] bg-[#111318] transition-all hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 flex flex-col"
        data-testid={`card-product-${product.id}`}
      >
        {/* Image */}
        <div className="w-full bg-[#0c0e13] relative overflow-hidden" style={{ aspectRatio: '1 / 1' }}>
          {product.image && !imgError ? (
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-full object-contain p-3 transform group-hover:scale-105 transition-transform duration-500"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-[#0c0e13]">
              <span className="text-4xl font-bold text-white/20">{product.name?.charAt(0)?.toUpperCase()}</span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-2.5 flex flex-col gap-2">
          <p className="text-[11px] font-bold text-white leading-snug text-center line-clamp-2">
            {product.name}
          </p>

          <button
            className="w-full h-8 rounded-lg text-[11px] font-bold text-white flex items-center justify-between px-3 transition-all hover:opacity-90 active:scale-[0.98]"
            style={{ background: "#c0392b" }}
          >
            <span>Buy Now</span>
            {lowestPrice > 0 && <span>${(lowestPrice / 100).toFixed(2)}</span>}
          </button>
        </div>
      </div>
    </Link>
  );
}
