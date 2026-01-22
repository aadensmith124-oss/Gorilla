import { useAuth } from "@/hooks/use-auth";
import { useProducts } from "@/hooks/use-products";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, Trash2, Package, Users, DollarSign, ShoppingBag } from "lucide-react";
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

  if (user?.role !== "admin") return <div className="p-8 text-center">Access Denied</div>;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-display font-black tracking-tighter italic">ADMIN DASHBOARD <span className="text-primary">8765</span></h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold italic">1,284</div>
          </CardContent>
        </Card>
        <Card className="bg-green-500/5 border-green-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold italic text-green-500">$12,450.00</div>
          </CardContent>
        </Card>
        <Card className="bg-accent/5 border-accent/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Items</CardTitle>
            <Package className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold italic text-accent">45</div>
          </CardContent>
        </Card>
        <Card className="bg-destructive/5 border-destructive/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Sold Items</CardTitle>
            <ShoppingBag className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold italic text-destructive">892</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Manage Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
               {productsLoading ? <Loader2 className="animate-spin" /> : (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {products?.map(p => (
                      <div key={p.id} className="p-4 rounded-xl bg-secondary/20 border border-border flex items-center justify-between">
                         <div className="flex items-center gap-3">
                            <img src={p.image} className="h-10 w-10 rounded-lg object-cover" />
                            <span className="font-bold italic">{p.name}</span>
                         </div>
                         <Button variant="ghost" size="icon" className="text-destructive">
                            <Trash2 className="h-4 w-4" />
                         </Button>
                      </div>
                    ))}
                 </div>
               )}
               <Button className="w-full h-12 gap-2 italic font-bold">
                 <Plus className="h-5 w-5" /> Add New Product
               </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}