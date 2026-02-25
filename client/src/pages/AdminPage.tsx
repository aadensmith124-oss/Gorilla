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
  RefreshCw, Eye, EyeOff, Search, Check, Menu, X, Edit2, Upload, ImageIcon
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { useLocation } from "wouter";
import { useState, useEffect, useRef } from "react";
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
  { id: "cards", label: "Manage Cards", icon: CreditCard },
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
            8765 <span className="text-primary">Admin</span>
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
          {activeSection === "cards" && <AdminCardsSection />}
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

function AdminCardsSection() {
  const { toast } = useToast();
  const [showAddForm, setShowAddForm] = useState(false);
  
  const { data: cards, isLoading } = useQuery<any[]>({
    queryKey: ["/api/cards/all"], // Admin view might need all cards including sold
    queryFn: async () => {
      const res = await fetch("/api/cards"); // For now just reuse public one or add admin route
      return res.json();
    }
  });

  const cardSchema = z.object({
    cardNumber: z.string().min(16, "Invalid card number"),
    expiry: z.string().min(5, "MM/YY format"),
    cvv: z.string().min(3, "Invalid CVV"),
    price: z.string().min(1, "Required"),
    isFirstHand: z.boolean().default(false),
  });

  const form = useForm<z.infer<typeof cardSchema>>({
    resolver: zodResolver(cardSchema),
    defaultValues: { cardNumber: "", expiry: "", cvv: "", price: "7.00", isFirstHand: false },
  });

  const addMutation = useMutation({
    mutationFn: async (data: z.infer<typeof cardSchema>) => {
      // BIN lookup simulation
      const bin = data.cardNumber.substring(0, 6);
      const country = bin.startsWith("4") ? "USA" : "UK"; // Basic mock
      const maskedCard = `${data.cardNumber.substring(0, 4)} ******`;
      
      await apiRequest("POST", "/api/cards", {
        ...data,
        country,
        maskedCard,
        price: Math.round(parseFloat(data.price) * 100),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cards/all"] });
      form.reset();
      setShowAddForm(false);
      toast({ title: "Card added successfully" });
    }
  });

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-display font-black tracking-tighter italic uppercase">Card Management</h1>
        <Button onClick={() => setShowAddForm(!showAddForm)} className="gap-2">
          <Plus className="h-4 w-4" /> Add Card
        </Button>
      </div>

      {showAddForm && (
        <Card className="bg-[#16181d] border-white/5">
          <CardContent className="p-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit((d) => addMutation.mutate(d))} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField control={form.control} name="cardNumber" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Card Number</FormLabel>
                      <FormControl><Input {...field} placeholder="4003..." /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="expiry" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expiry (MM/YY)</FormLabel>
                      <FormControl><Input {...field} placeholder="12/26" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="cvv" render={({ field }) => (
                    <FormItem>
                      <FormLabel>CVV</FormLabel>
                      <FormControl><Input {...field} placeholder="123" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="price" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price ($)</FormLabel>
                      <FormControl><Input {...field} type="number" step="0.01" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="isFirstHand" render={({ field }) => (
                    <FormItem className="flex items-center justify-between p-3 rounded-md bg-black/20 border border-white/5 mt-8">
                      <FormLabel className="!mt-0">First Hand</FormLabel>
                      <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    </FormItem>
                  )} />
                </div>
                <Button type="submit" className="w-full" disabled={addMutation.isPending}>
                  {addMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Card
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      <div className="bg-[#16181d] border border-white/5 rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-white/5">
              <TableHead>Card</TableHead>
              <TableHead>Country</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cards?.map((card) => (
              <TableRow key={card.id} className="border-white/5">
                <TableCell className="font-mono">{card.maskedCard}</TableCell>
                <TableCell>{card.country}</TableCell>
                <TableCell>${(card.price / 100).toFixed(2)}</TableCell>
                <TableCell>
                  <Badge variant={card.isSold ? "secondary" : "default"}>
                    {card.isSold ? "Sold" : "Active"}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
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
    <Card className="bg-[#16181d] border-white/5 shadow-lg shadow-black/20">
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2 p-3 md:p-4">
        <CardTitle className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-muted-foreground">{title}</CardTitle>
        <div className={`p-1.5 rounded-md bg-white/5 ${colorClasses[color]}`}>
          <Icon className="h-3.5 w-3.5 md:h-4 md:w-4" />
        </div>
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
  const [imagePreview, setImagePreview] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = (event.target?.result as string).split(',')[1];
        const res = await apiRequest("POST", "/api/upload", {
          filename: file.name,
          mimeType: file.type,
          data: base64,
        });
        const data = await res.json();
        form.setValue("image", data.url);
        setImagePreview(data.url);
        toast({ title: "Image uploaded" });
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      toast({ title: "Upload failed", variant: "destructive" });
      setIsUploading(false);
    }
  };

  const createMutation = useMutation({
    mutationFn: async (data: z.infer<typeof productSchema>) => {
      await apiRequest("POST", api.products.create.path, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/products"] });
      queryClient.invalidateQueries({ queryKey: [api.products.list.path] });
      form.reset();
      setShowForm(false);
      setImagePreview("");
      toast({ title: "Product created" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to create product", description: err.message, variant: "destructive" });
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
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Name</FormLabel>
                    <FormControl><Input {...field} placeholder="Netflix Premium" data-testid="input-product-name" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                
                <FormField control={form.control} name="image" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Image</FormLabel>
                    <div className="space-y-3">
                      <input
                        type="file"
                        accept="image/*"
                        ref={fileInputRef}
                        onChange={handleImageUpload}
                        className="hidden"
                        data-testid="input-product-image-file"
                      />
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploading}
                          className="flex-1 gap-2"
                          data-testid="btn-upload-image"
                        >
                          {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                          {isUploading ? "Uploading..." : "Upload from Gallery"}
                        </Button>
                      </div>
                      {(imagePreview || field.value) && (
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-[#1c1f26]">
                          <img src={imagePreview || field.value} className="h-12 w-12 rounded object-contain bg-[#0f1115] p-1" />
                          <span className="text-sm text-muted-foreground truncate flex-1">{field.value}</span>
                          <Check className="h-4 w-4 text-green-500" />
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground">Or enter URL directly:</div>
                      <Input {...field} placeholder="https://..." data-testid="input-product-image-url" />
                    </div>
                    <FormMessage />
                  </FormItem>
                )} />

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
                  <div className="h-10 w-10 rounded bg-[#0f1115] overflow-hidden flex-shrink-0">
                      <img src={p.image} className="h-full w-full object-cover" />
                    </div>
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
  const [editingVariant, setEditingVariant] = useState<any>(null);
  const [selectedVariantForStock, setSelectedVariantForStock] = useState<number | null>(null);
  const [newStockContent, setNewStockContent] = useState("");
  const [isBulkAdding, setIsBulkAdding] = useState(false);

  const { data: stockItems, refetch: refetchStock } = useQuery({
    queryKey: ["/api/admin/stock", selectedVariantForStock],
    queryFn: async () => {
      if (!selectedVariantForStock) return [];
      const res = await fetch(`/api/admin/stock/${selectedVariantForStock}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!selectedVariantForStock,
  });

  const optionSchema = z.object({
    name: z.string().min(1, "Required"),
    price: z.string().min(1, "Required"),
  });

  const optionForm = useForm<z.infer<typeof optionSchema>>({
    resolver: zodResolver(optionSchema),
    defaultValues: { name: "", price: "" },
  });

  const deleteProductMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/admin/products/${product.id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/products"] });
      queryClient.invalidateQueries({ queryKey: [api.products.list.path] });
      toast({ title: "Product deleted" });
      onClose();
    }
  });

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

  const updateVariantMutation = useMutation({
    mutationFn: async ({ id, name, price }: { id: number; name: string; price: number }) => {
      await apiRequest("PATCH", `/api/admin/variants/${id}`, { name, price });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/products"] });
      queryClient.invalidateQueries({ queryKey: [api.products.list.path] });
      setEditingVariant(null);
      toast({ title: "Option updated" });
    }
  });

  const deleteVariantMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/admin/variants/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/products"] });
      queryClient.invalidateQueries({ queryKey: [api.products.list.path] });
      toast({ title: "Option deleted" });
    }
  });

  const addStockMutation = useMutation({
    mutationFn: async () => {
      if (isBulkAdding) {
        const lines = newStockContent.split('\n').filter(line => line.trim() !== '');
        for (const line of lines) {
          await apiRequest("POST", "/api/admin/stock", {
            variantId: selectedVariantForStock,
            content: line.trim(),
          });
        }
      } else {
        await apiRequest("POST", "/api/admin/stock", {
          variantId: selectedVariantForStock,
          content: newStockContent,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/products"] });
      queryClient.invalidateQueries({ queryKey: [api.products.list.path] });
      refetchStock();
      setNewStockContent("");
      toast({ title: isBulkAdding ? "Bulk stock items added" : "Stock item added" });
    }
  });

  const deleteStockMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/admin/stock/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/products"] });
      queryClient.invalidateQueries({ queryKey: [api.products.list.path] });
      refetchStock();
      toast({ title: "Stock item removed" });
    }
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg bg-[#16181d] border-white/10 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="h-10 w-10 rounded bg-[#0f1115] overflow-hidden flex-shrink-0">
              <img src={product.image} className="h-full w-full object-cover" />
            </div>
            {product.name}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="options">Options</TabsTrigger>
            <TabsTrigger value="stock">Stock</TabsTrigger>
          </TabsList>

          <TabsContent value="options" className="space-y-4 mt-4">
            {product.variants?.length > 0 && (
              <div className="space-y-2">
                {product.variants.map((v: any) => (
                  <div key={v.id} className="p-3 rounded-lg bg-[#1c1f26]">
                    {editingVariant?.id === v.id ? (
                      <div className="space-y-3">
                        <Input 
                          value={editingVariant.name} 
                          onChange={(e) => setEditingVariant({ ...editingVariant, name: e.target.value })}
                          placeholder="Name"
                        />
                        <Input 
                          type="number" 
                          step="0.01"
                          value={(editingVariant.price / 100).toFixed(2)} 
                          onChange={(e) => setEditingVariant({ ...editingVariant, price: Math.round(parseFloat(e.target.value) * 100) })}
                          placeholder="Price"
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => updateVariantMutation.mutate(editingVariant)} disabled={updateVariantMutation.isPending}>
                            {updateVariantMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingVariant(null)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{v.name}</p>
                          <p className="text-xs text-muted-foreground">{v.stockCount} in stock</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-green-500">${(v.price / 100).toFixed(2)}</Badge>
                          <Button size="icon" variant="ghost" onClick={() => setEditingVariant({ ...v })} data-testid={`btn-edit-variant-${v.id}`}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => deleteVariantMutation.mutate(v.id)} data-testid={`btn-delete-variant-${v.id}`}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    )}
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

            <Button variant="destructive" className="w-full" onClick={() => deleteProductMutation.mutate()} disabled={deleteProductMutation.isPending} data-testid="btn-delete-product">
              {deleteProductMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Trash2 className="mr-2 h-4 w-4" /> Delete Product
            </Button>
          </TabsContent>

          <TabsContent value="stock" className="space-y-4 mt-4">
            <div className="p-4 bg-[#1c1f26] rounded-lg space-y-4 border border-white/5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Manage Stock</h3>
              </div>
              
              <div className="space-y-4">
                <Select onValueChange={(v) => setSelectedVariantForStock(parseInt(v))} value={selectedVariantForStock?.toString() || ""}>
                  <SelectTrigger data-testid="select-stock-variant" className="bg-[#0f1115] border-white/5">
                    <SelectValue placeholder="Select option" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1c1f26] border-white/10 text-white">
                    {product.variants?.map((v: any) => (
                      <SelectItem key={v.id} value={v.id.toString()}>{v.name} ({v.stockCount})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">Add Stock</div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Bulk Mode</span>
                    <Switch checked={isBulkAdding} onCheckedChange={setIsBulkAdding} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Textarea 
                    placeholder={isBulkAdding ? "Enter one item per line..." : "Enter item content..."}
                    value={newStockContent}
                    onChange={(e) => setNewStockContent(e.target.value)}
                    rows={isBulkAdding ? 6 : 3}
                    className="bg-[#0f1115] border-white/5 font-mono text-xs"
                  />
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>Stock in database: {stockItems?.length || 0}</span>
                  </div>
                </div>

                <Button 
                  onClick={() => addStockMutation.mutate()} 
                  disabled={addStockMutation.isPending || !newStockContent.trim() || !selectedVariantForStock}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase italic tracking-tighter"
                >
                  {addStockMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : (isBulkAdding ? "Bulk Add Items" : "Add Stock")}
                </Button>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1 border-purple-500/30 text-purple-400">Copy all as text</Button>
              <Button variant="outline" size="sm" className="flex-1 border-purple-500/30 text-purple-400">Export to CSV</Button>
            </div>

            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Status</p>
              <div className="flex gap-2 p-1 bg-white/5 rounded-lg w-fit">
                <Button size="sm" variant="secondary" className="h-7 text-[10px] uppercase font-bold">Available</Button>
                <Button size="sm" variant="ghost" className="h-7 text-[10px] uppercase font-bold text-muted-foreground">Sold</Button>
                <Button size="sm" variant="ghost" className="h-7 text-[10px] uppercase font-bold text-muted-foreground">All</Button>
              </div>
            </div>

            <div className="space-y-4">
              {selectedVariantForStock && (
                <div className="space-y-2">
                  <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Current Stock ({stockItems?.length || 0})</p>
                  {stockItems?.map((item: any) => (
                    <div key={item.id} className="flex items-start justify-between p-3 rounded-lg bg-[#1c1f26] gap-2">
                      <pre className="text-xs font-mono whitespace-pre-wrap break-all flex-1">{item.content}</pre>
                      <Button size="icon" variant="ghost" onClick={() => deleteStockMutation.mutate(item.id)} data-testid={`btn-delete-stock-${item.id}`}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                  {(!stockItems || stockItems.length === 0) && (
                    <p className="text-sm text-muted-foreground text-center py-4">No stock items</p>
                  )}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function OrdersSection() {
  const [orderIdSearch, setOrderIdSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const { data: orders, isLoading } = useQuery({
    queryKey: ["/api/admin/orders"],
    queryFn: async () => {
      const res = await fetch("/api/admin/orders");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    }
  });

  const filteredOrders = orders?.filter((o: any) => {
    const matchesId = orderIdSearch ? o.id.toString().toLowerCase().includes(orderIdSearch.toLowerCase()) : true;
    const matchesStatus = statusFilter === "all" ? true : o.status === statusFilter;
    return matchesId && matchesStatus;
  });

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-display font-black tracking-tighter italic uppercase text-primary">Orders</h1>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
             <span className="text-blue-500 font-bold text-sm uppercase italic">{filteredOrders?.length || 0} Orders Found</span>
          </div>
          <div className="relative group">
            <Input 
              placeholder="order-id1,order-id2,order-id3,..." 
              value={orderIdSearch}
              onChange={(e) => setOrderIdSearch(e.target.value)}
              className="bg-[#16181d] border-white/5 pr-20 uppercase font-mono text-xs"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground uppercase">Order ID</div>
          </div>
          <div className="relative">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="bg-[#16181d] border-white/5 text-xs font-bold uppercase">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-[#16181d] border-white/10 text-white">
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="paid">Fulfilled</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>
            <div className="absolute right-10 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground uppercase pointer-events-none">Status</div>
          </div>
        </div>

        <Card className="bg-[#16181d] border-white/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[10px] md:text-xs uppercase font-bold tracking-tight">
              <thead>
                <tr className="border-b border-white/5 text-muted-foreground">
                  <th className="p-3 text-left">Paid</th>
                  <th className="p-3 text-left">Expected</th>
                  <th className="p-3 text-left">Status</th>
                  <th className="p-3 text-left">Date</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders?.map((o: any) => (
                  <tr key={o.id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                    <td className="p-3 text-white">${(o.total / 100).toFixed(2)}</td>
                    <td className="p-3 text-white">${(o.total / 100).toFixed(2)}</td>
                    <td className="p-3">
                      <span className={o.status === 'paid' ? 'text-green-500' : 'text-orange-500'}>
                        {o.status === 'paid' ? 'Fulfilled' : o.status.charAt(0).toUpperCase() + o.status.slice(1)}
                      </span>
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {new Date(o.createdAt).toLocaleString()}
                    </td>
                    <td className="p-3 text-right">
                      <AdminOrderDetailsSheet order={o} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}

function AdminOrderDetailsSheet({ order }: { order: any }) {
  const [activeTab, setActiveTab] = useState("info");
  const { toast } = useToast();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!" });
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="h-6 w-6 text-primary">
          <Eye className="h-3 w-3" />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md bg-[#0d0f12] border-l border-white/5 text-white p-0">
        <div className="p-6 space-y-6 h-full flex flex-col">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-display font-black tracking-tighter italic uppercase">Order info</h2>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1">
            <TabsList className="w-full bg-transparent border-b border-white/5 rounded-none p-0 h-auto gap-8">
              <TabsTrigger 
                value="info" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 py-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground data-[state=active]:text-blue-500"
              >
                Info
              </TabsTrigger>
              <TabsTrigger 
                value="products" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 py-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground data-[state=active]:text-blue-500"
              >
                Products
              </TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="pt-6 space-y-4">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">ID</p>
                <p className="text-xs font-mono break-all">{order.id}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Creation date</p>
                <p className="text-xs">{new Date(order.createdAt).toLocaleString()}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Reason</p>
                <p className="text-xs">cart</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Expected amount</p>
                <p className="text-xs">${(order.total / 100).toFixed(2)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Paid amount</p>
                <p className="text-xs">${(order.total / 100).toFixed(2)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Status</p>
                <p className="text-xs text-green-500 font-bold">{order.status === 'paid' ? 'fulfilled' : order.status}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Logs</p>
                <p className="text-xs text-muted-foreground italic">no log</p>
              </div>
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black uppercase italic tracking-tighter text-xs h-10 mt-4">
                Order Url
              </Button>
            </TabsContent>

            <TabsContent value="products" className="pt-6 space-y-6 overflow-y-auto max-h-[60vh]">
              {order.items?.map((item: any, idx: number) => (
                <div key={idx} className="space-y-4 border-b border-white/5 pb-6 last:border-0">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Product</p>
                    <p className="text-xs font-bold">{item.variant?.product?.name}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Option</p>
                    <p className="text-xs font-bold">{item.variant?.name}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Quantity</p>
                    <p className="text-xs font-bold">1</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Unit price</p>
                    <p className="text-xs font-bold">${(item.price / 100).toFixed(2)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Total</p>
                    <p className="text-xs font-bold">${(item.price / 100).toFixed(2)}</p>
                  </div>
                  <Button 
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black uppercase italic tracking-tighter text-xs h-10"
                    onClick={() => item.stockItem && copyToClipboard(item.stockItem.content)}
                  >
                    View stock
                  </Button>
                </div>
              ))}
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
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

  const banMutation = useMutation({
    mutationFn: async ({ userId, banned }: { userId: number; banned: boolean }) => {
      await apiRequest("PATCH", `/api/admin/users/${userId}`, { isBanned: banned });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "User status updated" });
    }
  });

  const filtered = users?.filter((u: any) => 
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    (u.email && u.email.toLowerCase().includes(search.toLowerCase()))
  ) || [];

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <h1 className="text-xl md:text-2xl font-display font-black tracking-tighter italic uppercase text-primary">Users</h1>
      
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 bg-[#16181d] border-white/5" />
      </div>

      <div className="space-y-3">
        {filtered.map((u: any) => (
          <Card key={u.id} className="bg-[#16181d] border-white/5">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold truncate text-white">{u.username}</p>
                  <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Joined: {new Date(u.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-[10px] font-bold uppercase">{u.role}</Badge>
                  <Badge variant={u.isBanned ? "destructive" : "default"} className="text-[10px] font-bold uppercase">
                    {u.isBanned ? "Banned" : "Active"}
                  </Badge>
                  <Button 
                    size="sm" 
                    variant="destructive" 
                    className="h-8 gap-2 font-bold uppercase italic text-[10px]"
                    onClick={() => banMutation.mutate({ userId: u.id, banned: !u.isBanned })}
                  >
                    <Ban className="h-3.5 w-3.5" />
                    {u.isBanned ? "Unban" : "Ban"}
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
