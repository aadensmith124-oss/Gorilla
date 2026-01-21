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
    <Card className="group overflow-hidden border-border bg-card/40 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1">
      <div className="aspect-[16/9] w-full overflow-hidden bg-secondary/50 relative">
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent z-10" />
        {product.image ? (
          <img 
            src={product.image} 
            alt={product.name}
            className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <Package className="h-12 w-12 opacity-50" />
          </div>
        )}
        <div className="absolute top-2 right-2 z-20">
          {!hasStock && <Badge variant="destructive" className="font-bold">OUT OF STOCK</Badge>}
          {hasStock && <Badge className="bg-primary hover:bg-primary font-bold">In Stock</Badge>}
        </div>
      </div>
      
      <CardHeader className="p-4 pb-2">
        <h3 className="font-display font-bold text-lg leading-tight line-clamp-1 group-hover:text-primary transition-colors">
          {product.name}
        </h3>
      </CardHeader>
      
      <CardContent className="p-4 pt-0">
        <p className="text-sm text-muted-foreground line-clamp-2 h-10">
          {product.description}
        </p>
      </CardContent>
      
      <CardFooter className="p-4 pt-2 flex items-center justify-between border-t border-border/50 bg-secondary/20">
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">Starting from</span>
          <span className="text-lg font-bold font-mono text-green-400">
            ${(lowestPrice / 100).toFixed(2)}
          </span>
        </div>
        <Link href={`/product/${product.id}`}>
          <Button size="sm" variant={hasStock ? "default" : "secondary"} disabled={!hasStock} className="font-semibold">
            {hasStock ? "View Item" : "Restocking"}
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
