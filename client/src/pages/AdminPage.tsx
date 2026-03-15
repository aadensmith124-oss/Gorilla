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
import { Loader2, Plus, Trash2, Pencil, X, Users, DollarSign, ShoppingBag, Receipt, ShieldX, Menu, ChevronRight, Send, ChevronDown, ChevronUp, Check } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { useLocation } from "wouter";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const adminSections = [
  { id: "dashboard", label: "Dashboard" },
  { id: "products", label: "Products" },
  { id: "orders", label: "Orders" },
  { id: "users", label: "Users" },
  { id: "test", label: "Test Mode" },
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
        <h1 className="text-lg font-display font-black italic uppercase">ADMIN</h1>
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
          <h1 className="text-lg font-display font-black italic uppercase">ADMIN</h1>
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
          {activeSection === "users" && <UsersSection />}
          {activeSection === "test" && <TestModeSection onGoToOrders={() => setActiveSection("orders")} />}
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
      <h1 className="text-2xl font-display font-black tracking-tighter italic uppercase">Dashboard</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatCard title="Total Users" value={stats?.totalUsers || 0} icon={Users} />
        <StatCard title="Total Orders" value={stats?.totalOrders || 0} icon={ShoppingBag} />
        <StatCard title="Total Sales" value={`$${((stats?.totalSales || 0) / 100).toFixed(2)}`} icon={DollarSign} color="green" />
        <StatCard title="Pending Orders" value={stats?.pendingOrders || 0} icon={Receipt} color="orange" />
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
          <p className="text-xs text-muted-foreground uppercase tracking-widest">{title}</p>
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
  const { data: products, isLoading } = useProducts();

  const productSchema = z.object({
    name: z.string().min(1, "Name required"),
    image: z.string().optional(),
  });

  const variantSchema = z.object({
    name: z.string().min(1, "Name required"),
    price: z.string().min(1, "Price required"),
    minQuantity: z.string().default("1"),
  });

  const addForm = useForm<z.infer<typeof productSchema>>({
    resolver: zodResolver(productSchema),
    defaultValues: { name: "", image: "" },
  });

  const editForm = useForm<z.infer<typeof productSchema>>({
    resolver: zodResolver(productSchema),
    defaultValues: { name: "", image: "" },
  });

  const variantForm = useForm<z.infer<typeof variantSchema>>({
    resolver: zodResolver(variantSchema),
    defaultValues: { name: "", price: "", minQuantity: "1" },
  });

  const addMutation = useMutation({
    mutationFn: async (data: z.infer<typeof productSchema>) => {
      const res = await apiRequest("POST", api.products.create.path, { ...data, description: "" });
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
    editForm.reset({ name: product.name, image: product.image || "" });
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
        <h1 className="text-2xl font-display font-black tracking-tighter italic uppercase">Products</h1>
        <Button onClick={() => { setShowAddForm(!showAddForm); setEditingProduct(null); }} className="gap-2">
          <Plus className="h-4 w-4" />Add Product
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
                <Button type="submit" className="w-full" disabled={addMutation.isPending}>
                  {addMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save Product
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
                <Button type="submit" className="w-full" disabled={editMutation.isPending}>
                  {editMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Update Product
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
                <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Variants</p>

                {product.variants?.length > 0 ? (
                  <div className="space-y-2">
                    {product.variants.map((v: any) => (
                      <div key={v.id} className="flex items-center justify-between bg-black/30 rounded-lg px-3 py-2 border border-white/5">
                        <div>
                          <span className="text-sm font-medium">{v.name}</span>
                          <span className="text-xs text-muted-foreground ml-2">${(v.price / 100).toFixed(2)}</span>
                          <span className="text-xs text-muted-foreground ml-2">Min qty: {v.minQuantity || 1}</span>
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10"
                          onClick={() => { if (confirm("Delete variant?")) deleteVariantMutation.mutate(v.id); }}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">No variants yet</p>
                )}

                <Form {...variantForm}>
                  <form onSubmit={variantForm.handleSubmit((d) => addVariantMutation.mutate({ productId: product.id, data: d }))}
                    className="grid grid-cols-3 gap-2 items-end">
                    <FormField control={variantForm.control} name="name" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Name</FormLabel>
                        <FormControl><Input {...field} placeholder="e.g. 1 Month" className="bg-black/50 border-white/10 h-8 text-xs" /></FormControl>
                      </FormItem>
                    )} />
                    <FormField control={variantForm.control} name="price" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Price ($)</FormLabel>
                        <FormControl><Input {...field} placeholder="9.99" type="number" step="0.01" className="bg-black/50 border-white/10 h-8 text-xs" /></FormControl>
                      </FormItem>
                    )} />
                    <FormField control={variantForm.control} name="minQuantity" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Min Qty</FormLabel>
                        <FormControl><Input {...field} placeholder="1" type="number" min="1" className="bg-black/50 border-white/10 h-8 text-xs" /></FormControl>
                      </FormItem>
                    )} />
                    <div className="col-span-3">
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

function statusLabel(s: string) {
  if (s === "pending") return "Pending";
  if (s === "waiting_payment") return "Unpaid";
  if (s === "delivering") return "Waiting";
  if (s === "fulfilled") return "Fulfilled";
  return s;
}

function statusBadgeClass(s: string) {
  if (s === "fulfilled") return "bg-green-500/20 text-green-400 border-green-500/30";
  if (s === "delivering") return "bg-blue-500/20 text-blue-400 border-blue-500/30";
  if (s === "waiting_payment") return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
  return "bg-white/10 text-white/60";
}

function parseDeliveryContents(raw: string | null | undefined): Record<string, string> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed as Record<string, string>;
  } catch {}
  return {};
}

function OrdersSection() {
  const { toast } = useToast();
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [deliveryContents, setDeliveryContents] = useState<Record<string, string>>({});
  const [activeProductKey, setActiveProductKey] = useState<string | null>(null);

  const { data: orders, isLoading } = useQuery({
    queryKey: ["/api/admin/orders"],
    queryFn: async () => {
      const res = await fetch("/api/admin/orders");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    }
  });

  const deliverMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/admin/orders/${selectedOrder.id}/deliver`, { deliveryContents });
      if (!res.ok) throw new Error("Delivery failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
      setSelectedOrder(null);
      setDeliveryContents({});
      setActiveProductKey(null);
      toast({ title: "Order delivered successfully" });
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
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
    const allFilled = groupedEntries.length > 0 && groupedEntries.every(([key]) => !!deliveryContents[key]?.trim());

    return (
      <div className="space-y-4">
        <Button variant="outline" size="sm" onClick={() => { setSelectedOrder(null); setDeliveryContents({}); setActiveProductKey(null); }}>← Back</Button>

        <div className="bg-[#0f1115] border border-white/5 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-white uppercase tracking-tight">Order Detail</h2>
            <Badge className={statusBadgeClass(current.status)}>{statusLabel(current.status)}</Badge>
          </div>

          <div className="space-y-3 border-b border-white/5 pb-4">
            <div><p className="text-[10px] text-white/40 uppercase tracking-widest mb-0.5">ID</p><p className="text-xs font-mono text-white break-all">{current.orderId}</p></div>
            <div><p className="text-[10px] text-white/40 uppercase tracking-widest mb-0.5">Creation date</p><p className="text-sm text-white">{new Date(current.createdAt).toLocaleString("en-US")}</p></div>
            <div><p className="text-[10px] text-white/40 uppercase tracking-widest mb-0.5">Customer</p><p className="text-sm text-white font-bold">{current.user?.username || current.userId} · @{current.user?.telegramUsername || "—"}</p></div>
            <div><p className="text-[10px] text-white/40 uppercase tracking-widest mb-0.5">Payment method</p><p className="text-sm text-white">{current.paymentMethod || "Crypto"}</p></div>
            <div><p className="text-[10px] text-white/40 uppercase tracking-widest mb-0.5">Expected amount</p><p className="text-sm text-white">${(current.total / 100).toFixed(2)}</p></div>
            <div><p className="text-[10px] text-white/40 uppercase tracking-widest mb-0.5">Status</p><p className={`text-sm font-bold ${statusTextColor(current.status)}`}>{statusLabel(current.status)}</p></div>
          </div>

          {groupedEntries.length > 0 && (
            <div className="space-y-3">
              <p className="text-[10px] text-white/40 uppercase tracking-widest">Products — click to add delivery items</p>
              {groupedEntries.map(([key, g]) => {
                const hasFill = !!deliveryContents[key]?.trim();
                const isOpen = activeProductKey === key;
                return (
                  <div key={key} className="space-y-2">
                    <button
                      onClick={() => setActiveProductKey(isOpen ? null : key)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all text-left ${
                        hasFill
                          ? "border-green-500/40 bg-green-500/10"
                          : "border-white/10 bg-white/5 hover:bg-white/10"
                      } ${isOpen ? "ring-1 ring-primary" : ""}`}
                    >
                      <div>
                        <p className="text-sm font-bold text-white">{g.productName} ({g.qty})</p>
                        <p className="text-xs text-white/40 mt-0.5">{g.variantName}</p>
                      </div>
                      {hasFill
                        ? <Check className="h-5 w-5 text-green-400 flex-shrink-0" />
                        : isOpen
                          ? <ChevronUp className="h-4 w-4 text-white/40 flex-shrink-0" />
                          : <ChevronDown className="h-4 w-4 text-white/40 flex-shrink-0" />
                      }
                    </button>

                    {isOpen && (
                      <div className="bg-black/30 border border-white/10 rounded-xl p-4 space-y-3">
                        <div className="space-y-1 text-xs text-white/50">
                          <p><span className="text-white/30">Product:</span> {g.productName}</p>
                          <p><span className="text-white/30">Option:</span> {g.variantName}</p>
                          <p><span className="text-white/30">Quantity:</span> {g.qty}</p>
                        </div>
                        <textarea
                          value={deliveryContents[key] || ""}
                          onChange={(e) => setDeliveryContents(prev => ({ ...prev, [key]: e.target.value }))}
                          placeholder={`Paste ${g.qty} item(s) for this product...`}
                          rows={4}
                          className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-white/20 resize-none"
                        />
                        <button
                          onClick={() => setActiveProductKey(null)}
                          className="w-full h-9 rounded-lg bg-primary/20 hover:bg-primary/30 text-primary text-sm font-bold transition-colors"
                        >
                          Done
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="border-t border-white/5 pt-4">
            <Button
              onClick={() => deliverMutation.mutate()}
              disabled={deliverMutation.isPending || !allFilled}
              className="w-full gap-2 bg-primary hover:bg-primary/90 text-black font-black uppercase tracking-widest disabled:opacity-40"
            >
              {deliverMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send & Mark Fulfilled
            </Button>
            {!allFilled && groupedEntries.length > 0 && (
              <p className="text-xs text-white/30 text-center mt-2">Fill in items for all products to send</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-display font-black tracking-tighter italic uppercase">Orders</h1>
      <p className="text-sm text-muted-foreground">{orders?.length || 0} orders total</p>

      {(!orders || orders.length === 0) && (
        <div className="text-center py-12 text-muted-foreground text-sm">No orders yet.</div>
      )}

      <div className="bg-[#0f1115] border border-white/5 rounded-xl overflow-hidden">
        <div className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] px-4 py-2.5 border-b border-white/5">
          <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Price</span>
          <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Date</span>
          <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Status</span>
          <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Payment</span>
          <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Action</span>
        </div>
        {orders?.map((order: any) => (
          <div key={order.id} className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] px-4 py-3 border-b border-white/5 last:border-0 items-center hover:bg-white/5 transition-colors">
            <span className="text-sm font-bold text-white">${(order.total / 100).toFixed(2)}</span>
            <span className="text-xs text-white/50">{new Date(order.createdAt).toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "numeric" })}</span>
            <span className={`text-sm font-bold ${statusTextColor(order.status)}`}>{statusLabel(order.status)}</span>
            <span className="text-xs text-white/60">{order.paymentMethod || "Crypto"}</span>
            <Button variant="ghost" size="sm" className="h-7 text-xs px-3" onClick={() => {
              setSelectedOrder(order);
              setDeliveryContents(parseDeliveryContents(order.deliveryContent));
              setActiveProductKey(null);
            }}>
              View
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function statusTextColor(s: string) {
  if (s === "fulfilled") return "text-green-400";
  if (s === "delivering") return "text-blue-400";
  if (s === "waiting_payment") return "text-orange-400";
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
        <h1 className="text-2xl font-display font-black tracking-tighter italic uppercase">Test Mode</h1>
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
            <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-2">Product</label>
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
              <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-2">Variant</label>
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
            <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-2">Quantity</label>
            <Input
              type="number" min="1" value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="bg-black/50 border-white/10"
            />
          </div>

          <Button
            onClick={() => testOrderMutation.mutate()}
            disabled={testOrderMutation.isPending || !selectedProduct || !selectedVariant}
            className="w-full"
          >
            {testOrderMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Account</p>
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
        <h1 className="text-2xl font-display font-black tracking-tighter italic uppercase">Users</h1>
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
