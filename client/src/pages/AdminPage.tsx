import { useAuth } from "@/hooks/use-auth";
import { useProducts } from "@/hooks/use-products";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Plus, Trash2, Pencil, X, Users, DollarSign, ShoppingBag, Receipt, ShieldX, Menu, ChevronRight, ChevronDown, Link2, Star, Package, Wallet, Pin, Gift, Tag } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { SiBitcoin, SiCashapp } from "react-icons/si";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const adminSections = [
  { id: "dashboard", label: "Dashboard" },
  { id: "products", label: "Products" },
  { id: "orders", label: "Orders" },
  { id: "cashapp", label: "CashApp" },
  { id: "users", label: "Users" },
  { id: "codes", label: "Codes" },
  { id: "test", label: "Test Mode" },
  { id: "integrations", label: "Integrations" },
];

export default function AdminPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [activeSection, setActiveSection] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isAdmin = user?.role === 'admin';

  if (authLoading) {
    return <div className="flex h-screen items-center justify-center bg-[#090a0c]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!isAdmin) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-[#090a0c] gap-4">
        <ShieldX className="h-16 w-16 text-destructive" />
        <h1 className="text-xl font-bold text-white">Access Denied</h1>
      </div>
    );
  }

  const SidebarContent = () => (
    <>
      <div className="p-4 border-b border-white/5">
        <h1 className="text-lg font-semibold">ADMIN</h1>
      </div>
      <nav className="flex-1 p-2 space-y-1">
        {adminSections.map((section) => (
          <button
            key={section.id}
            onClick={() => { setActiveSection(section.id); setSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeSection === section.id ? "bg-primary/20 text-primary border border-primary/30" : "text-white/60 hover:bg-white/5 hover:text-white"
            }`}
          >
            <span>{section.label}</span>
            {activeSection === section.id && <ChevronRight className="h-4 w-4 ml-auto" />}
          </button>
        ))}
      </nav>
    </>
  );

  return (
    <div className="flex h-screen bg-[#090a0c] text-white overflow-hidden">
      <aside className="hidden md:flex w-64 border-r border-white/5 bg-[#0d0f12] flex-col">
        <SidebarContent />
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="md:hidden flex items-center justify-between p-4 border-b border-white/5 bg-[#0d0f12]">
          <h1 className="text-lg font-semibold">ADMIN</h1>
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger asChild>
              <Button size="icon" variant="ghost"><Menu className="h-5 w-5" /></Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0 bg-[#0d0f12] border-white/5">
              <SidebarContent />
            </SheetContent>
          </Sheet>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {activeSection === "dashboard" && <DashboardSection />}
          {activeSection === "products" && <ProductsSection />}
          {activeSection === "orders" && <OrdersSection />}
          {activeSection === "cashapp" && <CashAppSection />}
          {activeSection === "users" && <UsersSection />}
          {activeSection === "codes" && <CodesSection />}
          {activeSection === "test" && <TestModeSection onGoToOrders={() => setActiveSection("orders")} />}
          {activeSection === "integrations" && <IntegrationsSection />}
        </main>
      </div>
    </div>
  );
}

function DashboardSection() {
  const { data: stats, isLoading } = useQuery({
    queryKey: [api.admin.dashboard.path],
    queryFn: async () => {
      const res = await fetch(api.admin.dashboard.path);
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    }
  });

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatCard title="Total Users" value={stats?.totalUsers || 0} icon={Users} />
        <StatCard title="Total Orders" value={stats?.totalOrders || 0} icon={ShoppingBag} />
        <StatCard title="Total Sales" value={`$${((stats?.totalSales || 0) / 100).toFixed(2)}`} icon={DollarSign} color="green" />
        <StatCard title="Pending Orders" value={stats?.pendingOrders || 0} icon={Receipt} color="orange" />
        <StatCard title="Stock Worth" value={`$${((stats?.stockWorth || 0) / 100).toFixed(2)}`} icon={Package} color="gold" />
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color }: any) {
  const colorClass = color === "green" ? "text-green-500" : color === "orange" ? "text-orange-500" : "text-primary";
  return (
    <Card className="bg-[#0f1115] border-white/5">
      <CardContent className="p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{title}</p>
          <p className="text-xl font-bold mt-1">{value}</p>
        </div>
        <Icon className={`h-8 w-8 ${colorClass} opacity-60`} />
      </CardContent>
    </Card>
  );
}

function ProductsSection() {
  const { toast } = useToast();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [expandedProduct, setExpandedProduct] = useState<number | null>(null);
  const [managingStock, setManagingStock] = useState<number | null>(null);
  const [editingVariant, setEditingVariant] = useState<number | null>(null);
  const { data: products, isLoading } = useProducts();

  const productSchema = z.object({
    name: z.string().min(1, "Name required"),
    image: z.string().optional(),
    description: z.string().optional(),
  });

  const variantSchema = z.object({
    name: z.string().min(1, "Name required"),
    price: z.string().min(1, "Price required"),
    comparePrice: z.string().optional(),
    minQuantity: z.string().default("1"),
  });

  const addForm = useForm<z.infer<typeof productSchema>>({
    resolver: zodResolver(productSchema),
    defaultValues: { name: "", image: "", description: "" },
  });

  const editForm = useForm<z.infer<typeof productSchema>>({
    resolver: zodResolver(productSchema),
    defaultValues: { name: "", image: "", description: "" },
  });

  const variantForm = useForm<z.infer<typeof variantSchema>>({
    resolver: zodResolver(variantSchema),
    defaultValues: { name: "", price: "", comparePrice: "", minQuantity: "1" },
  });

  const editVariantForm = useForm<z.infer<typeof variantSchema>>({
    resolver: zodResolver(variantSchema),
    defaultValues: { name: "", price: "", comparePrice: "", minQuantity: "1" },
  });

  const addMutation = useMutation({
    mutationFn: async (data: z.infer<typeof productSchema>) => {
      const res = await apiRequest("POST", api.products.create.path, { ...data, description: data.description || "" });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.products.list.path] });
      addForm.reset();
      setShowAddForm(false);
      toast({ title: "Product added" });
    }
  });

  const editMutation = useMutation({
    mutationFn: async (data: z.infer<typeof productSchema>) => {
      const res = await apiRequest("PATCH", `/api/admin/products/${editingProduct.id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.products.list.path] });
      setEditingProduct(null);
      toast({ title: "Product updated" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/admin/products/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.products.list.path] });
      toast({ title: "Product deleted" });
    }
  });

  const pinMutation = useMutation({
    mutationFn: async ({ id, pinned }: { id: number; pinned: boolean }) => {
      const res = await apiRequest("PATCH", `/api/admin/products/${id}`, { pinned });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.products.list.path] });
    }
  });

  const addVariantMutation = useMutation({
    mutationFn: async ({ productId, data }: { productId: number; data: z.infer<typeof variantSchema> }) => {
      const res = await apiRequest("POST", api.variants.create.path, {
        productId,
        name: data.name,
        price: Math.round(parseFloat(data.price) * 100),
        comparePrice: data.comparePrice ? Math.round(parseFloat(data.comparePrice) * 100) : null,
        minQuantity: parseInt(data.minQuantity) || 1,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.products.list.path] });
      variantForm.reset({ name: "", price: "", comparePrice: "", minQuantity: "1" });
      toast({ title: "Variant added" });
    }
  });

  const updateVariantMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: z.infer<typeof variantSchema> }) => {
      const res = await apiRequest("PATCH", `/api/admin/variants/${id}`, {
        name: data.name,
        price: Math.round(parseFloat(data.price) * 100),
        comparePrice: data.comparePrice ? Math.round(parseFloat(data.comparePrice) * 100) : null,
        minQuantity: parseInt(data.minQuantity) || 1,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.products.list.path] });
      setEditingVariant(null);
      toast({ title: "Variant updated" });
    },
    onError: (e: any) => { toast({ title: "Error", description: e.message, variant: "destructive" }); }
  });

  const deleteVariantMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/admin/variants/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.products.list.path] });
      toast({ title: "Variant deleted" });
    }
  });

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" /></div>;

  const startEdit = (product: any) => {
    setEditingProduct(product);
    editForm.reset({ name: product.name, image: product.image || "", description: product.description || "" });
    setShowAddForm(false);
  };

  const ImageUploadField = ({ field }: { field: any }) => (
    <div className="space-y-2">
      <Input {...field} placeholder="https://example.com/image.png" className="bg-black/50 border-white/10" />
      <label className="block">
        <span className="text-xs text-muted-foreground cursor-pointer hover:text-primary transition-colors">Or upload file →</span>
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              const reader = new FileReader();
              reader.onload = (ev) => field.onChange(ev.target?.result);
              reader.readAsDataURL(file);
            }
          }}
        />
      </label>
      {field.value && field.value.startsWith("data:") && (
        <div className="flex items-center gap-2 text-xs text-green-400">
          <span>✓ Image uploaded</span>
          <button type="button" onClick={() => field.onChange("")} className="text-destructive hover:opacity-80">Remove</button>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Products</h1>
        <Button size="sm" onClick={() => { setShowAddForm(!showAddForm); setEditingProduct(null); }} className="gap-1.5 text-xs">
          <Plus className="h-3.5 w-3.5" />Add Product
        </Button>
      </div>

      {showAddForm && (
        <Card className="bg-[#0f1115] border-primary/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Add Product</CardTitle>
              <Button size="icon" variant="ghost" onClick={() => setShowAddForm(false)}><X className="h-4 w-4" /></Button>
            </div>
          </CardHeader>
          <CardContent>
            <Form {...addForm}>
              <form onSubmit={addForm.handleSubmit((d) => addMutation.mutate(d))} className="space-y-4">
                <FormField control={addForm.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Name</FormLabel>
                    <FormControl><Input {...field} className="bg-black/50 border-white/10" /></FormControl>
                  </FormItem>
                )} />
                <FormField control={addForm.control} name="image" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Image</FormLabel>
                    <FormControl><ImageUploadField field={field} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={addForm.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Describe the product — shown on product detail page..."
                        rows={4}
                        className="bg-black/50 border-white/10 resize-none text-sm"
                      />
                    </FormControl>
                  </FormItem>
                )} />
                <Button type="submit" size="sm" className="w-full text-xs" disabled={addMutation.isPending}>
                  {addMutation.isPending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}Save Product
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {editingProduct && (
        <Card className="bg-[#0f1115] border-primary/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Edit: {editingProduct.name}</CardTitle>
              <Button size="icon" variant="ghost" onClick={() => setEditingProduct(null)}><X className="h-4 w-4" /></Button>
            </div>
          </CardHeader>
          <CardContent>
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit((d) => editMutation.mutate(d))} className="space-y-4">
                <FormField control={editForm.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Name</FormLabel>
                    <FormControl><Input {...field} className="bg-black/50 border-white/10" /></FormControl>
                  </FormItem>
                )} />
                <FormField control={editForm.control} name="image" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Image</FormLabel>
                    <FormControl><ImageUploadField field={field} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={editForm.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Describe the product — shown on product detail page..."
                        rows={4}
                        className="bg-black/50 border-white/10 resize-none text-sm"
                      />
                    </FormControl>
                  </FormItem>
                )} />
                <Button type="submit" size="sm" className="w-full text-xs" disabled={editMutation.isPending}>
                  {editMutation.isPending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}Update Product
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {products?.map((product: any) => (
          <div key={product.id} className="bg-[#0f1115] border border-white/5 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                {product.image && (
                  <img src={product.image} alt={product.name} className="w-10 h-10 object-cover rounded" />
                )}
                <div>
                  <p className="font-bold text-sm">{product.name}</p>
                  <p className="text-xs text-muted-foreground">{product.variants?.length || 0} variant(s)</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost" size="icon"
                  className={`h-8 w-8 ${product.pinned ? "text-primary" : "text-muted-foreground hover:text-primary"}`}
                  title={product.pinned ? "Unpin product" : "Pin to top (max 4)"}
                  disabled={pinMutation.isPending || (!product.pinned && (products?.filter((p: any) => p.pinned).length ?? 0) >= 4)}
                  onClick={() => pinMutation.mutate({ id: product.id, pinned: !product.pinned })}
                >
                  <Pin className={`h-4 w-4 ${product.pinned ? "fill-primary" : ""}`} />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary"
                  onClick={() => setExpandedProduct(expandedProduct === product.id ? null : product.id)}>
                  <ChevronDown className={`h-4 w-4 transition-transform ${expandedProduct === product.id ? "rotate-180" : ""}`} />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-white"
                  onClick={() => startEdit(product)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10"
                  onClick={() => { if (confirm("Delete product?")) deleteMutation.mutate(product.id); }}
                  disabled={deleteMutation.isPending}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {expandedProduct === product.id && (
              <div className="border-t border-white/5 p-4 space-y-4">
                <p className="text-xs text-muted-foreground font-bold">Variants</p>

                {product.variants?.length > 0 ? (
                  <div className="space-y-2">
                    {product.variants.map((v: any) => (
                      <div key={v.id}>
                        <div className="flex items-center justify-between bg-black/30 rounded-lg px-3 py-2 border border-white/5">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-sm font-medium truncate">{v.name}</span>
                            <span className="text-xs text-muted-foreground">${(v.price / 100).toFixed(2)}</span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${v.stockCount > 0 ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                              {v.stockCount || 0} in stock
                            </span>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Button
                              variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary"
                              onClick={() => {
                                if (editingVariant === v.id) { setEditingVariant(null); return; }
                                setEditingVariant(v.id);
                                editVariantForm.reset({ name: v.name, price: (v.price / 100).toFixed(2), comparePrice: v.comparePrice ? (v.comparePrice / 100).toFixed(2) : "", minQuantity: String(v.minQuantity ?? 1) });
                              }}
                              title="Edit variant"
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary"
                              onClick={() => setManagingStock(managingStock === v.id ? null : v.id)}
                              title="Manage stock"
                            >
                              <Package className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10"
                              onClick={() => { if (confirm("Delete variant?")) deleteVariantMutation.mutate(v.id); }}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        {editingVariant === v.id && (
                          <div className="mt-1 bg-black/40 border border-primary/20 rounded-lg p-3">
                            <Form {...editVariantForm}>
                              <form onSubmit={editVariantForm.handleSubmit((d) => updateVariantMutation.mutate({ id: v.id, data: d }))}
                                className="grid grid-cols-2 gap-2 items-end">
                                <FormField control={editVariantForm.control} name="name" render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-xs">Name</FormLabel>
                                    <FormControl><Input {...field} className="bg-black/50 border-white/10 h-8 text-xs" /></FormControl>
                                  </FormItem>
                                )} />
                                <FormField control={editVariantForm.control} name="minQuantity" render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-xs">Min Qty</FormLabel>
                                    <FormControl><Input {...field} type="number" min="1" className="bg-black/50 border-white/10 h-8 text-xs" /></FormControl>
                                  </FormItem>
                                )} />
                                <FormField control={editVariantForm.control} name="price" render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-xs">Sale Price ($)</FormLabel>
                                    <FormControl><Input {...field} type="number" step="0.01" className="bg-black/50 border-white/10 h-8 text-xs" /></FormControl>
                                  </FormItem>
                                )} />
                                <FormField control={editVariantForm.control} name="comparePrice" render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-xs">Original Price ($) <span className="text-white/30">(optional)</span></FormLabel>
                                    <FormControl><Input {...field} type="number" step="0.01" placeholder="e.g. 19.99" className="bg-black/50 border-white/10 h-8 text-xs" /></FormControl>
                                  </FormItem>
                                )} />
                                <div className="col-span-2 flex gap-2">
                                  <Button type="submit" size="sm" className="flex-1 h-8 text-xs" disabled={updateVariantMutation.isPending}>
                                    {updateVariantMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
                                  </Button>
                                  <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setEditingVariant(null)}>
                                    Cancel
                                  </Button>
                                </div>
                              </form>
                            </Form>
                          </div>
                        )}
                        {managingStock === v.id && <VariantStockPanel variantId={v.id} />}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">No variants yet</p>
                )}

                <Form {...variantForm}>
                  <form onSubmit={variantForm.handleSubmit((d) => addVariantMutation.mutate({ productId: product.id, data: d }))}
                    className="grid grid-cols-2 gap-2 items-end">
                    <FormField control={variantForm.control} name="name" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Name</FormLabel>
                        <FormControl><Input {...field} placeholder="e.g. 1 Month" className="bg-black/50 border-white/10 h-8 text-xs" /></FormControl>
                      </FormItem>
                    )} />
                    <FormField control={variantForm.control} name="minQuantity" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Min Qty</FormLabel>
                        <FormControl><Input {...field} placeholder="1" type="number" min="1" className="bg-black/50 border-white/10 h-8 text-xs" /></FormControl>
                      </FormItem>
                    )} />
                    <FormField control={variantForm.control} name="price" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Sale Price ($)</FormLabel>
                        <FormControl><Input {...field} placeholder="9.99" type="number" step="0.01" className="bg-black/50 border-white/10 h-8 text-xs" /></FormControl>
                      </FormItem>
                    )} />
                    <FormField control={variantForm.control} name="comparePrice" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Original Price ($) <span className="text-white/30">(optional)</span></FormLabel>
                        <FormControl><Input {...field} placeholder="19.99" type="number" step="0.01" className="bg-black/50 border-white/10 h-8 text-xs" /></FormControl>
                      </FormItem>
                    )} />
                    <div className="col-span-2">
                      <Button type="submit" size="sm" className="w-full h-8 text-xs gap-1" disabled={addVariantMutation.isPending}>
                        {addVariantMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                        Add Variant
                      </Button>
                    </div>
                  </form>
                </Form>
              </div>
            )}
          </div>
        ))}

        {(!products || products.length === 0) && (
          <div className="text-center py-12 text-muted-foreground text-sm">No products yet. Add one above.</div>
        )}
      </div>
    </div>
  );
}

function VariantStockPanel({ variantId }: { variantId: number }) {
  const [input, setInput] = useState("");
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: items, isLoading } = useQuery({
    queryKey: ["/api/admin/stock", variantId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/stock/${variantId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch stock");
      return res.json();
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      if (!input.trim()) throw new Error("No items to add");
      const res = await apiRequest("POST", "/api/admin/stock/bulk", { variantId, rawContent: input });
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: `Added ${data.addedCount} stock item${data.addedCount !== 1 ? "s" : ""}` });
      setInput("");
      qc.invalidateQueries({ queryKey: ["/api/admin/stock", variantId] });
      qc.invalidateQueries({ queryKey: ["/api/products"] });
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/admin/stock/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/stock", variantId] });
      qc.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: "Item removed" });
    },
  });

  return (
    <div className="mt-1 mb-2 bg-black/50 rounded-lg border border-white/8 p-3 space-y-3">
      <p className="text-[10px] font-bold text-muted-foreground">
        Stock — {isLoading ? "..." : `${items?.length || 0} items available`}
      </p>

      <div className="space-y-1.5">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={"Blank line separates items:\nstock1\n\nstock2\n\nstock3"}
          rows={4}
          className="bg-black/60 border-white/10 text-xs font-mono resize-none placeholder:text-white/20"
        />
        <Button
          size="sm"
          className="w-full h-7 text-xs gap-1"
          disabled={!input.trim() || addMutation.isPending}
          onClick={() => addMutation.mutate()}
        >
          {addMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
          Add Stock Items
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-2"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
      ) : items?.length > 0 ? (
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {items.map((item: any) => (
            <div key={item.id} className="flex items-start gap-2 bg-black/30 rounded px-2 py-2 border border-white/5">
              <span className="text-[11px] font-mono text-white/60 flex-1 whitespace-pre-wrap break-all">
                {item.content}
              </span>
              <button
                onClick={() => deleteMutation.mutate(item.id)}
                disabled={deleteMutation.isPending}
                className="text-destructive/70 hover:text-destructive transition-colors flex-shrink-0"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic text-center py-1">No stock items yet</p>
      )}
    </div>
  );
}

function statusLabel(s: string) {
  if (s === "pending") return "Pending";
  if (s === "waiting_payment") return "Unpaid";
  if (s === "delivering") return "Fulfilled";
  if (s === "fulfilled") return "Fulfilled";
  if (s === "refunded") return "Refunded";
  if (s === "replaced") return "Replaced";
  return s;
}

function statusBadgeClass(s: string) {
  if (s === "pending") return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
  if (s === "waiting_payment") return "bg-red-500/20 text-red-400 border-red-500/30";
  if (s === "delivering" || s === "fulfilled") return "bg-green-500/20 text-green-400 border-green-500/30";
  if (s === "refunded") return "bg-orange-500/20 text-orange-400 border-orange-500/30";
  if (s === "replaced") return "bg-blue-500/20 text-blue-400 border-blue-500/30";
  return "bg-white/10 text-white/60";
}

function OrdersSection() {
  const { toast } = useToast();
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [orderFilter, setOrderFilter] = useState<"all" | "waiting" | "fulfilled" | "pending">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: orders, isLoading } = useQuery({
    queryKey: ["/api/admin/orders"],
    queryFn: async () => {
      const res = await fetch("/api/admin/orders");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    refetchInterval: 8000,
  });

  const cashappFulfillMutation = useMutation({
    mutationFn: async (orderId: number) => {
      const res = await apiRequest("POST", `/api/admin/orders/${orderId}/cashapp-fulfill`, {});
      if (!res.ok) { const err = await res.json(); throw new Error(err.message || "Failed"); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
      toast({ title: "Order fulfilled — items sent to user" });
    },
    onError: (e: any) => { toast({ title: "Error", description: e.message, variant: "destructive" }); }
  });

  const markUnpaidMutation = useMutation({
    mutationFn: async (orderId: number) => {
      const res = await apiRequest("POST", `/api/admin/orders/${orderId}/mark-unpaid`, {});
      if (!res.ok) { const err = await res.json(); throw new Error(err.message || "Failed"); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
      toast({ title: "Order marked unpaid" });
    },
    onError: (e: any) => { toast({ title: "Error", description: e.message, variant: "destructive" }); }
  });

  const refundMutation = useMutation({
    mutationFn: async (orderId: number) => {
      const res = await apiRequest("POST", `/api/admin/orders/${orderId}/refund`, {});
      if (!res.ok) { const err = await res.json(); throw new Error(err.message || "Failed"); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
      setSelectedOrder(null);
      toast({ title: "Order refunded — balance returned to user" });
    },
    onError: (e: any) => { toast({ title: "Error", description: e.message, variant: "destructive" }); }
  });

  const replaceMutation = useMutation({
    mutationFn: async (orderId: number) => {
      const res = await apiRequest("POST", `/api/admin/orders/${orderId}/replace`, {});
      if (!res.ok) { const err = await res.json(); throw new Error(err.message || "Failed"); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
      setSelectedOrder(null);
      toast({ title: "Replacement stock sent to user" });
    },
    onError: (e: any) => { toast({ title: "Error", description: e.message, variant: "destructive" }); }
  });

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" /></div>;

  if (selectedOrder) {
    const current = orders?.find((o: any) => o.id === selectedOrder.id) || selectedOrder;
    const productItems = current.items?.filter((i: any) => !i.itemType || i.itemType === "product") || [];
    const grouped: Record<string, { productName: string; variantName: string; qty: number; unitPrice: number }> = {};
    for (const item of productItems) {
      const key = String(item.variantId || item.id);
      if (!grouped[key]) grouped[key] = { productName: item.productName || "Product", variantName: item.variant?.name || "—", qty: 0, unitPrice: item.price };
      grouped[key].qty += (item.quantity ?? 1);
    }
    const groupedEntries = Object.entries(grouped);

    return (
      <div className="space-y-4">
        <Button variant="outline" size="sm" onClick={() => setSelectedOrder(null)}>← Back</Button>

        <div className="bg-[#0f1115] border border-white/5 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-white">Order Detail</h2>
            <Badge className={statusBadgeClass(current.status)}>{statusLabel(current.status)}</Badge>
          </div>

          <div className="space-y-3 border-b border-white/5 pb-4">
            <div><p className="text-[10px] text-white/40 mb-0.5">Order ID</p><p className="text-xs font-mono text-white break-all">{current.orderId}</p></div>
            <div><p className="text-[10px] text-white/40 mb-0.5">Date</p><p className="text-xs text-white">{new Date(current.createdAt).toLocaleString("en-US")}</p></div>
            <div><p className="text-[10px] text-white/40 mb-0.5">Customer</p><p className="text-xs text-white font-bold">{current.user?.username || current.userId} · @{current.user?.telegramUsername || "—"}</p></div>
            <div><p className="text-[10px] text-white/40 mb-0.5">Payment</p><p className="text-xs text-white">{current.paymentMethod || "—"}</p></div>
            {current.paymentNote && (
              <div><p className="text-[10px] text-white/40 mb-0.5">Payment Note</p><p className="text-xs font-mono text-[#00D632]">{current.paymentNote}</p></div>
            )}
            <div><p className="text-[10px] text-white/40 mb-0.5">Amount</p><p className="text-xs text-white">${(current.total / 100).toFixed(2)}</p></div>
            <div><p className="text-[10px] text-white/40 mb-0.5">Status</p><p className={`text-xs font-bold ${statusTextColor(current.status)}`}>{statusLabel(current.status)}</p></div>
          </div>

          {current.status === "pending" && current.paymentMethod === "CashApp" && (
            <div className="flex gap-3 border-b border-white/5 pb-4">
              <button
                onClick={() => { cashappFulfillMutation.mutate(current.id); }}
                disabled={cashappFulfillMutation.isPending}
                className="flex-1 h-11 rounded-xl bg-[#00D632]/20 border border-[#00D632]/40 text-[#00D632] text-sm font-black hover:bg-[#00D632]/30 transition-colors disabled:opacity-50"
                data-testid={`button-cashapp-paid-detail-${current.id}`}
              >
                {cashappFulfillMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "✓ Paid — Deliver Stock"}
              </button>
              <button
                onClick={() => { markUnpaidMutation.mutate(current.id); }}
                disabled={markUnpaidMutation.isPending}
                className="flex-1 h-11 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-bold hover:bg-red-500/20 transition-colors disabled:opacity-50"
                data-testid={`button-cashapp-unpaid-detail-${current.id}`}
              >
                ✕ Unpaid
              </button>
            </div>
          )}

          {(current.status === "delivering" || current.status === "fulfilled" || current.status === "replaced") && (
            <div className="flex gap-2 border-b border-white/5 pb-4">
              <button
                onClick={() => replaceMutation.mutate(current.id)}
                disabled={replaceMutation.isPending}
                className="flex-1 h-9 rounded-xl bg-primary/20 border border-primary/40 text-primary text-xs font-black hover:bg-primary/30 transition-colors disabled:opacity-50"
                data-testid={`button-replace-${current.id}`}
              >
                {replaceMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mx-auto" /> : "↺ Replace (new stock)"}
              </button>
              <button
                onClick={() => refundMutation.mutate(current.id)}
                disabled={refundMutation.isPending || current.status === "refunded"}
                className="flex-1 h-9 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-black hover:bg-orange-500/20 transition-colors disabled:opacity-50"
                data-testid={`button-refund-${current.id}`}
              >
                {refundMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mx-auto" /> : "$ Refund to Balance"}
              </button>
            </div>
          )}

          {groupedEntries.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] text-white/40">Items Ordered</p>
              {groupedEntries.map(([key, g]) => (
                <div key={key} className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-white/5 border border-white/5">
                  <div>
                    <p className="text-xs font-bold text-white">{g.productName}</p>
                    <p className="text-[10px] text-white/40 mt-0.5">{g.variantName} · qty {g.qty}</p>
                  </div>
                  <p className="text-xs text-white/70">${((g.unitPrice * g.qty) / 100).toFixed(2)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  const q = searchQuery.trim().toLowerCase();
  const filteredOrders = (orders || []).filter((o: any) => {
    if (orderFilter === "waiting") { if (!(o.paymentMethod === "CashApp" && o.status === "pending")) return false; }
    else if (orderFilter === "fulfilled") { if (!(o.status === "delivering" || o.status === "fulfilled" || o.status === "replaced")) return false; }
    if (!q) return true;
    return (
      o.orderId?.toLowerCase().includes(q) ||
      o.user?.username?.toLowerCase().includes(q) ||
      o.paymentNote?.toLowerCase().includes(q) ||
      o.paymentMethod?.toLowerCase().includes(q)
    );
  });

  const waitingCount = (orders || []).filter((o: any) => o.paymentMethod === "CashApp" && o.status === "pending").length;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Orders</h1>

      <div className="relative">
        <input
          type="text"
          placeholder="Search by order ID, username, payment note..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full h-9 bg-white/5 border border-white/10 rounded-lg px-3 pr-8 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-primary/40"
          data-testid="input-order-search"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="flex gap-2 flex-wrap">
        {[
          { key: "all", label: "All" },
          { key: "waiting", label: `Unconfirmed CashApp${waitingCount > 0 ? ` (${waitingCount})` : ""}` },
          { key: "fulfilled", label: "Delivered" },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setOrderFilter(key as any)}
            className={`px-3 py-1 rounded-lg text-[10px] font-bold border transition-all ${
              orderFilter === key
                ? key === "waiting"
                  ? "bg-yellow-500/20 border-yellow-500/40 text-yellow-400"
                  : "bg-primary/20 border-primary/40 text-primary"
                : "bg-white/5 border-white/10 text-white/50 hover:text-white hover:border-white/20"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {filteredOrders.length === 0 && (
        <div className="text-center py-12 text-muted-foreground text-sm">No orders here.</div>
      )}

      <div className="bg-[#0f1115] border border-white/5 rounded-xl overflow-hidden">
        <div className="grid grid-cols-[auto_1fr_auto_auto] px-3 py-2 border-b border-white/5 gap-2">
          <span className="text-[10px] font-bold text-white/40">$</span>
          <span className="text-[10px] font-bold text-white/40">Note / Method</span>
          <span className="text-[10px] font-bold text-white/40">Status</span>
          <span></span>
        </div>
        {filteredOrders.map((order: any) => (
          <div key={order.id} className="grid grid-cols-[auto_1fr_auto_auto] px-3 py-2.5 border-b border-white/5 last:border-0 items-center gap-2 hover:bg-white/5 transition-colors cursor-pointer" onClick={() => setSelectedOrder(order)}>
            <span className="text-xs font-bold text-white">${(order.total / 100).toFixed(2)}</span>
            <div className="min-w-0">
              <p className="text-[11px] text-white/70 truncate font-mono">{order.user?.username ? `@${order.user.username}` : ""} <span className="text-white/40">{order.orderId?.slice(0, 10)}</span></p>
              <p className="text-[10px] text-white/30 truncate">{order.paymentNote || order.paymentMethod || "—"} · {new Date(order.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
            </div>
            <span className={`text-[11px] font-bold ${statusTextColor(order.status)}`}>{statusLabel(order.status)}</span>
            <ChevronRight className="h-3.5 w-3.5 text-white/20" />
          </div>
        ))}
      </div>
    </div>
  );
}

function statusTextColor(s: string) {
  if (s === "pending") return "text-yellow-400";
  if (s === "waiting_payment") return "text-red-400";
  if (s === "delivering" || s === "fulfilled") return "text-green-400";
  if (s === "refunded") return "text-orange-400";
  if (s === "replaced") return "text-blue-400";
  return "text-white/50";
}


function TestModeSection({ onGoToOrders }: { onGoToOrders: () => void }) {
  const { toast } = useToast();
  const { data: products } = useProducts();
  const [selectedProduct, setSelectedProduct] = useState<number | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [lastOrder, setLastOrder] = useState<any>(null);

  const testOrderMutation = useMutation({
    mutationFn: async () => {
      if (!selectedProduct || !selectedVariant) throw new Error("Select product and variant");
      const res = await apiRequest("POST", "/api/admin/test-order", {
        productId: selectedProduct,
        variantId: selectedVariant,
        quantity
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed");
      }
      return res.json();
    },
    onSuccess: (order) => {
      setLastOrder(order);
      toast({ title: "Test order created!", description: `Order ${order.orderId} created with status 'delivering'` });
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  });

  const product = products?.find((p: any) => p.id === selectedProduct);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Test Mode</h1>
        <p className="text-sm text-muted-foreground mt-1">Create a fake order to test the delivery flow — no payment needed.</p>
      </div>

      <Card className="bg-[#0f1115] border-primary/20">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            Create Test Order (No Payment)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground block mb-2">Product</label>
            <Select value={selectedProduct?.toString()} onValueChange={(v) => { setSelectedProduct(Number(v)); setSelectedVariant(null); }}>
              <SelectTrigger className="bg-black/50 border-white/10">
                <SelectValue placeholder="Select a product" />
              </SelectTrigger>
              <SelectContent className="bg-[#0f1115] border-white/10">
                {products?.map((p: any) => (
                  <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {product && (
            <div>
              <label className="text-xs text-muted-foreground block mb-2">Variant</label>
              <Select value={selectedVariant?.toString()} onValueChange={(v) => setSelectedVariant(Number(v))}>
                <SelectTrigger className="bg-black/50 border-white/10">
                  <SelectValue placeholder="Select a variant" />
                </SelectTrigger>
                <SelectContent className="bg-[#0f1115] border-white/10">
                  {product.variants?.map((v: any) => (
                    <SelectItem key={v.id} value={v.id.toString()}>
                      {v.name} — ${(v.price / 100).toFixed(2)} (min {v.minQuantity || 1})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <label className="text-xs text-muted-foreground block mb-2">Quantity</label>
            <Input
              type="number" min="1" value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="bg-black/50 border-white/10"
            />
          </div>

          <Button
            size="sm"
            onClick={() => testOrderMutation.mutate()}
            disabled={testOrderMutation.isPending || !selectedProduct || !selectedVariant}
            className="w-full text-xs"
          >
            {testOrderMutation.isPending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
            Create Test Order
          </Button>
        </CardContent>
      </Card>

      {lastOrder && (
        <Card className="bg-green-500/5 border-green-500/20">
          <CardContent className="p-4 space-y-3">
            <p className="text-sm font-bold text-green-400">✓ Test order created!</p>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>Order ID: <span className="font-mono text-white">{lastOrder.orderId}</span></p>
              <p>Status: <Badge className="bg-blue-500/20 text-blue-400 text-[10px]">delivering</Badge></p>
              <p className="text-white/60">Now go to the Orders tab to paste items and fulfill this order.</p>
            </div>
            <Button size="sm" className="w-full" onClick={onGoToOrders}>
              Go to Orders →
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}


function UsersSection() {
  const { toast } = useToast();
  const [selectedUser, setSelectedUser] = useState<any>(null);

  const { data: users, isLoading } = useQuery({
    queryKey: ['/api/admin/users'],
    queryFn: async () => {
      const res = await fetch('/api/admin/users');
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    refetchInterval: 15000,
  });

  const banMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await apiRequest('POST', api.admin.banUser.path.replace(':id', userId.toString()));
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({ title: 'User banned' });
      if (selectedUser) setSelectedUser((u: any) => ({ ...u, isBanned: true }));
    },
  });

  const unbanMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await apiRequest('POST', api.admin.unbanUser.path.replace(':id', userId.toString()));
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({ title: 'User unbanned' });
      if (selectedUser) setSelectedUser((u: any) => ({ ...u, isBanned: false }));
    },
  });

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" /></div>;

  if (selectedUser) {
    return (
      <div className="space-y-4">
        <Button variant="outline" size="sm" onClick={() => setSelectedUser(null)}>← Back to Users</Button>
        <Card className="bg-[#0f1115] border-white/5">
          <CardHeader>
            <CardTitle className="flex items-center justify-between flex-wrap gap-2">
              <span>{selectedUser.username}</span>
              {selectedUser.isBanned && <Badge className="bg-red-500/20 text-red-400">BANNED</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-white/5 rounded-xl p-3 space-y-2 border border-white/5 text-sm">
              <p className="text-[10px] font-bold text-muted-foreground mb-2">Account</p>
              <div className="flex justify-between"><p className="text-xs text-muted-foreground">Email</p><p className="text-xs">{selectedUser.email}</p></div>
              <div className="flex justify-between"><p className="text-xs text-muted-foreground">Telegram</p><p className="text-xs">@{selectedUser.telegramUsername || '—'}</p></div>
              <div className="flex justify-between"><p className="text-xs text-muted-foreground">Role</p><p className="text-xs capitalize">{selectedUser.role}</p></div>
              <div className="flex justify-between"><p className="text-xs text-muted-foreground">Joined</p><p className="text-xs">{new Date(selectedUser.createdAt).toLocaleDateString()}</p></div>
            </div>
            <div className="border-t border-white/5 pt-3 flex gap-2">
              {selectedUser.isBanned ? (
                <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white h-8 text-xs"
                  onClick={() => unbanMutation.mutate(selectedUser.id)} disabled={unbanMutation.isPending}>
                  {unbanMutation.isPending && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                  Unban User
                </Button>
              ) : (
                <Button size="sm" variant="outline" className="border-destructive/40 text-destructive hover:bg-destructive/10 h-8 text-xs"
                  onClick={() => { if (confirm('Ban this user?')) banMutation.mutate(selectedUser.id); }}
                  disabled={banMutation.isPending}>
                  {banMutation.isPending && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                  Ban User
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Users</h1>
        <p className="text-sm text-muted-foreground mt-1">{users?.length || 0} total</p>
      </div>
      <div className="space-y-2">
        {users?.map((user: any) => (
          <Card key={user.id} className="bg-[#0f1115] border-white/5 cursor-pointer hover:border-white/10 transition-colors"
            onClick={() => setSelectedUser(user)}>
            <CardContent className="p-4 flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold text-sm text-white">{user.username}</p>
                  {user.isBanned && <Badge className="bg-red-500/20 text-red-400 text-[9px]">BANNED</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">{user.email} · @{user.telegramUsername || '—'}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function CodesSection() {
  const { toast } = useToast();
  const [tab, setTab] = useState<"balance" | "discount">("balance");

  // Balance codes state
  const [amount, setAmount] = useState("");
  const [count, setCount] = useState("1");
  const [generated, setGenerated] = useState<string[]>([]);
  const qc = useQueryClient();

  const { data: balanceCodes, isLoading: balanceLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/codes"],
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const amountCents = Math.round(parseFloat(amount) * 100);
      if (isNaN(amountCents) || amountCents <= 0) throw new Error("Enter a valid amount");
      const qty = parseInt(count) || 1;
      if (qty < 1 || qty > 100) throw new Error("Quantity must be 1–100");
      const res = await apiRequest("POST", "/api/admin/codes", { amount: amountCents, count: qty });
      return res.json();
    },
    onSuccess: (data) => {
      setGenerated(data.codes || []);
      qc.invalidateQueries({ queryKey: ["/api/admin/codes"] });
      toast({ title: `${data.codes?.length || 0} code(s) generated` });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const copyAll = () => {
    navigator.clipboard.writeText(generated.join("\n"));
    toast({ title: "Copied all codes" });
  };

  // Discount codes state
  const [dForm, setDForm] = useState({ code: "", type: "percent", value: "", minOrder: "", maxUses: "", expiresAt: "" });
  const { data: discountList = [] } = useQuery<any[]>({ queryKey: ["/api/admin/discount-codes"] });

  const createDiscountMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/discount-codes", dForm),
    onSuccess: () => {
      toast({ title: "Discount code created" });
      setDForm({ code: "", type: "percent", value: "", minOrder: "", maxUses: "", expiresAt: "" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/discount-codes"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const toggleDiscountMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      apiRequest("PATCH", `/api/admin/discount-codes/${id}`, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/discount-codes"] }),
  });

  const deleteDiscountMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/discount-codes/${id}`, {}),
    onSuccess: () => {
      toast({ title: "Code deleted" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/discount-codes"] });
    },
  });

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold">Codes</h1>

      {/* Tab toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab("balance")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            tab === "balance"
              ? "bg-primary text-black"
              : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
          }`}
          data-testid="tab-balance-codes"
        >
          <Gift className="h-4 w-4" />
          Balance Codes
        </button>
        <button
          onClick={() => setTab("discount")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            tab === "discount"
              ? "bg-primary text-black"
              : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
          }`}
          data-testid="tab-discount-codes"
        >
          <Tag className="h-4 w-4" />
          Discount Codes
        </button>
      </div>

      {/* ── BALANCE CODES TAB ── */}
      {tab === "balance" && (
        <>
          <Card className="bg-[#0f1115] border-white/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Create Balance Code</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <p className="text-xs text-white/50">Amount ($)</p>
                  <Input
                    type="number" step="0.01" min="0.01" placeholder="e.g. 10.00"
                    value={amount} onChange={e => setAmount(e.target.value)}
                    className="bg-black/50 border-white/10 h-9 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-white/50">Quantity (max 100)</p>
                  <Input
                    type="number" min="1" max="100" placeholder="1"
                    value={count} onChange={e => setCount(e.target.value)}
                    className="bg-black/50 border-white/10 h-9 text-sm"
                  />
                </div>
              </div>
              <Button className="w-full gap-2" onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending}>
                {generateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Create Code
              </Button>

              {generated.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-white/50">Generated codes</p>
                    <button onClick={copyAll} className="text-xs text-primary hover:opacity-80 transition-opacity">Copy All</button>
                  </div>
                  <div className="bg-black/40 border border-white/10 rounded-lg p-3 space-y-1 max-h-48 overflow-y-auto">
                    {generated.map((c) => (
                      <div key={c} className="flex items-center justify-between group">
                        <span className="text-xs font-mono text-green-400">{c}</span>
                        <button
                          onClick={() => { navigator.clipboard.writeText(c); toast({ title: "Copied" }); }}
                          className="text-[10px] text-white/30 hover:text-white opacity-0 group-hover:opacity-100 transition-all"
                        >Copy</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-[#0f1115] border-white/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Balance Codes ({balanceCodes?.length ?? 0})</CardTitle>
            </CardHeader>
            <CardContent>
              {balanceLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
              ) : !balanceCodes?.length ? (
                <p className="text-xs text-white/40 text-center py-8">No codes generated yet.</p>
              ) : (
                <div className="space-y-2">
                  {balanceCodes.map((c: any) => (
                    <div key={c.id} className="flex items-center justify-between bg-black/40 border border-white/5 rounded-lg px-3 py-2.5">
                      <div>
                        <p className="text-sm font-bold text-white font-mono">{c.code}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs font-bold text-green-400">${(c.amount / 100).toFixed(2)}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${c.isUsed ? "bg-white/5 text-white/30" : "bg-green-500/20 text-green-400"}`}>
                            {c.isUsed ? "Used" : "Available"}
                          </span>
                        </div>
                      </div>
                      <span className="text-[11px] text-white/30">{new Date(c.createdAt).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* ── DISCOUNT CODES TAB ── */}
      {tab === "discount" && (
        <>
          <Card className="bg-[#0f1115] border-white/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Create Discount Code</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <p className="text-xs text-white/50">Code</p>
                  <Input
                    placeholder="SAVE20"
                    value={dForm.code}
                    onChange={e => setDForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                    className="bg-black/50 border-white/10 h-9 text-sm font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-white/50">Type</p>
                  <select
                    value={dForm.type}
                    onChange={e => setDForm(f => ({ ...f, type: e.target.value }))}
                    className="w-full h-9 rounded-md bg-black/50 border border-white/10 text-sm text-white px-2 focus:outline-none"
                  >
                    <option value="percent">Percent (%)</option>
                    <option value="fixed">Fixed ($)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-white/50">{dForm.type === "percent" ? "Discount %" : "Discount $ Amount"}</p>
                  <Input
                    type="number" min="0" step={dForm.type === "percent" ? "1" : "0.01"} placeholder={dForm.type === "percent" ? "20" : "5.00"}
                    value={dForm.value}
                    onChange={e => setDForm(f => ({ ...f, value: e.target.value }))}
                    className="bg-black/50 border-white/10 h-9 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-white/50">Min. Order $ (optional)</p>
                  <Input
                    type="number" min="0" step="0.01" placeholder="0.00"
                    value={dForm.minOrder}
                    onChange={e => setDForm(f => ({ ...f, minOrder: e.target.value }))}
                    className="bg-black/50 border-white/10 h-9 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-white/50">Max Uses (optional)</p>
                  <Input
                    type="number" min="1" placeholder="Unlimited"
                    value={dForm.maxUses}
                    onChange={e => setDForm(f => ({ ...f, maxUses: e.target.value }))}
                    className="bg-black/50 border-white/10 h-9 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-white/50">Expires At (optional)</p>
                  <Input
                    type="datetime-local"
                    value={dForm.expiresAt}
                    onChange={e => setDForm(f => ({ ...f, expiresAt: e.target.value }))}
                    className="bg-black/50 border-white/10 h-9 text-sm"
                  />
                </div>
              </div>
              <Button className="w-full gap-2" onClick={() => createDiscountMutation.mutate()} disabled={createDiscountMutation.isPending}>
                {createDiscountMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Create Code
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-[#0f1115] border-white/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Discount Codes ({discountList.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {discountList.length === 0 ? (
                <p className="text-sm text-white/30 text-center py-6">No codes yet</p>
              ) : (
                <div className="space-y-2">
                  {discountList.map((dc: any) => (
                    <div key={dc.id} className="flex items-center gap-3 bg-black/40 border border-white/5 rounded-lg px-3 py-2.5">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-bold text-white font-mono">{dc.code}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${dc.isActive ? "bg-primary/20 text-primary" : "bg-white/10 text-white/40"}`}>
                            {dc.isActive ? "Active" : "Inactive"}
                          </span>
                        </div>
                        <p className="text-[11px] text-white/40">
                          {dc.type === "percent" ? `${dc.value}% off` : `$${(dc.value / 100).toFixed(2)} off`}
                          {dc.minOrder > 0 && ` · min $${(dc.minOrder / 100).toFixed(2)}`}
                          {` · ${dc.usedCount}/${dc.maxUses ?? "∞"} uses`}
                          {dc.expiresAt && ` · expires ${new Date(dc.expiresAt).toLocaleDateString()}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => toggleDiscountMutation.mutate({ id: dc.id, isActive: !dc.isActive })}
                          className={`px-2 py-1 rounded text-[11px] font-semibold border transition-colors ${dc.isActive ? "border-white/20 text-white/60 hover:bg-white/5" : "border-primary/30 text-primary hover:bg-primary/10"}`}
                        >
                          {dc.isActive ? "Disable" : "Enable"}
                        </button>
                        <button
                          onClick={() => deleteDiscountMutation.mutate(dc.id)}
                          className="px-2 py-1 rounded text-[11px] font-semibold border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function IntegrationsSection() {
  const { toast } = useToast();
  const [cashappTagInput, setCashappTagInput] = useState("");

  const { data: integrationStatus, isLoading: statusLoading } = useQuery<Record<string, boolean>>({
    queryKey: ["/api/admin/integrations/status"],
  });

  const { data: paymentMethods, isLoading: methodsLoading } = useQuery<Record<string, boolean>>({
    queryKey: ["/api/admin/payment-methods"],
  });

  const { data: cashappTagData } = useQuery<{ tag: string }>({
    queryKey: ["/api/admin/settings/cashapp-tag"],
  });

  useEffect(() => {
    if (cashappTagData?.tag !== undefined) {
      setCashappTagInput(cashappTagData.tag);
    }
  }, [cashappTagData]);

  const toggleMutation = useMutation({
    mutationFn: async ({ method, enabled }: { method: string; enabled: boolean }) => {
      const res = await apiRequest("PATCH", `/api/admin/payment-methods/${method}`, { enabled });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payment-methods"] });
      queryClient.invalidateQueries({ queryKey: ["/api/payment-methods"] });
    },
    onError: () => {
      toast({ title: "Failed to update", variant: "destructive" });
    },
  });

  const saveCashappTagMutation = useMutation({
    mutationFn: async (tag: string) => {
      const res = await apiRequest("POST", "/api/admin/settings/cashapp-tag", { tag });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings/cashapp-tag"] });
      toast({ title: "CashApp tag saved" });
    },
    onError: () => {
      toast({ title: "Failed to save", variant: "destructive" });
    },
  });

  const METHODS = [
    { id: "wallet", label: "Wallet / Balance", icon: <Wallet className="h-4 w-4 text-white" />, bg: "bg-primary" },
    { id: "cashapp", label: "CashApp", icon: <SiCashapp className="h-4 w-4 text-white" />, bg: "bg-[#00D632]" },
    { id: "crypto", label: "Crypto", icon: <SiBitcoin className="h-4 w-4 text-black" />, bg: "bg-primary" },
    { id: "stars", label: "Telegram Stars", icon: <Star className="h-4 w-4 text-white fill-white" />, bg: "bg-blue-500" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Link2 className="h-5 w-5 text-primary" /> Integrations
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Enable or disable payment methods and manage your bot token.</p>
      </div>

      {/* Payment Method Toggles */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-3">Payment Methods</p>
        <div className="space-y-2">
          {methodsLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
          ) : METHODS.map((m) => {
            const enabled = paymentMethods?.[m.id] !== false;
            return (
              <Card key={m.id} className="bg-[#0f1115] border-white/5" data-testid={`card-payment-toggle-${m.id}`}>
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`h-8 w-8 rounded-full ${m.bg} flex items-center justify-center flex-shrink-0`}>
                      {m.icon}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-white">{m.label}</p>
                      <p className="text-xs text-muted-foreground">{enabled ? "Visible to customers" : "Hidden from customers"}</p>
                    </div>
                  </div>
                  <Switch
                    checked={enabled}
                    disabled={toggleMutation.isPending}
                    onCheckedChange={(val) => toggleMutation.mutate({ method: m.id, enabled: val })}
                    data-testid={`switch-payment-${m.id}`}
                  />
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* CashApp Tag */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-3">CashApp Settings</p>
        <Card className="bg-[#0f1115] border-white/5">
          <CardContent className="p-4 space-y-3">
            <div>
              <p className="font-bold text-sm text-white mb-1">Your CashApp $Cashtag</p>
              <p className="text-xs text-muted-foreground leading-relaxed mb-3">Customers will be shown this $cashtag when paying via CashApp. They will send money here with a generated note.</p>
              <div className="flex gap-2">
                <Input
                  value={cashappTagInput}
                  onChange={(e) => setCashappTagInput(e.target.value)}
                  placeholder="$YourCashTag"
                  className="flex-1 bg-white/5 border-white/8 text-white font-mono"
                  data-testid="input-cashapp-tag"
                />
                <Button
                  size="sm"
                  onClick={() => saveCashappTagMutation.mutate(cashappTagInput)}
                  disabled={saveCashappTagMutation.isPending}
                  data-testid="button-save-cashapp-tag"
                >
                  {saveCashappTagMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Telegram Bot Token Status */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-3">Telegram Bot Token</p>
        {statusLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : (
          <Card className="bg-[#0f1115] border-white/5" data-testid="card-integration-TELEGRAM_BOT_TOKEN">
            <CardContent className="p-4 flex items-start justify-between gap-4">
              <div className="space-y-1 min-w-0">
                <p className="font-mono text-sm text-white">TELEGRAM_BOT_TOKEN</p>
                <p className="text-xs text-muted-foreground leading-relaxed">Required for Telegram Stars payments. Create a bot via @BotFather and enable Stars in Payments.</p>
              </div>
              <div className="shrink-0 mt-0.5">
                {integrationStatus?.TELEGRAM_BOT_TOKEN ? (
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30">✓ Set</Badge>
                ) : (
                  <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">⚠ Not set</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Card className="bg-[#0f1115] border-primary/20">
        <CardContent className="p-4 space-y-2">
          <p className="text-xs font-semibold text-primary">How to set the token</p>
          <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
            <li>Message <span className="text-white font-medium">@BotFather</span> on Telegram and create a new bot</li>
            <li>Go to <span className="text-white font-medium">My Bots → Your Bot → Payments</span> and enable Stars</li>
            <li>Add the token as a secret named <span className="text-white font-mono">TELEGRAM_BOT_TOKEN</span> in Replit's Secrets panel (🔒)</li>
            <li>Restart the server — webhook registers automatically</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}

function CashAppSection() {
  const { toast } = useToast();
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: allOrders, isLoading } = useQuery({
    queryKey: ["/api/admin/orders"],
    queryFn: async () => {
      const res = await fetch("/api/admin/orders");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    refetchInterval: 6000,
  });

  const cashappOrders = (allOrders || []).filter((o: any) => o.paymentMethod === "CashApp");
  const pendingOrders = cashappOrders.filter((o: any) => o.status === "pending");
  const cq = searchQuery.trim().toLowerCase();
  const displayedOrders = (showHistory ? cashappOrders : pendingOrders).filter((o: any) =>
    !cq ||
    o.orderId?.toLowerCase().includes(cq) ||
    o.user?.username?.toLowerCase().includes(cq) ||
    o.paymentNote?.toLowerCase().includes(cq)
  );

  const mutationOpts = (successMsg: string) => ({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
      setSelectedOrder(null);
      toast({ title: successMsg });
    },
    onError: (e: any) => { toast({ title: "Error", description: e.message, variant: "destructive" }); }
  });

  const cashappFulfillMutation = useMutation({
    mutationFn: async (orderId: number) => {
      const res = await apiRequest("POST", `/api/admin/orders/${orderId}/cashapp-fulfill`, {});
      if (!res.ok) { const err = await res.json(); throw new Error(err.message || "Failed"); }
      return res.json();
    },
    ...mutationOpts("Order fulfilled — stock delivered to user"),
  });

  const markUnpaidMutation = useMutation({
    mutationFn: async (orderId: number) => {
      const res = await apiRequest("POST", `/api/admin/orders/${orderId}/mark-unpaid`, {});
      if (!res.ok) { const err = await res.json(); throw new Error(err.message || "Failed"); }
      return res.json();
    },
    ...mutationOpts("Order marked unpaid"),
  });

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" /></div>;

  if (selectedOrder) {
    const current = cashappOrders?.find((o: any) => o.id === selectedOrder.id) || selectedOrder;
    const productItems = current.items?.filter((i: any) => !i.itemType || i.itemType === "product") || [];
    const grouped: Record<string, { productName: string; variantName: string; qty: number; unitPrice: number }> = {};
    for (const item of productItems) {
      const key = String(item.variantId || item.id);
      if (!grouped[key]) grouped[key] = { productName: item.productName || "Product", variantName: item.variant?.name || "—", qty: 0, unitPrice: item.price };
      grouped[key].qty += (item.quantity ?? 1);
    }
    const groupedEntries = Object.entries(grouped);
    const isPending = current.status === "pending";
    const isFulfilled = current.status === "delivering" || current.status === "fulfilled" || current.status === "replaced";

    return (
      <div className="space-y-4">
        <Button variant="outline" size="sm" onClick={() => setSelectedOrder(null)}>← Back</Button>
        <div className="bg-[#0f1115] border border-white/5 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SiCashapp className="h-5 w-5 text-[#00D632]" />
              <h2 className="text-lg font-black text-white">CashApp Order</h2>
            </div>
            <Badge className={statusBadgeClass(current.status)}>{statusLabel(current.status)}</Badge>
          </div>
          <div className="space-y-3 border-b border-white/5 pb-4">
            <div><p className="text-[10px] text-white/40 mb-0.5">Order ID</p><p className="text-xs font-mono text-white break-all">{current.orderId}</p></div>
            <div><p className="text-[10px] text-white/40 mb-0.5">Date</p><p className="text-xs text-white">{new Date(current.createdAt).toLocaleString("en-US")}</p></div>
            <div><p className="text-[10px] text-white/40 mb-0.5">Customer</p><p className="text-xs text-white font-bold">{current.user?.username || current.userId}</p></div>
            {current.paymentNote && (
              <div><p className="text-[10px] text-white/40 mb-0.5">Payment Note</p><p className="text-xs font-mono text-[#00D632]">{current.paymentNote}</p></div>
            )}
            <div><p className="text-[10px] text-white/40 mb-0.5">Amount</p><p className="text-sm font-black text-white">${(current.total / 100).toFixed(2)}</p></div>
          </div>

          {isPending && (
            <div className="flex gap-3">
              <button
                onClick={() => cashappFulfillMutation.mutate(current.id)}
                disabled={cashappFulfillMutation.isPending}
                className="flex-1 h-11 rounded-xl bg-[#00D632]/20 border border-[#00D632]/40 text-[#00D632] text-sm font-black hover:bg-[#00D632]/30 transition-colors disabled:opacity-50"
                data-testid={`button-cashapp-paid-${current.id}`}
              >
                {cashappFulfillMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "✓ Paid — Deliver Stock"}
              </button>
              <button
                onClick={() => markUnpaidMutation.mutate(current.id)}
                disabled={markUnpaidMutation.isPending}
                className="flex-1 h-11 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-black hover:bg-red-500/20 transition-colors disabled:opacity-50"
                data-testid={`button-cashapp-unpaid-${current.id}`}
              >
                ✕ Unpaid
              </button>
            </div>
          )}


          {groupedEntries.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] text-white/40">Items Ordered</p>
              {groupedEntries.map(([key, g]) => (
                <div key={key} className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-white/5 border border-white/5">
                  <div>
                    <p className="text-xs font-bold text-white">{g.productName}</p>
                    <p className="text-[10px] text-white/40 mt-0.5">{g.variantName} · qty {g.qty}</p>
                  </div>
                  <p className="text-xs text-white/70">${((g.unitPrice * g.qty) / 100).toFixed(2)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <SiCashapp className="h-6 w-6 text-[#00D632]" />
          <h1 className="text-2xl font-semibold">{showHistory ? "CashApp History" : "Unconfirmed CashApp"}</h1>
          {pendingOrders.length > 0 && (
            <Badge className="bg-[#00D632]/20 text-[#00D632] border-[#00D632]/30">{pendingOrders.length} pending</Badge>
          )}
        </div>
        <button
          onClick={() => setShowHistory(h => !h)}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${showHistory ? "bg-primary text-black" : "bg-white/5 text-white/50 hover:bg-white/10"}`}
        >
          {showHistory ? "← Pending" : "History"}
        </button>
      </div>

      <div className="relative">
        <input
          type="text"
          placeholder="Search by order ID, username, payment note..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full h-9 bg-white/5 border border-white/10 rounded-lg px-3 pr-8 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-[#00D632]/40"
          data-testid="input-cashapp-order-search"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {displayedOrders.length === 0 ? (
        <div className="text-center py-20 text-white/20 text-sm">
          {showHistory ? "No CashApp orders" : "No pending CashApp orders"}
        </div>
      ) : (
        <div className="space-y-2">
          {displayedOrders.map((order: any) => (
            <div
              key={order.id}
              className="bg-[#0f1115] border border-white/5 rounded-xl px-4 py-3 flex items-center justify-between gap-3 cursor-pointer hover:bg-white/[0.03] transition-colors"
              onClick={() => setSelectedOrder(order)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-mono text-white/50 truncate">{order.orderId}</p>
                  <Badge className={statusBadgeClass(order.status)}>{statusLabel(order.status)}</Badge>
                </div>
                <p className="text-sm font-black text-white mt-0.5">${(order.total / 100).toFixed(2)}</p>
                {order.paymentNote && <p className="text-[10px] font-mono text-[#00D632]/70 mt-0.5">{order.paymentNote}</p>}
                <p className="text-[10px] text-white/30 mt-0.5">{order.user?.username || order.userId} · {new Date(order.createdAt).toLocaleDateString()}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-white/20 flex-shrink-0" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
