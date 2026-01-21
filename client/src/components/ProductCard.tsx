import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import type { Product, Variant } from "@shared/schema";
import { Package } from "lucide-react";

interface ProductWithVariants extends Product {
  variants: (Variant & { stockCount: number })[];
}

export function ProductCard({ product }: { product: ProductWithVariants }) {
  const lowestPrice = Math.min(...product.variants.map(v => v.price));
  const hasStock = product.variants.some(v => v.stockCount > 0);

  return (
    <Link href={`/product/${product.id}`}>
      <div className="group relative cursor-pointer overflow-hidden rounded-xl bg-card transition-all hover:scale-[1.02]">
        <div className="aspect-[4/3] w-full relative">
          {product.image ? (
            <img 
              src={product.image} 
              alt={product.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-secondary/20 text-muted-foreground">
              <Package className="h-12 w-12 opacity-50" />
            </div>
          )}
          <div className="absolute top-2 right-2">
            <div className="bg-destructive text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-lg uppercase">
              From ${(lowestPrice / 100).toFixed(2)}
            </div>
          </div>
        </div>
        {!hasStock && (
          <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
            <span className="font-bold text-destructive rotate-[-15deg] border-2 border-destructive px-2 py-1">OUT OF STOCK</span>
          </div>
        )}
      </div>
    </Link>
  );
}
