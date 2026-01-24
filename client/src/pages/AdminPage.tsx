import { useAuth } from "@/hooks/use-auth";
import { useProducts } from "@/hooks/use-products";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Loader2, Plus, Trash2, Package, Users, DollarSign, ShoppingBag, Terminal, ShieldX,
  LayoutDashboard, Box, Receipt, UserCog, Ticket, Megaphone, 
  Gamepad2, HeadphonesIcon, ScrollText, ChevronRight, Copy, Ban, CreditCard,
  RefreshCw, Eye, EyeOff, Search, Check, Menu, X, Edit2
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const adminSections = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "products", label: "Products", icon: Package },
  { id: "orders", label: "Orders", icon: Receipt },
  { id: "users", label: "Users", icon: UserCog },
  { id: "codes", label: "Redeem Codes", icon: Ticket },
  { id: "announcements", label: "Announcements", icon: Megaphone },
  { id: "games", label: "Games", icon: Gamepad2 },
  { id: "support", label: "Support", icon: HeadphonesIcon },
  { id: "logs", label: "Logs", icon: ScrollText },
];

export default function AdminPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [activeSection, setActiveSection] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      setLocation("/");
    }
  }, [authLoading, isAdmin, setLocation]);

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#090a0c]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-[#090a0c] gap-4">
        <ShieldX className="h-16 w-16 text-destructive" />
        <h1 className="text-xl font-bold text-white">Access Denied</h1>
        <p className="text-muted-foreground">You don't have permission to view this page.</p>
      </div>
    );
  }

  const handleNavClick = (id: string) => {
    setActiveSection(id);
    setSidebarOpen(false);
  };

  const SidebarContent = () => (
    <>
      <div className="p-4 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Terminal className="h-5 w-5 text-primary" />
          <span className="text-lg font-display font-black tracking-tighter italic uppercase">
            ADMIN <span className="text-primary">8765</span>
          </span>
        </div>
      </div>
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {adminSections.map((section) => (
          <button
            key={section.id}
            onClick={() => handleNavClick(section.id)}
            data-testid={`nav-${section.id}`}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeSection === section.id 
                ? "bg-primary/20 text-primary border border-primary/30" 
                : "text-white/60 hover:bg-white/5 hover:text-white"
            }`}
          >
            <section.icon className="h-4 w-4" />
            <span>{section.label}</span>
            {activeSection === section.id && <ChevronRight className="h-4 w-4 ml-auto" />}
          </button>
        ))}
      </nav>
      <div className="p-4 border-t border-white/5">
        <Badge variant="outline" className="w-full justify-center py-1 text-[10px] uppercase tracking-widest">
          Level 4 Access
        </Badge>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-[#090a0c] text-white overflow-hidden">
      <aside className="hidden md:flex w-64 border-r border-white/5 bg-[#0d0f12] flex-col">
        <SidebarContent />
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="md:hidden flex items-center justify-between p-4 border-b border-white/5 bg-[#0d0f12]">
          <div className="flex items-center gap-2">
            <Terminal className="h-5 w-5 text-primary" />
            <span className="text-lg font-display font-black tracking-tighter italic uppercase">
              ADMIN
            </span>
          </div>
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger asChild>
              <Button size="icon" variant="ghost" data-testid="btn-mobile-menu">
                <Menu className="h-5 w-5" />
              </Button>
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
          {activeSection === "codes" && <CodesSection />}
          {activeSection === "announcements" && <AnnouncementsSection />}
          {activeSection === "games" && <GamesSection />}
          {activeSection === "support" && <SupportSection />}
          {activeSection === "logs" && <LogsSection />}
        </main>
      </div>
    </div>
  );
}

function DashboardSection() {
  const { data: products } = useProducts();
  const { data: stats, isLoading } = useQuery({
    queryKey: [api.admin.dashboard.path],
    queryFn: async () => {
      const res = await fetch(api.admin.dashboard.path);
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    }
  });

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl md:text-2xl font-display font-black tracking-tighter italic uppercase">Dashboard</h1>
      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatCard title="Total Users" value={stats?.totalUsers || 0} icon={Users} />
        <StatCard title="Total Orders" value={stats?.totalOrders || 0} icon={ShoppingBag} />
        <StatCard title="Total Sales" value={`$${((stats?.totalSales || 0) / 100).toFixed(2)}`} icon={DollarSign} color="green" />
        <StatCard title="Store Balance" value={`$${((stats?.storeBalance || 0) / 100).toFixed(2)}`} icon={CreditCard} />
        <StatCard title="Items in Stock" value={stats?.itemsInStock || 0} icon={Box} />
        <StatCard title="Items Sold" value={stats?.itemsSold || 0} icon={Package} color="purple" />
        <StatCard title="Active Products" value={products?.length || 0} icon={Box} />
        <StatCard title="Pending Orders" value={stats?.pendingOrders || 0} icon={Receipt} color="orange" />
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color = "primary" }: { title: string; value: string | number; icon: any; color?: string }) {
  const colorClasses: Record<string, string> = {
    primary: "text-primary",
    green: "text-green-500",
    orange: "text-orange-500",
    purple: "text-purple-500",
  };
  return (
    <Card className="bg-[#16181d] border-white/5">
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2 p-3 md:p-4">
        <CardTitle className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-muted-foreground">{title}</CardTitle>
        <Icon className={`h-3 w-3 md:h-4 md:w-4 ${colorClasses[color]}`} />
      </CardHeader>
      <CardContent className="p-3 md:p-4 pt-0">
        <div className={`text-lg md:text-2xl font-black italic tracking-tighter ${colorClasses[color]}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

function ProductsSection() {
  const { data: products, isLoading } = useQuery({
    queryKey: ["/api/admin/products"],
    queryFn: async () => {
      const res = await fetch("/api/admin/products");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    }
  });
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);

  const toggleMutation = useMutation({
    mutationFn: async ({ id, active }: { id: number; active: boolean }) => {
      await apiRequest("PATCH", `/api/admin/products/${id}`, { active });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/products"] });
      queryClient.invalidateQueries({ queryKey: [api.products.list.path] });
    }
  });

  const productSchema = z.object({
    name: z.string().min(1, "Required"),
    image: z.string().min(1, "Required"),
    description: z.string().optional(),
    active: z.boolean().default(true),
  });

  const form = useForm<z.infer<typeof productSchema>>({
    resolver: zodResolver(productSchema),
    defaultValues: { name: "", image: "", description: "", active: true },
  });

  const createMutation = useMutation({
    mutationFn: async (data: z.infer<typeof productSchema>) => {
      await apiRequest("POST", api.products.create.path, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/products"] });
      queryClient.invalidateQueries({ queryKey: [api.products.list.path] });
      form.reset();
      setShowForm(false);
      toast({ title: "Product created" });
    }
  });

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-xl md:text-2xl font-display font-black tracking-tighter italic uppercase">Products</h1>
        <Button onClick={() => setShowForm(!showForm)} className="gap-2" data-testid="btn-add-product">
          <Plus className="h-4 w-4" /> Add Product
        </Button>
      </div>

      {showForm && (
        <Card className="bg-[#16181d] border-white/5">
          <CardContent className="p-4 md:p-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Product Name</FormLabel>
                      <FormControl><Input {...field} placeholder="Netflix Premium" data-testid="input-product-name" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="image" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Image URL</FormLabel>
                      <FormControl><Input {...field} placeholder="https://..." data-testid="input-product-image" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (optional)</FormLabel>
                    <FormControl><Textarea {...field} rows={3} data-testid="input-product-description" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="active" render={({ field }) => (
                  <FormItem className="flex items-center gap-3">
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-product-active" /></FormControl>
                    <FormLabel className="!mt-0">Active</FormLabel>
                  </FormItem>
                )} />
                <Button type="submit" disabled={createMutation.isPending} className="w-full" data-testid="btn-save-product">
                  {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Product
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {products?.map((p: any) => (
          <Card key={p.id} className="bg-[#16181d] border-white/5" data-testid={`card-product-${p.id}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <img src={p.image} className="h-10 w-10 rounded bg-[#0f1115] object-contain p-1 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="font-bold truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.variants?.length || 0} options • {p.variants?.reduce((s: number, v: any) => s + (v.stockCount || 0), 0) || 0} in stock
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge variant={p.active ? "default" : "secondary"} className="hidden sm:flex">
                    {p.active ? "Active" : "Hidden"}
                  </Badge>
                  <Button size="icon" variant="ghost" onClick={() => setEditingProduct(p)} data-testid={`btn-edit-${p.id}`}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => toggleMutation.mutate({ id: p.id, active: !p.active })} data-testid={`btn-toggle-${p.id}`}>
                    {p.active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {editingProduct && (
        <ProductEditDialog product={editingProduct} onClose={() => setEditingProduct(null)} />
      )}
    </div>
  );
}

function ProductEditDialog({ product, onClose }: { product: any; onClose: () => void }) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("options");

  const optionSchema = z.object({
    name: z.string().min(1, "Required"),
    price: z.string().min(1, "Required"),
  });

  const optionForm = useForm<z.infer<typeof optionSchema>>({
    resolver: zodResolver(optionSchema),
    defaultValues: { name: "", price: "" },
  });

  const stockSchema = z.object({
    variantId: z.string().min(1, "Required"),
    rawContent: z.string().min(1, "Required"),
  });

  const stockForm = useForm<z.infer<typeof stockSchema>>({
    resolver: zodResolver(stockSchema),
    defaultValues: { variantId: "", rawContent: "" },
  });

  const rawContent = stockForm.watch("rawContent");
  const lines = rawContent.split('\n').filter(l => l.trim().length > 0);
  const itemsDetected = Math.floor(lines.length / 3);

  const createOptionMutation = useMutation({
    mutationFn: async (data: z.infer<typeof optionSchema>) => {
      await apiRequest("POST", api.variants.create.path, {
        productId: product.id,
        name: data.name,
        price: Math.round(parseFloat(data.price) * 100),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/products"] });
      queryClient.invalidateQueries({ queryKey: [api.products.list.path] });
      optionForm.reset();
      toast({ title: "Option added" });
    }
  });

  const addStockMutation = useMutation({
    mutationFn: async (data: z.infer<typeof stockSchema>) => {
      await apiRequest("POST", api.stock.add.path, {
        variantId: parseInt(data.variantId),
        rawContent: data.rawContent,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/products"] });
      queryClient.invalidateQueries({ queryKey: [api.products.list.path] });
      stockForm.reset({ variantId: stockForm.getValues("variantId"), rawContent: "" });
      toast({ title: `Added ${itemsDetected} items` });
    }
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg bg-[#16181d] border-white/10 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <img src={product.image} className="h-8 w-8 rounded bg-[#0f1115] object-contain p-1" />
            {product.name}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="options">Options</TabsTrigger>
            <TabsTrigger value="stock">Add Stock</TabsTrigger>
          </TabsList>

          <TabsContent value="options" className="space-y-4 mt-4">
            {product.variants?.length > 0 && (
              <div className="space-y-2">
                {product.variants.map((v: any) => (
                  <div key={v.id} className="flex items-center justify-between p-3 rounded-lg bg-[#1c1f26]">
                    <div>
                      <p className="font-medium">{v.name}</p>
                      <p className="text-xs text-muted-foreground">{v.stockCount} in stock</p>
                    </div>
                    <Badge variant="outline" className="text-green-500">${(v.price / 100).toFixed(2)}</Badge>
                  </div>
                ))}
              </div>
            )}

            <Form {...optionForm}>
              <form onSubmit={optionForm.handleSubmit((d) => createOptionMutation.mutate(d))} className="space-y-4 p-4 rounded-lg bg-[#1c1f26]">
                <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Add New Option</p>
                <div className="grid grid-cols-2 gap-3">
                  <FormField control={optionForm.control} name="name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl><Input {...field} placeholder="Private Account" data-testid="input-option-name" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={optionForm.control} name="price" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price ($)</FormLabel>
                      <FormControl><Input {...field} type="number" step="0.01" placeholder="5.00" data-testid="input-option-price" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <Button type="submit" disabled={createOptionMutation.isPending} className="w-full" data-testid="btn-save-option">
                  {createOptionMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Add Option
                </Button>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="stock" className="space-y-4 mt-4">
            <Form {...stockForm}>
              <form onSubmit={stockForm.handleSubmit((d) => addStockMutation.mutate(d))} className="space-y-4">
                <FormField control={stockForm.control} name="variantId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Option</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-stock-option">
                          <SelectValue placeholder="Choose option" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {product.variants?.map((v: any) => (
                          <SelectItem key={v.id} value={v.id.toString()}>{v.name} ({v.stockCount} in stock)</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={stockForm.control} name="rawContent" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stock Items</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={6} placeholder="Paste items here&#10;(Every 3 non-empty lines = 1 item)" className="font-mono text-sm" data-testid="textarea-stock-content" />
                    </FormControl>
                    <FormDescription>Every 3 non-empty lines = 1 item</FormDescription>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="flex items-center gap-4 p-3 rounded-lg bg-[#1c1f26] text-sm">
                  <span>Items detected: <strong className="text-primary">{itemsDetected}</strong></span>
                </div>

                <Button type="submit" disabled={addStockMutation.isPending || itemsDetected === 0} className="w-full" data-testid="btn-save-stock">
                  {addStockMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Add Stock
                </Button>
              </form>
            </Form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function OrdersSection() {
  const [search, setSearch] = useState("");
  const { data: orders, isLoading } = useQuery({
    queryKey: ["/api/admin/orders"],
    queryFn: async () => {
      const res = await fetch("/api/admin/orders");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    }
  });
  const { toast } = useToast();

  const refundMutation = useMutation({
    mutationFn: async (orderId: number) => {
      await apiRequest("POST", `/api/admin/orders/${orderId}/refund`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
      toast({ title: "Order refunded (store credit)" });
    }
  });

  const replaceMutation = useMutation({
    mutationFn: async (orderId: number) => {
      await apiRequest("POST", `/api/admin/orders/${orderId}/replace`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
      toast({ title: "Item replaced" });
    }
  });

  const filtered = orders?.filter((o: any) => 
    o.id.toString().includes(search) || 
    o.user?.username?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <h1 className="text-xl md:text-2xl font-display font-black tracking-tighter italic uppercase">Orders</h1>
      
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search orders..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" data-testid="input-search-orders" />
      </div>

      <div className="space-y-3">
        {filtered.map((o: any) => (
          <Card key={o.id} className="bg-[#16181d] border-white/5" data-testid={`card-order-${o.id}`}>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="font-mono font-bold">ORD-{o.id.toString().padStart(5, '0')}</p>
                  <p className="text-sm text-muted-foreground">{o.user?.username || 'Unknown'} • {new Date(o.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-500 font-bold">${(o.total / 100).toFixed(2)}</span>
                  <Badge variant={o.status === 'paid' ? 'default' : o.status === 'refunded' ? 'secondary' : 'outline'}>
                    {o.status}
                  </Badge>
                  {o.status === 'paid' && (
                    <>
                      <Button size="sm" variant="ghost" onClick={() => refundMutation.mutate(o.id)} disabled={refundMutation.isPending} data-testid={`btn-refund-${o.id}`}>
                        <DollarSign className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => replaceMutation.mutate(o.id)} disabled={replaceMutation.isPending} data-testid={`btn-replace-${o.id}`}>
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function UsersSection() {
  const [search, setSearch] = useState("");
  const { data: users, isLoading } = useQuery({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      const res = await fetch("/api/admin/users");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    }
  });
  const { toast } = useToast();
  const [editingUser, setEditingUser] = useState<number | null>(null);
  const [balanceAmount, setBalanceAmount] = useState("");

  const banMutation = useMutation({
    mutationFn: async ({ userId, banned }: { userId: number; banned: boolean }) => {
      await apiRequest("PATCH", `/api/admin/users/${userId}`, { isBanned: banned });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    }
  });

  const balanceMutation = useMutation({
    mutationFn: async ({ userId, amount }: { userId: number; amount: number }) => {
      await apiRequest("POST", `/api/admin/users/${userId}/balance`, { amount });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setEditingUser(null);
      setBalanceAmount("");
      toast({ title: "Balance updated" });
    }
  });

  const filtered = users?.filter((u: any) => 
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  ) || [];

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <h1 className="text-xl md:text-2xl font-display font-black tracking-tighter italic uppercase">Users</h1>
      
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" data-testid="input-search-users" />
      </div>

      <div className="space-y-3">
        {filtered.map((u: any) => (
          <Card key={u.id} className="bg-[#16181d] border-white/5" data-testid={`card-user-${u.id}`}>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="font-bold">{u.username}</p>
                  <p className="text-sm text-muted-foreground">{u.email}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {editingUser === u.id ? (
                    <div className="flex items-center gap-2">
                      <Input type="number" value={balanceAmount} onChange={(e) => setBalanceAmount(e.target.value)} className="w-20 h-8" placeholder="+/-" data-testid={`input-balance-${u.id}`} />
                      <Button size="icon" className="h-8 w-8" onClick={() => balanceMutation.mutate({ userId: u.id, amount: Math.round(parseFloat(balanceAmount) * 100) })} data-testid={`btn-save-balance-${u.id}`}>
                        <Check className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <span className="text-green-500 font-bold">${(u.balance / 100).toFixed(2)}</span>
                  )}
                  <Badge variant="outline">{u.role}</Badge>
                  <Badge variant={u.isBanned ? "destructive" : "default"}>
                    {u.isBanned ? "Banned" : "Active"}
                  </Badge>
                  <Button size="icon" variant="ghost" onClick={() => setEditingUser(editingUser === u.id ? null : u.id)} data-testid={`btn-edit-balance-${u.id}`}>
                    <CreditCard className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => banMutation.mutate({ userId: u.id, banned: !u.isBanned })} data-testid={`btn-ban-${u.id}`}>
                    <Ban className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function CodesSection() {
  const { data: codes, isLoading } = useQuery({
    queryKey: ["/api/admin/codes"],
    queryFn: async () => {
      const res = await fetch("/api/admin/codes");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    }
  });
  const { toast } = useToast();
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([]);

  const codeSchema = z.object({
    amount: z.string().min(1, "Required"),
    count: z.string().min(1, "Required"),
  });

  const form = useForm<z.infer<typeof codeSchema>>({
    resolver: zodResolver(codeSchema),
    defaultValues: { amount: "", count: "10" },
  });

  const generateMutation = useMutation({
    mutationFn: async (data: z.infer<typeof codeSchema>) => {
      const res = await apiRequest("POST", api.admin.generateCodes.path, {
        amount: Math.round(parseFloat(data.amount) * 100),
        count: parseInt(data.count),
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/codes"] });
      setGeneratedCodes(data.codes);
      toast({ title: `Generated ${data.codes.length} codes` });
    }
  });

  const copyAll = () => {
    navigator.clipboard.writeText(generatedCodes.join('\n'));
    toast({ title: "Copied to clipboard" });
  };

  const available = codes?.filter((c: any) => !c.isUsed) || [];
  const used = codes?.filter((c: any) => c.isUsed) || [];

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <h1 className="text-xl md:text-2xl font-display font-black tracking-tighter italic uppercase">Redeem Codes</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard title="Total" value={codes?.length || 0} icon={Ticket} />
        <StatCard title="Available" value={available.length} icon={Check} color="green" />
        <StatCard title="Used" value={used.length} icon={Ticket} color="orange" />
        <StatCard title="Issued" value={`$${(codes?.reduce((s: number, c: any) => s + c.amount, 0) / 100 || 0).toFixed(2)}`} icon={DollarSign} color="purple" />
      </div>

      <Card className="bg-[#16181d] border-white/5">
        <CardHeader><CardTitle className="text-sm uppercase tracking-widest">Generate Codes</CardTitle></CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((d) => generateMutation.mutate(d))} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="amount" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount ($)</FormLabel>
                    <FormControl><Input {...field} type="number" step="0.01" placeholder="5.00" data-testid="input-code-amount" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="count" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity</FormLabel>
                    <FormControl><Input {...field} type="number" min="1" max="100" data-testid="input-code-count" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <Button type="submit" disabled={generateMutation.isPending} className="w-full" data-testid="btn-generate-codes">
                {generateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Generate Codes
              </Button>
            </form>
          </Form>

          {generatedCodes.length > 0 && (
            <div className="mt-4 p-4 rounded-lg bg-[#1c1f26] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold">Generated Codes</span>
                <Button size="sm" variant="ghost" onClick={copyAll} className="gap-2" data-testid="btn-copy-codes">
                  <Copy className="h-4 w-4" /> Copy All
                </Button>
              </div>
              <div className="font-mono text-xs space-y-1 max-h-40 overflow-y-auto">
                {generatedCodes.map((c, i) => <div key={i} className="text-primary">{c}</div>)}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-[#16181d] border-white/5">
          <CardHeader><CardTitle className="text-sm uppercase tracking-widest">Available</CardTitle></CardHeader>
          <CardContent className="max-h-60 overflow-y-auto">
            <div className="space-y-2">
              {available.map((c: any) => (
                <div key={c.id} className="flex items-center justify-between p-2 rounded bg-[#1c1f26] text-sm">
                  <span className="font-mono text-primary text-xs">{c.code}</span>
                  <Badge>${(c.amount / 100).toFixed(2)}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#16181d] border-white/5">
          <CardHeader><CardTitle className="text-sm uppercase tracking-widest">Used</CardTitle></CardHeader>
          <CardContent className="max-h-60 overflow-y-auto">
            <div className="space-y-2">
              {used.map((c: any) => (
                <div key={c.id} className="flex items-center justify-between p-2 rounded bg-[#1c1f26] text-sm opacity-60">
                  <span className="font-mono text-xs">{c.code}</span>
                  <Badge variant="secondary">${(c.amount / 100).toFixed(2)}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function AnnouncementsSection() {
  const { data: announcements, isLoading } = useQuery({
    queryKey: ["/api/admin/announcements"],
    queryFn: async () => {
      const res = await fetch("/api/admin/announcements");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    }
  });
  const { toast } = useToast();

  const annSchema = z.object({
    content: z.string().min(1, "Required"),
    link: z.string().optional(),
    active: z.boolean().default(true),
  });

  const form = useForm<z.infer<typeof annSchema>>({
    resolver: zodResolver(annSchema),
    defaultValues: { content: "", link: "", active: true },
  });

  const createMutation = useMutation({
    mutationFn: async (data: z.infer<typeof annSchema>) => {
      await apiRequest("POST", "/api/admin/announcements", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/announcements"] });
      form.reset();
      toast({ title: "Announcement saved" });
    }
  });

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <h1 className="text-xl md:text-2xl font-display font-black tracking-tighter italic uppercase">Announcements</h1>

      <Card className="bg-[#16181d] border-white/5">
        <CardHeader><CardTitle className="text-sm uppercase tracking-widest">New Announcement</CardTitle></CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
              <FormField control={form.control} name="content" render={({ field }) => (
                <FormItem>
                  <FormLabel>Text</FormLabel>
                  <FormControl><Textarea {...field} rows={3} placeholder="Your announcement..." data-testid="textarea-announcement" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="link" render={({ field }) => (
                <FormItem>
                  <FormLabel>Link (optional)</FormLabel>
                  <FormControl><Input {...field} placeholder="https://..." data-testid="input-announcement-link" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="active" render={({ field }) => (
                <FormItem className="flex items-center gap-3">
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-announcement-active" /></FormControl>
                  <FormLabel className="!mt-0">Enable</FormLabel>
                </FormItem>
              )} />
              <Button type="submit" disabled={createMutation.isPending} className="w-full" data-testid="btn-save-announcement">
                {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {announcements?.map((a: any) => (
          <Card key={a.id} className="bg-[#16181d] border-white/5">
            <CardContent className="p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate">{a.content}</p>
                {a.link && <a href={a.link} className="text-sm text-primary truncate block">{a.link}</a>}
              </div>
              <Badge variant={a.active ? "default" : "secondary"}>{a.active ? "Active" : "Off"}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function GamesSection() {
  const { toast } = useToast();
  
  const gameSchema = z.object({
    diceDefaultLoseChance: z.string().default("50"),
    diceReductionPerPurchase: z.string().default("1"),
    diceMinLoseChance: z.string().default("30"),
  });

  const form = useForm<z.infer<typeof gameSchema>>({
    resolver: zodResolver(gameSchema),
    defaultValues: { diceDefaultLoseChance: "50", diceReductionPerPurchase: "1", diceMinLoseChance: "30" },
  });

  return (
    <div className="space-y-4 md:space-y-6">
      <h1 className="text-xl md:text-2xl font-display font-black tracking-tighter italic uppercase">Game Settings</h1>

      <Card className="bg-[#16181d] border-white/5">
        <CardHeader><CardTitle className="text-sm uppercase tracking-widest">Dice Game</CardTitle></CardHeader>
        <CardContent>
          <Form {...form}>
            <form className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField control={form.control} name="diceDefaultLoseChance" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Lose %</FormLabel>
                    <FormControl><Input {...field} type="number" data-testid="input-dice-lose" /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="diceReductionPerPurchase" render={({ field }) => (
                  <FormItem>
                    <FormLabel>% Reduction/Purchase</FormLabel>
                    <FormControl><Input {...field} type="number" data-testid="input-dice-reduction" /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="diceMinLoseChance" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Min Lose Cap</FormLabel>
                    <FormControl><Input {...field} type="number" data-testid="input-dice-min" /></FormControl>
                  </FormItem>
                )} />
              </div>
              <Button type="button" onClick={() => toast({ title: "Settings saved" })} className="w-full" data-testid="btn-save-games">
                Save Settings
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

function SupportSection() {
  const { toast } = useToast();
  
  const supportSchema = z.object({
    redirectUrl: z.string().min(1, "Required"),
    buttonLabel: z.string().optional(),
  });

  const form = useForm<z.infer<typeof supportSchema>>({
    resolver: zodResolver(supportSchema),
    defaultValues: { redirectUrl: "", buttonLabel: "Get Support" },
  });

  return (
    <div className="space-y-4 md:space-y-6">
      <h1 className="text-xl md:text-2xl font-display font-black tracking-tighter italic uppercase">Support Settings</h1>

      <Card className="bg-[#16181d] border-white/5">
        <CardHeader><CardTitle className="text-sm uppercase tracking-widest">Configuration</CardTitle></CardHeader>
        <CardContent>
          <Form {...form}>
            <form className="space-y-4">
              <FormField control={form.control} name="redirectUrl" render={({ field }) => (
                <FormItem>
                  <FormLabel>Support URL</FormLabel>
                  <FormControl><Input {...field} placeholder="https://discord.gg/..." data-testid="input-support-url" /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="buttonLabel" render={({ field }) => (
                <FormItem>
                  <FormLabel>Button Label</FormLabel>
                  <FormControl><Input {...field} placeholder="Get Support" data-testid="input-support-label" /></FormControl>
                </FormItem>
              )} />
              <Button type="button" onClick={() => toast({ title: "Settings saved" })} className="w-full" data-testid="btn-save-support">
                Save
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

function LogsSection() {
  const { data: logs, isLoading } = useQuery({
    queryKey: ["/api/admin/logs"],
    queryFn: async () => {
      const res = await fetch("/api/admin/logs");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    }
  });

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <h1 className="text-xl md:text-2xl font-display font-black tracking-tighter italic uppercase">Admin Logs</h1>

      <Card className="bg-[#16181d] border-white/5">
        <CardContent className="p-0">
          <div className="divide-y divide-white/5">
            {logs?.map((log: any, i: number) => (
              <div key={i} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <p className="font-medium">{log.action}</p>
                  <p className="text-sm text-muted-foreground font-mono">{log.target}</p>
                </div>
                <span className="text-xs text-muted-foreground">{new Date(log.createdAt).toLocaleString()}</span>
              </div>
            ))}
            {(!logs || logs.length === 0) && (
              <div className="p-8 text-center text-muted-foreground">No logs yet</div>
            )}
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-center">Logs are permanent and cannot be deleted</p>
    </div>
  );
}
