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
import { Loader2, Plus, Trash2, Pencil, X, Users, DollarSign, ShoppingBag, Receipt, ShieldX, Menu, ChevronRight, Send, ChevronDown } from "lucide-react";
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
  { id: "verifications", label: "Verifications" },
  { id: "sellers", label: "Sellers" },
  { id: "users", label: "Users" },
  { id: "mail", label: "Mail" },
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
          {activeSection === "verifications" && <VerificationsSection />}
          {activeSection === "sellers" && <SellersSection />}
          {activeSection === "users" && <UsersSection />}
          {activeSection === "mail" && <AdminMailSection />}
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

function OrdersSection() {
  const { toast } = useToast();
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [deliveryContent, setDeliveryContent] = useState("");

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
      const res = await apiRequest("POST", `/api/admin/orders/${selectedOrder.id}/deliver`, { deliveryContent });
      if (!res.ok) throw new Error("Delivery failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
      setSelectedOrder(null);
      setDeliveryContent("");
      toast({ title: "Order delivered successfully" });
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: number; status: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/orders/${orderId}/status`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
      toast({ title: "Status updated" });
    }
  });

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" /></div>;

  if (selectedOrder) {
    const current = orders?.find((o: any) => o.id === selectedOrder.id) || selectedOrder;
    return (
      <div className="space-y-6">
        <Button variant="outline" onClick={() => { setSelectedOrder(null); setDeliveryContent(""); }}>← Back</Button>

        <Card className="bg-[#0f1115] border-white/5">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Order #{current.orderId}</span>
              <Badge className={statusBadgeClass(current.status)}>{statusLabel(current.status)}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground uppercase mb-1">Total</p>
                <p className="font-bold">${(current.total / 100).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase mb-1">Customer</p>
                <p className="font-bold">{current.user?.username || current.userId}</p>
              </div>
            </div>

            {(current.user?.telegramUsername || current.user?.channelName || current.user?.channelLink) && (
              <div className="bg-white/5 border border-white/5 rounded-xl p-3 space-y-2">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Reseller Info</p>
                {current.user?.telegramUsername && (
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">Telegram</p>
                    <p className="text-xs font-bold text-white">{current.user.telegramUsername}</p>
                  </div>
                )}
                {current.user?.channelName && (
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">Channel</p>
                    <p className="text-xs font-bold text-white">{current.user.channelName}</p>
                  </div>
                )}
                {current.user?.channelLink && (
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">Link</p>
                    <a href={current.user.channelLink} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline truncate max-w-[180px]">{current.user.channelLink}</a>
                  </div>
                )}
              </div>
            )}

            {current.items && current.items.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground uppercase tracking-widest">Items Ordered</p>
                {(() => {
                  const productItems = current.items.filter((i: any) => i.itemType === "product");
                  const grouped: Record<string, { name: string; qty: number; price: number }> = {};
                  for (const item of productItems) {
                    const key = String(item.variantId || item.id);
                    if (!grouped[key]) grouped[key] = { name: item.variant?.name || "Unknown variant", qty: 0, price: item.price };
                    grouped[key].qty += (item.quantity ?? 1);
                  }
                  return Object.values(grouped).map((g, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2 text-sm border border-white/5">
                      <div>
                        <p className="font-bold text-white">{g.name}</p>
                        <p className="text-xs text-muted-foreground">Qty: {g.qty}</p>
                      </div>
                      <p className="text-primary font-bold">${((g.price * g.qty) / 100).toFixed(2)}</p>
                    </div>
                  ));
                })()}
              </div>
            )}

            <div className="space-y-2">
              <p className="text-xs text-muted-foreground uppercase">Change Status</p>
              <div className="flex flex-wrap gap-2">
                {["pending", "waiting_payment", "delivering", "fulfilled"].map((s) => (
                  <Button key={s} size="sm" variant={current.status === s ? "default" : "outline"}
                    className="text-xs h-7"
                    onClick={() => updateStatusMutation.mutate({ orderId: current.id, status: s })}
                    disabled={updateStatusMutation.isPending || current.status === s}>
                    {statusLabel(s)}
                  </Button>
                ))}
              </div>
            </div>

            {(current.status === "delivering" || current.status === "waiting_payment" || current.status === "pending") && (
              <div className="space-y-3 border-t border-white/5 pt-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Paste Items to Deliver</p>
                <Textarea
                  value={deliveryContent}
                  onChange={(e) => setDeliveryContent(e.target.value)}
                  placeholder="Paste account credentials, keys, or any delivery content here..."
                  className="bg-black/50 border-white/10 min-h-32 font-mono text-xs"
                />
                <Button
                  onClick={() => deliverMutation.mutate()}
                  disabled={deliverMutation.isPending || !deliveryContent.trim()}
                  className="w-full gap-2"
                >
                  {deliverMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Send Items & Mark Fulfilled
                </Button>
              </div>
            )}

            {current.status === "fulfilled" && current.deliveryContent && (
              <div className="border-t border-white/5 pt-4 space-y-2">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Delivered Content</p>
                <div className="bg-green-500/5 border border-green-500/20 p-3 rounded-lg text-xs font-mono whitespace-pre-wrap">
                  {current.deliveryContent}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-display font-black tracking-tighter italic uppercase">Orders</h1>
      {(!orders || orders.length === 0) && (
        <div className="text-center py-12 text-muted-foreground text-sm">No orders yet.</div>
      )}
      <div className="bg-[#0f1115] border border-white/5 rounded-lg overflow-hidden">
        <Table>
          <TableHeader className="bg-white/5">
            <TableRow className="hover:bg-transparent border-white/5">
              <TableHead className="text-xs font-bold uppercase">Order ID</TableHead>
              <TableHead className="text-xs font-bold uppercase">Items</TableHead>
              <TableHead className="text-xs font-bold uppercase">Total</TableHead>
              <TableHead className="text-xs font-bold uppercase">Status</TableHead>
              <TableHead className="text-right text-xs font-bold uppercase">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders?.map((order: any) => (
              <TableRow key={order.id} className="border-white/5 hover:bg-white/5">
                <TableCell className="font-mono text-xs">{order.orderId}</TableCell>
                <TableCell className="text-xs text-white/80 max-w-[180px]">
                  {(() => {
                    const productItems = order.items?.filter((i: any) => i.itemType === "product") || [];
                    const grouped: Record<string, { name: string; qty: number }> = {};
                    for (const item of productItems) {
                      const key = String(item.variantId || item.id);
                      if (!grouped[key]) grouped[key] = { name: item.variant?.name || "Item", qty: 0 };
                      grouped[key].qty += (item.quantity ?? 1);
                    }
                    return Object.values(grouped).map((g, idx) => (
                      <div key={idx} className="truncate font-medium">{g.name} <span className="text-primary">×{g.qty}</span></div>
                    ));
                  })()}
                </TableCell>
                <TableCell className="font-bold">${(order.total / 100).toFixed(2)}</TableCell>
                <TableCell>
                  <Badge className={statusBadgeClass(order.status)}>{statusLabel(order.status)}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => { setSelectedOrder(order); setDeliveryContent(""); }}>
                    View
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
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

function SellersSection() {
  const { toast } = useToast();
  const [selectedSeller, setSelectedSeller] = useState<any>(null);
  const [termMessage, setTermMessage] = useState("");
  const [showTermInput, setShowTermInput] = useState(false);

  const { data: sellers, isLoading, error } = useQuery({
    queryKey: ["/api/admin/sellers"],
    queryFn: async () => {
      const res = await fetch("/api/admin/sellers");
      if (res.status === 401) throw new Error("SESSION_EXPIRED");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    refetchInterval: 15000,
  });

  const termMutation = useMutation({
    mutationFn: async ({ id, message }: { id: number; message: string }) => {
      const res = await apiRequest("POST", `/api/admin/verifications/${id}/term`, { message });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/sellers"] });
      setShowTermInput(false);
      setTermMessage("");
      toast({ title: "Seller termed" });
      if (selectedSeller) setSelectedSeller((s: any) => ({ ...s, status: "termed" }));
    },
  });

  const unverifyMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/admin/verifications/${id}/unverify`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/sellers"] });
      toast({ title: "Seller unverified — must reapply" });
      setSelectedSeller(null);
    },
  });

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" /></div>;

  if ((error as any)?.message === "SESSION_EXPIRED") {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <p className="text-sm text-muted-foreground">Session expired. Please log in again.</p>
        <Button size="sm" onClick={() => window.location.href = "/auth"}>Go to Login</Button>
      </div>
    );
  }

  if (selectedSeller) {
    const current = sellers?.find((s: any) => s.id === selectedSeller.id) || selectedSeller;
    return (
      <div className="space-y-6">
        <Button variant="outline" size="sm" onClick={() => { setSelectedSeller(null); setShowTermInput(false); setTermMessage(""); }}>← Back to Sellers</Button>

        <Card className="bg-[#0f1115] border-white/5">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{current.user?.username || `User ${current.userId}`}</span>
              <Badge className={current.status === "approved" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}>
                {current.status === "termed" ? "TERMED" : "APPROVED"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3 text-sm">
              <div className="bg-white/5 rounded-xl p-3 space-y-2 border border-white/5">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Reseller Info</p>
                <div className="flex justify-between"><p className="text-xs text-muted-foreground">Telegram</p><p className="text-xs font-bold">{current.telegramUsername}</p></div>
                <div className="flex justify-between"><p className="text-xs text-muted-foreground">Channel</p><p className="text-xs font-bold">{current.channelName}</p></div>
                <div className="flex justify-between items-center"><p className="text-xs text-muted-foreground">Link</p><a href={current.channelLink} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline truncate max-w-[200px]">{current.channelLink}</a></div>
              </div>

              <div className="bg-white/5 rounded-xl p-3 space-y-2 border border-white/5">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Login IPs ({current.ips?.length || 0} unique, {current.totalLogins || 0} total)</p>
                {current.ips?.length === 0 && <p className="text-xs text-muted-foreground">No logins recorded yet</p>}
                {current.ips?.map((ip: string, i: number) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${i >= 3 ? "bg-destructive" : "bg-green-500"}`} />
                    <p className="text-xs font-mono text-white">{ip}</p>
                    {i >= 3 && <Badge className="text-[9px] bg-destructive/20 text-destructive">FLAGGED</Badge>}
                  </div>
                ))}
                {(current.ips?.length || 0) >= 3 && (
                  <p className="text-[10px] text-destructive font-bold mt-1">⚠ 3+ UNIQUE IPs — POSSIBLE ACCOUNT SHARING</p>
                )}
              </div>

              {current.status === "termed" && current.termMessage && (
                <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-3">
                  <p className="text-[10px] font-bold text-destructive uppercase tracking-widest mb-1">Term Reason</p>
                  <p className="text-xs text-white/70">{current.termMessage}</p>
                </div>
              )}
            </div>

            <div className="border-t border-white/5 pt-4 space-y-3">
              {showTermInput ? (
                <div className="space-y-2">
                  <Input
                    placeholder="Reason for termination (shown to user)..."
                    value={termMessage}
                    onChange={e => setTermMessage(e.target.value)}
                    className="bg-black/50 border-white/10 text-sm"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1 bg-destructive hover:bg-destructive/90 text-white h-8 text-xs"
                      onClick={() => termMutation.mutate({ id: current.id, message: termMessage })}
                      disabled={termMutation.isPending}
                    >
                      {termMutation.isPending && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                      Confirm Term
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setShowTermInput(false)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  {current.status !== "termed" && (
                    <Button
                      size="sm"
                      className="flex-1 bg-destructive hover:bg-destructive/90 text-white h-8 text-xs"
                      onClick={() => setShowTermInput(true)}
                    >
                      Term
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 border-white/20 h-8 text-xs"
                    onClick={() => unverifyMutation.mutate(current.id)}
                    disabled={unverifyMutation.isPending}
                  >
                    {unverifyMutation.isPending && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                    Unverify
                  </Button>
                </div>
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
        <h1 className="text-2xl font-display font-black tracking-tighter italic uppercase">Sellers</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {sellers?.filter((s: any) => s.status === "approved").length || 0} active · {sellers?.filter((s: any) => s.status === "termed").length || 0} termed
        </p>
      </div>

      {(!sellers || sellers.filter((s: any) => s.status === "approved" || s.status === "termed").length === 0) && (
        <div className="text-center py-12 text-muted-foreground text-sm">No approved sellers yet. Approve them from the Verifications section.</div>
      )}

      <div className="space-y-3">
        {sellers?.filter((s: any) => s.status === "approved" || s.status === "termed").map((s: any) => (
          <Card key={s.id} className="bg-[#0f1115] border-white/5 cursor-pointer hover:border-white/10 transition-colors" onClick={() => setSelectedSeller(s)}>
            <CardContent className="p-4 flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-sm text-white">{s.user?.username}</p>
                  <Badge className={
                    s.status === "approved" ? "bg-green-500/20 text-green-400 text-[9px]" :
                    s.status === "termed" ? "bg-red-500/20 text-red-400 text-[9px]" :
                    s.status === "pending" ? "bg-yellow-500/20 text-yellow-400 text-[9px]" :
                    "bg-white/10 text-white/50 text-[9px]"
                  }>
                    {s.status === "approved" ? "ACTIVE" : s.status === "termed" ? "TERMED" : s.status === "pending" ? "PENDING" : "DENIED"}
                  </Badge>
                  {(s.ips?.length || 0) >= 3 && <Badge className="bg-destructive/20 text-destructive text-[9px]">IP ALERT</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">{s.telegramUsername} · {s.channelName}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">{s.ips?.length || 0} unique IPs</p>
                <ChevronRight className="h-4 w-4 text-muted-foreground mt-1 ml-auto" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function VerificationsSection() {
  const { toast } = useToast();
  const { data: verifications, isLoading } = useQuery({
    queryKey: ["/api/admin/verifications"],
    queryFn: async () => {
      const res = await fetch("/api/admin/verifications");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    }
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, note }: { id: number; note?: string }) => {
      const res = await apiRequest("POST", `/api/admin/verifications/${id}/approve`, { note: note || "" });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/verifications"] });
      toast({ title: "Application approved" });
    }
  });

  const denyMutation = useMutation({
    mutationFn: async ({ id, note }: { id: number; note?: string }) => {
      const res = await apiRequest("POST", `/api/admin/verifications/${id}/deny`, { note: note || "" });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/verifications"] });
      toast({ title: "Application denied" });
    }
  });

  const pending = verifications?.filter((v: any) => v.status === "pending") || [];
  const others = verifications?.filter((v: any) => v.status !== "pending") || [];

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-black tracking-tighter italic uppercase">Verifications</h1>
        <p className="text-sm text-muted-foreground mt-1">{pending.length} pending application{pending.length !== 1 ? "s" : ""}</p>
      </div>

      {verifications?.length === 0 && (
        <div className="text-center py-12 text-muted-foreground text-sm">No applications yet.</div>
      )}

      {pending.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-bold text-primary uppercase tracking-widest">Pending Review</p>
          {pending.map((v: any) => (
            <Card key={v.id} className="bg-[#0f1115] border-primary/20">
              <CardContent className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-0.5">Telegram</p>
                    <p className="font-medium">{v.telegramUsername}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-0.5">Channel</p>
                    <p className="font-medium">{v.channelName}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-0.5">Channel Link</p>
                    <a href={v.channelLink} target="_blank" rel="noreferrer" className="text-primary text-xs hover:underline truncate block">{v.channelLink}</a>
                  </div>
                </div>
                <div className="flex gap-2 pt-1 border-t border-white/5">
                  <Button
                    size="sm"
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white h-8 text-xs"
                    onClick={() => approveMutation.mutate({ id: v.id })}
                    disabled={approveMutation.isPending}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 border-destructive/40 text-destructive hover:bg-destructive/10 h-8 text-xs"
                    onClick={() => {
                      const note = prompt("Denial reason (optional):");
                      denyMutation.mutate({ id: v.id, note: note || "" });
                    }}
                    disabled={denyMutation.isPending}
                  >
                    Deny
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {others.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Reviewed</p>
          <div className="bg-[#0f1115] border border-white/5 rounded-lg overflow-hidden">
            <Table>
              <TableHeader className="bg-white/5">
                <TableRow className="hover:bg-transparent border-white/5">
                  <TableHead className="text-xs font-bold uppercase">Telegram</TableHead>
                  <TableHead className="text-xs font-bold uppercase">Channel</TableHead>
                  <TableHead className="text-xs font-bold uppercase">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {others.map((v: any) => (
                  <TableRow key={v.id} className="border-white/5 hover:bg-white/5">
                    <TableCell className="text-sm">{v.telegramUsername}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{v.channelName}</TableCell>
                    <TableCell>
                      <Badge className={v.status === "approved" ? "bg-green-500/20 text-green-400 text-[10px]" : "bg-red-500/20 text-red-400 text-[10px]"}>
                        {v.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}

function UsersSection() {
  const { toast } = useToast();
  const { data: users, isLoading } = useQuery({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      const res = await fetch("/api/admin/users");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    }
  });

  const banMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await apiRequest("POST", api.admin.banUser.path.replace(":id", userId.toString()));
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "User banned" });
    }
  });

  const unbanMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await apiRequest("POST", api.admin.unbanUser.path.replace(":id", userId.toString()));
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "User unbanned" });
    }
  });

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-display font-black tracking-tighter italic uppercase">Users</h1>
      <div className="bg-[#0f1115] border border-white/5 rounded-lg overflow-hidden">
        <Table>
          <TableHeader className="bg-white/5">
            <TableRow className="hover:bg-transparent border-white/5">
              <TableHead className="text-xs font-bold uppercase">Username</TableHead>
              <TableHead className="text-xs font-bold uppercase">Email</TableHead>
              <TableHead className="text-xs font-bold uppercase">Telegram</TableHead>
              <TableHead className="text-xs font-bold uppercase">Status</TableHead>
              <TableHead className="text-right text-xs font-bold uppercase">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users?.map((user: any) => (
              <TableRow key={user.id} className="border-white/5 hover:bg-white/5">
                <TableCell className="font-bold text-sm">{user.username}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{user.email}</TableCell>
                <TableCell className="text-xs text-muted-foreground">@{user.telegramUsername || "—"}</TableCell>
                <TableCell>
                  {user.isBanned
                    ? <Badge className="bg-red-500/20 text-red-400 text-[10px]">Banned</Badge>
                    : <Badge className="bg-green-500/20 text-green-400 text-[10px]">Active</Badge>
                  }
                </TableCell>
                <TableCell className="text-right">
                  {user.isBanned ? (
                    <Button variant="ghost" size="sm" className="text-green-400 hover:bg-green-500/10 text-xs h-7"
                      onClick={() => unbanMutation.mutate(user.id)} disabled={unbanMutation.isPending}>
                      Unban
                    </Button>
                  ) : (
                    <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 text-xs h-7"
                      onClick={() => { if (confirm("Ban this user?")) banMutation.mutate(user.id); }}
                      disabled={banMutation.isPending}>
                      Ban
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function AdminMailSection() {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [recipientId, setRecipientId] = useState<string>("");
  const [selectedMail, setSelectedMail] = useState<any>(null);

  const { data: sellers } = useQuery<any[]>({
    queryKey: ["/api/admin/sellers/approved"],
    queryFn: async () => {
      const res = await fetch("/api/admin/sellers/approved");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: mails, isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/mails"],
    queryFn: async () => {
      const res = await fetch("/api/mails");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    refetchInterval: 15000,
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/mails/send", {
        title: title.trim(),
        body: body.trim(),
        recipientId: recipientId ? Number(recipientId) : null,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/mails"] });
      setTitle("");
      setBody("");
      setRecipientId("");
      toast({ title: "Mail sent" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (selectedMail) {
    return (
      <div className="space-y-4 max-w-2xl">
        <Button variant="outline" size="sm" onClick={() => setSelectedMail(null)}>← Back</Button>
        <Card className="bg-[#0f1115] border-white/5">
          <CardHeader>
            <CardTitle className="text-white">{selectedMail.title}</CardTitle>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
              {selectedMail.recipientId
                ? `To: ${sellers?.find((s: any) => s.userId === selectedMail.recipientId)?.user?.username || `User #${selectedMail.recipientId}`}`
                : "Broadcast — All Sellers"}
              {" · "}{new Date(selectedMail.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </p>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-[#e1e1e1] whitespace-pre-wrap leading-relaxed">{selectedMail.body}</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-display font-black tracking-tighter italic uppercase">Mail</h1>

      <Card className="bg-[#0f1115] border-white/5">
        <CardHeader>
          <CardTitle className="text-base">Send New Mail</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-1">Recipient</label>
            <select
              value={recipientId}
              onChange={e => setRecipientId(e.target.value)}
              className="w-full bg-white/5 border border-white/10 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">All Sellers (Broadcast)</option>
              {sellers?.map((s: any) => (
                <option key={s.userId} value={s.userId}>{s.user?.username || `User #${s.userId}`}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-1">Subject</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Mail subject..."
              className="w-full bg-white/5 border border-white/10 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-white/30"
              data-testid="input-mail-title"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-1">Message</label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={5}
              placeholder="Write your message..."
              className="w-full bg-white/5 border border-white/10 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-white/30 resize-none"
              data-testid="input-mail-body"
            />
          </div>
          <Button
            onClick={() => sendMutation.mutate()}
            disabled={sendMutation.isPending || !title.trim() || !body.trim()}
            className="bg-primary hover:bg-primary/80 text-white font-bold text-xs uppercase"
            data-testid="button-send-mail"
          >
            {sendMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {recipientId ? "Send to Seller" : "Broadcast to All Sellers"}
          </Button>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-3">Sent Mails</h2>
        {isLoading && <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>}
        {!isLoading && (!mails || mails.length === 0) && (
          <div className="text-center py-8 text-sm text-muted-foreground">No mails sent yet.</div>
        )}
        <div className="space-y-2">
          {mails?.map((mail: any) => (
            <button key={mail.id} onClick={() => setSelectedMail(mail)} className="w-full text-left">
              <Card className="bg-[#0f1115] border-white/5 hover:border-primary/20 transition-colors cursor-pointer">
                <CardContent className="py-3 px-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold text-white">{mail.title}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {mail.recipientId
                        ? `To: ${sellers?.find((s: any) => s.userId === mail.recipientId)?.user?.username || `User #${mail.recipientId}`}`
                        : "Broadcast — All Sellers"}
                    </p>
                  </div>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                    {new Date(mail.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                </CardContent>
              </Card>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
