import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Briefcase, Package, ShoppingBag, Plus, Trash2, ChevronRight, Loader2, ShieldX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const TABS = [
  { id: "products", label: "Products & Stock" },
  { id: "orders", label: "Orders" },
];

function statusLabel(s: string) {
  const map: Record<string, string> = {
    pending: "Pending",
    fulfilled: "Fulfilled",
    delivering: "Delivered",
    refunded: "Refunded",
    waiting_payment: "Awaiting Payment",
    replaced: "Replaced",
  };
  return map[s] || s;
}

function statusClass(s: string) {
  if (s === "fulfilled" || s === "delivering" || s === "replaced")
    return "bg-green-500/20 text-green-400 border-green-500/30";
  if (s === "pending") return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
  if (s === "refunded") return "bg-blue-500/20 text-blue-400 border-blue-500/30";
  if (s === "waiting_payment") return "bg-red-500/20 text-red-400 border-red-500/30";
  return "bg-white/10 text-white/50 border-white/10";
}

function StockPanel({ variantId, variantName }: { variantId: number; variantName: string }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [rawContent, setRawContent] = useState("");

  const { data: stockItems = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/stock", variantId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/stock/${variantId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const addStockMutation = useMutation({
    mutationFn: async () => {
      if (!rawContent.trim()) throw new Error("No content");
      const res = await apiRequest("POST", "/api/admin/stock/bulk", { variantId, rawContent: rawContent.trim() });
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: `Added ${data.addedCount} items (${data.skippedCount} duplicates skipped)` });
      setRawContent("");
      qc.invalidateQueries({ queryKey: ["/api/admin/stock", variantId] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteStockMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/admin/stock/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/stock", variantId] }),
  });

  const available = stockItems.filter((i: any) => !i.isSold && !i.isReserved);

  return (
    <div className="space-y-3 pt-3 border-t border-white/5">
      <p className="text-[10px] text-white/40 uppercase tracking-widest font-mono">
        Stock for {variantName} — {available.length} available
      </p>
      <textarea
        value={rawContent}
        onChange={e => setRawContent(e.target.value)}
        placeholder={"item1_line1\nitem1_line2\n\nitem2_line1\n\n(blank line = new item)"}
        rows={5}
        className="w-full bg-black/40 border border-white/10 rounded text-xs text-white font-mono p-2 outline-none focus:border-white/20 resize-none placeholder:text-white/20"
        data-testid={`textarea-stock-${variantId}`}
      />
      <Button
        size="sm"
        className="w-full h-8 text-xs"
        onClick={() => addStockMutation.mutate()}
        disabled={addStockMutation.isPending || !rawContent.trim()}
        data-testid={`btn-add-stock-${variantId}`}
      >
        {addStockMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
        Add Stock Items
      </Button>
      {isLoading ? (
        <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-white/30" /></div>
      ) : available.length === 0 ? (
        <p className="text-xs text-white/25 text-center py-3 font-mono">No stock items</p>
      ) : (
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {available.slice(0, 30).map((item: any) => (
            <div key={item.id} className="flex items-center justify-between bg-black/30 border border-white/5 rounded px-2.5 py-1.5 group">
              <p className="text-[10px] font-mono text-white/50 truncate flex-1">{item.content?.substring(0, 60)}...</p>
              <button
                onClick={() => deleteStockMutation.mutate(item.id)}
                className="ml-2 text-white/20 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
                data-testid={`btn-delete-stock-${item.id}`}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
          {available.length > 30 && <p className="text-[10px] text-white/25 text-center font-mono">+ {available.length - 30} more</p>}
        </div>
      )}
    </div>
  );
}

function ProductsTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [expandedProduct, setExpandedProduct] = useState<number | null>(null);
  const [expandedVariant, setExpandedVariant] = useState<number | null>(null);
  const [showNewProduct, setShowNewProduct] = useState(false);
  const [showNewVariant, setShowNewVariant] = useState<number | null>(null);
  const [newProductName, setNewProductName] = useState("");
  const [newProductDesc, setNewProductDesc] = useState("");
  const [newVariantName, setNewVariantName] = useState("");
  const [newVariantPrice, setNewVariantPrice] = useState("");

  const { data: products = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/products"],
    queryFn: async () => {
      const res = await fetch("/api/admin/products", { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const createProductMutation = useMutation({
    mutationFn: async () => {
      if (!newProductName.trim()) throw new Error("Name required");
      const res = await apiRequest("POST", "/api/products", {
        name: newProductName.trim(),
        description: newProductDesc.trim(),
        active: true,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Product created" });
      setNewProductName(""); setNewProductDesc(""); setShowNewProduct(false);
      qc.invalidateQueries({ queryKey: ["/api/admin/products"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const createVariantMutation = useMutation({
    mutationFn: async (productId: number) => {
      if (!newVariantName.trim() || !newVariantPrice) throw new Error("Name and price required");
      const price = Math.round(parseFloat(newVariantPrice) * 100);
      const res = await apiRequest("POST", "/api/variants", { productId, name: newVariantName.trim(), price });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Variant created" });
      setNewVariantName(""); setNewVariantPrice(""); setShowNewVariant(null);
      qc.invalidateQueries({ queryKey: ["/api/admin/products"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-white">Products ({products.length})</h2>
        <Button size="sm" className="h-7 text-xs gap-1" onClick={() => setShowNewProduct(v => !v)} data-testid="btn-new-product">
          <Plus className="h-3.5 w-3.5" />New Product
        </Button>
      </div>

      {showNewProduct && (
        <div className="bg-[#0f1115] border border-white/8 rounded-xl p-4 space-y-3">
          <p className="text-xs font-bold text-white/60 uppercase tracking-widest">New Product</p>
          <Input
            placeholder="Product name"
            value={newProductName}
            onChange={e => setNewProductName(e.target.value)}
            className="bg-black/50 border-white/10 h-8 text-sm"
            data-testid="input-product-name"
          />
          <Input
            placeholder="Description (optional)"
            value={newProductDesc}
            onChange={e => setNewProductDesc(e.target.value)}
            className="bg-black/50 border-white/10 h-8 text-sm"
            data-testid="input-product-desc"
          />
          <div className="flex gap-2">
            <Button size="sm" className="flex-1 h-8 text-xs" onClick={() => createProductMutation.mutate()} disabled={createProductMutation.isPending || !newProductName.trim()}>
              {createProductMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Create"}
            </Button>
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setShowNewProduct(false)}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {products.map((product: any) => {
          const isExpanded = expandedProduct === product.id;
          const totalStock = product.variants?.reduce((sum: number, v: any) => sum + (v.stockCount || 0), 0) ?? 0;
          return (
            <div key={product.id} className="bg-[#0f1115] border border-white/5 rounded-xl overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors"
                onClick={() => setExpandedProduct(isExpanded ? null : product.id)}
                data-testid={`btn-product-${product.id}`}
              >
                <div className="flex items-center gap-3 text-left">
                  <Package className="h-4 w-4 text-white/30 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-white">{product.name}</p>
                    <p className="text-[10px] text-white/30 font-mono mt-0.5">
                      {product.variants?.length ?? 0} variants · {totalStock} in stock
                    </p>
                  </div>
                </div>
                <ChevronRight className={`h-4 w-4 text-white/20 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 space-y-3 border-t border-white/5">
                  {/* Variants */}
                  <div className="space-y-2 pt-3">
                    {(product.variants || []).map((variant: any) => {
                      const isVariantExpanded = expandedVariant === variant.id;
                      return (
                        <div key={variant.id} className="bg-black/30 border border-white/5 rounded-lg overflow-hidden">
                          <button
                            className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-white/5 transition-colors"
                            onClick={() => setExpandedVariant(isVariantExpanded ? null : variant.id)}
                            data-testid={`btn-variant-${variant.id}`}
                          >
                            <div className="text-left">
                              <p className="text-xs font-bold text-white">{variant.name}</p>
                              <p className="text-[10px] text-white/30 font-mono">
                                ${(variant.price / 100).toFixed(2)} · {variant.stockCount} in stock
                              </p>
                            </div>
                            <ChevronRight className={`h-3.5 w-3.5 text-white/20 transition-transform ${isVariantExpanded ? "rotate-90" : ""}`} />
                          </button>
                          {isVariantExpanded && (
                            <div className="px-3 pb-3">
                              <StockPanel variantId={variant.id} variantName={variant.name} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* New Variant */}
                  {showNewVariant === product.id ? (
                    <div className="space-y-2 pt-1">
                      <p className="text-[10px] text-white/40 uppercase tracking-widest font-mono">New Variant</p>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Variant name"
                          value={newVariantName}
                          onChange={e => setNewVariantName(e.target.value)}
                          className="flex-1 bg-black/50 border-white/10 h-8 text-xs"
                          data-testid="input-variant-name"
                        />
                        <Input
                          placeholder="Price $"
                          type="number"
                          step="0.01"
                          value={newVariantPrice}
                          onChange={e => setNewVariantPrice(e.target.value)}
                          className="w-24 bg-black/50 border-white/10 h-8 text-xs"
                          data-testid="input-variant-price"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" className="flex-1 h-7 text-xs" onClick={() => createVariantMutation.mutate(product.id)} disabled={createVariantMutation.isPending}>
                          {createVariantMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Add Variant"}
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowNewVariant(null)}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setShowNewVariant(product.id); setNewVariantName(""); setNewVariantPrice(""); }}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 border border-dashed border-white/10 rounded text-xs text-white/30 hover:text-white hover:border-white/20 transition-colors"
                      data-testid={`btn-add-variant-${product.id}`}
                    >
                      <Plus className="h-3 w-3" /> Add Variant
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OrdersTab() {
  const [search, setSearch] = useState("");

  const { data: orders = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/orders"],
    queryFn: async () => {
      const res = await fetch("/api/admin/orders", { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    refetchInterval: 15000,
  });

  const filtered = orders.filter((o: any) =>
    !search ||
    o.orderId?.toLowerCase().includes(search.toLowerCase()) ||
    o.user?.username?.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-white">Orders ({orders.length})</h2>
      </div>
      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search by order ID or username..."
        className="w-full h-8 bg-[#111] border border-white/8 rounded px-3 text-xs text-white placeholder:text-white/25 outline-none"
        data-testid="input-orders-search"
      />
      <div className="space-y-1.5">
        {filtered.slice(0, 50).map((order: any) => (
          <div
            key={order.id}
            className="bg-[#0f1115] border border-white/5 rounded-xl px-3 py-2.5"
            data-testid={`row-order-${order.id}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <Badge className={`text-[10px] flex-shrink-0 ${statusClass(order.status)}`}>{statusLabel(order.status)}</Badge>
                <p className="text-xs font-mono text-white/50 truncate">{order.orderId}</p>
              </div>
              <span className="text-xs font-mono text-white flex-shrink-0 ml-2">
                {order.total > 0 ? `$${(order.total / 100).toFixed(2)}` : "—"}
              </span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <p className="text-[10px] text-white/30 font-mono">
                {order.user?.username || order.userId} · {order.paymentMethod || "—"}
              </p>
              <p className="text-[10px] text-white/20 font-mono">
                {new Date(order.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-xs text-white/25 py-8 font-mono">No orders found</p>
        )}
      </div>
    </div>
  );
}

export default function WorkerDashboardPage() {
  const { user, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("products");

  if (isLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const isWorkerOrAdmin = (user as any)?.isWorker || user?.role === "admin";

  if (!isWorkerOrAdmin) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <ShieldX className="h-14 w-14 text-destructive" />
        <h1 className="text-lg font-bold text-white">Access Denied</h1>
        <p className="text-xs text-white/40">Worker access required</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-600/30 flex items-center justify-center">
          <Briefcase className="h-4 w-4 text-blue-400" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-white">Worker Dashboard</h1>
          <p className="text-[10px] text-white/30 font-mono">@{user?.username}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/5 rounded-lg p-1">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded text-xs font-semibold transition-colors ${
              activeTab === tab.id ? "bg-white/10 text-white" : "text-white/40 hover:text-white/70"
            }`}
            data-testid={`tab-${tab.id}`}
          >
            {tab.id === "products" ? <Package className="h-3.5 w-3.5" /> : <ShoppingBag className="h-3.5 w-3.5" />}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "products" && <ProductsTab />}
      {activeTab === "orders" && <OrdersTab />}
    </div>
  );
}
