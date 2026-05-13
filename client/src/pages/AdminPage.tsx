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
import { Loader2, Plus, Trash2, Pencil, X, Users, DollarSign, ShoppingBag, Receipt, ShieldX, Menu, ChevronRight, ChevronDown, Link2, Star, Package, Wallet, Pin, Gift, Tag, Copy, Check } from "lucide-react";
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
  { id: "cards", label: "Cards" },
  { id: "ach", label: "ACH" },
  { id: "orders", label: "Orders" },
  { id: "cashapp", label: "CashApp" },
  { id: "deposits", label: "Deposits" },
  { id: "users", label: "Users" },
  { id: "sellers", label: "Sellers" },
  { id: "codes", label: "Codes" },
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
              activeSection === section.id ? "bg-white/10 text-white border-l-2 border-white/50" : "text-white/50 hover:bg-white/5 hover:text-white/80"
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
          {activeSection === "cards" && <AdminCardsSection />}
          {activeSection === "ach" && <AdminAchSection />}
          {activeSection === "sellers" && <SellerApplicationsSection />}
          {activeSection === "deposits" && <DepositsSection />}
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

function DepositsSection() {
  const { data: deposits, isLoading, refetch } = useQuery({
    queryKey: ["/api/admin/deposits"],
    queryFn: async () => {
      const res = await fetch("/api/admin/deposits");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    refetchInterval: 30000,
  });

  const statusBadge = (status: string, type: string) => {
    if (status === "fulfilled" || status === "delivering") return <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/15 text-green-400 font-mono">credited</span>;
    if (status === "pending") return <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/15 text-yellow-400 font-mono">{type === "cashapp" ? "awaiting admin" : "pending"}</span>;
    if (status === "waiting_payment") return <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 font-mono">unpaid</span>;
    return <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white/40 font-mono">{status}</span>;
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Deposits</h1>
          <p className="text-sm text-muted-foreground mt-1">All crypto and CashApp deposits from all users</p>
        </div>
        <Button size="sm" variant="outline" className="text-xs border-white/10" onClick={() => refetch()}>Refresh</Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
      ) : !deposits?.length ? (
        <div className="text-center py-20 text-white/30 text-sm">No deposits yet</div>
      ) : (
        <div className="bg-[#0f1115] border border-white/5 rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-white/5 hover:bg-transparent">
                <TableHead className="text-white/40 text-xs">User</TableHead>
                <TableHead className="text-white/40 text-xs">Type</TableHead>
                <TableHead className="text-white/40 text-xs">Amount</TableHead>
                <TableHead className="text-white/40 text-xs">Status</TableHead>
                <TableHead className="text-white/40 text-xs">Note</TableHead>
                <TableHead className="text-white/40 text-xs">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deposits.map((d: any) => (
                <TableRow key={d.id} className="border-white/5 hover:bg-white/[0.02]">
                  <TableCell className="text-xs font-mono text-white/70">{d.username}</TableCell>
                  <TableCell className="text-xs">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${d.type === "crypto" ? "bg-blue-500/15 text-blue-400" : "bg-green-500/15 text-green-400"}`}>
                      {d.type}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs font-mono font-bold">${((d.amount ?? 0) / 100).toFixed(2)}</TableCell>
                  <TableCell>{statusBadge(d.status, d.type)}</TableCell>
                  <TableCell className="text-[10px] font-mono text-white/40">{d.paymentNote ?? "—"}</TableCell>
                  <TableCell className="text-[10px] text-white/40">{new Date(d.createdAt).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
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
    description: z.string().optional(),
  });

  const variantSchema = z.object({
    name: z.string().min(1, "Name required"),
    price: z.string().min(1, "Price required"),
    minQuantity: z.string().default("1"),
  });

  const addForm = useForm<z.infer<typeof productSchema>>({
    resolver: zodResolver(productSchema),
    defaultValues: { name: "", description: "" },
  });

  const editForm = useForm<z.infer<typeof productSchema>>({
    resolver: zodResolver(productSchema),
    defaultValues: { name: "", description: "" },
  });

  const variantForm = useForm<z.infer<typeof variantSchema>>({
    resolver: zodResolver(variantSchema),
    defaultValues: { name: "", price: "", minQuantity: "1" },
  });

  const editVariantForm = useForm<z.infer<typeof variantSchema>>({
    resolver: zodResolver(variantSchema),
    defaultValues: { name: "", price: "", minQuantity: "1" },
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
        minQuantity: parseInt(data.minQuantity) || 1,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.products.list.path] });
      variantForm.reset({ name: "", price: "", minQuantity: "1" });
      toast({ title: "Variant added" });
    }
  });

  const updateVariantMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: z.infer<typeof variantSchema> }) => {
      const res = await apiRequest("PATCH", `/api/admin/variants/${id}`, {
        name: data.name,
        price: Math.round(parseFloat(data.price) * 100),
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
    editForm.reset({ name: product.name, description: product.description || "" });
    setShowAddForm(false);
  };

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
                                editVariantForm.reset({ name: v.name, price: (v.price / 100).toFixed(2), minQuantity: String(v.minQuantity ?? 1) });
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
                                    <FormLabel className="text-xs">Price ($)</FormLabel>
                                    <FormControl><Input {...field} type="number" step="0.01" className="bg-black/50 border-white/10 h-8 text-xs" /></FormControl>
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
                        <FormLabel className="text-xs">Price ($)</FormLabel>
                        <FormControl><Input {...field} placeholder="9.99" type="number" step="0.01" className="bg-black/50 border-white/10 h-8 text-xs" /></FormControl>
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
      const msg = data.skippedCount > 0
        ? `Added ${data.addedCount}, skipped ${data.skippedCount} duplicate${data.skippedCount !== 1 ? "s" : ""}`
        : `Added ${data.addedCount} stock item${data.addedCount !== 1 ? "s" : ""}`;
      toast({ title: msg });
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
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold text-muted-foreground">
          🔥 Top Seller — {isLoading ? "..." : `${items?.length || 0} available`}
        </p>
      </div>

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
        <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
          {items.map((item: any) => (
            <div key={item.id} className="bg-[#111] border border-white/5 rounded px-3 py-2 flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-mono text-white/50 truncate">{(item.content || "").substring(0, 80)}{(item.content || "").length > 80 ? "…" : ""}</p>
                <p className="text-[9px] font-mono text-white/20 mt-0.5">#{item.id}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-[9px] text-white/20">avail</span>
                <button
                  onClick={() => deleteMutation.mutate(item.id)}
                  disabled={deleteMutation.isPending}
                  className="text-red-400/50 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
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

          {groupedEntries.length === 0 && current.deliveryContent && current.orderId?.startsWith("ACH-") && (
            <div className="space-y-2">
              <p className="text-[10px] text-white/40">ACH Account Delivered</p>
              <div className="px-3 py-2.5 rounded-xl bg-white/5 border border-white/5">
                <p className="text-xs font-mono text-white/80 whitespace-pre-wrap break-all">{current.deliveryContent}</p>
              </div>
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


function CopyLoginCode({ code, userId }: { code: string; userId: number }) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Login code copied!" });
  };
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1 font-mono text-xs text-primary/80 hover:text-primary bg-primary/10 hover:bg-primary/20 border border-primary/20 rounded px-2 py-0.5 transition-colors"
      data-testid={`btn-copy-code-${userId}`}
      title="Copy login code"
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {copied ? "Copied!" : code}
    </button>
  );
}

function UsersSection() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [balanceInput, setBalanceInput] = useState("");
  const [search, setSearch] = useState("");

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
      qc.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({ title: 'User banned' });
      setSelectedUser((u: any) => u ? { ...u, isBanned: true } : null);
    },
  });

  const unbanMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await apiRequest('POST', api.admin.unbanUser.path.replace(':id', userId.toString()));
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({ title: 'User unbanned' });
      setSelectedUser((u: any) => u ? { ...u, isBanned: false } : null);
    },
  });

  const setBalanceMutation = useMutation({
    mutationFn: async ({ userId, balance }: { userId: number; balance: string }) => {
      const res = await apiRequest('POST', `/api/admin/users/${userId}/set-balance`, { balance: parseFloat(balance) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message || 'Failed'); }
      return res.json();
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['/api/admin/users'] });
      setSelectedUser((u: any) => u ? { ...u, balance: data.balance } : null);
      setBalanceInput("");
      toast({ title: `Balance set to $${(data.balance / 100).toFixed(2)}` });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const setRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: number; role: string }) => {
      const res = await apiRequest('POST', `/api/admin/users/${userId}/set-role`, { role });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message || 'Failed'); }
      return res.json();
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['/api/admin/users'] });
      setSelectedUser((u: any) => u ? { ...u, role: data.role } : null);
      toast({ title: `Role set to ${data.role}` });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" /></div>;

  const filtered = (users ?? []).filter((u: any) =>
    !search || u.username?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase())
  );

  if (selectedUser) {
    return (
      <div className="space-y-3">
        <button onClick={() => setSelectedUser(null)} className="text-xs text-white/40 hover:text-white transition-colors">← Back to Users</button>

        <div className="bg-[#0f1115] border border-white/5 rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="font-bold text-white">{selectedUser.username}</p>
              <p className="text-[10px] text-white/30 font-mono">{selectedUser.email}</p>
            </div>
            <div className="flex gap-2 items-center">
              {selectedUser.isBanned && <Badge className="bg-red-500/20 text-red-400 text-[9px]">BANNED</Badge>}
              <Badge className={selectedUser.role === "admin" ? "bg-primary/20 text-primary border-primary/30" : "bg-white/5 text-white/40 border-white/10"}>
                {selectedUser.role}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="bg-black/30 rounded-lg p-2">
              <p className="text-[9px] text-white/30">Balance</p>
              <p className="text-sm font-mono font-bold text-white">${(selectedUser.balance / 100).toFixed(2)}</p>
            </div>
            <div className="bg-black/30 rounded-lg p-2">
              <p className="text-[9px] text-white/30">Login Code</p>
              {selectedUser.loginCode
                ? <CopyLoginCode code={selectedUser.loginCode} userId={selectedUser.id} />
                : <p className="text-xs text-white/30">—</p>}
            </div>
          </div>

          {/* Set Balance */}
          <div className="space-y-1.5 pt-1 border-t border-white/5">
            <p className="text-[9px] text-white/30 uppercase tracking-widest">Set Balance ($)</p>
            <div className="flex gap-2">
              <input
                value={balanceInput}
                onChange={e => setBalanceInput(e.target.value)}
                placeholder="e.g. 50.00"
                type="number"
                step="0.01"
                min="0"
                className="flex-1 h-8 bg-black/40 border border-white/10 rounded px-2 text-xs text-white font-mono outline-none focus:border-primary/40"
                data-testid={`input-balance-${selectedUser.id}`}
              />
              <button
                onClick={() => setBalanceMutation.mutate({ userId: selectedUser.id, balance: balanceInput })}
                disabled={setBalanceMutation.isPending || !balanceInput}
                className="h-8 px-3 bg-primary/80 hover:bg-primary text-black text-xs font-bold rounded transition-colors disabled:opacity-40 flex items-center gap-1"
                data-testid={`btn-set-balance-${selectedUser.id}`}
              >
                {setBalanceMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Set"}
              </button>
            </div>
          </div>

          {/* Role + Actions */}
          <div className="flex flex-wrap gap-2 pt-1 border-t border-white/5">
            {selectedUser.role !== "admin" ? (
              <button
                onClick={() => { if (confirm("Make this user admin?")) setRoleMutation.mutate({ userId: selectedUser.id, role: "admin" }); }}
                disabled={setRoleMutation.isPending}
                className="h-7 px-3 bg-yellow-600/80 hover:bg-yellow-600 text-white text-xs font-bold rounded transition-colors disabled:opacity-40"
                data-testid={`btn-make-admin-${selectedUser.id}`}
              >
                Make Admin
              </button>
            ) : (
              <button
                onClick={() => { if (confirm("Remove admin from this user?")) setRoleMutation.mutate({ userId: selectedUser.id, role: "user" }); }}
                disabled={setRoleMutation.isPending}
                className="h-7 px-3 border border-yellow-700/40 text-yellow-500 text-xs font-bold rounded hover:bg-yellow-900/20 transition-colors disabled:opacity-40"
                data-testid={`btn-remove-admin-${selectedUser.id}`}
              >
                Remove Admin
              </button>
            )}
            {selectedUser.isBanned ? (
              <button
                onClick={() => unbanMutation.mutate(selectedUser.id)}
                disabled={unbanMutation.isPending}
                className="h-7 px-3 bg-green-700/80 hover:bg-green-700 text-white text-xs font-bold rounded transition-colors disabled:opacity-40"
                data-testid={`btn-unban-${selectedUser.id}`}
              >
                Unban
              </button>
            ) : (
              <button
                onClick={() => { if (confirm("Ban this user?")) banMutation.mutate(selectedUser.id); }}
                disabled={banMutation.isPending}
                className="h-7 px-3 border border-red-800/40 text-red-400 text-xs font-bold rounded hover:bg-red-900/20 transition-colors disabled:opacity-40"
                data-testid={`btn-ban-${selectedUser.id}`}
              >
                Ban
              </button>
            )}
          </div>

          <div className="text-[9px] text-white/20 font-mono pt-1 border-t border-white/5 space-y-0.5">
            <p>Telegram: @{selectedUser.telegramUsername || '—'}</p>
            <p>Joined: {new Date(selectedUser.createdAt).toLocaleDateString()}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-white">Users <span className="text-white/30 font-normal">({(users ?? []).length})</span></h2>
      </div>
      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search by username or email..."
        className="w-full h-8 bg-[#111] border border-white/8 rounded px-3 text-xs text-white placeholder:text-white/25 outline-none"
        data-testid="input-users-search"
      />
      <div className="space-y-1.5">
        {filtered.map((user: any) => (
          <button
            key={user.id}
            onClick={() => { setSelectedUser(user); setBalanceInput(""); }}
            className="w-full text-left bg-[#0f1115] border border-white/5 rounded-xl px-3 py-2.5 hover:border-white/10 transition-colors"
            data-testid={`btn-user-${user.id}`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold text-sm text-white truncate">{user.username}</p>
                  {user.role === "admin" && <Badge className="bg-primary/20 text-primary border-primary/30 text-[9px]">admin</Badge>}
                  {user.isBanned && <Badge className="bg-red-500/20 text-red-400 text-[9px]">banned</Badge>}
                </div>
                <p className="text-[10px] text-white/30 font-mono">${(user.balance / 100).toFixed(2)}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {user.loginCode && <CopyLoginCode code={user.loginCode} userId={user.id} />}
                <ChevronRight className="h-3.5 w-3.5 text-white/20" />
              </div>
            </div>
          </button>
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
    { id: "wallet", label: "Wallet / Balance", icon: <Wallet className="h-4 w-4 text-black" />, bg: "bg-primary" },
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

function AdminCardsSection() {
  const { toast } = useToast();
  const qc = queryClient;
  const [cardNumber, setCardNumber] = useState("");
  const [fullItem, setFullItem] = useState("");
  const [price, setPrice] = useState("");

  const { data: cards, isLoading } = useQuery<any[]>({ queryKey: ["/api/cards"] });

  const bin = cardNumber.replace(/\D/g, "").substring(0, 6);

  const addMutation = useMutation({
    mutationFn: async () => {
      const digits = cardNumber.replace(/\D/g, "");
      const masked = digits.length >= 4
        ? digits.substring(0, 4) + "*".repeat(Math.max(0, digits.length - 8)) + digits.slice(-4)
        : cardNumber;
      const res = await apiRequest("POST", "/api/cards", {
        cardNumber: cardNumber.trim(),
        maskedCard: masked,
        expiry: "",
        cvv: "",
        country: "",
        extras: fullItem.trim(),
        price: Math.round(parseFloat(price) * 100),
        isFirstHand: false,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to add card");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/cards"] });
      setCardNumber(""); setFullItem(""); setPrice("");
      toast({ title: "Card added" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/admin/cards/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/cards"] });
      toast({ title: "Card deleted" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-5">
      <h2 className="text-base font-bold text-white">Cards Management</h2>

      <div className="bg-[#0f1115] border border-white/5 rounded-xl p-4 space-y-3">
        <p className="text-xs font-bold text-white/40 uppercase tracking-widest">Add Card</p>

        <div className="space-y-1">
          <label className="text-[10px] text-white/40 uppercase tracking-widest">Card Number</label>
          <Input
            value={cardNumber}
            onChange={e => setCardNumber(e.target.value)}
            placeholder="4111111111111111"
            className="bg-black/50 border-white/10 font-mono"
            data-testid="input-card-number"
          />
          {bin.length === 6 && <p className="text-[10px] text-white/30 font-mono">BIN: {bin}</p>}
        </div>

        <div className="space-y-1">
          <label className="text-[10px] text-white/40 uppercase tracking-widest">Full Item</label>
          <textarea
            value={fullItem}
            onChange={e => setFullItem(e.target.value)}
            placeholder={"4111111111111111|12/25|123|John Doe|123 Main St"}
            rows={3}
            className="w-full bg-black/50 border border-white/10 rounded text-xs text-white font-mono p-2 outline-none focus:border-white/20 resize-none placeholder:text-white/20"
            data-testid="input-full-item"
          />
          <p className="text-[9px] text-white/20">only shown to buyer after purchase</p>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] text-white/40 uppercase tracking-widest">Price ($)</label>
          <Input
            value={price}
            onChange={e => setPrice(e.target.value)}
            placeholder="5.00"
            type="number"
            step="0.01"
            className="bg-black/50 border-white/10"
            data-testid="input-card-price"
          />
        </div>

        <Button
          onClick={() => addMutation.mutate()}
          disabled={addMutation.isPending || !cardNumber || !price}
          size="sm"
          className="w-full h-8 text-xs"
          data-testid="btn-add-card"
        >
          {addMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Card"}
        </Button>
      </div>

      <div className="space-y-2">
        <p className="text-xs text-white/30">{(cards ?? []).length} cards total</p>
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : (
          (cards ?? []).map((card: any) => {
            const cBin = (card.cardNumber || "").replace(/\D/g, "").substring(0, 6);
            return (
              <div key={card.id} className="bg-[#0f1115] border border-white/5 rounded-xl px-4 py-3 flex items-center justify-between">
                <div className="space-y-0.5 min-w-0 flex-1">
                  <p className="text-sm font-mono text-white">{card.maskedCard}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono bg-[#1a1a1a] border border-white/10 px-1.5 py-0.5 rounded text-white/50">{cBin}</span>
                  </div>
                  {card.extras && <p className="text-[10px] text-white/20 truncate">{card.extras}</p>}
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-2">
                  <span className="font-mono text-sm text-white">${(card.price / 100).toFixed(2)}</span>
                  <button
                    onClick={() => deleteMutation.mutate(card.id)}
                    disabled={deleteMutation.isPending}
                    className="text-white/20 hover:text-destructive transition-colors"
                    data-testid={`btn-delete-card-${card.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function AdminAchSection() {
  const { toast } = useToast();
  const qc = queryClient;
  const [bankName, setBankName] = useState("");
  const [balance, setBalance] = useState("");
  const [fullItem, setFullItem] = useState("");
  const [price, setPrice] = useState("");

  const { data: achList, isLoading } = useQuery<any[]>({ queryKey: ["/api/ach"] });

  const addMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/ach", { bankName, balance, fullItem, price });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message || "Failed"); }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/ach"] });
      setBankName(""); setBalance(""); setFullItem(""); setPrice("");
      toast({ title: "ACH added" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/admin/ach/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/ach"] });
      toast({ title: "ACH deleted" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-5">
      <h2 className="text-base font-bold text-white">ACH Management</h2>

      <div className="bg-[#0f1115] border border-white/5 rounded-xl p-4 space-y-3">
        <p className="text-xs font-bold text-white/40 uppercase tracking-widest">Add ACH</p>

        <div className="space-y-1">
          <label className="text-[10px] text-white/40 uppercase tracking-widest">Bank</label>
          <Input value={bankName} onChange={e => setBankName(e.target.value)} placeholder="Chase, Wells Fargo..." className="bg-black/50 border-white/10" data-testid="input-ach-bank" />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] text-white/40 uppercase tracking-widest">Balance</label>
          <div className="flex items-center bg-black/50 border border-white/10 rounded-md overflow-hidden">
            <span className="pl-3 pr-1 text-sm text-white/50 font-mono select-none">$</span>
            <input
              value={balance}
              onChange={e => setBalance(e.target.value.replace(/[^0-9,.\-]/g, ""))}
              placeholder="4,990 or 3,298.09"
              type="text"
              inputMode="decimal"
              className="flex-1 bg-transparent py-2 pr-3 text-sm text-white font-mono outline-none placeholder:text-white/20"
              data-testid="input-ach-balance"
            />
          </div>
          <p className="text-[10px] text-white/25">e.g. 4,990 or 3,298.09 — $ is added automatically</p>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] text-white/40 uppercase tracking-widest">Full Item</label>
          <textarea
            value={fullItem}
            onChange={e => setFullItem(e.target.value)}
            placeholder={"routing|account|name|address"}
            rows={3}
            className="w-full bg-black/50 border border-white/10 rounded text-xs text-white font-mono p-2 outline-none focus:border-white/20 resize-none placeholder:text-white/20"
            data-testid="input-ach-full-item"
          />
          <p className="text-[9px] text-white/20">only shown to buyer after purchase</p>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] text-white/40 uppercase tracking-widest">Price ($)</label>
          <Input value={price} onChange={e => setPrice(e.target.value)} placeholder="10.00" type="number" step="0.01" className="bg-black/50 border-white/10" data-testid="input-ach-price" />
        </div>

        <Button
          onClick={() => addMutation.mutate()}
          disabled={addMutation.isPending || !bankName || !balance || !fullItem || !price}
          size="sm"
          className="w-full h-8 text-xs"
          data-testid="btn-add-ach"
        >
          {addMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add ACH"}
        </Button>
      </div>

      <div className="space-y-2">
        <p className="text-xs text-white/30">{(achList ?? []).length} ACH total</p>
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : (
          (achList ?? []).map((a: any) => (
            <div key={a.id} className="bg-[#0f1115] border border-white/5 rounded-xl px-4 py-3 flex items-center justify-between">
              <div className="space-y-0.5 min-w-0 flex-1">
                <p className="text-sm font-bold text-white">{a.bankName}</p>
                <p className="text-[10px] text-white/30 font-mono">{a.balance}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0 ml-2">
                <span className="font-mono text-sm text-white">${(a.price / 100).toFixed(2)}</span>
                <button
                  onClick={() => deleteMutation.mutate(a.id)}
                  disabled={deleteMutation.isPending}
                  className="text-white/20 hover:text-destructive transition-colors"
                  data-testid={`btn-delete-ach-${a.id}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function SellerPermissionsPanel({ sellerId }: { sellerId: number }) {
  const { toast } = useToast();
  const qc = queryClient;

  const { data: perms, isLoading } = useQuery<{ cards: boolean; ach: boolean; logs: boolean }>({
    queryKey: ["/api/admin/seller-permissions", sellerId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/seller-permissions/${sellerId}`);
      return res.json();
    },
    enabled: !!sellerId,
  });

  const { data: productPerms } = useQuery<{ productIds: number[] }>({
    queryKey: ["/api/admin/seller-permissions/products", sellerId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/seller-permissions/products/${sellerId}`);
      return res.json();
    },
    enabled: !!sellerId,
  });

  const { data: allProducts } = useQuery<any[]>({ queryKey: ["/api/products"] });

  const saveMutation = useMutation({
    mutationFn: async (newPerms: { cards: boolean; ach: boolean; logs: boolean }) => {
      const res = await apiRequest("POST", `/api/admin/seller-permissions/${sellerId}`, newPerms);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/seller-permissions", sellerId] });
      toast({ title: "Permissions saved" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const saveProductPermsMutation = useMutation({
    mutationFn: async (productIds: number[]) => {
      const res = await apiRequest("POST", `/api/admin/seller-permissions/products/${sellerId}`, { productIds });
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/seller-permissions/products", sellerId] });
      toast({ title: "Product permissions saved" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const toggle = (key: "cards" | "ach" | "logs") => {
    if (!perms) return;
    saveMutation.mutate({ ...perms, [key]: !perms[key] });
  };

  const toggleProduct = (productId: number) => {
    const current = productPerms?.productIds ?? [];
    const next = current.includes(productId)
      ? current.filter(id => id !== productId)
      : [...current, productId];
    saveProductPermsMutation.mutate(next);
  };

  if (isLoading) return <div className="py-2 flex justify-center"><Loader2 className="h-3 w-3 animate-spin text-primary" /></div>;

  const opts: { key: "cards" | "ach" | "logs"; label: string }[] = [
    { key: "cards", label: "Cards" },
    { key: "ach", label: "ACH" },
    { key: "logs", label: "Logs" },
  ];

  const allowedProductIds = productPerms?.productIds ?? [];
  const logProducts = (allProducts ?? []).filter((p: any) => p.active);

  return (
    <div className="space-y-1.5 pt-1 border-t border-white/5">
      <p className="text-[9px] text-white/30 uppercase tracking-widest">Can Sell</p>
      {opts.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => toggle(key)}
          className={`w-full h-7 flex items-center justify-between px-2 rounded border text-xs transition-all ${
            perms?.[key]
              ? "border-green-700/50 bg-green-900/20 text-green-400"
              : "border-white/8 bg-black/20 text-white/30"
          }`}
          data-testid={`btn-perm-${key}-${sellerId}`}
        >
          <span>{label}</span>
          <span className="text-[10px]">{perms?.[key] ? "✓ on" : "✗ off"}</span>
        </button>
      ))}

      {perms?.logs && logProducts.length > 0 && (
        <div className="pt-1 space-y-1">
          <p className="text-[9px] text-white/20 uppercase tracking-widest">Allowed Products <span className="normal-case text-white/15">(empty = all)</span></p>
          {logProducts.map((p: any) => {
            const allowed = allowedProductIds.includes(p.id);
            return (
              <button
                key={p.id}
                onClick={() => toggleProduct(p.id)}
                className={`w-full h-7 flex items-center justify-between px-2 rounded border text-xs transition-all ${
                  allowed
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-white/5 bg-black/10 text-white/25"
                }`}
                data-testid={`btn-product-perm-${p.id}-${sellerId}`}
              >
                <span className="truncate text-left">{p.name}</span>
                <span className="text-[10px] flex-shrink-0 ml-2">{allowed ? "✓" : "✗"}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

const SELLER_BADGE: Record<string, string> = { bronze: "🍟", fresh: "🍺", top: "🔥" };
const SELLER_TYPES = [
  { value: "bronze", label: "🍟 Bronze" },
  { value: "fresh", label: "🍺 Fresh" },
  { value: "top", label: "🔥 Top" },
];

function SellerApplicationsSection() {
  const { toast } = useToast();
  const qc = queryClient;
  const [tab, setTab] = useState<"pending" | "active">("pending");
  const [selectedSeller, setSelectedSeller] = useState<any>(null);
  const [editType, setEditType] = useState("");
  const [editName, setEditName] = useState("");
  const [search, setSearch] = useState("");

  const { data: applications, isLoading: appsLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/seller-applications"],
  });
  const { data: activeSellers, isLoading: activeLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/active-sellers"],
  });
  const { data: sellerDetail, isLoading: detailLoading } = useQuery<any>({
    queryKey: ["/api/admin/active-sellers", selectedSeller?.id, "detail"],
    queryFn: async () => {
      const res = await fetch(`/api/admin/active-sellers/${selectedSeller.id}/detail`);
      return res.json();
    },
    enabled: !!selectedSeller,
  });

  const approveMutation = useMutation({
    mutationFn: async (id: number) => { const res = await apiRequest("POST", `/api/admin/seller-applications/${id}/approve`); return res.json(); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/seller-applications"] }); qc.invalidateQueries({ queryKey: ["/api/admin/active-sellers"] }); toast({ title: "Seller approved" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const rejectMutation = useMutation({
    mutationFn: async (id: number) => { const res = await apiRequest("POST", `/api/admin/seller-applications/${id}/reject`); return res.json(); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/seller-applications"] }); toast({ title: "Seller rejected" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const setTypeMutation = useMutation({
    mutationFn: async ({ userId, sellerType, sellerDisplayName }: any) => {
      const res = await apiRequest("PATCH", `/api/admin/active-sellers/${userId}/type`, { sellerType, sellerDisplayName });
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/active-sellers"] });
      qc.invalidateQueries({ queryKey: ["/api/products"] });
      qc.invalidateQueries({ queryKey: ["/api/seller/status"] });
      toast({ title: "Seller type updated" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const removeMutation = useMutation({
    mutationFn: async (userId: number) => { const res = await apiRequest("DELETE", `/api/admin/active-sellers/${userId}`); return res.json(); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/active-sellers"] }); setSelectedSeller(null); toast({ title: "Seller removed" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const payoutMutation = useMutation({
    mutationFn: async (userId: number) => { const res = await apiRequest("POST", `/api/admin/active-sellers/${userId}/payout`); return res.json(); },
    onSuccess: (d) => { qc.invalidateQueries({ queryKey: ["/api/admin/active-sellers"] }); qc.invalidateQueries({ queryKey: ["/api/admin/active-sellers", selectedSeller?.id, "detail"] }); toast({ title: `Payout recorded: $${(d.amount / 100).toFixed(2)}` }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const pendingApps = (applications ?? []).filter((a: any) => a.status === "pending");
  const sellers = activeSellers ?? [];
  const filteredSellers = sellers.filter((s: any) =>
    !search || s.username?.toLowerCase().includes(search.toLowerCase()) || s.sellerCode?.toLowerCase().includes(search.toLowerCase()) || s.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-white">Sellers</h2>
      </div>

      {/* Tabs */}
      <div className="flex bg-white/5 rounded-lg p-0.5 gap-0.5">
        <button onClick={() => setTab("pending")} className={`flex-1 text-xs py-1.5 rounded transition-colors ${tab === "pending" ? "bg-white/10 text-white" : "text-white/30 hover:text-white/60"}`}>
          Pending {pendingApps.length > 0 && <span className="ml-1 bg-yellow-500 text-black text-[9px] px-1 rounded-full font-bold">{pendingApps.length}</span>}
        </button>
        <button onClick={() => setTab("active")} className={`flex-1 text-xs py-1.5 rounded transition-colors ${tab === "active" ? "bg-white/10 text-white" : "text-white/30 hover:text-white/60"}`}>
          Active ({sellers.length})
        </button>
      </div>

      {tab === "pending" && (
        <div className="space-y-2">
          {appsLoading ? <div className="py-10 flex justify-center"><Loader2 className="h-4 w-4 animate-spin text-primary" /></div>
            : pendingApps.length === 0 ? <div className="py-12 text-center text-white/20 text-xs">No pending applications</div>
            : pendingApps.map((app: any) => (
              <div key={app.id} className="bg-[#111] border border-white/5 rounded-xl p-3 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-bold text-white">@{app.username}</p>
                    <p className="text-[10px] font-mono text-primary mt-0.5">{app.sellerCode}</p>
                    <p className="text-[10px] text-white/30">{app.email}</p>
                  </div>
                  <p className="text-[10px] text-white/25">{new Date(app.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="flex gap-1.5">
                  <button onClick={() => approveMutation.mutate(app.id)} disabled={approveMutation.isPending} className="flex-1 h-7 bg-green-700/80 hover:bg-green-700 text-white text-xs font-bold rounded transition-colors disabled:opacity-50" data-testid={`btn-approve-seller-${app.id}`}>Approve</button>
                  <button onClick={() => rejectMutation.mutate(app.id)} disabled={rejectMutation.isPending} className="flex-1 h-7 bg-red-900/30 hover:bg-red-900/50 text-red-400 text-xs font-bold rounded border border-red-800/30 transition-colors disabled:opacity-50" data-testid={`btn-reject-seller-${app.id}`}>Reject</button>
                </div>
              </div>
            ))
          }
        </div>
      )}

      {tab === "active" && (
        <div className="space-y-3">
          {/* Search */}
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by username, code..." className="w-full bg-[#111] border border-white/8 rounded h-8 px-3 text-xs text-white placeholder:text-white/25 outline-none" data-testid="input-seller-search" />

          {/* Two column layout: list + detail */}
          <div className="flex gap-3">
            {/* Seller list */}
            <div className="flex-1 min-w-0 space-y-1 max-h-[500px] overflow-y-auto">
              {activeLoading ? <div className="py-10 flex justify-center"><Loader2 className="h-4 w-4 animate-spin text-primary" /></div>
                : filteredSellers.length === 0 ? <div className="py-12 text-center text-white/20 text-xs">No active sellers</div>
                : filteredSellers.map((s: any) => {
                  const badge = SELLER_BADGE[s.sellerType] ?? "🍟";
                  const isSelected = selectedSeller?.id === s.id;
                  return (
                    <button key={s.id} onClick={() => { setSelectedSeller(s); setEditType(s.sellerType); setEditName(s.sellerDisplayName); }}
                      className={`w-full text-left p-2.5 rounded border transition-all ${isSelected ? "bg-white/8 border-white/15" : "bg-[#111] border-white/5 hover:border-white/10"}`}
                      data-testid={`btn-seller-${s.id}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-white">{badge} {s.username}</p>
                          <p className="text-[9px] font-mono text-primary">{s.sellerCode}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-mono text-white">${(s.sellerBalance / 100).toFixed(2)}</p>
                          <p className="text-[9px] text-white/25">{s.sellerType}</p>
                        </div>
                      </div>
                    </button>
                  );
                })
              }
            </div>

            {/* Detail panel */}
            {selectedSeller && (
              <div className="w-64 flex-shrink-0 space-y-2 max-h-[500px] overflow-y-auto">
                <div className="bg-[#111] border border-white/8 rounded-xl p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-white">{selectedSeller.username}</p>
                    <button onClick={() => setSelectedSeller(null)} className="text-white/30 hover:text-white text-xs">✕</button>
                  </div>
                  <p className="text-[9px] font-mono text-primary">{selectedSeller.sellerCode}</p>

                  {/* Balance + payout */}
                  <div className="grid grid-cols-2 gap-1.5 text-center">
                    <div className="bg-black/30 rounded p-2">
                      <p className="text-[9px] text-white/30">Pending</p>
                      <p className="text-sm font-mono font-bold text-white">${(selectedSeller.sellerBalance / 100).toFixed(2)}</p>
                    </div>
                    <div className="bg-black/30 rounded p-2">
                      <p className="text-[9px] text-white/30">Earned</p>
                      <p className="text-sm font-mono font-bold text-white">${(selectedSeller.totalEarned / 100).toFixed(2)}</p>
                    </div>
                  </div>

                  <button onClick={() => payoutMutation.mutate(selectedSeller.id)} disabled={payoutMutation.isPending || selectedSeller.sellerBalance <= 0}
                    className="w-full h-7 bg-yellow-600/80 hover:bg-yellow-600 text-white text-xs font-bold rounded transition-colors disabled:opacity-40 flex items-center justify-center gap-1"
                    data-testid={`btn-payout-${selectedSeller.id}`}>
                    {payoutMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Mark Payout"}
                  </button>


                  {/* Set Type */}
                  <div className="space-y-1.5 pt-1 border-t border-white/5">
                    <p className="text-[9px] text-white/30 uppercase tracking-widest">Seller Type</p>
                    <Select value={editType} onValueChange={setEditType}>
                      <SelectTrigger className="h-7 text-xs bg-black/40 border-white/10" data-testid="select-seller-type-edit">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#111] border-white/10 text-white text-xs">
                        {SELLER_TYPES.map(t => <SelectItem key={t.value} value={t.value} className="text-xs">{t.label}</SelectItem>)}
                        <SelectItem value="custom" className="text-xs">✏️ Custom</SelectItem>
                      </SelectContent>
                    </Select>
                    <input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Display name (e.g. JOHN'S SHOP)" className="w-full bg-black/40 border border-white/10 rounded h-7 px-2 text-xs text-white placeholder:text-white/20 outline-none" data-testid="input-seller-display-name" />
                    <button onClick={() => setTypeMutation.mutate({ userId: selectedSeller.id, sellerType: editType, sellerDisplayName: editName })}
                      disabled={setTypeMutation.isPending}
                      className="w-full h-7 bg-primary/80 hover:bg-primary text-black text-xs font-bold rounded transition-colors disabled:opacity-40"
                      data-testid={`btn-set-type-${selectedSeller.id}`}>
                      {setTypeMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin inline" /> : "Save Type"}
                    </button>
                  </div>

                  {/* What seller can sell */}
                  <SellerPermissionsPanel sellerId={selectedSeller.id} />

                  {/* Remove */}
                  <button onClick={() => { if (confirm("Remove this seller?")) removeMutation.mutate(selectedSeller.id); }}
                    disabled={removeMutation.isPending}
                    className="w-full h-7 border border-red-800/40 text-red-400 text-xs rounded hover:bg-red-900/20 transition-colors disabled:opacity-40"
                    data-testid={`btn-remove-seller-${selectedSeller.id}`}>
                    Remove Seller
                  </button>
                </div>

                {/* Seller stats */}
                {detailLoading ? <div className="py-4 flex justify-center"><Loader2 className="h-3 w-3 animate-spin text-primary" /></div> : sellerDetail && (
                  <div className="space-y-2">
                    {/* Cards */}
                    <div className="bg-[#111] border border-white/5 rounded-xl p-3">
                      <p className="text-[9px] text-white/30 uppercase tracking-widest mb-2">Cards ({sellerDetail.cards?.length ?? 0})</p>
                      {(sellerDetail.cards ?? []).slice(0, 5).map((c: any) => (
                        <div key={c.id} className="flex justify-between py-1 border-b border-white/5 last:border-0">
                          <span className="text-[10px] font-mono text-white/60 truncate">{c.masked_card}</span>
                          <span className={`text-[9px] ml-2 flex-shrink-0 ${c.is_sold ? "text-green-400" : "text-white/30"}`}>{c.is_sold ? "sold" : "avail"}</span>
                        </div>
                      ))}
                      {(sellerDetail.cards ?? []).length === 0 && <p className="text-[10px] text-white/20">No cards</p>}
                    </div>
                    {/* Stock */}
                    <div className="bg-[#111] border border-white/5 rounded-xl p-3">
                      <p className="text-[9px] text-white/30 uppercase tracking-widest mb-2">Logs ({sellerDetail.stock?.length ?? 0})</p>
                      {(sellerDetail.stock ?? []).slice(0, 5).map((s: any) => (
                        <div key={s.id} className="py-1 border-b border-white/5 last:border-0">
                          <p className="text-[10px] text-white/60 truncate">{s.product_name} — {s.variant_name}</p>
                          <span className={`text-[9px] ${s.is_sold ? "text-green-400" : "text-white/30"}`}>{s.is_sold ? "sold" : "avail"}</span>
                        </div>
                      ))}
                      {(sellerDetail.stock ?? []).length === 0 && <p className="text-[10px] text-white/20">No stock</p>}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SmtpSection() {
  const { toast } = useToast();
  const [host, setHost] = useState("smtp.gmail.com");
  const [port, setPort] = useState("587");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loaded, setLoaded] = useState(false);

  const { data: smtpData, isLoading } = useQuery({
    queryKey: ["/api/admin/smtp"],
    queryFn: async () => {
      const res = await fetch("/api/admin/smtp");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  if (smtpData && !loaded) {
    setHost(smtpData.smtp_host || "smtp.gmail.com");
    setPort(smtpData.smtp_port || "587");
    setEmail(smtpData.smtp_email || "");
    setLoaded(true);
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const body: any = { smtp_host: host, smtp_port: port, smtp_email: email };
      if (password) body.smtp_password = password;
      const res = await apiRequest("POST", "/api/admin/smtp", body);
      if (!res.ok) throw new Error("Failed to save");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "SMTP settings saved!" });
      setPassword("");
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Email (SMTP)</h1>
        <p className="text-sm text-muted-foreground mt-1">Configure the sending email for the Email Bomber tool</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
      ) : (
        <div className="bg-[#0f1115] border border-white/5 rounded-xl p-5 space-y-4 max-w-md">
          <div className="space-y-1">
            <label className="text-[10px] text-white/40 uppercase tracking-widest">SMTP Host</label>
            <Input
              value={host}
              onChange={e => setHost(e.target.value)}
              placeholder="smtp.gmail.com"
              className="bg-black/50 border-white/10"
              data-testid="input-smtp-host"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-white/40 uppercase tracking-widest">SMTP Port</label>
            <Input
              value={port}
              onChange={e => setPort(e.target.value)}
              placeholder="587"
              className="bg-black/50 border-white/10"
              data-testid="input-smtp-port"
            />
            <p className="text-[10px] text-white/20">587 for TLS, 465 for SSL, 25 for plain</p>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-white/40 uppercase tracking-widest">Sender Email</label>
            <Input
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="youremail@gmail.com"
              type="email"
              className="bg-black/50 border-white/10"
              data-testid="input-smtp-email"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-white/40 uppercase tracking-widest">
              App Password {smtpData?.has_password && <span className="text-green-400 normal-case">(saved)</span>}
            </label>
            <Input
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={smtpData?.has_password ? "Leave blank to keep current password" : "App password or SMTP password"}
              type="password"
              className="bg-black/50 border-white/10"
              data-testid="input-smtp-password"
            />
            <p className="text-[10px] text-white/20">For Gmail: use an App Password, not your account password</p>
          </div>

          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !host || !port || !email}
            className="w-full h-9 text-xs"
            data-testid="btn-save-smtp"
          >
            {saveMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save SMTP Settings"}
          </Button>
        </div>
      )}
    </div>
  );
}
