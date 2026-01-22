import { useAuth } from "@/hooks/use-auth";
import { useProducts } from "@/hooks/use-products";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, Trash2, Package, Users, DollarSign, ShoppingBag, Terminal } from "lucide-react";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { api } from "@shared/routes";

export default function AdminPage() {
  const { user } = useAuth();
  const { data: products, isLoading: productsLoading } = useProducts();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  if (user?.role !== "admin") return <div className="p-8 text-center bg-[#090a0c] text-white min-h-screen pt-20 font-black italic uppercase tracking-tighter">Access Denied</div>;

  return (
    <div className="space-y-8 bg-[#090a0c] min-h-screen text-white">
      <div className="flex items-center justify-between border-b border-white/5 pb-6">
        <div className="flex items-center gap-3">
          <Terminal className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-display font-black tracking-tighter italic uppercase">
            ADMIN <span className="text-primary italic">8765</span>
          </h1>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 rounded bg-primary/10 border border-primary/20 text-[10px] font-black italic uppercase tracking-widest text-primary">
          Level 4 Access
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-[#16181d] border-white/5 shadow-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total Users</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black italic tracking-tighter">1,284</div>
          </CardContent>
        </Card>
        <Card className="bg-[#16181d] border-white/5 shadow-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total Sales</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black italic text-green-500 tracking-tighter">$12,450.00</div>
          </CardContent>
        </Card>
        <Card className="bg-[#16181d] border-white/5 shadow-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Active Items</CardTitle>
            <Package className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black italic text-accent tracking-tighter">45</div>
          </CardContent>
        </Card>
        <Card className="bg-[#16181d] border-white/5 shadow-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Sold Items</CardTitle>
            <ShoppingBag className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black italic text-destructive tracking-tighter">892</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-8">
        <Card className="bg-[#16181d] border-white/5">
          <CardHeader className="border-b border-white/5">
            <CardTitle className="text-sm font-black uppercase tracking-[0.2em] italic">Manage Products</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-6">
               {productsLoading ? <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" /></div> : (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {products?.map(p => (
                      <div key={p.id} className="p-4 rounded-xl bg-[#1c1f26] border border-white/5 flex items-center justify-between group hover:border-primary/30 transition-colors">
                         <div className="flex items-center gap-3">
                            <img src={p.image} className="h-10 w-10 rounded bg-[#0f1115] object-contain p-1 border border-white/5" />
                            <div className="flex flex-col">
                              <span className="text-[11px] font-black italic uppercase tracking-tighter text-white">{p.name}</span>
                              <span className="text-[9px] font-bold text-muted-foreground uppercase">{p.variants.length} Options</span>
                            </div>
                         </div>
                         <Button variant="ghost" size="icon" className="h-8 w-8 text-white/20 hover:text-destructive hover:bg-destructive/10">
                            <Trash2 className="h-4 w-4" />
                         </Button>
                      </div>
                    ))}
                 </div>
               )}
               <Button size="sm" className="w-full h-12 gap-2 italic font-black uppercase tracking-tighter bg-primary hover:bg-primary/80">
                 <Plus className="h-5 w-5" /> Add New Product
               </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}