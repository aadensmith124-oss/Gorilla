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
    <div className="group flex flex-col gap-3">
      <div className="aspect-[1/1] w-full overflow-hidden rounded-xl relative">
        {product.image ? (
          <img 
            src={product.image} 
            alt={product.name}
            className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-secondary/20 text-muted-foreground">
            <Package className="h-12 w-12 opacity-50" />
          </div>
        )}
      </div>
      
      <div className="flex flex-col gap-1 px-1">
        <h3 className="font-bold text-sm leading-tight line-clamp-1">
          {product.name}
        </h3>
        <span className="text-lg font-bold font-mono text-primary">
          ${(lowestPrice / 100).toFixed(2)}
        </span>
      </div>
      
      <Link href={`/product/${product.id}`}>
        <Button className="w-full font-bold h-10" disabled={!hasStock}>
          {hasStock ? "BUY NOW" : "OUT OF STOCK"}
        </Button>
      </Link>
    </div>
  );
}
