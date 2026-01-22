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
    <div className="space-y-12 pb-20 pt-4">
      <div className="flex flex-col items-center gap-8">
        <h1 className="text-5xl font-display font-black tracking-tighter text-white italic text-center">
          RULF<span className="text-primary italic">.CC</span>
        </h1>

        <a 
          href="https://t.me/Rulfccbot" 
          target="_blank" 
          rel="noopener noreferrer"
        >
          <Button variant="destructive" size="sm" className="h-10 px-6 font-bold gap-2 rounded-lg bg-[#e11d48] hover:bg-[#be123c] transition-colors uppercase tracking-tight shadow-xl shadow-red-500/20">
            <Headset className="h-4 w-4" /> Contact Support
          </Button>
        </a>

        <div className="relative w-full max-w-lg px-4">
          <Input 
            placeholder="Find products..." 
            className="h-12 bg-white/5 border-white/5 text-white placeholder:text-white/20 pl-6 rounded-xl focus-visible:ring-primary/20 text-sm font-medium"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {filtered?.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <p className="text-sm font-bold uppercase tracking-widest opacity-50">No products found</p>
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
