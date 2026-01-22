import { useProducts } from "@/hooks/use-products";
import { ProductCard } from "@/components/ProductCard";
import { Input } from "@/components/ui/input";
import { Search, Loader2, Headset, Send } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

export default function ShopPage() {
  const { data: products, isLoading } = useProducts();
  const [search, setSearch] = useState("");

  const filtered = products?.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.description.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) {
    return <div className="flex h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col items-center gap-6 pt-4">
        <div className="flex items-center gap-3">
          <h1 className="text-4xl font-display font-black tracking-tighter text-foreground italic">
            RULF<span className="text-primary/80 italic">.CC</span>
          </h1>
          <Send className="h-6 w-6 text-primary fill-primary" />
        </div>

        <a 
          href="https://t.me/Rulfccbot" 
          target="_blank" 
          rel="noopener noreferrer"
        >
          <Button variant="destructive" className="h-12 px-8 font-bold gap-2 rounded-lg text-lg">
            <Headset className="h-5 w-5" /> Contact Support
          </Button>
        </a>

        <div className="relative w-full max-w-xl px-4">
          <Input 
            placeholder="Find products..." 
            className="h-14 bg-card/40 border-none text-lg pl-6 rounded-xl focus-visible:ring-primary/20"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {filtered?.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <p>No items found matching your search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 px-2">
          {filtered?.map((product, i) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
            >
              <ProductCard product={product} />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
