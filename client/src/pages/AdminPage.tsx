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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Plus, Trash2, Package, Users, DollarSign, ShoppingBag, LayoutDashboard, Receipt, UserCog, ShieldX, Menu, ChevronRight, Send, Mail } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const adminSections = [
  { id: "dashboard", label: "Dashboard" },
  { id: "products", label: "Products" },
  { id: "orders", label: "Orders" },
  { id: "users", label: "Users" },
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
  const { data: products, isLoading } = useProducts();

  const productSchema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    image: z.string().optional(),
  });

  const form = useForm<z.infer<typeof productSchema>>({
    resolver: zodResolver(productSchema),
    defaultValues: { name: "", description: "", image: "" },
  });

  const addMutation = useMutation({
    mutationFn: async (data: z.infer<typeof productSchema>) => {
      const res = await apiRequest("POST", api.products.create.path, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.products.list.path] });
      form.reset();
      setShowAddForm(false);
      toast({ title: "Product added" });
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

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-black tracking-tighter italic uppercase">Products</h1>
        <Button onClick={() => setShowAddForm(!showAddForm)} className="gap-2"><Plus className="h-4 w-4" />Add</Button>
      </div>

      {showAddForm && (
        <Card className="bg-[#0f1115] border-white/5">
          <CardContent className="p-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit((d) => addMutation.mutate(d))} className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Name</FormLabel>
                    <FormControl><Input {...field} className="bg-black/50 border-white/10" /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl><Textarea {...field} className="bg-black/50 border-white/10" /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="image" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Image URL</FormLabel>
                    <FormControl><Input {...field} className="bg-black/50 border-white/10" /></FormControl>
                  </FormItem>
                )} />
                <Button type="submit" className="w-full" disabled={addMutation.isPending}>
                  {addMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      <div className="bg-[#0f1115] border border-white/5 rounded-lg overflow-hidden">
        <Table>
          <TableHeader className="bg-white/5">
            <TableRow className="hover:bg-transparent border-white/5">
              <TableHead className="text-xs font-bold uppercase text-muted-foreground">Name</TableHead>
              <TableHead className="text-xs font-bold uppercase text-muted-foreground">Image</TableHead>
              <TableHead className="text-right text-xs font-bold uppercase text-muted-foreground">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products?.map((product: any) => (
              <TableRow key={product.id} className="border-white/5 hover:bg-white/5">
                <TableCell className="font-bold">{product.name}</TableCell>
                <TableCell>{product.image ? <Badge>Has Image</Badge> : "—"}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => {
                    if (confirm("Delete?")) deleteMutation.mutate(product.id);
                  }} disabled={deleteMutation.isPending}>
                    <Trash2 className="h-4 w-4" />
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
      const res = await apiRequest("POST", api.admin.deliverOrder.path.replace(":id", selectedOrder.id.toString()), {
        deliveryContent
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
      setSelectedOrder(null);
      setDeliveryContent("");
      toast({ title: "Order delivered" });
    }
  });

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" /></div>;

  if (selectedOrder) {
    return (
      <div className="space-y-6">
        <Button variant="outline" onClick={() => setSelectedOrder(null)}>← Back</Button>
        
        <Card className="bg-[#0f1115] border-white/5">
          <CardHeader>
            <CardTitle>Order #{selectedOrder.orderId}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase">Status</p>
                <Badge className={selectedOrder.status === "fulfilled" ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"}>
                  {selectedOrder.status}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase">Total</p>
                <p className="font-bold">${(selectedOrder.total / 100).toFixed(2)}</p>
              </div>
            </div>

            {selectedOrder.status === "delivering" && (
              <div className="space-y-4 border-t border-white/5 pt-4">
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-2">Paste Items Below</label>
                  <Textarea
                    value={deliveryContent}
                    onChange={(e) => setDeliveryContent(e.target.value)}
                    placeholder="Paste all items here..."
                    className="bg-black/50 border-white/10 min-h-32 font-mono text-xs"
                  />
                </div>
                <Button
                  onClick={() => deliverMutation.mutate()}
                  disabled={deliverMutation.isPending || !deliveryContent}
                  className="w-full gap-2"
                >
                  {deliverMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Send Items
                </Button>
              </div>
            )}

            {selectedOrder.status === "fulfilled" && selectedOrder.deliveryContent && (
              <div className="border-t border-white/5 pt-4 space-y-2">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Delivered Items</p>
                <div className="bg-black/30 p-3 rounded border border-white/5 text-sm font-mono whitespace-pre-wrap text-xs">
                  {selectedOrder.deliveryContent}
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
      <div className="bg-[#0f1115] border border-white/5 rounded-lg overflow-hidden">
        <Table>
          <TableHeader className="bg-white/5">
            <TableRow className="hover:bg-transparent border-white/5">
              <TableHead className="text-xs font-bold uppercase">Order ID</TableHead>
              <TableHead className="text-xs font-bold uppercase">Total</TableHead>
              <TableHead className="text-xs font-bold uppercase">Status</TableHead>
              <TableHead className="text-right text-xs font-bold uppercase">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders?.map((order: any) => (
              <TableRow key={order.id} className="border-white/5 hover:bg-white/5">
                <TableCell className="font-mono text-xs">{order.orderId}</TableCell>
                <TableCell className="font-bold">${(order.total / 100).toFixed(2)}</TableCell>
                <TableCell>
                  <Badge className={
                    order.status === "delivering" ? "bg-blue-500/20 text-blue-400" :
                    order.status === "fulfilled" ? "bg-green-500/20 text-green-400" :
                    "bg-yellow-500/20 text-yellow-400"
                  }>
                    {order.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => setSelectedOrder(order)}>View</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
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
                <TableCell className="font-bold">{user.username}</TableCell>
                <TableCell className="text-xs">{user.email}</TableCell>
                <TableCell className="text-xs">{user.telegramUsername}</TableCell>
                <TableCell>
                  <Badge variant={user.isBanned ? "destructive" : "default"} className={user.isBanned ? "bg-red-500/20 text-red-400 border-none" : "bg-green-500/20 text-green-400 border-none"}>
                    {user.isBanned ? "Banned" : "Active"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {user.isBanned ? (
                    <Button variant="ghost" size="sm" className="text-green-400" onClick={() => {
                      if (confirm("Unban?")) unbanMutation.mutate(user.id);
                    }} disabled={unbanMutation.isPending}>
                      Unban
                    </Button>
                  ) : (
                    <Button variant="ghost" size="sm" className="text-red-400" onClick={() => {
                      if (confirm("Ban?")) banMutation.mutate(user.id);
                    }} disabled={banMutation.isPending}>
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
